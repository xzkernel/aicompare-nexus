import asyncio
import logging
import os
import time
from collections import defaultdict
from typing import Dict, Tuple

from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response

from utils.client_ip import get_client_ip
from security import redact_sensitive_data

# Configure logging for middleware
logger = logging.getLogger(__name__)

# Health paths and methods that should never be rate limited
EXCLUDED_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}
EXCLUDED_METHODS = {"HEAD", "OPTIONS"}
MAX_REQUEST_BODY_BYTES = int(os.getenv("MAX_REQUEST_BODY_BYTES", str(512 * 1024)))


class RequestSizeLimitMiddleware:
    """Bound request bodies before FastAPI buffers JSON, including chunked uploads."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("method") in EXCLUDED_METHODS:
            await self.app(scope, receive, send)
            return

        raw_length = dict(scope.get("headers", [])).get(b"content-length")
        if raw_length:
            try:
                if int(raw_length) > MAX_REQUEST_BODY_BYTES:
                    await JSONResponse(
                        status_code=413,
                        content={"detail": "Request body is too large"},
                    )(scope, receive, send)
                    return
            except ValueError:
                await JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid Content-Length header"},
                )(scope, receive, send)
                return

        chunks: list[bytes] = []
        total = 0
        more_body = True
        while more_body:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            if message["type"] != "http.request":
                continue
            body = message.get("body", b"")
            total += len(body)
            if total > MAX_REQUEST_BODY_BYTES:
                await JSONResponse(
                    status_code=413,
                    content={"detail": "Request body is too large"},
                )(scope, receive, send)
                return
            chunks.append(body)
            more_body = message.get("more_body", False)

        body = b"".join(chunks)
        delivered = False

        async def replay_receive():
            nonlocal delivered
            if delivered:
                return await receive()
            delivered = True
            return {"type": "http.request", "body": body, "more_body": False}

        await self.app(scope, replay_receive, send)

class RateLimiter:
    def __init__(self, requests_per_minute: int = 60, requests_per_hour: int = 1000):
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.minute_requests: Dict[str, list] = defaultdict(list)
        self.hour_requests: Dict[str, list] = defaultdict(list)
        self.lock = asyncio.Lock()
        self._last_gc = time.monotonic()
    
    async def is_allowed(self, client_ip: str) -> Tuple[bool, Dict[str, int]]:
        """Check if request is allowed and return remaining limits"""
        async with self.lock:
            current_time = time.monotonic()
            
            # Clean old entries for current IP
            self._cleanup_old_requests(client_ip, current_time)
            
            # Periodic GC: remove stale IPs with no remaining timestamps
            self._sweep_idle_ips(current_time)
            
            # Check minute limit
            minute_count = len(self.minute_requests[client_ip])
            if minute_count >= self.requests_per_minute:
                logger.warning(f"Rate limit exceeded for {client_ip}: {minute_count}/{self.requests_per_minute} per minute")
                return False, {
                    "minute_remaining": 0,
                    "hour_remaining": max(0, self.requests_per_hour - len(self.hour_requests[client_ip]))
                }
            
            # Check hour limit
            hour_count = len(self.hour_requests[client_ip])
            if hour_count >= self.requests_per_hour:
                logger.warning(f"Rate limit exceeded for {client_ip}: {hour_count}/{self.requests_per_hour} per hour")
                return False, {
                    "minute_remaining": max(0, self.requests_per_minute - minute_count),
                    "hour_remaining": 0
                }
            
            # Add current request
            self.minute_requests[client_ip].append(current_time)
            self.hour_requests[client_ip].append(current_time)
            
            logger.debug(f"Rate limit check passed for {client_ip}: {minute_count + 1}/{self.requests_per_minute} per minute")
            
            return True, {
                "minute_remaining": self.requests_per_minute - minute_count - 1,
                "hour_remaining": self.requests_per_hour - hour_count - 1
            }
    
    def _cleanup_old_requests(self, client_ip: str, current_time: float):
        """Remove old request timestamps"""
        self.minute_requests[client_ip] = [
            req_time for req_time in self.minute_requests[client_ip]
            if current_time - req_time < 60
        ]
        self.hour_requests[client_ip] = [
            req_time for req_time in self.hour_requests[client_ip]
            if current_time - req_time < 3600
        ]
    
    def _sweep_idle_ips(self, current_time: float):
        """Expire timestamps for every identity and remove empty buckets."""
        if current_time - self._last_gc < 60:
            return
        self._last_gc = current_time
        for d, window in ((self.minute_requests, 60), (self.hour_requests, 3600)):
            for ip, times in list(d.items()):
                d[ip] = [timestamp for timestamp in times if current_time - timestamp < window]
            stale = [ip for ip, times in d.items() if not times]
            for ip in stale:
                del d[ip]

# Global rate limiter instance
rate_limiter = RateLimiter(
    requests_per_minute=int(os.getenv("RATE_LIMIT_PER_MINUTE", "60")),
    requests_per_hour=int(os.getenv("RATE_LIMIT_PER_HOUR", "1000"))
)

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Fail-open ASGI middleware for rate limiting that never crashes the app"""
    
    async def dispatch(self, request: StarletteRequest, call_next):
        if request.url.path in EXCLUDED_PATHS or request.method in EXCLUDED_METHODS:
            return await call_next(request)

        try:
            ip = get_client_ip(request)
            is_allowed, limits = await rate_limiter.is_allowed(ip)
        except Exception as e:
            logger.error("Rate limit middleware error: %s", redact_sensitive_data(str(e)))
            return await call_next(request)

        if not is_allowed:
            logger.warning(f"Rate limit exceeded for {ip}")
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded"},
                headers={
                    "Retry-After": "60",
                    "X-RateLimit-Limit-Minute": str(rate_limiter.requests_per_minute),
                    "X-RateLimit-Limit-Hour": str(rate_limiter.requests_per_hour),
                    "X-RateLimit-Remaining-Minute": str(limits["minute_remaining"]),
                    "X-RateLimit-Remaining-Hour": str(limits["hour_remaining"]),
                }
            )

        # Downstream exceptions must propagate; retrying call_next can execute side effects twice.
        response = await call_next(request)
        response.headers["X-RateLimit-Limit-Minute"] = str(rate_limiter.requests_per_minute)
        response.headers["X-RateLimit-Limit-Hour"] = str(rate_limiter.requests_per_hour)
        response.headers["X-RateLimit-Remaining-Minute"] = str(limits["minute_remaining"])
        response.headers["X-RateLimit-Remaining-Hour"] = str(limits["hour_remaining"])
        return response
