import type { SearchMetadata, SearchPhase } from "@/lib/search-metadata";
import { getSearchSupportForRoute } from "@/lib/search-capabilities";

/** Truthful per-side search capability — not a global on/off lie. */
export type SideSearchCapability = {
  /** User policy: searchMode !== off */
  requested: boolean;
  /** Provider route supports native search APIs */
  supported: boolean;
  /** Backend enabled search tools for this side (requested + supported) */
  enabled: boolean;
  /** Provider actually executed search (confirmed by stream events / metadata) */
  used: boolean;
  label: string;
  skipReason?: string;
};

export function buildStaticSearchCapability(
  modelProviderId: string,
  resolvedRoute: string | undefined,
  searchMode: "auto" | "force" | "off"
): SideSearchCapability {
  const support = getSearchSupportForRoute(modelProviderId, resolvedRoute);
  const requested = searchMode !== "off";
  const enabled = requested && support.supported;
  return {
    requested,
    supported: support.supported,
    enabled,
    used: false,
    label: support.label,
    skipReason: !support.supported ? support.hint : undefined,
  };
}

export function applySearchCapabilityEvent(
  current: SideSearchCapability,
  event: Partial<SideSearchCapability>
): SideSearchCapability {
  return { ...current, ...event };
}

/** Search ran — confirmed by provider events, not user toggle. */
export function isSearchActuallyUsed(
  metadata: SearchMetadata | undefined,
  capability: SideSearchCapability | undefined,
  phase: SearchPhase | undefined
): boolean {
  if (capability?.used) return true;
  if (metadata?.skipped || capability?.skipReason) return false;
  if ((metadata?.searchQueries?.length ?? 0) > 0) return true;
  if ((metadata?.citations?.length ?? 0) > 0) return true;
  if (metadata?.grounded) return true;
  if (phase === "complete" && metadata?.liveSearch) return true;
  return false;
}

export type SideSearchDisplay =
  | "off"
  | "unsupported"
  | "ready"
  | "searching"
  | "grounded"
  | "not-used"
  | "skipped";

export function getSideSearchDisplay(
  capability: SideSearchCapability | undefined,
  metadata: SearchMetadata | undefined,
  phase: SearchPhase | undefined
): SideSearchDisplay {
  if (!capability?.requested) return "off";
  if (!capability.supported) return "unsupported";
  if (isSearchActuallyUsed(metadata, capability, phase)) return "grounded";
  if (phase === "searching" || phase === "grounding") return "searching";
  if (phase === "skipped" || metadata?.skipped) return "skipped";
  if (capability.enabled && (phase === "complete" || phase === "idle")) return "not-used";
  if (capability.enabled) return "ready";
  return "off";
}

const DISPLAY_LABEL: Record<SideSearchDisplay, string> = {
  off: "Search off",
  unsupported: "No search API",
  ready: "Search armed",
  searching: "Searching…",
  grounded: "Search used",
  "not-used": "Search not used",
  skipped: "Search skipped",
};

export function parseSearchCapability(raw: unknown): SideSearchCapability | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  return {
    requested: Boolean(o.requested),
    supported: Boolean(o.supported),
    enabled: Boolean(o.enabled),
    used: Boolean(o.used),
    label: String(o.label ?? ""),
    skipReason: o.skipReason != null ? String(o.skipReason) : undefined,
  };
}

export function sideSearchDisplayLabel(display: SideSearchDisplay): string {
  return DISPLAY_LABEL[display];
}
