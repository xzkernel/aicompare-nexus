type LiveResponseDiffProps = {
  divergenceScore: number;
  sharedLines: number;
  totalLines: number;
  leftLatency?: number;
  rightLatency?: number;
  isComparing: boolean;
  groundedMismatch?: boolean;
  searchParityBreak?: boolean;
  citationOverlapPct?: number;
  leftGrounded?: boolean;
  rightGrounded?: boolean;
};

export function LiveResponseDiff({
  divergenceScore,
  sharedLines,
  totalLines,
  leftLatency,
  rightLatency,
  isComparing,
  groundedMismatch,
  searchParityBreak,
  citationOverlapPct,
  leftGrounded,
  rightGrounded,
}: LiveResponseDiffProps) {
  if (!isComparing && !leftLatency && !rightLatency && divergenceScore === 0) return null;

  return (
    <div className="flex flex-col gap-2 border border-stroke-subtle bg-bg-soft/25 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="mw-label-mono text-text-muted">Analysis</span>
        <span className="font-mono text-[10px] text-text-secondary">
          {isComparing ? "Live" : "Complete"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <AnalysisMetric label="Delta" value={`${divergenceScore}%`} accent={divergenceScore > 30} />
        <AnalysisMetric label="Aligned" value={`${sharedLines}/${totalLines}`} />
        <AnalysisMetric label="A" value={leftLatency ? `${Math.round(leftLatency)}ms` : "..."} />
        <AnalysisMetric label="B" value={rightLatency ? `${Math.round(rightLatency)}ms` : "..."} />
        {searchParityBreak && <AnalysisMetric label="Search" value="Asymmetric" warning />}
        {groundedMismatch && !searchParityBreak && <AnalysisMetric label="Grounding" value="Mismatch" warning />}
        {citationOverlapPct != null && (leftGrounded || rightGrounded) && (
          <AnalysisMetric label="Citations" value={`${citationOverlapPct}%`} />
        )}
      </div>
    </div>
  );
}

function AnalysisMetric({
  label,
  value,
  accent,
  warning,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px]">
      <span className="uppercase tracking-wider text-text-muted">{label}</span>
      <span className={warning ? "text-accent-yellow" : accent ? "text-accent-cyan" : "text-text-secondary"}>
        {value}
      </span>
    </div>
  );
}
