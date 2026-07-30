import { Scale, Timer, TextQuote } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ComparisonVerdict } from "@/lib/session-store";
import type { ModelResponse } from "./types";
import { estimateTokens } from "./types";

type EvaluationSummaryProps = {
  leftLabel: string;
  rightLabel: string;
  leftResponse?: ModelResponse;
  rightResponse?: ModelResponse;
  divergenceScore: number;
  sharedLines: number;
  totalLines: number;
  isComparing: boolean;
  verdict?: ComparisonVerdict;
  onVerdictChange: (verdict: ComparisonVerdict) => void;
  grounding: {
    searchParityBreak?: boolean;
    citationOverlapPct: number;
    leftGrounded: boolean;
    rightGrounded: boolean;
  };
};

export function EvaluationSummary({
  leftLabel,
  rightLabel,
  leftResponse,
  rightResponse,
  divergenceScore,
  sharedLines,
  totalLines,
  isComparing,
  verdict,
  onVerdictChange,
  grounding,
}: EvaluationSummaryProps) {
  const leftFinished = leftResponse?.status === "complete" || leftResponse?.status === "error";
  const rightFinished = rightResponse?.status === "complete" || rightResponse?.status === "error";
  const leftValid = leftResponse?.status === "complete" && Boolean(leftResponse.response.trim());
  const rightValid = rightResponse?.status === "complete" && Boolean(rightResponse.response.trim());
  const bothValid = leftValid && rightValid;

  if (isComparing || (!leftFinished && !rightFinished)) return null;

  const leftMs = leftResponse?.responseTime || 0;
  const rightMs = rightResponse?.responseTime || 0;
  const faster = bothValid && leftMs && rightMs
    ? leftMs === rightMs
      ? "Tie"
      : leftMs < rightMs
        ? leftLabel
        : rightLabel
    : "Incomplete";
  const leftTokens = leftResponse?.response ? estimateTokens(leftResponse.response) : 0;
  const rightTokens = rightResponse?.response ? estimateTokens(rightResponse.response) : 0;
  const groundingLabel = grounding.searchParityBreak
    ? "Asymmetric"
    : grounding.leftGrounded && grounding.rightGrounded
      ? `${grounding.citationOverlapPct}% citation overlap`
      : grounding.leftGrounded
        ? "Model A only"
        : grounding.rightGrounded
          ? "Model B only"
          : "Not used";

  return (
    <section className="border border-stroke-strong bg-bg-paper/40" aria-labelledby="evaluation-summary-title">
      <div className="flex flex-col gap-2 border-b border-stroke-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mw-label-mono text-text-muted">Evaluation</p>
          <h2 id="evaluation-summary-title" className="mt-1 text-base font-medium text-text-primary">
            Comparison summary
          </h2>
        </div>
        <p className="max-w-xl text-sm text-text-muted">
          Performance and structural signals help review the outputs, but they do not determine answer quality.
        </p>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-stroke-subtle sm:grid-cols-4 sm:divide-y-0">
        <SummaryMetric icon={Timer} label="Faster response" value={faster} />
        <SummaryMetric icon={Scale} label="Structural delta" value={`${divergenceScore}%`} detail={`${sharedLines}/${totalLines} aligned`} />
        <SummaryMetric icon={TextQuote} label="Estimated output" value={`A ${leftTokens} / B ${rightTokens}`} detail="tokens" />
        <SummaryMetric label="Grounding" value={groundingLabel} />
      </div>

      {bothValid && <div className="flex flex-col gap-3 border-t border-stroke-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary">Your verdict</p>
          <p className="text-xs text-text-muted">Record the stronger answer after reviewing both outputs.</p>
        </div>
        <div className="grid grid-cols-3 gap-1" role="group" aria-label="Comparison verdict">
          <VerdictButton active={verdict === "left"} onClick={() => onVerdictChange("left")}>Model A</VerdictButton>
          <VerdictButton active={verdict === "tie"} onClick={() => onVerdictChange("tie")}>Tie</VerdictButton>
          <VerdictButton active={verdict === "right"} onClick={() => onVerdictChange("right")}>Model B</VerdictButton>
        </div>
      </div>}
    </section>
  );
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon?: typeof Timer;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="min-w-0 px-4 py-3">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-text-muted" strokeWidth={1.75} />}
        <span className="mw-label-mono text-[9px] text-text-muted">{label}</span>
      </div>
      <p className="mt-1.5 truncate text-sm font-medium text-text-primary" title={value}>{value}</p>
      {detail && <p className="mt-0.5 font-mono text-[9px] text-text-muted">{detail}</p>}
    </div>
  );
}

function VerdictButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-w-20 rounded px-3 py-2 text-xs font-medium ring-1 transition-colors",
        active
          ? "bg-accent-cyan/10 text-accent-cyan ring-accent-cyan/40"
          : "text-text-muted ring-stroke-subtle hover:text-text-primary hover:ring-stroke-strong"
      )}
    >
      {children}
    </button>
  );
}
