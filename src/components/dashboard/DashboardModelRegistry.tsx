import { getModelMeta, getRoutingLabel } from "@/components/comparison/playground/model-metadata";
import { ModelCapabilityBadges } from "@/components/ModelCapabilityBadges";
import { useModelRegistry } from "@/hooks/use-model-registry";
import { getModelCapabilities } from "@/lib/model-registry";
import { useSecureApiKeys } from "@/lib/secure-api-keys";
import type { ProviderId } from "@/config/providers";

export function DashboardModelRegistry() {
  const { apiKeys, getApiKeyStatus } = useSecureApiKeys();
  const { registry, loading, error, reload } = useModelRegistry();
  const status = getApiKeyStatus();
  const validity: Record<ProviderId, boolean> = {
    openai: status.openaiValid,
    google: status.googleValid,
    anthropic: status.anthropicValid,
    meta: status.metaValid,
    custom: status.customValid,
  };

  const rows = registry?.options ?? [];

  return (
    <section className="overflow-hidden border border-white/[0.06] bg-[#0e0e0e]">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#1c1b1b] px-4 py-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-white">
          MODEL_REGISTRY_METADATA
        </h2>
        <span className="font-mono text-[10px] uppercase text-white/40">
          {loading ? "syncing…" : `${rows.length} models`}
          {registry?.openRouterHydrated && " · OR+"}
          {registry?.degraded && " · offline catalog"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-white/[0.10] text-white/30">
              <th className="p-4 font-mono text-[10px] font-medium uppercase tracking-[0.3em]">MODEL_IDENTITY</th>
              <th className="p-4 font-mono text-[10px] font-medium uppercase tracking-[0.3em]">PROVIDER</th>
              <th className="p-4 font-mono text-[10px] font-medium uppercase tracking-[0.3em]">CONTEXT_WIN</th>
              <th className="p-4 font-mono text-[10px] font-medium uppercase tracking-[0.3em]">AVG_LATENCY</th>
              <th className="p-4 font-mono text-[10px] font-medium uppercase tracking-[0.3em]">CAPS</th>
              <th className="p-4 font-mono text-[10px] font-medium uppercase tracking-[0.3em]">ROUTING</th>
              <th className="p-4 font-mono text-[10px] font-medium uppercase tracking-[0.3em]">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {rows.map((opt) => {
              const [providerId] = opt.value.split(":");
              const meta = getModelMeta(opt.value);
              const routing = getRoutingLabel(providerId, apiKeys);
              const connected = validity[providerId as ProviderId];
              const badges = getModelCapabilities(opt.model);
              return (
                <tr key={opt.value} className="transition-colors hover:bg-white/5">
                  <td className="p-4 font-bold text-white">{opt.label}</td>
                  <td className="p-4 text-white/50">{opt.group}</td>
                  <td className="p-4 text-white/50">{meta.contextWindow}</td>
                  <td className="p-4 text-[#5de6ff]">{meta.typicalLatency}</td>
                  <td className="p-4">
                    <ModelCapabilityBadges badges={badges} max={4} />
                  </td>
                  <td className="p-4 text-white/50">{routing}</td>
                  <td className="p-4">
                    {connected ? (
                      <span className="border border-[#5de6ff]/20 bg-[#5de6ff]/10 px-2 py-0.5 text-[10px] text-[#5de6ff]">
                        LIVE
                      </span>
                    ) : (
                      <span className="border border-white/[0.06] px-2 py-0.5 text-[10px] text-white/30">
                        KEY_REQUIRED
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-white/40">
                  {registry?.degraded || error
                    ? "Backend offline — start API on port 8001, then "
                    : "Registry empty — "}
                  <button
                    type="button"
                    onClick={() => void reload()}
                    className="underline text-white/60 hover:text-white"
                  >
                    retry sync
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
