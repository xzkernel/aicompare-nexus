import { getCachedRegistry } from "@/lib/model-registry/client";
import { getProviderLabel, getRelayLabel } from "@/lib/model-registry/helpers";
import { parseModelValue } from "@/lib/model-registry/normalize";
import { PROVIDER_CONFIG, type ProviderId } from "@/config/providers";
import type { ApiKeys } from "@/lib/secure-api-keys";

export type ModelMeta = {
  contextWindow: string;
  streaming: boolean;
  multimodal: boolean;
  typicalLatency: string;
  reasoning?: boolean;
  freeTier?: boolean;
  openSource?: boolean;
};

const DEFAULT_META: ModelMeta = {
  contextWindow: "—",
  streaming: true,
  multimodal: false,
  typicalLatency: "~2.0s",
};

export function getModelMeta(modelString: string): ModelMeta {
  const reg = getCachedRegistry();
  const entry = reg?.byFullId.get(modelString);
  if (entry) {
    return {
      contextWindow: entry.contextWindow,
      streaming: entry.supportsStreaming,
      multimodal: entry.multimodal,
      typicalLatency: entry.typicalLatency ?? "~2.0s",
      reasoning: entry.reasoning,
      freeTier: entry.freeTier,
      openSource: entry.openSource,
    };
  }
  return DEFAULT_META;
}

export function getRoutingLabel(providerId: string, apiKeys: ApiKeys): string {
  const relay = getRelayLabel(providerId);
  const hasDirect =
    (providerId === "openai" && !!apiKeys.openaiKey) ||
    (providerId === "google" && !!apiKeys.googleKey) ||
    (providerId === "anthropic" && !!apiKeys.anthropicKey) ||
    (providerId === "meta" && !!apiKeys.metaRelayKey) ||
    (providerId === "custom" && !!apiKeys.customApiKey);

  if (providerId === "meta") {
    const relayId = apiKeys.metaRelayProvider || "openrouter";
    const opt = PROVIDER_CONFIG.meta.relayConfig?.options.find((o) => o.id === relayId);
    return opt?.label ?? "OpenRouter";
  }

  if (hasDirect) return "Direct";
  if (relay && apiKeys.metaRelayKey) return relay;
  return "no routes";
}

export function getProviderDisplayForSlot(modelString: string): {
  providerLabel: string;
  modelLabel: string;
} {
  const { providerId, modelId } = parseModelValue(modelString);
  const reg = getCachedRegistry();
  const entry = reg?.byFullId.get(modelString);
  return {
    providerLabel: getProviderLabel(providerId),
    modelLabel: entry?.name ?? modelId,
  };
}
