"""
Security middleware and utilities for ModelWise backend.

Responsibilities:
- Add security response headers (CSP, X-Frame-Options, etc.)
- Provide sanitization and redaction helpers

Rate limiting is handled by RateLimitMiddleware in middleware.py.
CORS is handled by FastAPI's built-in CORSMiddleware in main.py.
"""

import asyncio
import codecs
import ipaddress
import logging
import re
import socket
from collections.abc import AsyncIterator
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from threading import Lock
from typing import Iterable, Optional
from urllib.parse import unquote, urlsplit, urlunsplit

import httpcore
import httpx
from httpcore._backends.auto import AutoBackend
from starlette.datastructures import MutableHeaders

logger = logging.getLogger(__name__)


class SecurityMiddleware:
    """Pure ASGI middleware that adds security headers to every HTTP response."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_security_headers(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
                headers["X-Frame-Options"] = "DENY"
                headers["X-Content-Type-Options"] = "nosniff"
                headers["Referrer-Policy"] = "no-referrer"
                headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
                if "Cache-Control" not in headers:
                    headers["Cache-Control"] = "no-store"
            await send(message)

        await self.app(scope, receive, send_with_security_headers)


def classify_provider_error(exc: Exception) -> str:
    """Map provider exceptions to safe client messages (LLM06 — no key/path leakage)."""
    raw = str(exc).lower()
    if any(k in raw for k in ("api key", "invalid key", "unauthorized", "401")):
        return "Provider authentication failed — check your API key in Settings."
    if any(k in raw for k in ("rate limit", "429", "quota")):
        return "Provider rate limit reached. Try again in a moment."
    if any(k in raw for k in ("timeout", "timed out")):
        return "Provider request timed out."
    if any(k in raw for k in ("connection", "network", "unreachable")):
        return "Could not reach provider — check your network connection."
    return "Provider request failed."


_ALLOWED_OUTBOUND_SCHEMES = {"https"}
_ALLOWED_KEY_HEADERS = {
    "authorization": "Authorization",
    "x-api-key": "X-API-Key",
    "api-key": "api-key",
}
MAX_UPSTREAM_RESPONSE_BYTES = 4 * 1024 * 1024
_DNS_EXECUTOR: ThreadPoolExecutor | None = None
_DNS_EXECUTOR_LOCK = Lock()


def startup_dns_executor() -> None:
    global _DNS_EXECUTOR
    with _DNS_EXECUTOR_LOCK:
        if _DNS_EXECUTOR is None:
            _DNS_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix="outbound-dns")


async def shutdown_dns_executor() -> None:
    global _DNS_EXECUTOR
    with _DNS_EXECUTOR_LOCK:
        executor, _DNS_EXECUTOR = _DNS_EXECUTOR, None
    if executor is not None:
        await asyncio.to_thread(executor.shutdown, True, cancel_futures=True)


class UpstreamResponseTooLarge(Exception):
    """Raised when an upstream response exceeds the streaming safety limit."""


def _is_public_address(value: str) -> bool:
    address = ipaddress.ip_address(value)
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
        return _is_public_address(str(address.ipv4_mapped))
    return address.is_global


def _validate_resolved_addresses(records) -> tuple[str, ...]:
    addresses = tuple(dict.fromkeys(record[4][0] for record in records))
    if not addresses:
        raise ValueError("Outbound URL hostname has no addresses")
    if any(not _is_public_address(address) for address in addresses):
        raise ValueError("Outbound URL targets a private or reserved address")
    return addresses


async def _resolve_public_addresses(
    hostname: str,
    port: int,
    timeout: float | None,
) -> tuple[str, ...]:
    """Resolve every address and reject hosts with any non-public result.

    The transport connects to one of the returned numeric addresses, so DNS is
    not queried again between validation and the TCP connection.
    """
    try:
        startup_dns_executor()
        loop = asyncio.get_running_loop()
        records = await asyncio.wait_for(
            loop.run_in_executor(
                _DNS_EXECUTOR,
                partial(
                    socket.getaddrinfo,
                    hostname,
                    port,
                    type=socket.SOCK_STREAM,
                ),
            ),
            timeout=timeout,
        )
    except asyncio.TimeoutError as exc:
        raise httpcore.ConnectTimeout("Outbound URL DNS resolution timed out") from exc
    except socket.gaierror as exc:
        raise ValueError("Outbound URL hostname could not be resolved") from exc

    return _validate_resolved_addresses(records)


class _PublicNetworkBackend(httpcore.AsyncNetworkBackend):
    """Resolve, validate, and pin public IPs at TCP connection time."""

    def __init__(self, backend: httpcore.AsyncNetworkBackend | None = None):
        self._backend = backend or AutoBackend()

    async def connect_tcp(
        self,
        host: str,
        port: int,
        timeout: float | None = None,
        local_address: str | None = None,
        socket_options: Optional[Iterable[tuple]] = None,
    ) -> httpcore.AsyncNetworkStream:
        loop = asyncio.get_running_loop()
        deadline = None if timeout is None else loop.time() + timeout
        addresses = await _resolve_public_addresses(host, port, timeout)
        last_error: Exception | None = None

        for index, address in enumerate(addresses):
            remaining = None
            if deadline is not None:
                remaining = max(0.0, deadline - loop.time())
                remaining /= len(addresses) - index
            try:
                return await self._backend.connect_tcp(
                    address,
                    port,
                    timeout=remaining,
                    local_address=local_address,
                    socket_options=socket_options,
                )
            except (httpcore.ConnectError, httpcore.ConnectTimeout) as exc:
                last_error = exc

        assert last_error is not None
        raise last_error

    async def connect_unix_socket(
        self,
        path: str,
        timeout: float | None = None,
        socket_options: Optional[Iterable[tuple]] = None,
    ) -> httpcore.AsyncNetworkStream:
        raise httpcore.ConnectError("Unix socket connections are not allowed")

    async def sleep(self, seconds: float) -> None:
        await self._backend.sleep(seconds)


class _PublicIPTransport(httpx.AsyncHTTPTransport):
    """HTTPX transport whose connection pool pins validated public IPs."""

    def __init__(self):
        super().__init__(trust_env=False)
        self._pool._network_backend = _PublicNetworkBackend()


def validate_outbound_url(url: Optional[str]) -> str:
    """Validate a user-supplied outbound URL before connecting.

    Redirects are disabled on every outbound client. The default outbound
    transport repeats DNS validation when opening the socket and connects to
    the validated numeric IP to prevent DNS rebinding between check and use.
    """
    if not url or not isinstance(url, str):
        raise ValueError("Outbound URL is required")

    normalized = url.strip()
    if len(normalized) > 512:
        raise ValueError("Outbound URL is too long")
    if any(ord(char) < 33 for char in normalized) or "\\" in normalized:
        raise ValueError("Outbound URL is malformed")

    try:
        parsed = urlsplit(normalized)
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
    except ValueError as exc:
        raise ValueError("Outbound URL is malformed") from exc

    if parsed.scheme.lower() not in _ALLOWED_OUTBOUND_SCHEMES:
        raise ValueError("Outbound URL must use HTTPS")
    if parsed.username or parsed.password:
        raise ValueError("Outbound URL must not contain credentials")
    if not parsed.netloc:
        raise ValueError("Outbound URL is malformed")

    hostname = (parsed.hostname or "").lower().rstrip(".")
    if not hostname or hostname == "localhost":
        raise ValueError("Outbound URL targets a private or reserved address")

    try:
        literal_address = ipaddress.ip_address(hostname)
    except ValueError:
        pass
    else:
        if not _is_public_address(str(literal_address)):
            raise ValueError("Outbound URL targets a private or reserved address")

    path = parsed.path.rstrip("/") or ""
    return urlunsplit((parsed.scheme.lower(), parsed.netloc, path, parsed.query, parsed.fragment))


def validate_relay_base_url(url: Optional[str]) -> str:
    """Validate a base URL that will have an API route appended."""
    normalized = validate_outbound_url(url)
    parsed = urlsplit(normalized)
    if parsed.query or parsed.fragment:
        raise ValueError("Outbound base URL must not contain a query or fragment")
    decoded_path = unquote(parsed.path)
    if any(part in {".", ".."} for part in decoded_path.split("/")):
        raise ValueError("Outbound base URL path is malformed")
    if decoded_path.lower().endswith(("/chat/completions", "/responses", "/messages")):
        raise ValueError("Outbound base URL must not include an API operation path")
    return normalized


def normalize_outbound_key_header(value: Optional[str]) -> str:
    """Return a canonical API-key header from the explicit allowlist."""
    if not value or not isinstance(value, str):
        return "Authorization"
    normalized = value.strip().lower()
    if not re.fullmatch(r"[a-z0-9-]{1,64}", normalized):
        raise ValueError("Outbound API key header is invalid")
    try:
        return _ALLOWED_KEY_HEADERS[normalized]
    except KeyError as exc:
        raise ValueError("Outbound API key header is not allowed") from exc


def outbound_client(
    timeout_seconds: float,
    transport: httpx.AsyncBaseTransport | None = None,
) -> httpx.AsyncClient:
    """Create a bounded, proxy-free client that never follows redirects."""
    return httpx.AsyncClient(
        timeout=httpx.Timeout(timeout_seconds, connect=min(10.0, timeout_seconds)),
        follow_redirects=False,
        trust_env=False,
        transport=transport or _PublicIPTransport(),
        headers={"Accept-Encoding": "identity"},
    )


def _reject_compressed_response(response: httpx.Response) -> None:
    encoding = response.headers.get("Content-Encoding", "").strip().lower()
    if encoding and encoding != "identity":
        raise UpstreamResponseTooLarge("Compressed upstream responses are not allowed")


async def _iter_raw_response(response: httpx.Response) -> AsyncIterator[bytes]:
    if response.is_stream_consumed:
        yield response.content
        return
    async for chunk in response.aiter_raw():
        yield chunk


async def iter_limited_response_lines(
    response: httpx.Response,
    limit: int = MAX_UPSTREAM_RESPONSE_BYTES,
) -> AsyncIterator[str]:
    """Yield decoded response lines while enforcing a total response limit."""
    _reject_compressed_response(response)
    decoder = codecs.getincrementaldecoder("utf-8")("replace")
    buffered = ""
    received = 0

    async for chunk in _iter_raw_response(response):
        received += len(chunk)
        if received > limit:
            raise UpstreamResponseTooLarge("Upstream response exceeded the size limit")
        buffered += decoder.decode(chunk)
        while "\n" in buffered:
            line, buffered = buffered.split("\n", 1)
            yield line.rstrip("\r")

    buffered += decoder.decode(b"", final=True)
    if buffered:
        yield buffered.rstrip("\r")


async def read_limited_response(
    response: httpx.Response,
    limit: int = MAX_UPSTREAM_RESPONSE_BYTES,
) -> bytes:
    """Read an upstream body only up to the configured safety limit."""
    _reject_compressed_response(response)
    chunks: list[bytes] = []
    received = 0
    async for chunk in _iter_raw_response(response):
        received += len(chunk)
        if received > limit:
            raise UpstreamResponseTooLarge("Upstream response exceeded the size limit")
        chunks.append(chunk)
    return b"".join(chunks)


def redact_sensitive_data(text: str) -> str:
    """Redact sensitive data from logs and error messages."""
    if not text:
        return text
    
    # Redact API keys (handles hyphenated formats: sk-proj-..., sk-or-v1-..., sk-ant-api03-...)
    text = re.sub(r'sk-[a-zA-Z0-9\-_]{20,}', 'sk-***REDACTED***', text)
    text = re.sub(r'AIza[a-zA-Z0-9\-_]{20,}', 'AIza***REDACTED***', text)

    # Redact credentials commonly echoed in URLs, JSON errors, and headers.
    text = re.sub(
        r'(?i)([?&](?:api[_-]?key|key|token|access[_-]?token|authorization)=)[^&#\s]+',
        r'\1***REDACTED***',
        text,
    )
    text = re.sub(
        r'(?im)^\s*(authorization|x-api-key|api-key)\s*:\s*.*$',
        r'\1: ***REDACTED***',
        text,
    )
    text = re.sub(r'(?i)Bearer\s+[^\s,;]+', 'Bearer ***REDACTED***', text)
    text = re.sub(
        r'(?i)(["\']?(?:api[_-]?key|authorization|token|secret|password)["\']?\s*[:=]\s*["\']?)[^,\s"\'}]+',
        r'\1***REDACTED***',
        text,
    )
    
    return text


def log_provider_error(context: str, exc: Exception) -> None:
    """Log a redacted failure without upstream response bodies."""
    detail = redact_sensitive_data(str(exc))
    logger.error("%s: %s", context, detail)
