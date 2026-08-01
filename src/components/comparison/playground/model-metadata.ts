import { getCachedRegistry } from "@/lib/model-registry/client";
import { getProviderLabel } from "@/lib/model-registry/helpers";
import { parseModelValue } from "@/lib/model-registry/normalize";
import { PROVIDER_CONFIG } from "@/config/providers";
import {
  hasValidCustomBaseUrl,
  isValidProviderApiKey,
  type ApiKeys,
} from "@/lib/secure-api-keys";

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
  if (providerId === "google" && apiKeys.googleProvider === "openrouter") {
    return isValidProviderApiKey(apiKeys.metaRelayKey, "meta") ? "OpenRouter" : "no routes";
  }
  if (providerId === "anthropic" && apiKeys.claudeProvider === "openrouter") {
    return isValidProviderApiKey(apiKeys.metaRelayKey, "meta") ? "OpenRouter" : "no routes";
  }

  const hasDirect =
    (providerId === "openai" && isValidProviderApiKey(apiKeys.openaiKey, "openai")) ||
    (providerId === "google" && isValidProviderApiKey(apiKeys.googleKey, "google")) ||
    (providerId === "anthropic" && isValidProviderApiKey(apiKeys.anthropicKey, "anthropic")) ||
    ((providerId === "opencode-go" || providerId === "opencode-zen") && isValidProviderApiKey(apiKeys.opencodeKey, providerId)) ||
    (providerId === "meta" && isValidProviderApiKey(apiKeys.metaRelayKey, "meta")) ||
    (providerId === "custom" && isValidProviderApiKey(apiKeys.customApiKey, "custom") && hasValidCustomBaseUrl(apiKeys.customApiConfig?.baseUrl));

  if (providerId === "meta") {
    const relayId = apiKeys.metaRelayProvider || "openrouter";
    const opt = PROVIDER_CONFIG.meta.relayConfig?.options.find((o) => o.id === relayId);
    return opt?.label ?? "OpenRouter";
  }

  if (providerId === "opencode-go" || providerId === "opencode-zen") {
    return hasDirect ? "OpenCode" : "no routes";
  }

  if (hasDirect) return "Direct";
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
