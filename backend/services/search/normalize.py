from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .citations import citation_from_url, dedupe_citations, hostname_from_url


@dataclass
class NormalizedCitation:
    title: str
    url: str
    hostname: str
    provider: str
    snippet: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "url": self.url,
            "hostname": self.hostname,
            "provider": self.provider,
            "snippet": self.snippet,
        }


@dataclass
class NormalizedSearchMetadata:
    grounded: bool = False
    citations: List[NormalizedCitation] = field(default_factory=list)
    search_latency_ms: Optional[int] = None
    search_provider: Optional[str] = None
    search_queries: List[str] = field(default_factory=list)
    search_mode: Optional[str] = None
    live_search: bool = False
    used: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "grounded": self.grounded,
            "citations": [c.to_dict() for c in self.citations],
            "searchLatencyMs": self.search_latency_ms,
            "searchProvider": self.search_provider,
            "searchQueries": self.search_queries,
            "searchMode": self.search_mode,
            "liveSearch": self.live_search,
            "used": self.used,
        }


def merge_metadata(
    base: Optional[NormalizedSearchMetadata],
    incoming: NormalizedSearchMetadata,
) -> NormalizedSearchMetadata:
    if base is None:
        return incoming
    merged_citations = dedupe_citations(
        [c.to_dict() for c in base.citations] + [c.to_dict() for c in incoming.citations]
    )
    return NormalizedSearchMetadata(
        grounded=base.grounded or incoming.grounded,
        citations=[NormalizedCitation(**c) for c in merged_citations],
        search_latency_ms=incoming.search_latency_ms or base.search_latency_ms,
        search_provider=incoming.search_provider or base.search_provider,
        search_queries=list(dict.fromkeys(base.search_queries + incoming.search_queries)),
        search_mode=incoming.search_mode or base.search_mode,
        live_search=base.live_search or incoming.live_search,
    )


def from_gemini_grounding(metadata: Dict[str, Any], provider: str = "google") -> NormalizedSearchMetadata:
    queries = list(metadata.get("webSearchQueries") or [])
    chunks = metadata.get("groundingChunks") or []
    citations: List[NormalizedCitation] = []
    for chunk in chunks:
        web = chunk.get("web") or {}
        uri = web.get("uri") or web.get("url") or ""
        if not uri:
            continue
        citations.append(
            NormalizedCitation(
                title=web.get("title") or hostname_from_url(uri),
                url=uri,
                hostname=hostname_from_url(uri),
                provider=provider,
            )
        )
    return NormalizedSearchMetadata(
        grounded=bool(citations or queries),
        citations=citations,
        search_provider=provider,
        search_queries=queries,
        live_search=bool(queries or citations),
        used=bool(queries or citations),
    )


def from_anthropic_citations(
    citations: List[Dict[str, Any]],
    queries: Optional[List[str]] = None,
    provider: str = "anthropic",
) -> NormalizedSearchMetadata:
    normalized: List[NormalizedCitation] = []
    for c in citations:
        url = c.get("url") or ""
        if not url:
            continue
        normalized.append(
            NormalizedCitation(
                title=c.get("title") or hostname_from_url(url),
                url=url,
                hostname=hostname_from_url(url),
                provider=provider,
                snippet=c.get("cited_text") or c.get("snippet"),
            )
        )
    return NormalizedSearchMetadata(
        grounded=bool(normalized or queries),
        citations=normalized,
        search_provider=provider,
        search_queries=queries or [],
        live_search=bool(normalized or queries),
    )


def from_openrouter_annotations(
    annotations: List[Dict[str, Any]],
    queries: Optional[List[str]] = None,
    provider: str = "openrouter",
) -> NormalizedSearchMetadata:
    citations: List[NormalizedCitation] = []
    for ann in annotations:
        if ann.get("type") == "url_citation":
            url_citation = ann.get("url_citation") or ann
            url = url_citation.get("url") or ""
            if not url:
                continue
            citations.append(
                NormalizedCitation(
                    title=url_citation.get("title") or hostname_from_url(url),
                    url=url,
                    hostname=hostname_from_url(url),
                    provider=provider,
                    snippet=url_citation.get("content"),
                )
            )
        elif ann.get("url"):
            citations.append(
                NormalizedCitation(
                    title=ann.get("title") or hostname_from_url(ann["url"]),
                    url=ann["url"],
                    hostname=hostname_from_url(ann["url"]),
                    provider=provider,
                    snippet=ann.get("content"),
                )
            )
    return NormalizedSearchMetadata(
        grounded=bool(citations or queries),
        citations=citations,
        search_provider=provider,
        search_queries=queries or [],
        live_search=True,
        search_mode="openrouter_online",
    )


def provider_supports_search(provider_name: str) -> bool:
    return provider_name in {"google", "anthropic", "meta"}
