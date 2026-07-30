import { GitCompare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ModelResponse } from "./types";
import { getPanelState } from "./types";

type PlaygroundToolbarProps = {
  leftModelLabel: string;
  rightModelLabel: string;
  isComparing: boolean;
  leftResponse?: ModelResponse;
  rightResponse?: ModelResponse;
};

export function PlaygroundToolbar({
  leftModelLabel,
  rightModelLabel,
  isComparing,
  leftResponse,
  rightResponse,
}: PlaygroundToolbarProps) {
  const { t } = useTranslation();
  const leftState = getPanelState(leftResponse);
  const rightState = getPanelState(rightResponse);
  const isStreaming = leftState === "streaming" || rightState === "streaming";
  const completedCount = Number(leftState === "success") + Number(rightState === "success");
  const failedCount = Number(leftState === "unavailable") + Number(rightState === "unavailable");
  const statusLabel = isComparing
    ? isStreaming
      ? t("playground.status.liveStream")
      : t("playground.status.connecting")
    : leftState === "success" && rightState === "success"
      ? t("playground.status.evaluationComplete")
      : completedCount === 1 && failedCount === 1
        ? "Partially complete"
        : failedCount === 2
          ? "Failed"
      : leftState === "loading" ||
          rightState === "loading" ||
          leftState === "streaming" ||
          rightState === "streaming"
        ? t("playground.status.inProgress")
        : t("playground.status.ready");

  return (
    <div className="flex flex-col gap-2 border-b border-stroke-subtle pb-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <GitCompare className="h-3.5 w-3.5 shrink-0 text-accent-cyan" strokeWidth={1.75} />
          <h1 className="truncate text-base font-medium text-text-primary">{t("playground.modelEval")}</h1>
          <span className="mw-label-mono rounded px-1.5 py-0.5 text-[9px] text-text-muted ring-1 ring-stroke-subtle">
            {t("playground.dualCompare")}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-text-muted">
          {leftModelLabel} ↔ {rightModelLabel}
        </p>
      </div>
      <span
        className={cn(
          "w-fit rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wider ring-1",
          isComparing ? "text-accent-cyan ring-accent-cyan/30" : "text-text-muted ring-stroke-subtle"
        )}
      >
        {statusLabel}
      </span>
    </div>
  );
}
