import { cn } from "@/lib/utils";
import type { SearchPhase } from "@/lib/search-metadata";
import {
  getSideSearchDisplay,
  isSearchActuallyUsed,
  sideSearchDisplayLabel,
  type SideSearchCapability,
} from "@/lib/search-capability-state";

type GroundedBadgeProps = {
  phase: SearchPhase;
  searchCapability?: SideSearchCapability;
  citationCount?: number;
  searchLatencyMs?: number;
  used?: boolean;
  compact?: boolean;
};

export function GroundedBadge({
  phase,
  searchCapability,
  citationCount = 0,
  searchLatencyMs,
  used,
  compact,
}: GroundedBadgeProps) {
  if (!searchCapability?.requested) return null;

  const display = getSideSearchDisplay(searchCapability, undefined, phase);
  const actuallyUsed = used ?? isSearchActuallyUsed(undefined, searchCapability, phase);

  if (display === "off") return null;

  const label =
    actuallyUsed && citationCount > 0
      ? `Search used · ${citationCount} src`
      : sideSearchDisplayLabel(display);

  const active = display === "searching" || display === "grounded";
  const warn = display === "unsupported" || display === "not-used" || display === "skipped";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide ring-1",
        active
          ? "text-accent-cyan ring-accent-cyan/40"
          : warn
            ? "text-accent-yellow ring-accent-yellow/30"
            : "text-text-muted ring-stroke-subtle"
      )}
      title={searchCapability.skipReason ?? searchCapability.label}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          display === "searching"
            ? "animate-pulse bg-accent-cyan"
            : actuallyUsed
              ? "bg-accent-green"
              : "bg-text-muted/40"
        )}
        aria-hidden
      />
      <span>{label}</span>
      {!compact && searchLatencyMs != null && searchLatencyMs > 0 && actuallyUsed && (
        <span className="text-text-muted">· {searchLatencyMs}ms</span>
      )}
    </div>
  );
}
