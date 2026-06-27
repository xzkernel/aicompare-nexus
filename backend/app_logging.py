import json
import logging
import time
import uuid
from typing import Dict, Any, Optional
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import sys

# Configure structured logging
class StructuredFormatter(logging.Formatter):
    """Custom formatter that outputs structured JSON logs"""
    
    def format(self, record: logging.LogRecord) -> str:
        # Extract extra fields if they exist
        extra_fields = {}
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 'filename', 'module', 'lineno', 'funcName', 'created', 'msecs', 'relativeCreated', 'thread', 'threadName', 'processName', 'process', 'getMessage', 'exc_info', 'exc_text', 'stack_info']:
                extra_fields[key] = value
        
        log_entry = {
            "timestamp": time.time(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            **extra_fields
        }
        
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": self.formatException(record.exc_info)
            }
        
        return json.dumps(log_entry)

# Configure root logger
def setup_logging():
    """Setup structured logging configuration"""
    
    # Create logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Create console handler with structured formatter
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(StructuredFormatter())
    
    # Add handler to logger
    logger.addHandler(console_handler)
    
    # Set specific loggers to INFO level
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    
    return logger

# Request context for tracking
class RequestContext:
    """Context manager for request tracking"""
    
    def __init__(self, request_id: str, start_time: float):
        self.request_id = request_id
        self.start_time = start_time
    
    def log_request_start(self, request: Request, **extra_fields):
        """Log request start — log path only, never full URL (query params may contain secrets)."""
        logger = logging.getLogger("request")
        logger.info("Request started", extra={
            "request_id": self.request_id,
            "method": request.method,
            "path": request.url.path,
            "client_ip": request.client.host if request.client else None,
            "content_length": request.headers.get("content-length"),
            **extra_fields
        })
    
    def log_request_end(self, response: Response, **extra_fields):
        """Log request end"""
        duration = (time.time() - self.start_time) * 1000
        logger = logging.getLogger("request")
        logger.info("Request completed", extra={
            "request_id": self.request_id,
            "status_code": response.status_code,
            "duration_ms": round(duration, 2),
            **extra_fields
        })

# Request logging middleware
class RequestLoggingMiddleware:
    """Middleware for logging all requests and responses"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Generate request ID
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Create request context
        context = RequestContext(request_id, start_time)
        
        # Log request start
        request = Request(scope)
        context.log_request_start(request)
        
        # Create custom send function to capture response
        async def custom_send(message):
            if message["type"] == "http.response.start":
                # Store status code for logging
                scope["status_code"] = message["status"]
            await send(message)
        
        # Process request
        try:
            await self.app(scope, receive, custom_send)
        except Exception as e:
            logger = logging.getLogger("request")
            logger.error("Request failed", extra={
                "request_id": request_id,
                # Log type only, not message — str(e) may contain API key fragments
                "error_type": type(e).__name__,
            })
            raise
        finally:
            # Log request end (we'll need to get the response status)
            if "status_code" in scope:
                # Create a mock response object for logging
                class MockResponse:
                    def __init__(self, status_code):
                        self.status_code = status_code
                
                response = MockResponse(scope["status_code"])
                context.log_request_end(response)

# Additional logging functions for other modules
def log_rate_limit(client_ip: str, request_count: int, limit: int, window: str, blocked: bool, **extra_fields):
    """Log rate limit events"""
    logger = logging.getLogger("rate_limit")
    action = "BLOCKED" if blocked else "ALLOWED"
    logger.warning(f"Rate limit {action}", extra={
        "client_ip": client_ip,
        "request_count": request_count,
        "limit": limit,
        "window": window,
        "blocked": blocked,
        **extra_fields
    })

def log_api_call(endpoint: str, method: str, status_code: int, duration_ms: float, **extra_fields):
    """Log API call details"""
    logger = logging.getLogger("api")
    logger.info("API call", extra={
        "endpoint": endpoint,
        "method": method,
        "status_code": status_code,
        "duration_ms": duration_ms,
        **extra_fields
    })

def log_performance(operation: str, duration_ms: float, **extra_fields):
    """Log performance metrics"""
    logger = logging.getLogger("performance")
    logger.info("Performance metric", extra={
        "operation": operation,
        "duration_ms": duration_ms,
        **extra_fields
    })

def log_health_check(status: str, duration_ms: float, **extra_fields):
    """Log health check results"""
    logger = logging.getLogger("health")
    logger.info("Health check", extra={
        "status": status,
        "duration_ms": duration_ms,
        **extra_fields
    })

# Utility functions for logging
def log_info(message: str, **extra_fields):
    """Log info message with extra fields"""
    logger = logging.getLogger()
    logger.info(message, extra=extra_fields)

def log_error(message: str, **extra_fields):
    """Log error message with extra fields"""
    logger = logging.getLogger()
    logger.error(message, extra=extra_fields)

def log_warning(message: str, **extra_fields):
    """Log warning message with extra fields"""
    logger = logging.getLogger()
    logger.warning(message, extra=extra_fields)

def log_debug(message: str, **extra_fields):
    """Log debug message with extra fields"""
    logger = logging.getLogger()
    logger.debug(message, extra=extra_fields)

# Request ID context
_request_context = {}

def get_request_id() -> Optional[str]:
    """Get current request ID from context"""
    return _request_context.get("request_id")

def set_request_id(request_id: str):
    """Set current request ID in context"""
    _request_context["request_id"] = request_id

def clear_request_id():
    """Clear current request ID from context"""
    _request_context.pop("request_id", None)
