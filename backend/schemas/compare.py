from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

from schemas.search import SearchMode

_MAX_PROMPT = 32_000
_MAX_MODEL_ID = 128
_MAX_PROVIDER_ID = 64


class AskRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=_MAX_PROMPT)
    leftModel: str = Field(..., min_length=1, max_length=_MAX_MODEL_ID)
    rightModel: str = Field(..., min_length=1, max_length=_MAX_MODEL_ID)
    leftProvider: Optional[str] = Field(default=None, max_length=_MAX_PROVIDER_ID)
    rightProvider: Optional[str] = Field(default=None, max_length=_MAX_PROVIDER_ID)
    searchMode: Optional[SearchMode] = None


class AskResponse(BaseModel):
    prompt: str
    leftModel: str
    rightModel: str
    leftResponse: str
    rightResponse: str
    leftTime: float
    rightTime: float


class ProviderSpec(BaseModel):
    """One model slot — keys resolved from BYOK headers, never from body."""
    label: str = Field(..., min_length=1, max_length=64)
    model: str = Field(..., min_length=1, max_length=_MAX_MODEL_ID)
    provider: Optional[str] = Field(default=None, max_length=_MAX_PROVIDER_ID)


class CompareRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=_MAX_PROMPT)
    providers: List[ProviderSpec] = Field(..., min_length=1, max_length=5)


class CompareResponse(BaseModel):
    prompt: str
    results: Dict[str, Dict[str, Any]]
