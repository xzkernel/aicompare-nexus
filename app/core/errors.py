from fastapi import HTTPException
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
import httpx

class AIProviderError(HTTPException):
    """Custom exception for AI provider errors"""
    def __init__(self, status_code: int, provider: str, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status_code, detail={
            "provider": provider,
            "message": message,
            "details": details or {}
        })

def handle_openai_error(response: httpx.Response) -> AIProviderError:
    """Convert OpenAI API errors to consistent format"""
    try:
        error_data = response.json()
        error_message = error_data.get("error", {}).get("message", "Unknown OpenAI error")
        error_type = error_data.get("error", {}).get("type", "unknown")
    except:
        error_message = f"OpenAI API error: {response.status_code}"
        error_type = "http_error"
    
    return AIProviderError(
        status_code=response.status_code,
        provider="openai",
        message=error_message,
        details={"type": error_type, "status_code": response.status_code}
    )

def handle_gemini_error(response: httpx.Response) -> AIProviderError:
    """Convert Gemini API errors to consistent format"""
    try:
        error_data = response.json()
        error_message = error_data.get("error", {}).get("message", "Unknown Gemini error")
        error_code = error_data.get("error", {}).get("code", 0)
    except:
        error_message = f"Gemini API error: {response.status_code}"
        error_code = response.status_code
    
    return AIProviderError(
        status_code=response.status_code,
        provider="gemini",
        message=error_message,
        details={"code": error_code, "status_code": response.status_code}
    )

def create_error_response(error: Exception) -> JSONResponse:
    """Create a consistent error response for any exception"""
    if isinstance(error, AIProviderError):
        return JSONResponse(
            status_code=error.status_code,
            content=error.detail
        )
    
    # Handle other exceptions
    return JSONResponse(
        status_code=500,
        content={
            "provider": "proxy",
            "message": "Internal proxy error",
            "details": {"error": str(error)}
        }
    )


