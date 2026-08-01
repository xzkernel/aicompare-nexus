"""
Resolve the real client IP for rate limiting and logging.

Only trusts X-Forwarded-For / X-Real-IP when the direct connection comes from
a configured trusted proxy (nginx, Docker frontend, localhost dev proxy).
Prevents clients from spoofing their IP via forged headers (A05).
"""

from __future__ import annotations

import ipaddress
import logging
import os
from functools import lru_cache
from typing import Optional

from starlette.requests import Request

logger = logging.getLogger(__name__)

# Trust local development proxies by default. Deployment proxies must be explicit.
_DEFAULT_TRUSTED = "127.0.0.1,::1"


@lru_cache(maxsize=1)
def _trusted_networks() -> tuple:
    raw = os.getenv("TRUSTED_PROXY_IPS", _DEFAULT_TRUSTED)
    networks: list = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            if "/" in part:
                networks.append(ipaddress.ip_network(part, strict=False))
            elif ":" in part:
                networks.append(ipaddress.ip_network(f"{part}/128", strict=False))
            else:
                networks.append(ipaddress.ip_network(f"{part}/32", strict=False))
        except ValueError:
            logger.warning("Invalid TRUSTED_PROXY_IPS entry ignored: %s", part)
    return tuple(networks)


def _is_trusted_proxy(host: Optional[str]) -> bool:
    if not host:
        return False
    try:
        ip = ipaddress.ip_address(host)
        return any(ip in net for net in _trusted_networks())
    except ValueError:
        return False


def get_client_ip(request: Request) -> str:
    """Return the best-effort client IP for rate limiting."""
    direct = request.client.host if request.client else None

    if direct and _is_trusted_proxy(direct):
        raw_forwarded = request.headers.get("x-forwarded-for", "")
        if raw_forwarded:
            try:
                forwarded = [
                    str(ipaddress.ip_address(part.strip()))
                    for part in raw_forwarded.split(",")
                    if part.strip()
                ]
            except ValueError:
                logger.warning("Ignoring malformed X-Forwarded-For chain")
                return direct
            if not forwarded:
                return direct
            # Walk toward the client, discarding only explicitly trusted hops.
            for host in reversed(forwarded):
                if not _is_trusted_proxy(host):
                    return host
            return forwarded[0]
        real_ip = request.headers.get("x-real-ip", "").strip()
        if real_ip:
            try:
                return str(ipaddress.ip_address(real_ip))
            except ValueError:
                logger.warning("Ignoring malformed X-Real-IP header")

    return direct or "unknown"
