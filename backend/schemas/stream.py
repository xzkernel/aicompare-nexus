from typing import Optional

from pydantic import BaseModel, Field

from schemas.search import SearchMode

# Keep limits generous enough for legitimate use but block abuse.
# A typical long-form evaluation prompt is well under 32 KB.
_MAX_PROMPT = 32_000
_MAX_MODEL_ID = 128
_MAX_PROVIDER_ID = 64


class StreamRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=_MAX_PROMPT)
    leftModel: str = Field(..., min_length=1, max_length=_MAX_MODEL_ID)
    rightModel: str = Field(..., min_length=1, max_length=_MAX_MODEL_ID)
    leftProvider: Optional[str] = Field(default=None, max_length=_MAX_PROVIDER_ID)
    rightProvider: Optional[str] = Field(default=None, max_length=_MAX_PROVIDER_ID)
    searchMode: Optional[SearchMode] = None