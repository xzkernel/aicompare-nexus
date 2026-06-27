"""Environment-aware backend configuration."""

import os


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()
IS_PRODUCTION = ENVIRONMENT == "production"

# Disable OpenAPI/Swagger in production — reduces attack surface.
ENABLE_API_DOCS = _env_bool("ENABLE_API_DOCS", default=not IS_PRODUCTION)
