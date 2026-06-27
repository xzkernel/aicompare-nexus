"""
Builds the canonical model registry response for GET /api/v1/models.
Live OpenRouter list is merged on every request (short server cache).
"""

from __future__ import annotations

import hashlib
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

import httpx

from registry.catalog import FRONTIER_CATALOG, PROVIDER_META
from registry.legacy import is_legacy_model_id

logger = logging.getLogger(__name__)

OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
OPENROUTER_HYDRATE_LIMIT = 200
REGISTRY_CACHE_TTL_SEC = 45

# Prefer recent frontier slugs when merging OpenRouter
_FRONTIER_HINTS = (
    "gpt-5.5",
    "gpt-5",
    "claude-opus-4.8",
    "claude-sonnet-4.6",
    "gemini-3.5",
    "gemini-3.1",
    "deepseek-v4",
    "o4-mini",
    "o3",
    "llama-4",
    "qwen3",
)

_OR_PREFIX_TO_PROVIDER: Dict[str, str] = {
    "openai": "openai",
    "google": "google",
    "anthropic": "anthropic",
}

_registry_cache: Dict[str, Any] = {"at": 0.0, "key": "", "payload": None}


def _openrouter_relevance(or_id: str, name: str) -> int:
    haystack = f"{or_id} {name}".lower()
    score = 0
    for idx, hint in enumerate(_FRONTIER_HINTS):
        if hint in haystack:
            score += (len(_FRONTIER_HINTS) - idx) * 10
    return score


def _model_entry(raw: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": raw["id"],
        "name": raw.get("name", raw["id"]),
        "provider": raw["provider"],
        "supportsStreaming": bool(raw.get("supportsStreaming", True)),
        "contextWindow": raw.get("contextWindow", "—"),
        "multimodal": bool(raw.get("multimodal", False)),
        "reasoning": bool(raw.get("reasoning", False)),
        "supportsWebSearch": bool(
            raw.get(
                "supportsWebSearch",
                raw.get("provider") in ("google", "anthropic", "meta"),
            )
        ),
        "freeTier": bool(raw.get("freeTier", False)),
        "openSource": bool(raw.get("openSource", False)),
        "relaySupported": bool(raw.get("relaySupported", raw["provider"] == "meta")),
        "openRouterId": raw.get("openRouterId"),
        "typicalLatency": raw.get("typicalLatency", "~2.0s"),
        "source": raw.get("source", "catalog"),
    }


def _internal_id_from_or_slug(provider: str, slug: str) -> str:
    if provider == "anthropic":
        return slug.replace(".", "-")
    return slug


def _provider_from_or_id(or_id: str) -> Tuple[str, str]:
    """Return (provider, internal_model_id) for an OpenRouter slug."""
    if "/" not in or_id:
        return "meta", or_id
    prefix, slug = or_id.split("/", 1)
    provider = _OR_PREFIX_TO_PROVIDER.get(prefix.lower(), "meta")
    if provider == "meta":
        return provider, or_id
    return provider, _internal_id_from_or_slug(provider, slug)


