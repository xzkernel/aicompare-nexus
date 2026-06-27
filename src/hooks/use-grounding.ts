import { useMemo } from "react";
import type { SearchMetadata, SearchPhase } from "@/lib/search-metadata";
import { EMPTY_SEARCH_METADATA, mergeSearchMetadata } from "@/lib/search-metadata";
import {
  isSearchActuallyUsed,
  type SideSearchCapability,
} from "@/lib/search-capability-state";

export function useGroundingSummary(
  left: SearchMetadata | undefined,
  right: SearchMetadata | undefined,
  leftCap?: SideSearchCapability,
  rightCap?: SideSearchCapability,
  leftPhase?: SearchPhase,
  rightPhase?: SearchPhase
) {
  return useMemo(() => {
    const l = left ?? EMPTY_SEARCH_METADATA;
    const r = right ?? EMPTY_SEARCH_METADATA;
    const leftGrounded = isSearchActuallyUsed(l, leftCap, leftPhase);
    const rightGrounded = isSearchActuallyUsed(r, rightCap, rightPhase);
    const groundedMismatch = leftGrounded !== rightGrounded;
    const urlsL = new Set(l.citations.map((c) => c.url).filter(Boolean));
    const urlsR = new Set(r.citations.map((c) => c.url).filter(Boolean));
    let overlap = 0;
    for (const u of urlsL) if (urlsR.has(u)) overlap += 1;
    const union = new Set([...urlsL, ...urlsR]).size;
    const citationOverlapPct = union ? Math.round((overlap / union) * 100) : urlsL.size || urlsR.size ? 0 : 100;
    const searchParityBreak =
      (leftCap?.enabled && !leftGrounded && rightCap?.enabled && rightGrounded) ||
      (rightCap?.enabled && !rightGrounded && leftCap?.enabled && leftGrounded);
    return {
      leftGrounded,
      rightGrounded,
      groundedMismatch,
      searchParityBreak,
      citationOverlapPct,
      leftCitationCount: l.citations.length,
      rightCitationCount: r.citations.length,
    };
  }, [left, right, leftCap, rightCap, leftPhase, rightPhase]);
}

export function applySearchEventMetadata(
  current: SearchMetadata,
  eventMetadata: unknown
): SearchMetadata {
  if (!eventMetadata || typeof eventMetadata !== "object") return current;
  const incoming = eventMetadata as SearchMetadata;
  return mergeSearchMetadata(current, {
    ...EMPTY_SEARCH_METADATA,
    ...incoming,
    citations: incoming.citations ?? [],
    searchQueries: incoming.searchQueries ?? [],
  });
}
