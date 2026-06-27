from typing import Any, Dict, List, Optional
from urllib.parse import urlparse


def hostname_from_url(url: str) -> str:
    try:
        host = urlparse(url).netloc or url
        return host.removeprefix("www.")
    except Exception:
        return url


def dedupe_citations(citations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen: set[str] = set()
    out: List[Dict[str, Any]] = []
    for c in citations:
        key = c.get("url") or c.get("title") or ""
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(c)
    return out


def citation_from_url(
    url: str,
    *,
    title: Optional[str] = None,
    provider: str,
    snippet: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "title": title or hostname_from_url(url),
        "url": url,
        "hostname": hostname_from_url(url),
        "provider": provider,
        "snippet": snippet,
    }
