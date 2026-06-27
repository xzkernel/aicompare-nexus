from dataclasses import dataclass, field
from typing import Any, Dict, Literal

StreamEventKind = Literal[
    "token",
    "search_start",
    "search_sources",
    "grounding",
    "citations",
    "search_complete",
]


@dataclass
class ProviderStreamEvent:
    kind: StreamEventKind
    text: str = ""
    data: Dict[str, Any] = field(default_factory=dict)
