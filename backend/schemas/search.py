from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class SearchMode(str, Enum):
    auto = "auto"
    force = "force"
    off = "off"


class ResolvedSearchOptions(BaseModel):
    """Internal resolved search policy for providers."""

    active: bool = False
    force: bool = False
    mode: SearchMode = SearchMode.off

    @classmethod
    def from_request(cls, search_mode: Optional[SearchMode]) -> "ResolvedSearchOptions":
        mode = search_mode or SearchMode.off
        if mode == SearchMode.off:
            return cls(active=False, force=False, mode=mode)
        if mode == SearchMode.force:
            return cls(active=True, force=True, mode=mode)
        # auto — enable native search on routes that support it
        return cls(active=True, force=False, mode=mode)

    @property
    def should_use_search(self) -> bool:
        return self.active and self.mode != SearchMode.off

    @property
    def requested(self) -> bool:
        return self.mode != SearchMode.off


def search_capability_payload(
    *,
    requested: bool,
    supported: bool,
    enabled: bool,
    label: str,
    skip_reason: Optional[str] = None,
) -> dict:
    return {
        "requested": requested,
        "supported": supported,
        "enabled": enabled,
        "used": False,
        "label": label,
        "skipReason": skip_reason,
    }


PROVIDER_SEARCH_LABELS = {
    "google": "Gemini grounding",
    "anthropic": "Claude web_search",
    "meta": "OpenRouter online",
    "openai": "Not available",
    "opencode-go": "Not available",
    "opencode-zen": "Not available",
    "custom": "Not available",
}
