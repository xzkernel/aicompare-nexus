"""
Security middleware and utilities for ModelWise backend.

Responsibilities:
- Add security response headers (CSP, X-Frame-Options, etc.)
- Provide sanitization and redaction helpers

Rate limiting is handled by RateLimitMiddleware in middleware.py.
CORS is handled by FastAPI's built-in CORSMiddleware in main.py.
"""

import re
from typing import List, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import logging

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


_PRIVATE_RANGES = re.compile(
    r"^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|"
    r"169\.254\.|::1|fc[0-9a-f][0-9a-f]:|fd[0-9a-f][0-9a-f]:)",
    re.IGNORECASE,
)

_ALLOWED_RELAY_SCHEMES = {"https"}


def validate_relay_base_url(url: Optional[str]) -> str:
    """Validate a user-supplied relay/custom base URL against SSRF risks.

    Rules (OWASP A10 / SSRF):
    - Must use https scheme.
    - Must not target private/loopback/link-local addresses.
    - Must not exceed 512 characters.

    Returns the sanitised URL (trailing slash stripped) or raises ValueError.
    """
    if not url or not isinstance(url, str):
        raise ValueError("Relay base URL is required")

    url = url.strip().rstrip("/")

    if len(url) > 512:
        raise ValueError("Relay base URL is too long")

    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
    except Exception:
        raise ValueError("Relay base URL is malformed")

    if parsed.scheme not in _ALLOWED_RELAY_SCHEMES:
        raise ValueError(
            f"Relay base URL must use HTTPS (got '{parsed.scheme or 'none'}')"
        )

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise ValueError("Relay base URL has no hostname")

    if _PRIVATE_RANGES.match(hostname):
        raise ValueError("Relay base URL targets a private/reserved address")

    return url


def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS and injection attacks."""
    if not text:
        return ""
    
    # Remove or escape potentially dangerous characters
    text = text.replace("<", "&lt;").replace(">", "&gt;")
    text = text.replace('"', "&quot;").replace("'", "&#x27;")
    text = text.replace("&", "&amp;")
    
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
    
    # Redact API keys
    text = re.sub(r'sk-[a-zA-Z0-9]{20,}', 'sk-***REDACTED***', text)
    text = re.sub(r'AIza[a-zA-Z0-9]{20,}', 'AIza***REDACTED***', text)
    
    # Redact other sensitive patterns
    text = re.sub(r'Bearer\s+[a-zA-Z0-9\-_]+', 'Bearer ***REDACTED***', text)
    
    return text

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

