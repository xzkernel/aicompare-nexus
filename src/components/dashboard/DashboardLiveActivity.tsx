import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useComparisonSessions } from "@/hooks/use-comparison-sessions";
import { getModelDisplayName } from "@/lib/model-registry";
import { cn } from "@/lib/utils";
import { EVALUATION_LANES, getLaneMeta, laneReadiness, latencyRaceLabel } from "./dashboard-utils";
import { useSecureApiKeys } from "@/lib/secure-api-keys";

function formatModel(model: string) {
  return getModelDisplayName(model);
}

export function DashboardLiveActivity() {
  const { getApiKeyStatus } = useSecureApiKeys();
  const { sessions, stats } = useComparisonSessions();
  const status = getApiKeyStatus();
  const recent = sessions.slice(0, 5);

  return (
    <section>
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <p className="font-mono text-[10px] uppercase text-white/30">
          {stats.total > 0 ? `${stats.total} saved comparisons` : "No comparisons yet"}
        </p>
        <Link
          to="/playground"
          className="flex items-center gap-1 font-mono text-[10px] text-[#5de6ff] hover:underline"
        >
          workbench <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {recent.length > 0 ? (
        <ul className="divide-y divide-white/[0.06]">
          {recent.map((s) => (
            <li key={s.id} className="px-4 py-3 hover:bg-white/5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="max-w-[70%] truncate font-mono text-[11px] text-white">
                  {s.prompt}
                </span>
                <Link
                  to={`/playground?session=${s.id}`}
                  className="font-mono text-[10px] text-[#5de6ff] hover:underline"
                >
                  reopen
                </Link>
              </div>
              <p className="mt-1 font-mono text-[10px] text-white/30">
                {formatModel(s.leftModel)} ↔ {formatModel(s.rightModel)}
                {(s.leftTimeMs || s.rightTimeMs) &&
                  ` · ${Math.round((s.leftTimeMs ?? 0) + (s.rightTimeMs ?? 0))}ms`}
                {s.pinned && " · pinned"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {EVALUATION_LANES.map((lane) => {
            const { ready, reason } = laneReadiness(lane, status);
            const { left, right } = getLaneMeta(lane);
            return (
              <li key={lane.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-white">{lane.label}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 font-mono text-[10px] uppercase",
                      ready
                        ? "border border-[#5de6ff]/20 bg-[#5de6ff]/10 text-[#5de6ff]"
                        : "border border-white/[0.06] text-white/30"
                    )}
                  >
                    {ready ? "READY" : "BLOCKED"}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] text-white/30">
                  {latencyRaceLabel(left.typicalLatency, right.typicalLatency)} · {reason}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
