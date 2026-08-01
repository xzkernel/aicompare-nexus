from typing import Any, Dict, List
from urllib.parse import urlparse


def valid_citation_url(url: object) -> bool:
    if not isinstance(url, str) or not url or len(url) > 2048:
        return False
    if any(ord(char) < 32 for char in url):
        return False
    try:
        parsed = urlparse(url)
        return (
            parsed.scheme.lower() in {"http", "https"}
            and bool(parsed.hostname)
            and parsed.username is None
            and parsed.password is None
        )
    except ValueError:
        return False


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
        if not valid_citation_url(c.get("url")):
            continue
        key = c.get("url") or c.get("title") or ""
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(c)
    return out
