import logging

from fastapi import APIRouter

from services.registry_service import build_registry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["models"])


@router.get("/models")
async def list_models():
    """
    Canonical model registry — frontier catalog + optional OpenRouter hydration.
    """
    try:
        return await build_registry()
    except Exception:
        logger.exception("registry build failed")
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
                "supportsWebSearch": m.get("supportsWebSearch", False),
                "source": m.get("source", "catalog"),
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
            for pid in [
                "openai",
                "google",
                "anthropic",
                "opencode-go",
                "opencode-zen",
                "meta",
                "custom",
            ]
            if pid in groups
        ]
        return {
            "version": "3",
            "updatedAt": None,
            "streaming": True,
            "byok": True,
            "openRouterHydrated": False,
            "openCodeGoHydrated": False,
            "openCodeZenHydrated": False,
            "liveSync": False,
            "fingerprint": "backend-fallback",
            "providers": providers,
            "modelCount": len(models),
            "degraded": True,
        }
