import { PROVIDER_CONFIG } from "@/config/providers";
import type { ProviderId } from "@/config/providers";
import type { ApiKeys } from "@/lib/secure-api-keys";

export type ResolvedProvider = {
  name: string;
  model: string;
  key: string;
  extras: Record<string, string | undefined>;
};

/** Resolve BYOK keys/relay config for one model slot (same logic as legacy compare). */
export function resolveProviderForSlot(
  providerId: string,
  modelId: string,
  apiKeys: ApiKeys,
  getApiKey: (id: ProviderId) => string | null
): ResolvedProvider | null {
  let key = getApiKey(providerId as ProviderId);
  let name = providerId;

  if (providerId === "anthropic" && !key) {
    if ((apiKeys.claudeProvider || "anthropic") === "openrouter") {
      const relay = getApiKey("meta");
      if (relay) {
        key = relay;
        name = "meta";
      }
    }
  }

  if (providerId === "google" && !key) {
    if ((apiKeys.googleProvider || "google") === "openrouter") {
      const relay = getApiKey("meta");
      if (relay) {
        key = relay;
        name = "meta";
      }
    }
  }

  if (!key) return null;

  const extras: Record<string, string | undefined> = {};

  if (name === "meta") {
    const relayId = apiKeys.metaRelayProvider || "openrouter";
    const relayConfig = PROVIDER_CONFIG.meta.relayConfig?.options.find((o) => o.id === relayId);
    if (relayConfig) {
      extras.base_url = relayConfig.baseUrl;
      extras.key_header = relayConfig.keyHeader;
    }
  } else if (name === "custom") {
    extras.base_url = apiKeys.customApiConfig?.baseUrl;
    extras.key_header = apiKeys.customApiConfig?.keyHeader;
  }

  return { name, model: modelId, key, extras };
}

/** Build BYOK headers for /api/v1/stream and /api/v1/ask. */
export function buildCompareHeaders(
  left: ResolvedProvider | null,
  right: ResolvedProvider | null,
  apiKeys: ApiKeys,
  getApiKey: (id: ProviderId) => string | null
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const assign = (provider: ResolvedProvider | null) => {
    if (!provider) return;
    if (provider.name === "openai") headers["X-OpenAI-API-Key"] = provider.key;
    if (provider.name === "google") headers["X-Google-API-Key"] = provider.key;
    if (provider.name === "anthropic") headers["X-Anthropic-API-Key"] = provider.key;
    if (provider.name === "meta") {
      headers["X-Meta-API-Key"] = provider.key;
      if (provider.extras.base_url) headers["X-Meta-Base-Url"] = provider.extras.base_url;
      if (provider.extras.key_header) headers["X-Meta-Key-Header"] = provider.extras.key_header;
    }
    if (provider.name === "custom") {
      headers["X-Custom-API-Key"] = provider.key;
      if (provider.extras.base_url) headers["X-Custom-Base-Url"] = provider.extras.base_url;
      if (provider.extras.key_header) headers["X-Custom-Key-Header"] = provider.extras.key_header;
    }
  };

  assign(left);
  assign(right);

  const anthropicKey = getApiKey("anthropic");
  if (anthropicKey && !headers["X-Anthropic-API-Key"]) {
    headers["X-Anthropic-API-Key"] = anthropicKey;
  }

  return headers;
}
