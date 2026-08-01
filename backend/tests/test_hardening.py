import asyncio
import json
import time
from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI
from pydantic import ValidationError
from starlette.requests import Request

import security
from main import create_app
from middleware import RateLimitMiddleware, RateLimiter
from providers.anthropic import AnthropicProvider
from providers.custom import CustomProvider
from providers.gemini import GeminiProvider
from providers.meta import MetaRelayProvider
from providers.openai import OpenAIProvider
from providers.stream_events import ProviderStreamEvent
from schemas.compare import AskRequest, CompareRequest
from schemas.search import ResolvedSearchOptions, SearchMode
from schemas.stream import StreamRequest
from services import compare_service, registry_service, stream_service
from services.search.citations import valid_citation_url
from services.search.normalize import NormalizedSearchMetadata, merge_metadata
from utils import client_ip
from utils.byok import ByokHeaders


def _request(client: str, forwarded: str | None = None) -> Request:
    headers = [] if forwarded is None else [(b"x-forwarded-for", forwarded.encode())]
    return Request({"type": "http", "method": "GET", "path": "/", "headers": headers, "client": (client, 1)})


def test_proxy_chain_requires_trusted_direct_peer_and_valid_addresses(monkeypatch):
    monkeypatch.setenv("TRUSTED_PROXY_IPS", "127.0.0.1,10.0.0.2")
    client_ip._trusted_networks.cache_clear()
    try:
        assert client_ip.get_client_ip(_request("203.0.113.10", "198.51.100.7")) == "203.0.113.10"
        assert client_ip.get_client_ip(_request("127.0.0.1", "198.51.100.7, 10.0.0.2")) == "198.51.100.7"
        assert client_ip.get_client_ip(_request("127.0.0.1", "spoofed, 10.0.0.2")) == "127.0.0.1"
    finally:
        client_ip._trusted_networks.cache_clear()


def test_proxy_defaults_do_not_trust_private_networks(monkeypatch):
    monkeypatch.delenv("TRUSTED_PROXY_IPS", raising=False)
    client_ip._trusted_networks.cache_clear()
    try:
        assert client_ip.get_client_ip(_request("10.0.0.8", "198.51.100.7")) == "10.0.0.8"
    finally:
        client_ip._trusted_networks.cache_clear()


def test_rate_limiter_sweeps_all_stale_identities(monkeypatch):
    limiter = RateLimiter()
    limiter.minute_requests.update({"old": [1.0], "live": [3990.0]})
    limiter.hour_requests.update({"old": [1.0], "live": [3990.0]})
    limiter._last_gc = 0
    monkeypatch.setattr(time, "monotonic", lambda: 4000.0)
    asyncio.run(limiter.is_allowed("current"))
    assert "old" not in limiter.minute_requests
    assert "old" not in limiter.hour_requests


def test_rate_middleware_never_retries_a_failing_endpoint():
    calls = 0
    app = FastAPI()
    app.add_middleware(RateLimitMiddleware)

    @app.get("/fail")
    async def fail():
        nonlocal calls
        calls += 1
        raise RuntimeError("boom")

    async def run():
        transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.get("/fail")

    assert asyncio.run(run()).status_code == 500
    assert calls == 1


def test_cors_is_present_on_request_size_early_error(monkeypatch):
    origin = "https://frontend.example"
    monkeypatch.setenv("CORS_ORIGINS", origin)

    async def run():
        transport = httpx.ASGITransport(app=create_app())
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.post(
                "/api/v1/stream",
                headers={"Origin": origin, "Content-Length": str(600_000)},
                content=b"x",
            )

    response = asyncio.run(run())
    assert response.status_code == 413
    assert response.headers["access-control-allow-origin"] == origin


def test_cors_wildcard_with_credentials_is_rejected(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "*")
    with pytest.raises(ValueError, match="must not contain"):
        create_app()


def test_request_models_trim_forbid_extra_and_validate_providers():
    body = StreamRequest(
        prompt=" hello ", leftModel=" vendor/model:free ", rightModel="gpt-test", leftProvider=" openai "
    )
    assert body.prompt == "hello"
    assert body.leftModel == "vendor/model:free"
    assert body.leftProvider == "openai"
    with pytest.raises(ValidationError):
        StreamRequest(prompt="x", leftModel="a", rightModel="b", leftProvider="unknown")
    with pytest.raises(ValidationError):
        AskRequest(prompt="x", leftModel="a", rightModel="b", unexpected=True)


