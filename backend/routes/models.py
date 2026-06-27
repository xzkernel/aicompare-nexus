import logging
from typing import Optional

from fastapi import APIRouter, Header

from services.registry_service import build_registry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["models"])


@router.get("/models")
async def list_models(
    x_meta_api_key: Optional[str] = Header(default=None, alias="X-Meta-API-Key"),
):
    """
    Canonical model registry — frontier catalog + optional OpenRouter hydration.
    """
    try:
        return await build_registry(openrouter_api_key=x_meta_api_key)
    except Exception as e:
        logger.exception("registry build failed: %s", e)
        # Fallback minimal registry so UI never hard-crashes
        from registry.catalog import FRONTIER_CATALOG, PROVIDER_META

        models = [
            {
                "id": m["id"],
                "name": m.get("name", m["id"]),
                "provider": m["provider"],
                "supportsStreaming": True,
                "contextWindow": m.get("contextWindow", "—"),
                "multimodal": m.get("multimodal", False),
                "reasoning": m.get("reasoning", False),
                "freeTier": m.get("freeTier", False),
                "openSource": m.get("openSource", False),
                "relaySupported": m.get("relaySupported", False),
            }
            for m in FRONTIER_CATALOG
        ]
        groups: dict = {}
        for m in models:
            groups.setdefault(m["provider"], []).append(m)
        providers = [
            {
                "id": pid,
                "label": PROVIDER_META.get(pid, {}).get("label", pid),
                "description": PROVIDER_META.get(pid, {}).get("description", ""),
                "relayLabel": PROVIDER_META.get(pid, {}).get("relayLabel"),
                "models": groups[pid],
            }
            for pid in ["openai", "google", "anthropic", "meta", "custom"]
            if pid in groups
        ]
        return {
            "version": "2",
            "updatedAt": None,
            "streaming": True,
            "byok": True,
            "openRouterHydrated": False,
            "liveSync": False,
            "fingerprint": "backend-fallback",
            "providers": providers,
            "modelCount": len(models),
            "degraded": True,
        }
