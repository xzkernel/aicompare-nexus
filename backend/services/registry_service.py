"""
Builds the canonical model registry response for GET /api/v1/models.
Live OpenRouter list is merged on every request (short server cache).
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import time
import weakref
from datetime import datetime, timezone
from typing import Any, Dict, List, Set, Tuple

from registry.catalog import FRONTIER_CATALOG, PROVIDER_META
from registry.legacy import is_legacy_model_id
from providers.opencode import OPENCODE_ROOTS, is_supported_live_model
from security import outbound_client, read_limited_response

logger = logging.getLogger(__name__)

OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
OPENROUTER_HYDRATE_LIMIT = 200
OPENCODE_HYDRATE_LIMIT = 200
REGISTRY_CACHE_TTL_SEC = 45
MAX_REGISTRY_RESPONSE_BYTES = 2 * 1024 * 1024
MAX_REGISTRY_MODEL_ID = 256
MAX_REGISTRY_MODEL_NAME = 256

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
_registry_cache_locks: weakref.WeakKeyDictionary[asyncio.AbstractEventLoop, asyncio.Lock] = (
    weakref.WeakKeyDictionary()
)


def _get_registry_cache_lock() -> asyncio.Lock:
    loop = asyncio.get_running_loop()
    lock = _registry_cache_locks.get(loop)
    if lock is None:
        lock = asyncio.Lock()
        _registry_cache_locks[loop] = lock
    return lock


def _is_free_model(provider: str, model_id: str) -> bool:
    normalized = model_id.lower()
    return (
        normalized.endswith("-free")
        or normalized.endswith(":free")
        or (provider == "opencode-zen" and normalized == "big-pickle")
    )


def _context_window(value: Any) -> str:
    if isinstance(value, int) and 0 < value <= 100_000_000:
        return str(value)
    if isinstance(value, str) and 0 < len(value) <= 32:
        return value
    return "—"


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
    seen_ids: Set[Tuple[str, str]] = set()
    seen_or: Set[Tuple[str, str]] = set()
    merged: List[Dict[str, Any]] = []

    for batch in sources:
        for raw in batch:
            entry = _model_entry(raw)
            mid = entry["id"]
            or_id = entry.get("openRouterId") or mid
            if is_legacy_model_id(mid) or is_legacy_model_id(str(or_id)):
                continue
            provider_key = str(entry["provider"])
            id_key = (provider_key, str(mid))
            or_key = (provider_key, str(or_id))
            if id_key in seen_ids or or_key in seen_or:
                continue
            seen_ids.add(id_key)
            seen_or.add(or_key)
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

    order = [
        "openai",
        "google",
        "anthropic",
        "opencode-go",
        "opencode-zen",
        "meta",
        "custom",
    ]
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


async def _fetch_registry_json(url: str) -> Any:
    """Fetch registry JSON without proxies and without buffering an unbounded body."""
    async with outbound_client(15) as client:
        if hasattr(client, "stream"):
            async with client.stream("GET", url) as response:
                response.raise_for_status()
                raw = await read_limited_response(response, MAX_REGISTRY_RESPONSE_BYTES)
            return json.loads(raw)

        # Production HTTPX clients always stream; this supports minimal test doubles.
        response = await client.get(url)
        response.raise_for_status()
        return response.json()


async def _fetch_openrouter_models() -> List[Dict[str, Any]]:
    extra: List[Dict[str, Any]] = []
    try:
        data = await _fetch_registry_json(OPENROUTER_MODELS_URL)
    except Exception:
        logger.warning("OpenRouter model hydration failed")
        return extra

    # OpenCode intentionally exposes IDs also available through direct providers
    # and OpenRouter; do not let those provider-qualified duplicates suppress each other.
    catalog_ids = {
        m["id"] for m in FRONTIER_CATALOG if not m["provider"].startswith("opencode-")
    }
    catalog_or = {
        m.get("openRouterId") or m["id"]
        for m in FRONTIER_CATALOG
        if not m["provider"].startswith("opencode-") and m.get("openRouterId")
    }

    raw_items = data.get("data", []) if isinstance(data, dict) else []
    if not isinstance(raw_items, list):
        return []
    candidates = []
    for item in raw_items[: OPENROUTER_HYDRATE_LIMIT * 10]:
        if not isinstance(item, dict):
            continue
        model_id = item.get("id")
        if not isinstance(model_id, str) or not model_id.strip() or len(model_id) > MAX_REGISTRY_MODEL_ID:
            continue
        if model_id in catalog_ids or model_id in catalog_or or is_legacy_model_id(model_id):
            continue
        name = item.get("name")
        if name is not None and (not isinstance(name, str) or len(name) > MAX_REGISTRY_MODEL_NAME):
            item = dict(item, name=model_id)
        candidates.append(item)
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
        extra.append(
            {
                "id": internal_id,
                "name": name,
                "provider": provider,
                "supportsStreaming": True,
                "contextWindow": _context_window(item.get("context_length")),
                "multimodal": False,
                "reasoning": False,
                "freeTier": _is_free_model(provider, or_id),
                "openSource": False,
                "relaySupported": True,
                "openRouterId": or_id,
                "typicalLatency": "~2.0s",
                "source": "openrouter",
            }
        )

    return extra


def _readable_model_name(model_id: str) -> str:
    brands = {
        "gpt": "GPT",
        "glm": "GLM",
        "hy3": "HY3",
        "kimi": "Kimi",
        "mimo": "MiMo",
        "qwen": "Qwen",
        "claude": "Claude",
        "gemini": "Gemini",
        "deepseek": "DeepSeek",
        "minimax": "MiniMax",
        "grok": "Grok",
    }
    words = model_id.replace("/", " ").replace("_", " ").replace("-", " ").split()
    return " ".join(brands.get(word.lower(), word.title()) for word in words)


async def _fetch_opencode_models(provider: str) -> List[Dict[str, Any]]:
    try:
        payload = await _fetch_registry_json(f"{OPENCODE_ROOTS[provider]}/models")
    except Exception:
        logger.warning("%s model hydration failed", provider)
        return []

    raw_models = payload.get("data", payload.get("models", [])) if isinstance(payload, dict) else []
    if not isinstance(raw_models, list):
        return []
    hydrated: List[Dict[str, Any]] = []
    omitted_ids: List[str] = []
    for raw in raw_models[:OPENCODE_HYDRATE_LIMIT]:
        if not isinstance(raw, (str, dict)):
            continue
        model_id = raw if isinstance(raw, str) else raw.get("id")
        if (
            not isinstance(model_id, str)
            or not model_id.strip()
            or len(model_id) > MAX_REGISTRY_MODEL_ID
        ):
            continue
        if not is_supported_live_model(provider, model_id):
            omitted_ids.append(model_id)
            continue
        name = raw.get("name") if isinstance(raw, dict) else None
        if name is not None and (not isinstance(name, str) or len(name) > MAX_REGISTRY_MODEL_NAME):
            name = None
        hydrated.append(
            {
                "id": model_id,
                "name": name or _readable_model_name(model_id),
                "provider": provider,
                "supportsStreaming": True,
                "contextWindow": _context_window(raw.get("context_length")) if isinstance(raw, dict) else "—",
                "multimodal": False,
                "reasoning": False,
                "freeTier": _is_free_model(provider, model_id),
                "openSource": False,
                "relaySupported": False,
                "supportsWebSearch": False,
                "typicalLatency": "~2.0s",
                "source": "opencode",
            }
        )
    if omitted_ids:
        logger.debug(
            "%s omitted unsupported models: count=%d ids=%s",
            provider,
            len(omitted_ids),
            ",".join(omitted_ids),
        )
    return hydrated


def _cached_registry(cache_key: str, now: float) -> Dict[str, Any] | None:
    cached = _registry_cache.get("payload")
    if (
        cached
        and now - float(_registry_cache.get("at", 0)) < REGISTRY_CACHE_TTL_SEC
        and _registry_cache.get("key") == cache_key
    ):
        return cached
    return None


async def build_registry() -> Dict[str, Any]:
    cache_key = "live"
    cached = _cached_registry(cache_key, time.monotonic())
    if cached:
        return cached

    async with _get_registry_cache_lock():
        cached = _cached_registry(cache_key, time.monotonic())
        if cached:
            return cached

        catalog = [
            dict(m, source=m.get("source", "catalog"))
            for m in FRONTIER_CATALOG
            if not is_legacy_model_id(m["id"])
        ]
        live, go_live, zen_live = await asyncio.gather(
            _fetch_openrouter_models(),
            _fetch_opencode_models("opencode-go"),
            _fetch_opencode_models("opencode-zen"),
        )
        models = _merge_models(catalog, live, go_live, zen_live)

        payload = {
            "version": "3",
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "streaming": True,
            "byok": True,
            "openRouterHydrated": bool(live),
            "openCodeGoHydrated": bool(go_live),
            "openCodeZenHydrated": bool(zen_live),
            "liveSync": True,
            "fingerprint": _fingerprint(models),
            "providers": _group_by_provider(models),
            "modelCount": len(models),
        }
        _registry_cache["at"] = time.monotonic()
        _registry_cache["key"] = cache_key
        _registry_cache["payload"] = payload
        return payload
