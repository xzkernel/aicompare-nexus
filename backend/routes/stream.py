import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse

from schemas.stream import StreamRequest
from services.stream_service import stream_comparison_sse
from utils.byok import parse_byok_headers

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["stream"])


@router.post("/stream")
async def stream_compare(
    body: StreamRequest,
    x_openai_api_key: Optional[str] = Header(default=None, alias="X-OpenAI-API-Key"),
    x_google_api_key: Optional[str] = Header(default=None, alias="X-Google-API-Key"),
    x_anthropic_api_key: Optional[str] = Header(default=None, alias="X-Anthropic-API-Key"),
    x_meta_api_key: Optional[str] = Header(default=None, alias="X-Meta-API-Key"),
    x_custom_api_key: Optional[str] = Header(default=None, alias="X-Custom-API-Key"),
    x_meta_base_url: Optional[str] = Header(default=None, alias="X-Meta-Base-Url"),
    x_meta_key_header: Optional[str] = Header(default=None, alias="X-Meta-Key-Header"),
    x_custom_base_url: Optional[str] = Header(default=None, alias="X-Custom-Base-Url"),
    x_custom_key_header: Optional[str] = Header(default=None, alias="X-Custom-Key-Header"),
):
    """
    Server-Sent Events stream for live dual-model comparison.
    BYOK keys via headers — same contract as /api/v1/ask.
    """
    if not body.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")

    keys = parse_byok_headers(
        x_openai_api_key=x_openai_api_key,
        x_google_api_key=x_google_api_key,
        x_anthropic_api_key=x_anthropic_api_key,
        x_meta_api_key=x_meta_api_key,
        x_custom_api_key=x_custom_api_key,
        x_meta_base_url=x_meta_base_url,
        x_meta_key_header=x_meta_key_header,
        x_custom_base_url=x_custom_base_url,
        x_custom_key_header=x_custom_key_header,
    )

    if not any([keys.openai, keys.google, keys.anthropic, keys.meta, keys.custom]):
        raise HTTPException(status_code=401, detail="At least one provider API key is required")

    try:
        return StreamingResponse(
            stream_comparison_sse(body, keys),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except ValueError as e:
        # ValueError from resolve_side — safe to surface (no key content, describes missing key)
        msg = str(e)
        raise HTTPException(status_code=400, detail=msg) from e
    except Exception as e:
        logger.exception("stream failed: %s", e)
        # Never expose internal exception details to client
        raise HTTPException(status_code=500, detail="Stream failed") from e
