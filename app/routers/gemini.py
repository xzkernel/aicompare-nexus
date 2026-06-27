from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Dict, Any, Optional
import json

from ..core.http import client
from ..core.settings import settings
from ..core.errors import handle_gemini_error, AIProviderError

router = APIRouter(prefix="/api/gemini", tags=["gemini"])

@router.post("/generate")
async def gemini_generate(
    payload: Dict[str, Any] = Body(...),
    model: str = Query(default="gemini-1.5-pro", description="Gemini model to use")
):
    """Proxy Gemini generate content API"""
    try:
        # Build the Gemini API URL
        url = f"{settings.GEMINI_BASE}/models/{model}:generateContent"
        
        # Forward the request to Gemini
        response = await client.post(
            url,
            params={"key": settings.GEMINI_API_KEY},
            json=payload
        )
        
        if response.status_code == 200:
            return JSONResponse(
                status_code=200,
                content=response.json()
            )
        else:
            # Handle Gemini API errors
            raise handle_gemini_error(response)
            
    except AIProviderError:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "provider": "gemini",
                "message": f"Proxy error: {str(e)}",
                "details": {"error_type": "proxy_error"}
            }
        )

@router.post("/generate/stream")
async def gemini_generate_stream(
    payload: Dict[str, Any] = Body(...),
    model: str = Query(default="gemini-1.5-pro", description="Gemini model to use")
):
    """Proxy Gemini streaming generate content API"""
    try:
        # Build the Gemini API URL
        url = f"{settings.GEMINI_BASE}/models/{model}:streamGenerateContent"
        
        # Forward the request to Gemini
        response = await client.post(
            url,
            params={"key": settings.GEMINI_API_KEY},
            json=payload
        )
        
        if response.status_code == 200:
            # Return streaming response
            async def stream_response():
                async for chunk in response.aiter_bytes():
                    yield chunk
            
            return StreamingResponse(
                stream_response(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive"
                }
            )
        else:
            # Handle Gemini API errors
            raise handle_gemini_error(response)
            
    except AIProviderError:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "provider": "gemini",
                "message": f"Proxy error: {str(e)}",
                "details": {"error_type": "proxy_error"}
            }
        )


