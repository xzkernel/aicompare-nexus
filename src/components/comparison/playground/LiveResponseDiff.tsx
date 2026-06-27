import { cn } from "@/lib/utils";

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
  const maxLatency = Math.max(leftLatency ?? 0, rightLatency ?? 0, 1);
  const leftPct = leftLatency ? Math.min(100, (leftLatency / maxLatency) * 100) : isComparing ? 35 : 0;
  const rightPct = rightLatency ? Math.min(100, (rightLatency / maxLatency) * 100) : isComparing ? 28 : 0;

  if (!isComparing && !leftLatency && !rightLatency && divergenceScore === 0) {
    return null;
  }

  return (
    <div className="border border-stroke-subtle bg-bg-soft/30 px-3 py-2">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="mw-label-mono text-text-muted">Live divergence analysis</span>
        <span className="font-mono text-[11px] text-accent-cyan">{divergenceScore}% structural delta</span>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-3">
        <LatencyBar label="Model A" pct={leftPct} active={isComparing && !leftLatency} ms={leftLatency} />
        <LatencyBar label="Model B" pct={rightPct} active={isComparing && !rightLatency} ms={rightLatency} />
      </div>

      <p className="font-mono text-[10px] text-text-muted">
        {sharedLines}/{totalLines} aligned segments · divergent lines highlighted in output panels
        {searchParityBreak && (
          <span className="text-accent-yellow">
            {" "}
            · search parity broken — one model used native search, one did not
          </span>
        )}
        {groundedMismatch && !searchParityBreak && (
          <span className="text-accent-yellow">
            {" "}
            · factual divergence: one model grounded, one not (
            {leftGrounded ? "A grounded" : "A not grounded"} /{" "}
            {rightGrounded ? "B grounded" : "B not grounded"})
          </span>
        )}
        {citationOverlapPct != null &&
          (leftGrounded || rightGrounded) &&
          citationOverlapPct < 100 && (
            <span className="text-accent-cyan/80"> · citation overlap {citationOverlapPct}%</span>
          )}
      </p>
    </div>
  );
}

function LatencyBar({
  label,
  pct,
  active,
  ms,
}: {
  label: string;
  pct: number;
  active?: boolean;
  ms?: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-[10px] text-text-muted">
        <span>{label}</span>
        <span className={cn(ms !== undefined && "text-accent-cyan")}>
          {ms !== undefined ? `${Math.round(ms)}ms` : active ? "…" : "—"}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-bg-paper">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-base",
            active ? "animate-pulse bg-accent-cyan/40" : "bg-accent-cyan/70"
          )}
          style={{ width: `${Math.max(pct, active ? 20 : 0)}%` }}
        />
      </div>
    </div>
  );
}