def test_compare_rejects_duplicate_trimmed_labels():
    with pytest.raises(ValidationError, match="labels must be unique"):
        CompareRequest(
            prompt="x",
            providers=[
                {"label": "same", "model": "gpt-a"},
                {"label": " same ", "model": "gpt-b"},
            ],
        )


def _mock_client(monkeypatch, module, body: str, capture: dict | None = None):
    def handler(request: httpx.Request) -> httpx.Response:
        if capture is not None:
            capture["request"] = request
        return httpx.Response(200, text=body)

    monkeypatch.setattr(
        module,
        "outbound_client",
        lambda *_args, **_kwargs: httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )


@pytest.mark.parametrize(
    "module,provider,body,error",
    [
        pytest.param(__import__("providers.openai", fromlist=["x"]), OpenAIProvider("k", "m"), "data: [DONE]\n\n", "no answer", id="openai"),
        pytest.param(__import__("providers.gemini", fromlist=["x"]), GeminiProvider("k", "m"), 'data: {"candidates":[{"finishReason":"STOP"}]}\n\n', "no answer", id="gemini"),
        pytest.param(__import__("providers.anthropic", fromlist=["x"]), AnthropicProvider("k", "m"), 'data: {"type":"message_stop"}\n\n', "no answer", id="anthropic"),
        pytest.param(__import__("providers.meta", fromlist=["x"]), MetaRelayProvider("k", "m", "https://relay.example"), "data: [DONE]\n\n", "no answer", id="meta"),
        pytest.param(__import__("providers.meta", fromlist=["x"]), CustomProvider("k", "m", "https://custom.example"), "data: [DONE]\n\n", "no answer", id="custom"),
    ],
)
def test_provider_terminal_without_text_is_not_success(monkeypatch, module, provider, body, error):
    _mock_client(monkeypatch, module, body)

    async def collect():
        return [event async for event in provider.stream_events("hello")]

    with pytest.raises(Exception, match=error):
        asyncio.run(collect())


@pytest.mark.parametrize(
    "module,provider,body",
    [
        pytest.param(__import__("providers.openai", fromlist=["x"]), OpenAIProvider("k", "m"), 'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n', id="openai"),
        pytest.param(__import__("providers.gemini", fromlist=["x"]), GeminiProvider("k", "m"), 'data: {"candidates":[{"content":{"parts":[{"text":"partial"}]}}]}\n\n', id="gemini"),
        pytest.param(__import__("providers.anthropic", fromlist=["x"]), AnthropicProvider("k", "m"), 'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"partial"}}\n\n', id="anthropic"),
        pytest.param(__import__("providers.meta", fromlist=["x"]), MetaRelayProvider("k", "m", "https://relay.example"), 'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n', id="meta"),
    ],
)
def test_provider_unterminated_partial_stream_fails(monkeypatch, module, provider, body):
    _mock_client(monkeypatch, module, body)

    async def collect():
        return [event async for event in provider.stream_events("hello")]

    with pytest.raises(Exception, match="terminated unexpectedly"):
        asyncio.run(collect())


def test_direct_gemini_unspecified_finish_reason_is_not_success(monkeypatch):
    module = __import__("providers.gemini", fromlist=["x"])
    body = (
        'data: {"candidates":[{"content":{"parts":[{"text":"partial"}]}}]}\n\n'
        'data: {"candidates":[{"finishReason":"FINISH_REASON_UNSPECIFIED"}]}\n\n'
    )
    _mock_client(monkeypatch, module, body)

    async def collect():
        return [event async for event in GeminiProvider("k", "m").stream_events("hello")]

    with pytest.raises(Exception, match="did not complete successfully"):
        asyncio.run(collect())


def test_custom_non_authorization_key_is_raw_and_base_url_is_strict(monkeypatch):
    capture = {}
    module = __import__("providers.meta", fromlist=["x"])
    _mock_client(
        monkeypatch,
        module,
        'data: {"choices":[{"delta":{"content":"ok"},"finish_reason":"stop"}]}\n\n',
        capture,
    )
    provider = CustomProvider("raw-key", "m", "https://relay.example/api", "X-API-Key")
    assert asyncio.run(provider.complete("hello")) == "ok"
    assert capture["request"].headers["x-api-key"] == "raw-key"
    assert capture["request"].url.path == "/api/v1/chat/completions"
    for value in (
        "https://relay.example/api?target=x",
        "https://relay.example/api#fragment",
        "https://relay.example/a/../api",
        "https://relay.example/v1/chat/completions",
    ):
        with pytest.raises(ValueError):
            security.validate_relay_base_url(value)


