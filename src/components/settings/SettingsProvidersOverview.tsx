import { PROVIDER_CONFIG, type ProviderId } from "@/config/providers";
import { getModelMeta, getRoutingLabel } from "@/components/comparison/playground/model-metadata";
import { useModelRegistry } from "@/hooks/use-model-registry";
import { cn } from "@/lib/utils";
import type { ApiKeys } from "@/lib/secure-api-keys";

const PROVIDER_IDS: ProviderId[] = [
  "openai",
  "google",
  "anthropic",
  "opencode-go",
  "opencode-zen",
  "meta",
  "custom",
];

type Props = {
  apiKeys: ApiKeys;
  validity: Record<ProviderId, boolean>;
};

export function SettingsProvidersOverview({ apiKeys, validity }: Props) {
  const { registry } = useModelRegistry();

  const modelCountByProvider = (id: ProviderId): number => {
    const p = registry?.providers.find((x) => x.id === id);
    return p?.models.length ?? 0;
  };

  return (
    <div className="overflow-x-auto border border-stroke-subtle">
      <table className="w-full min-w-[640px] text-left font-mono text-[11px]">
        <thead>
          <tr className="border-b border-stroke-subtle bg-bg-soft/50 text-text-muted">
            <th className="px-3 py-2 font-medium uppercase tracking-wider">Provider</th>
            <th className="px-3 py-2 font-medium uppercase tracking-wider">Relay</th>
            <th className="px-3 py-2 font-medium uppercase tracking-wider">State</th>
            <th className="px-3 py-2 font-medium uppercase tracking-wider">Routing</th>
            <th className="px-3 py-2 font-medium uppercase tracking-wider">Context</th>
            <th className="px-3 py-2 font-medium uppercase tracking-wider">Stream</th>
            <th className="px-3 py-2 font-medium uppercase tracking-wider">Models</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stroke-subtle">
          {PROVIDER_IDS.map((id) => {
            const def = PROVIDER_CONFIG[id];
            const sample = registry?.providers.find((p) => p.id === id)?.models[0];
            const sampleId = sample ? `${id}:${sample.id}` : `${id}:—`;
            const meta = getModelMeta(sampleId);
            const routing = getRoutingLabel(id, apiKeys);
            const ok = validity[id];
            return (
              <tr key={id} className="hover:bg-bg-paper/30">
                <td className="px-3 py-2 text-text-primary">{def.label}</td>
                <td className="px-3 py-2 text-text-muted">{def.relayLabel ?? "—"}</td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5",
                      ok ? "text-accent-green" : "text-text-muted"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-accent-cyan" : "bg-text-muted")} />
                    {ok ? "configured" : "missing"}
                  </span>
                </td>
                <td className="px-3 py-2 text-text-secondary">{routing}</td>
                <td className="px-3 py-2 text-text-secondary">{meta.contextWindow}</td>
                <td className="px-3 py-2 text-text-secondary">{meta.streaming ? "yes" : "no"}</td>
                <td className="px-3 py-2 text-text-secondary">{modelCountByProvider(id)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
