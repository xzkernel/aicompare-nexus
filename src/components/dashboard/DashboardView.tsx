import { NoAPIKeyBanner } from "@/components/NoAPIKeyBanner";
import { ComparisonSessionList } from "@/components/sessions/ComparisonSessionList";
import { DashboardMetricsStrip } from "./DashboardMetricsStrip";
import { DashboardLiveActivity } from "./DashboardLiveActivity";
import { DashboardModelRegistry } from "./DashboardModelRegistry";

/**
 * Stitch layout: 12-col grid bento cards (5+7), model registry table, sessions.
 * Background: perspective-grid is applied by Shell.
 */
export function DashboardView() {
  return (
    <div className="space-y-[24px]">
      <NoAPIKeyBanner />

      {/* 12-col grid: Workspace Summary (5) + Live Activity (7) */}
      <section className="grid grid-cols-12 gap-[24px]">

        {/* Workspace Summary — col-span-5 */}
        <div className="col-span-12 flex flex-col overflow-hidden border border-white/[0.06] bg-[#0e0e0e] lg:col-span-5">
          <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#1c1b1b] px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
              WORKSPACE_SUMMARY.SYS
            </span>
            <div className="flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-white/20" />
              <span className="h-2 w-2 rounded-full bg-white/20" />
              <span className="h-2 w-2 rounded-full bg-white/20" />
            </div>
          </div>
          <div className="flex-1 p-[24px]">
            <DashboardMetricsStrip />
          </div>
          <div className="flex items-center justify-between border-t border-white/[0.06] bg-[#1c1b1b] px-4 py-3">
            <span className="font-mono text-[10px] uppercase text-[#5de6ff]">
              STATUS: OPERATIONAL
            </span>
            <span className="font-mono text-[10px] text-white/30">
              BYOK: Active
            </span>
          </div>
        </div>

        {/* Live Comparison Stream — col-span-7 */}
        <div className="col-span-12 flex flex-col overflow-hidden border border-white/[0.06] bg-[#0e0e0e] lg:col-span-7">
          <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#1c1b1b] px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#5de6ff]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white">
                LIVE_COMPARISON_STREAM
              </span>
            </div>
          </div>
          <div className="flex-1">
            <DashboardLiveActivity />
          </div>
        </div>

      </section>

      {/* Model Registry */}
      <DashboardModelRegistry />

      {/* Session history */}
      <section className="border border-white/[0.06] bg-[#0e0e0e]">
        <div className="border-b border-white/[0.06] bg-[#1c1b1b] px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
            BENCHMARK_SESSIONS
          </span>
        </div>
        <div className="p-[24px]">
          <ComparisonSessionList compact limit={6} />
        </div>
      </section>
    </div>
  );
}
