from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class ByokHeaders:
    openai: Optional[str] = None
    google: Optional[str] = None
    anthropic: Optional[str] = None
    meta: Optional[str] = None
    custom: Optional[str] = None
    meta_base_url: Optional[str] = None
    meta_key_header: str = "Authorization"
    custom_base_url: Optional[str] = None
    custom_key_header: str = "Authorization"


def parse_byok_headers(
    x_openai_api_key: Optional[str] = None,
    x_google_api_key: Optional[str] = None,
    x_anthropic_api_key: Optional[str] = None,
    x_meta_api_key: Optional[str] = None,
    x_custom_api_key: Optional[str] = None,
    x_meta_base_url: Optional[str] = None,
    x_meta_key_header: Optional[str] = None,
    x_custom_base_url: Optional[str] = None,
    x_custom_key_header: Optional[str] = None,
) -> ByokHeaders:
    return ByokHeaders(
        openai=x_openai_api_key,
        google=x_google_api_key,
        anthropic=x_anthropic_api_key,
        meta=x_meta_api_key,
        custom=x_custom_api_key,
        meta_base_url=x_meta_base_url,
        meta_key_header=x_meta_key_header or "Authorization",
        custom_base_url=x_custom_base_url,
        custom_key_header=x_custom_key_header or "Authorization",
    )
