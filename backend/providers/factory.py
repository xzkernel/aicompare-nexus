from typing import Any, Dict

from .openai import OpenAIProvider
from .gemini import GeminiProvider
from .anthropic import AnthropicProvider
from .meta import MetaRelayProvider
from .custom import CustomProvider
from .base import BaseProvider
from .opencode import OpenCodeProvider

def provider_for(name: str, key: str, model: str, extras: Dict[str, Any] | None = None) -> BaseProvider:
    extras = extras or {}
    name = name.lower()

    if name == "openai":
        return OpenAIProvider(key, model)
    if name == "google":
        return GeminiProvider(key, model)
    if name == "anthropic":
        return AnthropicProvider(key, model)
    if name in {"opencode-go", "opencode-zen"}:
        return OpenCodeProvider(key, model, name)
    if name == "meta":
        base_url = extras.get("base_url")
        if not base_url:
            raise ValueError("Meta provider requires base_url in extras")
        return MetaRelayProvider(
            key,
            model,
            base_url,
            extras.get("key_header", "Authorization"),
        )
    if name == "custom":
        base_url = extras.get("base_url")
        if not base_url:
            raise ValueError("Custom provider requires base_url in extras")
        return CustomProvider(
            key,
            model,
            base_url,
            extras.get("key_header", "Authorization"),
        )

    raise ValueError(f"Unknown provider: {name}")
