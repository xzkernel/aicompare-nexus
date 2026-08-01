from dataclasses import dataclass, field
from typing import Any, Dict, Optional


MAX_KEY_HEADER_LENGTH = 4096
MAX_BASE_URL_HEADER_LENGTH = 512
MAX_KEY_HEADER_NAME_LENGTH = 64


@dataclass
class ByokHeaders:
    openai: Optional[str] = None
    google: Optional[str] = None
    anthropic: Optional[str] = None
    meta: Optional[str] = None
    custom: Optional[str] = None
    opencode: Optional[str] = None
    meta_base_url: Optional[str] = None
    meta_key_header: str = "Authorization"
    custom_base_url: Optional[str] = None
    custom_key_header: str = "Authorization"


def _bounded(value: Optional[str], maximum: int, name: str) -> Optional[str]:
    if value is not None and len(value) > maximum:
        raise ValueError(f"{name} is too long")
    return value


def parse_byok_headers(
    x_openai_api_key: Optional[str] = None,
    x_google_api_key: Optional[str] = None,
    x_anthropic_api_key: Optional[str] = None,
    x_meta_api_key: Optional[str] = None,
    x_custom_api_key: Optional[str] = None,
    x_opencode_api_key: Optional[str] = None,
    x_meta_base_url: Optional[str] = None,
    x_meta_key_header: Optional[str] = None,
    x_custom_base_url: Optional[str] = None,
    x_custom_key_header: Optional[str] = None,
) -> ByokHeaders:
    return ByokHeaders(
        openai=_bounded(x_openai_api_key, MAX_KEY_HEADER_LENGTH, "OpenAI API key"),
        google=_bounded(x_google_api_key, MAX_KEY_HEADER_LENGTH, "Google API key"),
        anthropic=_bounded(x_anthropic_api_key, MAX_KEY_HEADER_LENGTH, "Anthropic API key"),
        meta=_bounded(x_meta_api_key, MAX_KEY_HEADER_LENGTH, "Relay API key"),
        custom=_bounded(x_custom_api_key, MAX_KEY_HEADER_LENGTH, "Custom API key"),
        opencode=_bounded(x_opencode_api_key, MAX_KEY_HEADER_LENGTH, "OpenCode API key"),
        meta_base_url=_bounded(x_meta_base_url, MAX_BASE_URL_HEADER_LENGTH, "Relay base URL"),
        meta_key_header=_bounded(x_meta_key_header, MAX_KEY_HEADER_NAME_LENGTH, "Relay API key header") or "Authorization",
        custom_base_url=_bounded(x_custom_base_url, MAX_BASE_URL_HEADER_LENGTH, "Custom base URL"),
        custom_key_header=_bounded(x_custom_key_header, MAX_KEY_HEADER_NAME_LENGTH, "Custom API key header") or "Authorization",
    )
