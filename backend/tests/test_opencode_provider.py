import asyncio
import json

import httpx
import pytest

from providers.opencode import OpenCodeProvider, protocol_for
from schemas.search import ResolvedSearchOptions, SearchMode
from services.stream_service import _stream_side


CASES = [
    (
        "opencode-zen",
        "gpt-5.6-sol",
        "responses",
        "/zen/v1/responses",
        "authorization",
        {"type": "response.output_text.delta", "delta": "response"},
    ),
    (
        "opencode-zen",
        "claude-sonnet-5",
        "messages",
        "/zen/v1/messages",
        "x-api-key",
        {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "message"}},
    ),
    (
        "opencode-zen",
        "gemini-3.6-flash",
        "gemini",
        "/zen/v1/models/gemini-3.6-flash:streamGenerateContent",
        "x-goog-api-key",
        {"candidates": [{"content": {"parts": [{"text": "gemini"}]}}]},
    ),
    (
        "opencode-go",
        "grok-4.5",
        "chat",
        "/zen/go/v1/chat/completions",
        "authorization",
        {"choices": [{"delta": {"content": "chat"}}]},
    ),
    (
        "opencode-zen",
        "deepseek-v4-flash-free",
        "chat",
        "/zen/v1/chat/completions",
        "authorization",
        {"choices": [{"delta": {"content": "chat"}}]},
    ),
    (
        "opencode-go",
        "qwen3.7-plus",
        "messages",
        "/zen/go/v1/messages",
        "x-api-key",
        {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "message"}},
    ),
]


@pytest.mark.parametrize(
    "provider,model,protocol,path,key_header,event",
    CASES,
)
def test_protocol_request_and_stream_parsing(provider, model, protocol, path, key_header, event):
    api_key = "unit-test-key"
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["request"] = request
        body = f"data: {json.dumps(event)}\n\ndata: [DONE]\n\n"
        return httpx.Response(200, text=body)

    adapter = OpenCodeProvider(
        api_key,
        model,
        provider,
        transport=httpx.MockTransport(handler),
    )

    async def collect():
        return [item async for item in adapter.stream_events("hello")]

    streamed = asyncio.run(collect())
    request = captured["request"]
    payload = json.loads(request.content)

    assert adapter.protocol == protocol
    assert request.url.path == path
    assert request.headers[key_header].endswith(api_key)
    assert all(api_key not in value for value in request.url.params.values())
    assert streamed[0].text in {"response", "message", "gemini", "chat"}

    if protocol == "responses":
        assert payload == {
            "model": model,
            "input": "hello",
            "stream": True,
            "max_output_tokens": 2048,
        }
    elif protocol == "messages":
        assert payload["messages"] == [{"role": "user", "content": "hello"}]
        assert payload["stream"] is True
        assert "authorization" not in request.headers
    elif protocol == "gemini":
        assert payload["contents"][0]["parts"] == [{"text": "hello"}]
        assert request.url.params["alt"] == "sse"
    else:
        assert payload["messages"] == [{"role": "user", "content": "hello"}]
        assert payload["stream"] is True
        if model.startswith("deepseek-"):
            assert payload["thinking"] == {"type": "disabled"}


def test_go_protocol_selection_rejects_undocumented_models():
    assert protocol_for("opencode-go", "minimax-m3") == "messages"
    assert protocol_for("opencode-go", "minimax-m2.7") == "messages"
    assert protocol_for("opencode-go", "minimax-m2.5") == "messages"
    assert protocol_for("opencode-go", "qwen3.7-max") == "messages"
    assert protocol_for("opencode-go", "qwen3.7-plus") == "messages"
    assert protocol_for("opencode-go", "qwen3.6-plus") == "messages"
    assert protocol_for("opencode-go", "glm-5.2") == "chat"
    with pytest.raises(ValueError, match="Unsupported OpenCode Go model"):
        protocol_for("opencode-go", "undocumented-live-id")


