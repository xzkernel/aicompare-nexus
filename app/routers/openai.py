from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Dict, Any
import json

from ..core.http import client
from ..core.settings import settings
from ..core.errors import handle_openai_error, AIProviderError

router = APIRouter(prefix="/api/openai", tags=["openai"])

@router.post("/chat")
async def openai_chat(payload: Dict[str, Any] = Body(...)):
    """Proxy OpenAI chat completions API"""
    try:
        # Forward the request to OpenAI
        response = await client.post(
            f"{settings.OPENAI_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json=payload
        )
        
        if response.status_code == 200:
            return JSONResponse(
                status_code=200,
                content=response.json()
            )
        else:
            # Handle OpenAI API errors
            raise handle_openai_error(response)
            
    except AIProviderError:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "provider": "openai",
                "message": f"Proxy error: {str(e)}",
                "details": {"error_type": "proxy_error"}
            }
        )

@router.post("/chat/stream")
async def openai_chat_stream(payload: Dict[str, Any] = Body(...)):
    """Proxy OpenAI streaming chat completions API"""
    try:
        # Ensure streaming is enabled
        if "stream" not in payload:
            payload["stream"] = True
        
        # Forward the request to OpenAI
        response = await client.post(
            f"{settings.OPENAI_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
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
            # Handle OpenAI API errors
            raise handle_openai_error(response)
            
    except AIProviderError:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "provider": "openai",
                "message": f"Proxy error: {str(e)}",
                "details": {"error_type": "proxy_error"}
            }
        )


