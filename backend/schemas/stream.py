from typing import Annotated, Literal, Optional

from pydantic import BaseModel, BeforeValidator, ConfigDict, StringConstraints

from schemas.search import SearchMode

# Keep limits generous enough for legitimate use but block abuse.
# A typical long-form evaluation prompt is well under 32 KB.
_MAX_PROMPT = 32_000
_MAX_MODEL_ID = 128
ProviderId = Annotated[
    Literal["openai", "google", "anthropic", "opencode-go", "opencode-zen", "meta", "custom"],
    BeforeValidator(lambda value: value.strip() if isinstance(value, str) else value),
]
Prompt = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=_MAX_PROMPT)]
ModelId = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=_MAX_MODEL_ID)]


class StreamRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    prompt: Prompt
    leftModel: ModelId
    rightModel: ModelId
    leftProvider: Optional[ProviderId] = None
    rightProvider: Optional[ProviderId] = None
    searchMode: Optional[SearchMode] = None
