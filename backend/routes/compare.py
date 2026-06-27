import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from schemas.compare import AskRequest, AskResponse, CompareRequest, CompareResponse
from services.compare_service import run_ask_comparison, run_multi_compare
from utils.byok import parse_byok_headers

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["compare"])


def _byok_from_headers(
    x_openai_api_key: Optional[str],
    x_google_api_key: Optional[str],
    x_anthropic_api_key: Optional[str],
    x_meta_api_key: Optional[str],
    x_custom_api_key: Optional[str],
    x_meta_base_url: Optional[str],
    x_meta_key_header: Optional[str],
    x_custom_base_url: Optional[str],
    x_custom_key_header: Optional[str],
):
    return parse_byok_headers(
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


@router.post("/ask", response_model=AskResponse)
async def ask(
    body: AskRequest,
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
    """Dual-model comparison — BYOK headers, factory provider pipeline."""
    if not body.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")

    keys = _byok_from_headers(
        x_openai_api_key,
        x_google_api_key,
        x_anthropic_api_key,
        x_meta_api_key,
        x_custom_api_key,
        x_meta_base_url,
        x_meta_key_header,
        x_custom_base_url,
        x_custom_key_header,
    )

    if not any([keys.openai, keys.google, keys.anthropic, keys.meta, keys.custom]):
        raise HTTPException(status_code=401, detail="At least one provider API key is required")

    try:
        return await run_ask_comparison(body, keys)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.exception("ask failed: %s", e)
        raise HTTPException(status_code=500, detail="Comparison failed") from e


@router.post("/compare", response_model=CompareResponse)
async def compare(
    req: CompareRequest,
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
    """Multi-provider comparison — BYOK headers only (keys never in JSON body)."""
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")

    keys = _byok_from_headers(
        x_openai_api_key,
        x_google_api_key,
        x_anthropic_api_key,
        x_meta_api_key,
        x_custom_api_key,
        x_meta_base_url,
        x_meta_key_header,
        x_custom_base_url,
        x_custom_key_header,
    )

    if not any([keys.openai, keys.google, keys.anthropic, keys.meta, keys.custom]):
        raise HTTPException(status_code=401, detail="At least one provider API key is required")

    try:
        return await run_multi_compare(req, keys)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.exception("compare failed: %s", e)
        raise HTTPException(status_code=500, detail="Comparison failed") from e
