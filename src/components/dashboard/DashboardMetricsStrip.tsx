import { useSecureApiKeys } from "@/lib/secure-api-keys";
import { useComparisonSessions } from "@/hooks/use-comparison-sessions";
import {
  averageTypicalLatencyMs,
  countActiveProviders,
  countRegistryModels,
  routingHealthLabel,
} from "./dashboard-utils";

/**
 * Stitch style: all-caps mono labels, cyan for key values, 2-col grid inside card.
 */

export function DashboardMetricsStrip() {
  const { getApiKeyStatus } = useSecureApiKeys();
  const { stats } = useComparisonSessions();
  const status = getApiKeyStatus();
  const routing = routingHealthLabel(status);
  const active = countActiveProviders(status);

  const avgLatency =
    stats.avgLatencyMs != null
      ? `${stats.avgLatencyMs}ms`
      : averageTypicalLatencyMs();

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
            ACTIVE_PROVIDERS
          </p>
          <h3 className="font-mono text-2xl text-[#5de6ff]">{active}</h3>
          <p className="font-mono text-[10px] text-white/30">of 5 BYOK slots</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
            AVG_LATENCY
          </p>
          <h3 className="font-mono text-2xl text-[#5de6ff]">{avgLatency}</h3>
          <div className="mt-2 h-1 w-full overflow-hidden bg-[#1c1b1b]">
            <div className="h-full w-2/3 bg-[#5de6ff] opacity-30" />
          </div>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
            REGISTRY_MODELS
          </p>
          <h3 className="font-mono text-2xl text-white">{countRegistryModels()}</h3>
          <p className="font-mono text-[10px] text-white/30">evaluable endpoints</p>
        </div>
      </div>

      <div className="space-y-4 border-l border-white/[0.06] pl-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
            ROUTING_HEALTH
          </p>
          <h3 className="font-mono text-2xl text-white">{routing.label}</h3>
          <p className="font-mono text-[10px] uppercase mt-1 text-white/30">
            {status.hasValidKeys ? "compare ready" : "keys required"}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
            BENCHMARK_SESSIONS
          </p>
          <h3 className="font-mono text-2xl text-white">{stats.total}</h3>
          <p className="font-mono text-[10px] text-white/30">
            {stats.pinned ? `${stats.pinned} pinned` : "local history"}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
            THROUGHPUT
          </p>
          <div className="flex h-8 items-end gap-1">
            {[20, 40, 60, 80, 50, 70, 60].map((h, i) => (
              <div
                key={i}
                className="w-1 bg-[#5de6ff]"
                style={{ height: `${h}%`, opacity: 0.2 + (i / 7) * 0.8 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