def test_search_request_emits_skipped_completion():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            text='data: {"choices":[{"delta":{"content":"answer"}}]}\n\ndata: [DONE]\n\n',
        )

    adapter = OpenCodeProvider(
        "unit-test-key",
        "grok-4.5",
        "opencode-go",
        transport=httpx.MockTransport(handler),
    )
    search = ResolvedSearchOptions(active=True, mode=SearchMode.force, force=True)

    async def collect():
        return [item async for item in adapter.stream_events("hello", search)]

    events = asyncio.run(collect())
    assert events[0].kind == "search_complete"
    assert events[0].data["skipped"] is True


def test_empty_stream_is_not_reported_as_success():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="data: [DONE]\n\n")

    adapter = OpenCodeProvider(
        "unit-test-key",
        "deepseek-v4-pro",
        "opencode-go",
        transport=httpx.MockTransport(handler),
    )

    async def collect():
        return [item async for item in adapter.stream_events("hello")]

    with pytest.raises(Exception, match="no answer text"):
        asyncio.run(collect())


def test_chat_finish_failures_are_reported():
    def handler(request: httpx.Request) -> httpx.Response:
        event = {"choices": [{"delta": {}, "finish_reason": "length"}]}
        return httpx.Response(200, text=f"data: {json.dumps(event)}\n\n")

    adapter = OpenCodeProvider(
        "unit-test-key",
        "deepseek-v4-pro",
        "opencode-go",
        transport=httpx.MockTransport(handler),
    )

    async def collect():
        return [item async for item in adapter.stream_events("hello")]

    with pytest.raises(Exception, match="output limit"):
        asyncio.run(collect())


def test_upstream_error_does_not_expose_body():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, text="sensitive upstream detail")

    adapter = OpenCodeProvider(
        "unit-test-key",
        "grok-4.5",
        "opencode-go",
        transport=httpx.MockTransport(handler),
    )

    async def collect():
        return [item async for item in adapter.stream_events("hello")]

    with pytest.raises(Exception, match="status 400") as caught:
        asyncio.run(collect())
    assert "sensitive upstream detail" not in str(caught.value)


@pytest.mark.parametrize(
    "provider,model",
    [
        ("opencode-zen", "gpt-5.6-sol"),
        ("opencode-zen", "claude-sonnet-5"),
        ("opencode-zen", "gemini-3.6-flash"),
        ("opencode-go", "grok-4.5"),
    ],
)
def test_sse_error_events_fail_without_exposing_details(provider, model):
    def handler(request: httpx.Request) -> httpx.Response:
        body = 'data: {"type":"error","error":{"message":"sensitive detail"}}\n\n'
        return httpx.Response(200, text=body)

    adapter = OpenCodeProvider(
        "unit-test-key",
        model,
        provider,
        transport=httpx.MockTransport(handler),
    )

    async def collect():
        return [item async for item in adapter.stream_events("hello")]

    with pytest.raises(Exception, match="OpenCode stream failed") as caught:
        asyncio.run(collect())
    assert "sensitive detail" not in str(caught.value)


