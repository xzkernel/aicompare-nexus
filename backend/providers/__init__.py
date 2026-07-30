from .base import BaseProvider


def provider_for(*args, **kwargs):
    from .factory import provider_for as build_provider

    return build_provider(*args, **kwargs)


__all__ = ["provider_for", "BaseProvider"]
