import asyncio
import logging

from providers.opencode import is_supported_live_model
from services import registry_service
from services.registry_service import _fetch_opencode_models, _merge_models
from utils.byok import parse_byok_headers
from utils.model_resolver import resolve_side


def test_both_opencode_providers_resolve_the_shared_key():
    keys = parse_byok_headers(x_opencode_api_key="unit-test-key")

    go = resolve_side("grok-4.5", "opencode-go", keys)
    zen = resolve_side("grok-4.5", "opencode-zen", keys)

    assert go[:3] == ("opencode-go", keys.opencode, "grok-4.5")
    assert zen[:3] == ("opencode-zen", keys.opencode, "grok-4.5")


def test_registry_dedup_is_provider_qualified():
    models = _merge_models(
        [
            {"id": "shared-model", "provider": "opencode-go", "name": "Go Shared"},
            {"id": "shared-model", "provider": "opencode-zen", "name": "Zen Shared"},
        ],
        [
            {"id": "shared-model", "provider": "opencode-go", "name": "Duplicate Go"},
        ],
    )

    assert {(model["provider"], model["id"]) for model in models} == {
        ("opencode-go", "shared-model"),
        ("opencode-zen", "shared-model"),
    }
    assert next(model for model in models if model["provider"] == "opencode-go")["name"] == "Go Shared"


def test_go_live_hydration_filters_unsupported_models(monkeypatch, caplog):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "data": [
                    {"id": "grok-4.5", "name": "Grok 4.5"},
                    {"id": "minimax-m2.7", "name": "MiniMax M2.7"},
                    {"id": "qwen3.7-max", "name": "Qwen 3.7 Max"},
                    {"id": "qwen3.7-plus", "name": "Qwen 3.7 Plus"},
                    {"id": "qwen3.7-unknown", "name": "Unsupported"},
                    {"id": "undocumented-live-id", "name": "Unsupported"},
                ]
            }

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def get(self, url):
            return FakeResponse()

    monkeypatch.setattr(registry_service, "outbound_client", lambda *_args, **_kwargs: FakeClient())
    caplog.set_level(logging.DEBUG, logger=registry_service.__name__)

    models = asyncio.run(_fetch_opencode_models("opencode-go"))

    assert {model["id"] for model in models} == {
        "grok-4.5",
        "minimax-m2.7",
        "qwen3.7-max",
        "qwen3.7-plus",
    }
    assert all(not model["multimodal"] for model in models)
    assert all(not model["reasoning"] for model in models)
    assert all(not model["openSource"] for model in models)
    assert "count=2" in caplog.text
    assert "qwen3.7-unknown" in caplog.text
    assert "undocumented-live-id" in caplog.text
    assert not is_supported_live_model("opencode-go", "qwen3.7-unknown")


def test_live_capabilities_are_conservative_and_free_requires_suffix(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"data": ["vision-reasoning-freeform", "vision-reasoning-free", "big-pickle"]}

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def get(self, url):
            return FakeResponse()

    monkeypatch.setattr(registry_service, "outbound_client", lambda *_args, **_kwargs: FakeClient())

    models = asyncio.run(_fetch_opencode_models("opencode-zen"))

    assert [model["freeTier"] for model in models] == [False, True, True]
    assert all(not model["multimodal"] for model in models)
    assert all(not model["reasoning"] for model in models)
    assert all(not model["openSource"] for model in models)


def test_registry_cache_fill_is_single_flight(monkeypatch):
    calls = {"openrouter": 0, "opencode-go": 0, "opencode-zen": 0}

    async def fetch_openrouter():
        calls["openrouter"] += 1
        await asyncio.sleep(0.01)
        return []

    async def fetch_opencode(provider):
        calls[provider] += 1
        await asyncio.sleep(0.01)
        return []

    monkeypatch.setattr(registry_service, "_fetch_openrouter_models", fetch_openrouter)
    monkeypatch.setattr(registry_service, "_fetch_opencode_models", fetch_opencode)
    monkeypatch.setitem(registry_service._registry_cache, "at", 0.0)
    monkeypatch.setitem(registry_service._registry_cache, "key", "")
    monkeypatch.setitem(registry_service._registry_cache, "payload", None)

    async def request_concurrently():
        return await asyncio.gather(*(registry_service.build_registry() for _ in range(12)))

    payloads = asyncio.run(request_concurrently())

    assert calls == {"openrouter": 1, "opencode-go": 1, "opencode-zen": 1}
    assert all(payload is payloads[0] for payload in payloads)

    registry_service._registry_cache.update({"at": 0.0, "key": "", "payload": None})
    second_payloads = asyncio.run(request_concurrently())
    assert calls == {"openrouter": 2, "opencode-go": 2, "opencode-zen": 2}
    assert all(payload is second_payloads[0] for payload in second_payloads)


def test_openrouter_free_variant_is_detected(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "data": [
                    {
                        "id": "qwen/qwen3-test:free",
                        "name": "Qwen Test Free",
                        "context_length": 1000,
                    },
                    {
                        "id": "openai/gpt-5-test:free",
                        "name": "GPT 5 Test Free",
                        "context_length": 1000,
                    }
                ]
            }

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def get(self, url):
            return FakeResponse()

    monkeypatch.setattr(registry_service, "outbound_client", lambda *_args, **_kwargs: FakeClient())

    models = asyncio.run(registry_service._fetch_openrouter_models())
    assert len(models) == 2
    assert all(model["freeTier"] for model in models)
