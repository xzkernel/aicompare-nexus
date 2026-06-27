export type SearchMode = "auto" | "force" | "off";

export type SearchPhase = "idle" | "searching" | "grounding" | "complete" | "skipped";

export type NormalizedCitation = {
  title: string;
  url: string;
  hostname: string;
  provider: string;
  snippet?: string;
};

export type SearchMetadata = {
  grounded: boolean;
  citations: NormalizedCitation[];
  searchLatencyMs?: number;
  searchProvider?: string;
  searchQueries: string[];
  searchMode?: string;
  liveSearch: boolean;
  used?: boolean;
  skipped?: boolean;
  skipReason?: string;
};

export const EMPTY_SEARCH_METADATA: SearchMetadata = {
  grounded: false,
  citations: [],
  searchQueries: [],
  liveSearch: false,
  used: false,
};

export function parseSearchMetadata(raw: unknown): SearchMetadata {
  if (!raw || typeof raw !== "object") return { ...EMPTY_SEARCH_METADATA };
  const o = raw as Record<string, unknown>;
  const citations = Array.isArray(o.citations)
    ? o.citations.map((c) => {
        const row = c as Record<string, unknown>;
        return {
          title: String(row.title ?? ""),
          url: String(row.url ?? ""),
          hostname: String(row.hostname ?? ""),
          provider: String(row.provider ?? ""),
          snippet: row.snippet != null ? String(row.snippet) : undefined,
        };
      })
    : [];
  return {
    grounded: Boolean(o.grounded),
    citations,
    searchLatencyMs: o.searchLatencyMs != null ? Number(o.searchLatencyMs) : undefined,
    searchProvider: o.searchProvider != null ? String(o.searchProvider) : undefined,
    searchQueries: Array.isArray(o.searchQueries) ? o.searchQueries.map(String) : [],
    searchMode: o.searchMode != null ? String(o.searchMode) : undefined,
    liveSearch: Boolean(o.liveSearch),
    used: o.used != null ? Boolean(o.used) : undefined,
    skipped: Boolean(o.skipped),
    skipReason: o.skipReason != null ? String(o.skipReason) : o.reason != null ? String(o.reason) : undefined,
  };
}

export function mergeSearchMetadata(base: SearchMetadata, incoming: SearchMetadata): SearchMetadata {
  const seen = new Set<string>();
  const citations = [...base.citations, ...incoming.citations].filter((c) => {
    const key = c.url || c.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    grounded: base.grounded || incoming.grounded,
    citations,
    searchLatencyMs: incoming.searchLatencyMs ?? base.searchLatencyMs,
    searchProvider: incoming.searchProvider ?? base.searchProvider,
    searchQueries: [...new Set([...base.searchQueries, ...incoming.searchQueries])],
    searchMode: incoming.searchMode ?? base.searchMode,
    liveSearch: base.liveSearch || incoming.liveSearch,
    used: incoming.used ?? base.used,
    skipped: incoming.skipped ?? base.skipped,
    skipReason: incoming.skipReason ?? base.skipReason,
  };
}

export function citationOverlapPercent(a: SearchMetadata, b: SearchMetadata): number {
  const urlsA = new Set(a.citations.map((c) => c.url).filter(Boolean));
  const urlsB = new Set(b.citations.map((c) => c.url).filter(Boolean));
  if (urlsA.size === 0 && urlsB.size === 0) return 100;
  if (urlsA.size === 0 || urlsB.size === 0) return 0;
  let overlap = 0;
  for (const u of urlsA) {
    if (urlsB.has(u)) overlap += 1;
  }
  const union = new Set([...urlsA, ...urlsB]).size;
  return union ? Math.round((overlap / union) * 100) : 0;
}

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