TERMINAL_CASES = [
    (
        "opencode-zen",
        "gpt-5.6-sol",
        {"type": "response.output_text.delta", "delta": "partial"},
        {"type": "response.failed", "response": {"error": {"message": "sensitive"}}},
        "response failed",
    ),
    (
        "opencode-zen",
        "gpt-5.6-sol",
        {"type": "response.output_text.delta", "delta": "partial"},
        {
            "type": "response.incomplete",
            "response": {"incomplete_details": {"reason": "max_output_tokens"}},
        },
        "output limit",
    ),
    (
        "opencode-zen",
        "claude-sonnet-5",
        {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "partial"}},
        {"type": "message_delta", "delta": {"stop_reason": "max_tokens"}},
        "output limit",
    ),
    (
        "opencode-zen",
        "gemini-3.6-flash",
        {"candidates": [{"content": {"parts": [{"text": "partial"}]}}]},
        {"candidates": [{"finishReason": "MAX_TOKENS"}]},
        "output limit",
    ),
    (
        "opencode-zen",
        "gemini-3.6-flash",
        {"candidates": [{"content": {"parts": [{"text": "partial"}]}}]},
        {"promptFeedback": {"blockReason": "SAFETY"}},
        "safety filtering",
    ),
    (
        "opencode-zen",
        "gemini-3.6-flash",
        {"candidates": [{"content": {"parts": [{"text": "partial"}]}}]},
        {"error": {"status": "RESOURCE_EXHAUSTED", "message": "sensitive"}},
        "resources were unavailable",
    ),
    (
        "opencode-go",
        "grok-4.5",
        {"choices": [{"delta": {"content": "partial"}}]},
        {"choices": [{"delta": {}, "finish_reason": "length"}]},
        "output limit",
    ),
    (
        "opencode-go",
        "grok-4.5",
        {"choices": [{"delta": {"content": "partial"}}]},
        {"choices": [{"delta": {}, "finish_reason": "content_filter"}]},
        "content filtering",
    ),
    (
        "opencode-go",
        "grok-4.5",
        {"choices": [{"delta": {"content": "partial"}}]},
        {"choices": [{"delta": {}, "finish_reason": "insufficient_system_resource"}]},
        "resources were unavailable",
    ),
]


@pytest.mark.parametrize("provider,model,text_event,terminal_event,error_match", TERMINAL_CASES)
def test_terminal_events_fail_after_partial_text(
    provider, model, text_event, terminal_event, error_match
):
    def handler(request: httpx.Request) -> httpx.Response:
        body = "".join(
            f"data: {json.dumps(event)}\n\n" for event in (text_event, terminal_event)
        )
        return httpx.Response(200, text=body)

    adapter = OpenCodeProvider(
        "unit-test-key",
        model,
        provider,
        transport=httpx.MockTransport(handler),
    )

    async def collect():
        events = []
        try:
            async for event in adapter.stream_events("hello"):
                events.append(event)
        except Exception as exc:
            return events, exc
        raise AssertionError("terminal event did not fail")

    events, error = asyncio.run(collect())
    assert [event.text for event in events] == ["partial"]
    assert error_match in str(error)
    assert "sensitive" not in str(error)


@pytest.mark.parametrize(
    "status_code,message",
    [
        (401, "API key is invalid"),
        (402, "billing or credits"),
        (403, "access, entitlement, or model availability"),
        (404, "model or endpoint is unavailable"),
        (429, "rate limit or quota"),
        (500, "service is temporarily unavailable"),
        (503, "service is temporarily unavailable"),
    ],
)
def test_http_status_mapping_is_specific_and_safe(status_code, message):
    error = OpenCodeProvider._status_error(status_code)
    assert message in str(error)
    if status_code == 403:
        assert "key" not in str(error).lower()


@pytest.mark.parametrize("provider,model,text_event,terminal_event,error_match", TERMINAL_CASES)
def test_terminal_failure_emits_error_not_done(
    monkeypatch, provider, model, text_event, terminal_event, error_match
):
    def handler(request: httpx.Request) -> httpx.Response:
        body = "".join(
            f"data: {json.dumps(event)}\n\n" for event in (text_event, terminal_event)
        )
        return httpx.Response(200, text=body)

    adapter = OpenCodeProvider(
        "unit-test-key",
        model,
        provider,
        transport=httpx.MockTransport(handler),
    )
    monkeypatch.setattr("services.stream_service.provider_for", lambda *args: adapter)

    async def run_side():
        queue = asyncio.Queue()
        await _stream_side(
            "left",
            "hello",
            provider,
            "unit-test-key",
            model,
            {},
            ResolvedSearchOptions(active=False),
            queue,
        )
        queued = []
        while not queue.empty():
            queued.append(queue.get_nowait())
        return "".join(queued)

    output = asyncio.run(run_side())
    assert "event: token" in output
    assert "event: error" in output
    assert "event: done" not in output
