import asyncio
import logging
import os
import time
from collections import defaultdict
from typing import Dict, Tuple

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response

from utils.client_ip import get_client_ip

# Configure logging for middleware
logger = logging.getLogger(__name__)

# Health paths and methods that should never be rate limited
EXCLUDED_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}
EXCLUDED_METHODS = {"HEAD", "OPTIONS"}

class RateLimiter:
    def __init__(self, requests_per_minute: int = 60, requests_per_hour: int = 1000):
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.minute_requests: Dict[str, list] = defaultdict(list)
        self.hour_requests: Dict[str, list] = defaultdict(list)
        self.lock = asyncio.Lock()
    
    async def is_allowed(self, client_ip: str) -> Tuple[bool, Dict[str, int]]:
        """Check if request is allowed and return remaining limits"""
        async with self.lock:
            current_time = time.time()
            
            # Clean old entries
            self._cleanup_old_requests(client_ip, current_time)
            
            # Check minute limit
            minute_count = len(self.minute_requests[client_ip])
            if minute_count >= self.requests_per_minute:
                # Log rate limit exceeded
                logger.warning(f"Rate limit exceeded for {client_ip}: {minute_count}/{self.requests_per_minute} per minute")
                return False, {
                    "minute_remaining": 0,
                    "hour_remaining": max(0, self.requests_per_hour - len(self.hour_requests[client_ip]))
                }
            
            # Check hour limit
            hour_count = len(self.hour_requests[client_ip])
            if hour_count >= self.requests_per_hour:
                # Log rate limit exceeded
                logger.warning(f"Rate limit exceeded for {client_ip}: {hour_count}/{self.requests_per_hour} per hour")
                return False, {
                    "minute_remaining": max(0, self.requests_per_minute - minute_count),
                    "hour_remaining": 0
                }
            
            # Add current request
            self.minute_requests[client_ip].append(current_time)
            self.hour_requests[client_ip].append(current_time)
            
            # Log successful rate limit check
            logger.debug(f"Rate limit check passed for {client_ip}: {minute_count + 1}/{self.requests_per_minute} per minute")
            
            return True, {
                "minute_remaining": self.requests_per_minute - minute_count - 1,
                "hour_remaining": self.requests_per_hour - hour_count - 1
            }
    
    def _cleanup_old_requests(self, client_ip: str, current_time: float):
        """Remove old request timestamps"""
        # Remove requests older than 1 minute
        self.minute_requests[client_ip] = [
            req_time for req_time in self.minute_requests[client_ip]
            if current_time - req_time < 60
        ]
        
        # Remove requests older than 1 hour
        self.hour_requests[client_ip] = [
            req_time for req_time in self.hour_requests[client_ip]
            if current_time - req_time < 3600
        ]

# Global rate limiter instance
rate_limiter = RateLimiter(
    requests_per_minute=int(os.getenv("RATE_LIMIT_PER_MINUTE", "60")),
    requests_per_hour=int(os.getenv("RATE_LIMIT_PER_HOUR", "1000"))
)

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Fail-open ASGI middleware for rate limiting that never crashes the app"""
    
    async def dispatch(self, request: StarletteRequest, call_next):
        try:
            # Skip excluded paths and methods
            if request.url.path in EXCLUDED_PATHS or request.method in EXCLUDED_METHODS:
                logger.debug(f"Skipping rate limit for {request.method} {request.url.path}")
                return await call_next(request)

            # Get client IP (handle proxy headers and Windows edge cases)
            ip = get_client_ip(request)
            
            logger.debug(f"Rate limiting IP: {ip}")
            
            # Check rate limit
            is_allowed, limits = await rate_limiter.is_allowed(ip)
            
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
                        "X-RateLimit-Remaining-Hour": str(limits["hour_remaining"])
                    }
                )
            
            # Skip body handling for now to avoid middleware issues
            # The request body will be handled normally by FastAPI
            
            # Process request and add rate limit headers to response
            response = await call_next(request)
            response.headers["X-RateLimit-Limit-Minute"] = str(rate_limiter.requests_per_minute)
            response.headers["X-RateLimit-Limit-Hour"] = str(rate_limiter.requests_per_hour)
            response.headers["X-RateLimit-Remaining-Minute"] = str(limits["minute_remaining"])
            response.headers["X-RateLimit-Remaining-Hour"] = str(limits["hour_remaining"])
            
            return response
            
        except Exception as e:
            # Never crash the stack from within middleware
            # Log the error and allow request to proceed rather than 500-ing
            logger.error(f"Rate limit middleware error: {e}")
            
            # Fallback: allow request to proceed
            try:
                return await call_next(request)
            except Exception as fallback_error:
                logger.error(f"Fallback call_next also failed: {fallback_error}")
                # Last resort: return a generic error response
                return JSONResponse(
                    status_code=500,
                    content={"detail": "Internal server error in rate limiting"}
                )

# Legacy function-based middleware for backward compatibility
async def rate_limit_middleware(request: Request, call_next):
    """Legacy rate limiting middleware for FastAPI that never crashes the app"""
    try:
        # Skip excluded paths and methods
        if request.url.path in EXCLUDED_PATHS or request.method in EXCLUDED_METHODS:
            logger.debug(f"Skipping rate limit for {request.method} {request.url.path}")
            return await call_next(request)

        # Get client IP (handle proxy headers and Windows edge cases)
        ip = get_client_ip(request)
        
        logger.debug(f"Rate limiting IP: {ip}")
        
        # Check rate limit
        is_allowed, limits = await rate_limiter.is_allowed(ip)
        
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
                    "X-RateLimit-Remaining-Hour": str(limits["hour_remaining"])
                }
            )
        
        # Skip body handling for now to avoid middleware issues
        # The request body will be handled normally by FastAPI
        
        # Process request and add rate limit headers to response
        response = await call_next(request)
        response.headers["X-RateLimit-Limit-Minute"] = str(rate_limiter.requests_per_minute)
        response.headers["X-RateLimit-Limit-Hour"] = str(rate_limiter.requests_per_hour)
        response.headers["X-RateLimit-Remaining-Minute"] = str(limits["minute_remaining"])
        response.headers["X-RateLimit-Remaining-Hour"] = str(limits["hour_remaining"])
        
        return response
        
    except Exception as e:
        # Never crash the stack from within middleware
        # Log the error and allow request to proceed rather than 500-ing
        logger.error(f"Rate limit middleware error: {e}")
        
        # Fallback: allow request to proceed
        try:
            return await call_next(request)
        except Exception as fallback_error:
            logger.error(f"Fallback call_next also failed: {fallback_error}")
            # Last resort: return a generic error response
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error in rate limiting"}
            )