def _merge_models(*sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen_ids: Set[str] = set()
    seen_or: Set[str] = set()
    merged: List[Dict[str, Any]] = []

    for batch in sources:
        for raw in batch:
            entry = _model_entry(raw)
            mid = entry["id"]
            or_id = entry.get("openRouterId") or mid
            if is_legacy_model_id(mid) or is_legacy_model_id(str(or_id)):
                continue
            if mid in seen_ids or or_id in seen_or:
                continue
            seen_ids.add(mid)
            seen_or.add(or_id)
            merged.append(entry)

    merged.sort(
        key=lambda m: _openrouter_relevance(
            str(m.get("openRouterId") or m["id"]),
            str(m.get("name") or ""),
        ),
        reverse=True,
    )
    return merged


def _group_by_provider(models: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    groups: Dict[str, List[Dict[str, Any]]] = {}
    for m in models:
        pid = m["provider"]
        groups.setdefault(pid, []).append(m)

    order = ["openai", "google", "anthropic", "meta", "custom"]
    result = []
    for pid in order:
        if pid not in groups:
            continue
        meta = PROVIDER_META.get(pid, {})
        provider_models = sorted(
            groups[pid],
            key=lambda m: _openrouter_relevance(
                str(m.get("openRouterId") or m["id"]),
                str(m.get("name") or ""),
            ),
            reverse=True,
        )
        result.append(
            {
                "id": pid,
                "label": meta.get("label", pid.title()),
                "description": meta.get("description", ""),
                "relayLabel": meta.get("relayLabel"),
                "models": provider_models,
            }
        )
    return result


def _fingerprint(models: List[Dict[str, Any]]) -> str:
    ids = sorted(f"{m['provider']}:{m['id']}" for m in models)
    digest = hashlib.sha256(",".join(ids).encode()).hexdigest()
    return digest[:16]


async def _fetch_openrouter_models() -> List[Dict[str, Any]]:
    extra: List[Dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(OPENROUTER_MODELS_URL)
            response.raise_for_status()
            data = response.json()
    except Exception as e:
        logger.warning("OpenRouter model hydration failed: %s", e)
        return extra

    catalog_ids = {m["id"] for m in FRONTIER_CATALOG}
    catalog_or = {
        m.get("openRouterId") or m["id"] for m in FRONTIER_CATALOG if m.get("openRouterId")
    }

    candidates = [
        item
        for item in data.get("data", [])
        if item.get("id")
        and item["id"] not in catalog_ids
        and item["id"] not in catalog_or
        and not is_legacy_model_id(str(item["id"]))
    ]
    candidates.sort(
        key=lambda item: _openrouter_relevance(
            str(item.get("id", "")),
            str(item.get("name") or ""),
        ),
        reverse=True,
    )

    for item in candidates[:OPENROUTER_HYDRATE_LIMIT]:
        or_id = str(item.get("id"))
        if _openrouter_relevance(or_id, str(item.get("name") or "")) <= 0:
            continue

        provider, internal_id = _provider_from_or_id(or_id)
        name = item.get("name") or internal_id
        pricing = item.get("pricing") or {}
        is_free = (
            str(pricing.get("prompt", "1")) == "0"
            and str(pricing.get("completion", "1")) == "0"
        )
        hay = f"{or_id} {name}".lower()

        extra.append(
            {
                "id": internal_id,
                "name": name,
                "provider": provider,
                "supportsStreaming": True,
                "contextWindow": str(item.get("context_length") or "—"),
                "multimodal": any(x in hay for x in ("vision", "multimodal", "image")),
                "reasoning": any(x in hay for x in ("r1", "reasoning", "think", "o3", "o4")),
                "freeTier": is_free,
                "openSource": any(
                    x in or_id.lower()
                    for x in ("llama", "qwen", "gemma", "deepseek", "mistral")
                ),
                "relaySupported": True,
                "openRouterId": or_id,
                "typicalLatency": "~2.0s",
                "source": "openrouter",
            }
        )

    return extra


async def build_registry(openrouter_api_key: Optional[str] = None) -> Dict[str, Any]:
    # API key reserved for future authenticated OR endpoints; list is public today.
    _ = openrouter_api_key or os.getenv("OPENROUTER_API_KEY")
    cache_key = "live"
    now = time.monotonic()
    cached = _registry_cache.get("payload")
    if (
        cached
        and now - float(_registry_cache.get("at", 0)) < REGISTRY_CACHE_TTL_SEC
        and _registry_cache.get("key") == cache_key
    ):
        return cached

    catalog = [
        dict(m, source="catalog")
        for m in FRONTIER_CATALOG
        if not is_legacy_model_id(m["id"])
    ]
    live = await _fetch_openrouter_models()
    models = _merge_models(catalog, live)

    payload = {
        "version": "2",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "streaming": True,
        "byok": True,
        "openRouterHydrated": bool(live),
        "liveSync": True,
        "fingerprint": _fingerprint(models),
        "providers": _group_by_provider(models),
        "modelCount": len(models),
    }
    _registry_cache["at"] = now
    _registry_cache["key"] = cache_key
    _registry_cache["payload"] = payload
    return payload
