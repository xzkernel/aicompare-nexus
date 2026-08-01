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
from typing import Iterable, List, Optional

import httpcore
import httpx
from fastapi import Request, Response
from httpcore._backends.auto import AutoBackend
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class SecurityMiddleware(BaseHTTPMiddleware):
    """Adds security response headers to every API response."""

    def __init__(self, app, allowed_origins: List[str] = None):
        super().__init__(app)
        self.allowed_origins = allowed_origins or []

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        self._add_security_headers(response)
        return response

    def _add_security_headers(self, response: Response):
        """Add security headers to every response.

        CSP note: the API backend serves JSON/SSE only, never HTML.
        The frontend (Vite/React SPA) has its own CSP via vite.config or nginx.
        Here we provide defence-in-depth headers for the API surface.
        """
        csp = (
            "default-src 'none'; "
            "frame-ancestors 'none'"
        )

        response.headers["Content-Security-Policy"] = csp
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        # Instruct browsers not to cache API responses containing secrets
        response.headers.setdefault("Cache-Control", "no-store")


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
_DNS_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix="outbound-dns")


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

    normalized = url.strip().rstrip("/")
    if len(normalized) > 512:
        raise ValueError("Outbound URL is too long")

    try:
        from urllib.parse import urlparse

        parsed = urlparse(normalized)
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
    except ValueError as exc:
        raise ValueError("Outbound URL is malformed") from exc

    if parsed.scheme.lower() not in _ALLOWED_OUTBOUND_SCHEMES:
        raise ValueError("Outbound URL must use HTTPS")
    if parsed.username or parsed.password:
        raise ValueError("Outbound URL must not contain credentials")

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

    return normalized


def validate_relay_base_url(url: Optional[str]) -> str:
    """Backward-compatible name for outbound SSRF validation."""
    return validate_outbound_url(url)


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


def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS and injection attacks."""
    if not text:
        return ""
    
    # Replace & first to avoid double-encoding already-escaped entities
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;").replace(">", "&gt;")
    text = text.replace('"', "&quot;").replace("'", "&#x27;")
    
    # Remove null bytes
    text = text.replace("\x00", "")
    
    # Limit length
    if len(text) > 10000:  # 10KB limit
        text = text[:10000]
    
    return text

def validate_api_key_format(api_key: str, provider: str) -> bool:
    """Validate API key format for different providers."""
    if not api_key or not isinstance(api_key, str):
        return False
    
    api_key = api_key.strip()
    
    if provider.lower() == "openai":
        return api_key.startswith("sk-") and len(api_key) > 20
    elif provider.lower() == "gemini":
        return api_key.startswith("AIza") and len(api_key) > 20
    else:
        return False

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


def log_provider_error(context: str, exc: Exception, upstream_body: bytes | str | None = None) -> None:
    """Log only bounded, redacted upstream failures."""
    detail = redact_sensitive_data(str(exc))
    if upstream_body:
        if isinstance(upstream_body, bytes):
            upstream_body = upstream_body.decode("utf-8", errors="replace")
        detail = f"{detail}; upstream={redact_sensitive_data(upstream_body[:500])}"
    logger.error("%s: %s", context, detail)

class InputValidator:
    """Input validation utilities."""
    
    @staticmethod
    def validate_prompt(prompt: str) -> tuple[bool, str]:
        """Validate prompt input."""
        if not prompt or not isinstance(prompt, str):
            return False, "Prompt is required"
        
        prompt = prompt.strip()
        
        if len(prompt) < 1:
            return False, "Prompt cannot be empty"
        
        if len(prompt) > 10000:
            return False, "Prompt is too long (max 10,000 characters)"
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'<script[^>]*>',
            r'javascript:',
            r'data:text/html',
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, prompt, re.IGNORECASE):
                return False, "Prompt contains potentially unsafe content"
        
        return True, ""
    
    @staticmethod
    def validate_model_name(model: str) -> tuple[bool, str]:
        """Validate model name."""
        if not model or not isinstance(model, str):
            return False, "Model name is required"
        
        model = model.strip()
        
        # Allow only alphanumeric, hyphens, underscores, and dots
        if not re.match(r'^[a-zA-Z0-9\-_.]+$', model):
            return False, "Invalid model name format"
        
        if len(model) > 100:
            return False, "Model name is too long"
        
        return True, ""
