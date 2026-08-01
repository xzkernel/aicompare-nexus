from .meta import MetaRelayProvider


class CustomProvider(MetaRelayProvider):
    """OpenAI-compatible custom HTTP endpoint (BYOK)."""

    def __init__(self, key: str, model: str, base_url: str, key_header: str = "Authorization"):
        if not base_url:
            raise ValueError("Custom provider requires base_url")
        super().__init__(key, model, base_url, key_header)
