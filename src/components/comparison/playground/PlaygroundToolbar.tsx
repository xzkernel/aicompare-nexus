import { Activity, GitCompare, Layers, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ModelResponse } from "./types";
import { getPanelState } from "./types";
import {
  getSideSearchDisplay,
  isSearchActuallyUsed,
  sideSearchDisplayLabel,
} from "@/lib/search-capability-state";

type PlaygroundToolbarProps = {
  leftModelLabel: string;
  rightModelLabel: string;
  isComparing: boolean;
  promptTokens: number;
  leftResponse?: ModelResponse;
  rightResponse?: ModelResponse;
  divergenceScore?: number;
  searchPolicyActive?: boolean;
  groundingSummary?: {
    groundedMismatch: boolean;
    searchParityBreak?: boolean;
    citationOverlapPct: number;
    leftGrounded: boolean;
    rightGrounded: boolean;
  };
};

function runtimeSearchLabel(response: ModelResponse | undefined): string | null {
  if (!response?.searchCapability?.requested) return null;
  const display = getSideSearchDisplay(
    response.searchCapability,
    response.searchMetadata,
    response.searchPhase
  );
  return sideSearchDisplayLabel(display);
}

export function PlaygroundToolbar({
  leftModelLabel,
  rightModelLabel,
  isComparing,
  promptTokens,
  leftResponse,
  rightResponse,
  divergenceScore,
  searchPolicyActive,
  groundingSummary,
}: PlaygroundToolbarProps) {
  const { t } = useTranslation();
  const leftState = getPanelState(leftResponse);
  const rightState = getPanelState(rightResponse);
  const isStreaming = leftState === "streaming" || rightState === "streaming";
  const statusLabel = isComparing
    ? isStreaming
      ? t("playground.status.liveStream")
      : t("playground.status.connecting")
    : leftState === "success" && rightState === "success"
      ? t("playground.status.evaluationComplete")
      : leftState === "loading" ||
          rightState === "loading" ||
          leftState === "streaming" ||
          rightState === "streaming"
        ? t("playground.status.inProgress")
        : t("playground.status.ready");

  const leftSearch = runtimeSearchLabel(leftResponse);
  const rightSearch = runtimeSearchLabel(rightResponse);
  const anyUsed =
    isSearchActuallyUsed(leftResponse?.searchMetadata, leftResponse?.searchCapability, leftResponse?.searchPhase) ||
    isSearchActuallyUsed(rightResponse?.searchMetadata, rightResponse?.searchCapability, rightResponse?.searchPhase);

  return (
    <div className="flex flex-col gap-2 border-b border-stroke-subtle pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <GitCompare className="h-3.5 w-3.5 shrink-0 text-accent-cyan" strokeWidth={1.75} />
          <h1 className="truncate text-sm font-medium text-text-primary">{t("playground.modelEval")}</h1>
          <span className="mw-label-mono rounded px-1.5 py-0.5 text-[9px] text-text-muted ring-1 ring-stroke-subtle">
            {t("playground.dualCompare")}
          </span>
        </div>
        <p className="mt-0.5 truncate font-mono text-[10px] text-text-muted">
          {leftModelLabel} ↔ {rightModelLabel}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Metric icon={Activity} label="Status" value={statusLabel} accent={isComparing} />
        {searchPolicyActive && leftSearch && (
          <Metric label="A search" value={leftSearch} accent={groundingSummary?.leftGrounded} />
        )}
        {searchPolicyActive && rightSearch && (
          <Metric label="B search" value={rightSearch} accent={groundingSummary?.rightGrounded} />
        )}
        {searchPolicyActive && !anyUsed && (leftResponse || rightResponse) && !isComparing && (
          <Metric label="Search" value="Not used" />
        )}
        <Metric icon={Layers} label="Prompt" value={`~${promptTokens} tok`} />
        {divergenceScore !== undefined && (
          <Metric icon={Zap} label="Divergence" value={`${divergenceScore}%`} accent={divergenceScore > 30} />
        )}
        {groundingSummary?.searchParityBreak && (
          <Metric label="Parity" value="BROKEN" accent />
        )}
        {groundingSummary?.groundedMismatch && !groundingSummary.searchParityBreak && (
          <Metric label="Grounding" value="MISMATCH" accent />
        )}
        {groundingSummary &&
          (groundingSummary.leftGrounded || groundingSummary.rightGrounded) &&
          groundingSummary.citationOverlapPct < 100 && (
            <Metric label="Citations" value={`${groundingSummary.citationOverlapPct}% overlap`} />
          )}
        {leftResponse?.responseTime ? (
          <Metric label="L latency" value={`${Math.round(leftResponse.responseTime)}ms`} />
        ) : null}
        {rightResponse?.responseTime ? (
          <Metric label="R latency" value={`${Math.round(rightResponse.responseTime)}ms`} />
        ) : null}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon?: typeof Activity;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Icon && <Icon className="h-3 w-3 text-text-muted" strokeWidth={1.75} />}
      <span className="mw-label-mono text-text-muted">{label}</span>
      <span className={cn("font-mono text-[11px]", accent ? "text-accent-cyan" : "text-text-secondary")}>
        {value}
      </span>
    </div>
  );
}
