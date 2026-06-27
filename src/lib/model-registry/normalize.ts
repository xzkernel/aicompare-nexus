import type {
  ModelRegistryResponse,
  ModelOption,
  NormalizedRegistry,
  RegistryModel,
  RegistryProvider,
  RegistryProviderId,
  RegistryFilters,
} from "@/types/registry";

const PROVIDER_ORDER: RegistryProviderId[] = [
  "openai",
  "google",
  "anthropic",
  "meta",
  "custom",
];

function safeModel(raw: Record<string, unknown>, providerId: RegistryProviderId): RegistryModel {
  return {
    id: String(raw.id ?? "unknown"),
    name: String(raw.name ?? raw.id ?? "Unknown"),
    provider: (raw.provider as RegistryProviderId) || providerId,
    supportsStreaming: raw.supportsStreaming !== false,
    contextWindow: String(raw.contextWindow ?? "—"),
    multimodal: Boolean(raw.multimodal),
    reasoning: Boolean(raw.reasoning),
    supportsWebSearch: raw.supportsWebSearch !== false && (
      raw.supportsWebSearch === true ||
      providerId === "google" ||
      providerId === "anthropic" ||
      providerId === "meta"
    ),
    freeTier: Boolean(raw.freeTier),
    openSource: Boolean(raw.openSource),
    relaySupported: Boolean(raw.relaySupported ?? providerId === "meta"),
    openRouterId: raw.openRouterId != null ? String(raw.openRouterId) : undefined,
    typicalLatency: raw.typicalLatency != null ? String(raw.typicalLatency) : "~2.0s",
    source: raw.source as RegistryModel["source"],
  };
}

function safeProvider(raw: Record<string, unknown>): RegistryProvider {
  const id = String(raw.id ?? "custom") as RegistryProviderId;
  const modelsRaw = Array.isArray(raw.models) ? raw.models : [];
  return {
    id,
    label: String(raw.label ?? id),
    description: String(raw.description ?? ""),
    relayLabel: raw.relayLabel != null ? String(raw.relayLabel) : null,
    models: modelsRaw.map((m) => safeModel(m as Record<string, unknown>, id)),
  };
}

/** Normalize API payload into indexed registry structures. */
export function normalizeRegistryResponse(data: ModelRegistryResponse): NormalizedRegistry {
  const providers = (data.providers ?? [])
    .map((p) => safeProvider(p as unknown as Record<string, unknown>))
    .sort(
      (a, b) =>
        PROVIDER_ORDER.indexOf(a.id) - PROVIDER_ORDER.indexOf(b.id)
    );

  const byFullId = new Map<string, RegistryModel>();
  const options: ModelOption[] = [];

  for (const provider of providers) {
    for (const model of provider.models) {
      const value = `${provider.id}:${model.id}`;
      byFullId.set(value, model);
      options.push({
        value,
        label: model.name,
        group: provider.label,
        providerId: provider.id,
        model,
      });
    }
  }

  return {
    version: data.version ?? "1",
    updatedAt: data.updatedAt ?? null,
    providers,
    byFullId,
    options,
    openRouterHydrated: Boolean(data.openRouterHydrated),
    degraded: Boolean(data.degraded),
    fingerprint: data.fingerprint ?? "unknown",
  };
}

export function applyRegistryFilters(
  options: ModelOption[],
  filters: RegistryFilters
): ModelOption[] {
  return options.filter((opt) => {
    const m = opt.model;
    if (filters.freeOnly && !m.freeTier) return false;
    if (filters.streamingOnly && !m.supportsStreaming) return false;
    if (filters.ossOnly && !m.openSource) return false;
    return true;
  });
}

export function groupOptionsByProvider(
  options: ModelOption[]
): Record<string, ModelOption[]> {
  return options.reduce<Record<string, ModelOption[]>>((acc, opt) => {
    if (!acc[opt.group]) acc[opt.group] = [];
    acc[opt.group].push(opt);
    return acc;
  }, {});
}

export function filterOptionsBySearch(
  options: ModelOption[],
  query: string
): ModelOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((opt) => {
    const hay = [
      opt.label,
      opt.value,
      opt.model.id,
      opt.group,
      opt.providerId,
      opt.model.openRouterId ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function parseModelValue(value: string): { providerId: string; modelId: string } {
  const idx = value.indexOf(":");
  if (idx < 0) return { providerId: "unknown", modelId: value };
  return {
    providerId: value.slice(0, idx),
    modelId: value.slice(idx + 1),
  };
}

export function isKnownModelValue(
  registry: NormalizedRegistry | null,
  value: string
): boolean {
  if (!registry) return true;
  return registry.byFullId.has(value);
}