def test_fragmented_openai_tool_input_is_merged():
    provider = MetaRelayProvider("k", "m", "https://relay.example")
    buffers = {}
    first = {"choices": [{"delta": {"tool_calls": [{"index": 0, "function": {"arguments": '{"que'}}]}}]}
    second = {"choices": [{"delta": {"tool_calls": [{"index": 0, "function": {"arguments": 'ry":"news"}'}}]}}]}
    assert provider._extract_queries_from_chunk(first, buffers) == []
    assert provider._extract_queries_from_chunk(second, buffers) == ["news"]


def test_search_metadata_merge_and_citation_validation():
    merged = merge_metadata(NormalizedSearchMetadata(used=True), NormalizedSearchMetadata())
    assert merged.used is True
    assert valid_citation_url("https://example.com/article")
    assert not valid_citation_url("javascript:alert(1)")
    assert not valid_citation_url("https://user:pass@example.com")


def test_registry_skips_malformed_items(monkeypatch):
    async def payload(_url):
        return {
            "data": [None, "bad", {}, {"id": 1}, {"id": "x" * 300}, {"id": "openai/gpt-5-test", "name": 5}]
        }

    monkeypatch.setattr(registry_service, "_fetch_registry_json", payload)
    models = asyncio.run(registry_service._fetch_openrouter_models())
    assert [model["id"] for model in models] == ["gpt-5-test"]


