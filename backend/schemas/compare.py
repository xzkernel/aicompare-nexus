from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator
from typing import Annotated, Any, Dict, List, Optional

from schemas.search import SearchMode
from schemas.stream import ModelId, Prompt, ProviderId

class AskRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    prompt: Prompt
    leftModel: ModelId
    rightModel: ModelId
    leftProvider: Optional[ProviderId] = None
    rightProvider: Optional[ProviderId] = None
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
    model_config = ConfigDict(extra="forbid")

    label: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]
    model: ModelId
    provider: Optional[ProviderId] = None


class CompareRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    prompt: Prompt
    providers: List[ProviderSpec] = Field(..., min_length=1, max_length=5)

    @model_validator(mode="after")
    def labels_are_unique(self):
        labels = [spec.label for spec in self.providers]
        if len(labels) != len(set(labels)):
            raise ValueError("provider labels must be unique")
        return self


class CompareResponse(BaseModel):
    prompt: str
    results: Dict[str, Dict[str, Any]]
