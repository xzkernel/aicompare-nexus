"""Filter deprecated model ids from catalog and live OpenRouter hydration."""

from __future__ import annotations

import re
from typing import Pattern

# Current-gen allowlist — never treat as legacy even if a pattern would match
_CURRENT_GEN_MARKERS = (
    "gpt-5",
    "gemini-3",
    "claude-opus-4.8",
    "claude-opus-4-8",
    "claude-sonnet-4.6",
    "claude-sonnet-4-6",
    "deepseek-v4",
    "llama-4",
    "qwen3",
)

_LEGACY_PATTERNS: tuple[Pattern[str], ...] = (
    re.compile(r"gpt-4o", re.I),
    re.compile(r"gpt-4-turbo", re.I),
    re.compile(r"gpt-3\.5", re.I),
    re.compile(r"gpt-3-", re.I),
    re.compile(r"gemini-1[\.\-]", re.I),
    re.compile(r"gemini-2[\.\-]0", re.I),
    re.compile(r"gemini-2\.5", re.I),
    re.compile(r"claude-2", re.I),
    re.compile(r"claude-3", re.I),
    re.compile(r"20250514", re.I),
    re.compile(r"claude-sonnet-4$", re.I),
    re.compile(r"claude-opus-4$", re.I),
    re.compile(r"/claude-sonnet-4$", re.I),
    re.compile(r"/claude-opus-4$", re.I),
    re.compile(r"llama-3", re.I),
    re.compile(r"llama-2", re.I),
    re.compile(r"deepseek-r1", re.I),
    re.compile(r"mistral-7", re.I),
)


def is_legacy_model_id(model_id: str) -> bool:
    hay = (model_id or "").lower()
    if not hay or hay == "custom":
        return False
    if any(marker in hay for marker in _CURRENT_GEN_MARKERS):
        return False
    return any(p.search(hay) for p in _LEGACY_PATTERNS)
