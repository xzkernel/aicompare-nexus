import { Globe, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchMode } from "@/lib/search-metadata";
import {
  buildStaticSearchCapability,
  getSideSearchDisplay,
  sideSearchDisplayLabel,
  type SideSearchCapability,
} from "@/lib/search-capability-state";
import type { ModelResponse } from "./types";

type PlaygroundWebSearchControlsProps = {
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  leftProviderId: string;
  rightProviderId: string;
  leftRoute?: string;
  rightRoute?: string;
  leftResponse?: ModelResponse;
  rightResponse?: ModelResponse;
  isComparing?: boolean;
};

const MODES: { id: SearchMode; label: string; description: string }[] = [
  { id: "auto", label: "Auto", description: "Enable native search where each route supports it" },
  { id: "force", label: "Force", description: "Require search on supported routes only" },
  { id: "off", label: "Off", description: "Plain chat — no search tools" },
];

function SideSearchChip({
  slot,
  capability,
  response,
}: {
  slot: "A" | "B";
  capability: SideSearchCapability;
  response?: ModelResponse;
}) {
  const display = getSideSearchDisplay(
    response?.searchCapability ?? capability,
    response?.searchMetadata,
    response?.searchPhase
  );
  const label = sideSearchDisplayLabel(display);
  const tone =
    display === "grounded"
      ? "text-accent-green ring-accent-green/40"
      : display === "searching"
        ? "text-accent-cyan ring-accent-cyan/40"
        : display === "unsupported" || display === "skipped"
          ? "text-accent-yellow ring-accent-yellow/30"
          : display === "not-used"
            ? "text-accent-yellow ring-accent-yellow/30"
            : display === "ready"
              ? "text-text-secondary ring-stroke-subtle"
              : "text-text-muted ring-stroke-subtle";

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="mw-label-mono text-[9px] text-text-muted">Model {slot}</span>
      <span
        className={cn(
          "truncate rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide ring-1",
          tone
        )}
        title={capability.skipReason ?? capability.label}
      >
        {label}
      </span>
      <span className="truncate font-mono text-[9px] text-text-muted">{capability.label}</span>
    </div>
  );
}

export function PlaygroundWebSearchControls({
  searchMode,
  onSearchModeChange,
  leftProviderId,
  rightProviderId,
  leftRoute,
  rightRoute,
  leftResponse,
  rightResponse,
  isComparing,
}: PlaygroundWebSearchControlsProps) {
  const leftCap = buildStaticSearchCapability(leftProviderId, leftRoute, searchMode);
  const rightCap = buildStaticSearchCapability(rightProviderId, rightRoute, searchMode);
  const policyActive = searchMode !== "off";
  const parityNote =
    policyActive && leftCap.supported !== rightCap.supported
      ? "Search parity is asymmetric — divergence may reflect capability differences, not model quality."
      : policyActive && !leftCap.supported && !rightCap.supported
        ? "Neither route supports native search. Results are ungrounded chat completions."
        : null;

  return (
    <div className="flex flex-col gap-3 border border-stroke-subtle bg-bg-soft/20 px-3 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-accent-cyan" strokeWidth={1.75} />
          <span className="font-mono text-[11px] text-text-primary">Search policy</span>
          <span
            className={cn(
              "mw-label-mono rounded px-1.5 py-0.5 text-[9px] ring-1",
              policyActive
                ? "text-text-secondary ring-stroke-subtle"
                : "text-text-muted ring-stroke-subtle"
            )}
          >
            {policyActive ? `POLICY: ${searchMode.toUpperCase()}` : "POLICY: OFF"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={isComparing}
              title={m.description}
              onClick={() => onSearchModeChange(m.id)}
              className={cn(
                "rounded px-2 py-0.5 font-mono text-[10px] ring-1 transition-colors",
                searchMode === m.id
                  ? "bg-accent-cyan/10 text-accent-cyan ring-accent-cyan/40"
                  : "text-text-muted ring-stroke-subtle hover:text-text-secondary"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-stroke-subtle pt-2">
        <SideSearchChip slot="A" capability={leftCap} response={leftResponse} />
        <SideSearchChip slot="B" capability={rightCap} response={rightResponse} />
      </div>

      {parityNote && (
        <div className="flex items-start gap-1.5">
          <Info className="mt-0.5 h-3 w-3 shrink-0 text-accent-yellow" />
          <p className="font-mono text-[10px] text-text-muted">{parityNote}</p>
        </div>
      )}
    </div>
  );
}
