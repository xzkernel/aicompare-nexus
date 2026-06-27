from typing import Optional, Tuple

from utils.byok import ByokHeaders
from security import validate_relay_base_url

OPENROUTER_DEFAULT_BASE = "https://openrouter.ai/api"

# Internal id -> OpenRouter slug when routing via relay
OPENROUTER_MODEL_MAP = {
    "gpt-5.5": "openai/gpt-5.5",
    "gpt-5.5-pro": "openai/gpt-5.5-pro",
    "gpt-5-mini": "openai/gpt-5-mini",
    "gemini-3.1-pro-preview": "google/gemini-3.1-pro-preview",
    "gemini-3.5-flash": "google/gemini-3.5-flash",
    "claude-opus-4-8": "anthropic/claude-opus-4.8",
    "claude-sonnet-4-6": "anthropic/claude-sonnet-4.6",
    "deepseek/deepseek-v4-flash": "deepseek/deepseek-v4-flash",
    "meta-llama/llama-4-scout": "meta-llama/llama-4-scout",
    "meta-llama/llama-4-maverick": "meta-llama/llama-4-maverick",
    "qwen/qwen3-235b-a22b": "qwen/qwen3-235b-a22b",
    "google/gemma-3-27b-it": "google/gemma-3-27b-it",
}


def infer_provider_from_model(model_id: str) -> str:
    m = model_id.lower()
    if (
        m.startswith("gpt")
        or m.startswith("o1")
        or m.startswith("o3")
        or m.startswith("o4")
        or m.startswith("o5")
    ):
        return "openai"
    if m.startswith("gemini"):
        return "google"
    if "claude" in m:
        return "anthropic"
    if (
        "llama" in m
        or m.startswith("meta-")
        or "deepseek" in m
        or m.startswith("qwen/")
        or "gemma" in m
        or "/" in m
    ):
        return "meta"
    if m == "custom":
        return "custom"
    return "unknown"


def map_relay_model(model_id: str) -> str:
    if model_id in OPENROUTER_MODEL_MAP:
        return OPENROUTER_MODEL_MAP[model_id]
    if "/" in model_id:
        return model_id
    provider = infer_provider_from_model(model_id)
    if provider in ("openai", "google", "anthropic"):
        return f"{provider}/{model_id}"
    return model_id


def resolve_side(
    model_id: str,
    provider_hint: Optional[str],
    keys: ByokHeaders,
) -> Tuple[str, str, str, dict]:
    """
    Resolve provider name, api key, relay model id, and extras for one comparison side.
    Raises ValueError when no suitable key is available.
    """
    provider = (provider_hint or infer_provider_from_model(model_id)).lower()
    extras: dict = {}

    if provider == "openai":
        if not keys.openai:
            raise ValueError(f"No OpenAI API key for model '{model_id}'")
        return "openai", keys.openai, model_id, extras

    if provider == "google":
        if keys.google:
            return "google", keys.google, model_id, extras
        if keys.meta:
            relay_base = validate_relay_base_url(keys.meta_base_url or OPENROUTER_DEFAULT_BASE)
            extras["base_url"] = relay_base
            extras["key_header"] = keys.meta_key_header
            return "meta", keys.meta, map_relay_model(model_id), extras
        raise ValueError(f"No Google or relay API key for model '{model_id}'")

    if provider == "anthropic":
        if keys.anthropic:
            return "anthropic", keys.anthropic, model_id, extras
        if keys.meta:
            relay_base = validate_relay_base_url(keys.meta_base_url or OPENROUTER_DEFAULT_BASE)
            extras["base_url"] = relay_base
            extras["key_header"] = keys.meta_key_header
            return "meta", keys.meta, map_relay_model(model_id), extras
        raise ValueError(f"No Anthropic or relay API key for model '{model_id}'")

    if provider == "meta":
        if not keys.meta:
            raise ValueError(f"No OpenRouter relay API key for model '{model_id}'")
        relay_base = validate_relay_base_url(keys.meta_base_url or OPENROUTER_DEFAULT_BASE)
        extras["base_url"] = relay_base
        extras["key_header"] = keys.meta_key_header
        return "meta", keys.meta, map_relay_model(model_id), extras

    if provider == "custom":
        if not keys.custom or not keys.custom_base_url:
            raise ValueError(f"Custom provider requires API key and base URL for '{model_id}'")
        # SSRF prevention — validate before the backend ever fetches this URL
        custom_base = validate_relay_base_url(keys.custom_base_url)
        extras["base_url"] = custom_base
        extras["key_header"] = keys.custom_key_header
        return "custom", keys.custom, model_id, extras

    if keys.meta:
        relay_base = validate_relay_base_url(keys.meta_base_url or OPENROUTER_DEFAULT_BASE)
        extras["base_url"] = relay_base
        extras["key_header"] = keys.meta_key_header
        return "meta", keys.meta, map_relay_model(model_id), extras

    inferred = infer_provider_from_model(model_id)
    if inferred != "unknown":
        return resolve_side(model_id, inferred, keys)

    raise ValueError(f"Cannot resolve provider for model '{model_id}'")
