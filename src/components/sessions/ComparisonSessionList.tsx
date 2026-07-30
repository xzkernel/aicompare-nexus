import { Link } from "react-router-dom";
import { Pin, PinOff, Trash2, ExternalLink } from "lucide-react";
import { useComparisonSessions } from "@/hooks/use-comparison-sessions";
import { cn } from "@/lib/utils";
import { getModelDisplayName } from "@/lib/model-registry";

function formatModel(model: string) {
  return getModelDisplayName(model);
}

function formatVerdict(verdict: "left" | "tie" | "right" | undefined) {
  if (verdict === "left") return "Verdict: Model A";
  if (verdict === "right") return "Verdict: Model B";
  if (verdict === "tie") return "Verdict: Tie";
  return null;
}

type Props = {
  compact?: boolean;
  limit?: number;
};

export function ComparisonSessionList({ compact, limit = 12 }: Props) {
  const { sessions, remove, togglePin, clearAll } = useComparisonSessions();
  const shown = sessions.slice(0, limit);

  if (!shown.length) {
    return (
      <p className="font-mono text-[11px] text-text-muted">
        No saved comparisons yet. Run an evaluation in the workbench to build history.
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", compact && "space-y-1")}>
      {!compact && (
        <div className="flex items-center justify-between gap-2">
          <span className="mw-label-mono text-text-muted">Recent sessions</span>
          <button
            type="button"
            onClick={() => {
              if (confirm("Clear all comparison history?")) clearAll();
            }}
            className="font-mono text-[10px] text-text-muted hover:text-accent-red"
          >
            clear history
          </button>
        </div>
      )}
      <ul className="divide-y divide-stroke-subtle border border-stroke-subtle">
        {shown.map((s) => (
          <li key={s.id} className="flex items-start gap-2 px-3 py-2 hover:bg-bg-paper/30">
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[11px] text-text-primary">{s.prompt}</p>
              <p className="mt-0.5 font-mono text-[10px] text-text-muted">
                {formatModel(s.leftModel)} ↔ {formatModel(s.rightModel)}
                {s.leftTimeMs || s.rightTimeMs
                  ? ` · ${Math.round((s.leftTimeMs ?? 0) + (s.rightTimeMs ?? 0))}ms`
                  : ""}
              </p>
              <p className="font-mono text-[10px] text-text-muted">
                {new Date(s.timestamp).toLocaleString()}
                {formatVerdict(s.verdict) ? ` · ${formatVerdict(s.verdict)}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => togglePin(s.id)}
                className="p-1 text-text-muted hover:text-text-primary"
                aria-label={s.pinned ? "Unpin" : "Pin"}
              >
                {s.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
              <Link
                to={`/playground?session=${s.id}`}
                className="p-1 text-accent-cyan hover:text-accent-cyan/80"
                aria-label="Reopen"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="p-1 text-text-muted hover:text-accent-red"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