def test_registry_response_body_is_bounded(monkeypatch):
    class Stream(httpx.AsyncByteStream):
        async def __aiter__(self):
            yield b"x" * (registry_service.MAX_REGISTRY_RESPONSE_BYTES + 1)

    def handler(_request):
        return httpx.Response(200, stream=Stream())

    monkeypatch.setattr(
        registry_service,
        "outbound_client",
        lambda *_args, **_kwargs: httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    with pytest.raises(security.UpstreamResponseTooLarge):
        asyncio.run(registry_service._fetch_registry_json("https://registry.example/models"))


def test_stream_side_orders_start_before_skip_and_bounds_output(monkeypatch):
    class Provider:
        async def stream_events(self, *_args):
            yield ProviderStreamEvent(kind="token", text="too long")

    monkeypatch.setattr(stream_service, "provider_for", lambda *_args: Provider())
    monkeypatch.setattr(stream_service, "MAX_PROVIDER_OUTPUT_CHARS", 3)

    async def run():
        queue = asyncio.Queue()
        await stream_service._stream_side(
            "left", "p", "openai", "k", "m", {},
            ResolvedSearchOptions(active=True, mode=SearchMode.auto), queue,
        )
        return "".join(queue.get_nowait() for _ in range(queue.qsize()))

    output = asyncio.run(run())
    assert output.index("event: start") < output.index("event: search_complete")
    assert "event: error" in output
    assert "event: done" not in output


def test_sse_deadline_heartbeats_and_cancellation_have_no_finally_yields(monkeypatch):
    cancelled = 0

    async def hanging_side(*args, **_kwargs):
        nonlocal cancelled
        queue = args[-1]
        await queue.put(stream_service._sse("start", {"side": args[0]}))
        try:
            await asyncio.Event().wait()
        finally:
            cancelled += 1

    monkeypatch.setattr(stream_service, "_stream_side", hanging_side)
    monkeypatch.setattr(stream_service, "resolve_side", lambda *_args: ("openai", "k", "m", {}))
    monkeypatch.setattr(stream_service, "STREAM_DEADLINE_SECONDS", 0.04)
    monkeypatch.setattr(stream_service, "SSE_HEARTBEAT_SECONDS", 0.005)
    body = StreamRequest(prompt="p", leftModel="a", rightModel="b")

    async def run_deadline():
        return [item async for item in stream_service.stream_comparison_sse(body, ByokHeaders())]

    events = asyncio.run(run_deadline())
    assert any(item.startswith(": heartbeat") for item in events)
    assert sum(item.startswith(": heartbeat") for item in events) <= 10
    assert any("event: error" in item for item in events)
    assert events[-1].startswith("event: complete")
    assert cancelled == 2
    cancelled_before_close = cancelled

    async def close_early():
        generator = stream_service.stream_comparison_sse(body, ByokHeaders())
        await generator.__anext__()
        await generator.aclose()

    asyncio.run(close_early())
    assert cancelled > cancelled_before_close


def test_stream_deadline_times_out_only_unfinished_side(monkeypatch):
    cancelled = set()

    async def asymmetric_side(side, *_args, **_kwargs):
        if side == "left":
            return stream_service._sse("done", {"side": side, "text": "finished"})
        try:
            await asyncio.Event().wait()
        finally:
            cancelled.add(side)

    monkeypatch.setattr(stream_service, "_stream_side", asymmetric_side)
    monkeypatch.setattr(stream_service, "resolve_side", lambda *_args: ("openai", "k", "m", {}))
    monkeypatch.setattr(stream_service, "STREAM_DEADLINE_SECONDS", 0.02)
    monkeypatch.setattr(stream_service, "SSE_HEARTBEAT_SECONDS", 0.005)
    body = StreamRequest(prompt="p", leftModel="a", rightModel="b")

    async def collect():
        return [item async for item in stream_service.stream_comparison_sse(body, ByokHeaders())]

    output = "".join(asyncio.run(collect()))
    assert output.count('"side": "left"') == 1
    assert 'event: done\ndata: {"side": "left"' in output
    assert 'event: error\ndata: {"side": "left"' not in output
    assert output.count('event: error\ndata: {"side": "right"') == 1
    assert cancelled == {"right"}


def test_saturated_stream_queues_cancel_without_hanging(monkeypatch):
    cancelled = set()

    async def flooding_side(side, *_args, **_kwargs):
        queue = _args[-1]
        try:
            while True:
                await queue.put(stream_service._sse("token", {"side": side, "delta": "x"}))
        finally:
            cancelled.add(side)

    monkeypatch.setattr(stream_service, "_stream_side", flooding_side)
    monkeypatch.setattr(stream_service, "resolve_side", lambda *_args: ("openai", "k", "m", {}))
    body = StreamRequest(prompt="p", leftModel="a", rightModel="b")

    async def disconnect():
        generator = stream_service.stream_comparison_sse(body, ByokHeaders())
        await generator.__anext__()
        await asyncio.sleep(0.01)
        await asyncio.wait_for(generator.aclose(), timeout=0.2)

    asyncio.run(disconnect())
    assert cancelled == {"left", "right"}


def test_unhandled_500_receives_security_and_cors_headers(monkeypatch):
    origin = "https://frontend.example"
    monkeypatch.setenv("CORS_ORIGINS", origin)
    app = create_app()

    @app.get("/explode")
    async def explode():
        raise RuntimeError("boom")

    async def request():
        transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.get("/explode", headers={"Origin": origin})

    response = asyncio.run(request())
    assert response.status_code == 500
    assert response.headers["access-control-allow-origin"] == origin
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["content-security-policy"] == "default-src 'none'; frame-ancestors 'none'"


def test_multi_compare_absolute_deadline_preserves_result_shape(monkeypatch):
    async def slow(spec, *_args):
        await asyncio.sleep(1)
        return spec.label, {"ok": True}

    monkeypatch.setattr(compare_service, "_run_spec", slow)
    monkeypatch.setattr(compare_service, "COMPARE_DEADLINE_SECONDS", 0.01)
    request = CompareRequest(prompt="p", providers=[{"label": "one", "model": "gpt-test"}])
    response = asyncio.run(compare_service.run_multi_compare(request, ByokHeaders()))
    assert response.results["one"]["ok"] is False
    assert response.results["one"]["error"] == "Provider request timed out."


def test_dns_executor_can_restart_after_lifespan_shutdown():
    security.startup_dns_executor()
    assert security._DNS_EXECUTOR is not None
    asyncio.run(security.shutdown_dns_executor())
    assert security._DNS_EXECUTOR is None
    security.startup_dns_executor()


def test_backend_bootstrap_and_container_configuration():
    backend = Path(__file__).resolve().parents[1]
    main_source = (backend / "main.py").read_text(encoding="utf-8")
    dockerfile = (backend / "Dockerfile").read_text(encoding="utf-8")
    requirements = (backend / "requirements.txt").read_text(encoding="utf-8")

    assert main_source.index("load_dotenv(backend_env)") < main_source.index("from config import")
    assert "python-dotenv==" in requirements
    assert "apt-get install" not in dockerfile
    assert 'CMD ["curl"' not in dockerfile
    assert 'os.getenv(\\"PORT\\", \\"8001\\")' in dockerfile
