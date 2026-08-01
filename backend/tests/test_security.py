import asyncio
import socket
import time

import httpx
import pytest

import security
from security import (
    MAX_UPSTREAM_RESPONSE_BYTES,
    iter_limited_response_lines,
    normalize_outbound_key_header,
    outbound_client,
    redact_sensitive_data,
    validate_outbound_url,
)
from utils.byok import parse_byok_headers
from main import create_app


def _addresses(*values: str):
    return [
        (socket.AF_INET6 if ":" in value else socket.AF_INET, socket.SOCK_STREAM, 6, "", (value, 443))
        for value in values
    ]


class _AsyncContent(httpx.AsyncByteStream):
    def __init__(self, content: bytes):
        self.content = content

    async def __aiter__(self):
        yield self.content


def test_outbound_url_validation_does_not_block_on_dns(monkeypatch):
    def unexpected_resolution(*_args, **_kwargs):
        raise AssertionError("DNS must be resolved asynchronously by the transport")

    monkeypatch.setattr(security.socket, "getaddrinfo", unexpected_resolution)

    assert validate_outbound_url("https://models.example.test/v1/") == "https://models.example.test/v1"


@pytest.mark.parametrize("address", ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.0.1", "169.254.0.1", "::1", "fd00::1"])
def test_network_backend_rejects_private_dns_results(monkeypatch, address):
    monkeypatch.setattr(security.socket, "getaddrinfo", lambda *_args, **_kwargs: _addresses(address))

    async def connect():
        backend = security._PublicNetworkBackend()
        await backend.connect_tcp("models.example.test", 443, timeout=1)

    with pytest.raises(ValueError, match="private or reserved"):
        asyncio.run(connect())


def test_network_backend_rejects_mixed_dns_answers(monkeypatch):
    monkeypatch.setattr(
        security.socket,
        "getaddrinfo",
        lambda *_args, **_kwargs: _addresses("93.184.216.34", "127.0.0.1"),
    )

    async def connect():
        backend = security._PublicNetworkBackend()
        await backend.connect_tcp("models.example.test", 443, timeout=1)

    with pytest.raises(ValueError, match="private or reserved"):
        asyncio.run(connect())


@pytest.mark.parametrize("url", ["http://models.example.test", "https://127.0.0.1", "https://[::1]"])
def test_outbound_url_rejects_insecure_or_private_literals(url):
    with pytest.raises(ValueError):
        validate_outbound_url(url)


def test_network_backend_connects_to_validated_numeric_ip(monkeypatch):
    class RecordingBackend:
        def __init__(self):
            self.hosts = []

        async def connect_tcp(self, host, _port, **_kwargs):
            self.hosts.append(host)
            return object()

    recording_backend = RecordingBackend()
    monkeypatch.setattr(security.socket, "getaddrinfo", lambda *_args, **_kwargs: _addresses("93.184.216.34"))

    async def connect():
        backend = security._PublicNetworkBackend(recording_backend)
        await backend.connect_tcp("models.example.test", 443, timeout=1)

    asyncio.run(connect())
    assert recording_backend.hosts == ["93.184.216.34"]


def test_network_backend_blocks_dns_rebinding_before_connect(monkeypatch):
    class RecordingBackend:
        def __init__(self):
            self.hosts = []

        async def connect_tcp(self, host, _port, **_kwargs):
            self.hosts.append(host)
            return object()

    recording_backend = RecordingBackend()
    monkeypatch.setattr(security.socket, "getaddrinfo", lambda *_args, **_kwargs: _addresses("127.0.0.1"))

    assert validate_outbound_url("https://models.example.test") == "https://models.example.test"

    async def connect():
        backend = security._PublicNetworkBackend(recording_backend)
        await backend.connect_tcp("models.example.test", 443, timeout=1)

    with pytest.raises(ValueError, match="private or reserved"):
        asyncio.run(connect())
    assert recording_backend.hosts == []


def test_network_backend_bounds_dns_resolution_time(monkeypatch):
    def slow_resolution(*_args, **_kwargs):
        time.sleep(0.05)
        return _addresses("93.184.216.34")

    monkeypatch.setattr(security.socket, "getaddrinfo", slow_resolution)

    async def connect():
        backend = security._PublicNetworkBackend()
        await backend.connect_tcp("models.example.test", 443, timeout=0.001)

    with pytest.raises(security.httpcore.ConnectTimeout, match="DNS resolution timed out"):
        asyncio.run(connect())


@pytest.mark.parametrize("value, expected", [(" Authorization ", "Authorization"), ("X-API-Key", "X-API-Key"), ("api-key", "api-key")])
def test_outbound_key_header_allowlist(value, expected):
    assert normalize_outbound_key_header(value) == expected


@pytest.mark.parametrize("value", ["Host", "Cookie", "X-Forwarded-For", "Proxy-Authorization", "arbitrary-header"])
def test_outbound_key_header_rejects_unsafe_names(value):
    with pytest.raises(ValueError, match="not allowed"):
        normalize_outbound_key_header(value)


def test_redaction_removes_credentials_from_logs():
    value = "unit-test-secret-value"
    redacted = redact_sensitive_data(
        f"Authorization: Bearer {value}\nhttps://example.test/?api_key={value}"
    )

    assert value not in redacted
    assert "REDACTED" in redacted


def test_outbound_client_disables_redirects_and_environment_proxies():
    async def check_client():
        async with outbound_client(5) as client:
            assert client.follow_redirects is False
            assert client._trust_env is False
            assert client.headers["Accept-Encoding"] == "identity"

    asyncio.run(check_client())


def test_streaming_response_size_is_limited():
    async def read_lines():
        response = httpx.Response(
            200,
            stream=_AsyncContent(b"x" * (MAX_UPSTREAM_RESPONSE_BYTES + 1)),
        )
        return [line async for line in iter_limited_response_lines(response)]

    with pytest.raises(security.UpstreamResponseTooLarge):
        asyncio.run(read_lines())


def test_compressed_upstream_response_is_rejected_before_decoding():
    async def read_lines():
        response = httpx.Response(
            200,
            headers={"Content-Encoding": "gzip"},
            stream=_AsyncContent(b"compressed-payload"),
        )
        return [line async for line in iter_limited_response_lines(response)]

    with pytest.raises(security.UpstreamResponseTooLarge, match="Compressed"):
        asyncio.run(read_lines())


def test_byok_headers_have_bounded_sizes():
    with pytest.raises(ValueError, match="OpenAI API key is too long"):
        parse_byok_headers(x_openai_api_key="x" * 4097)


def test_request_size_limit_rejects_chunked_payloads():
    async def request():
        async def payload():
            yield b"x" * (512 * 1024 + 1)

        app = create_app()
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.post("/api/v1/stream", content=payload())

    response = asyncio.run(request())
    assert response.status_code == 413


def test_request_size_limit_allows_schema_maximum_unicode_prompt():
    async def request():
        app = create_app()
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.post(
                "/api/v1/stream",
                json={
                    "prompt": "\U0001f600" * 32_000,
                    "leftModel": "model-left",
                    "rightModel": "model-right",
                },
            )

    response = asyncio.run(request())
    assert response.status_code != 413
