import { describe, expect, it } from "vitest";

import { resolveProviderForSlot } from "./compare-request";
import type { ApiKeys } from "./secure-api-keys";
import type { ProviderId } from "@/config/providers";
import { PROVIDER_CONFIG } from "@/config/providers";

const keys: ApiKeys = {
  openaiKey: "",
  googleKey: "direct-google-key",
  anthropicKey: "direct-anthropic-key",
  opencodeKey: "",
  metaRelayKey: "relay-key",
  customApiKey: "",
  googleProvider: "openrouter",
  claudeProvider: "openrouter",
  metaRelayProvider: "openrouter",
};

const testKeys: Partial<Record<ProviderId, string>> = {
  google: "direct-google-key",
  anthropic: "direct-anthropic-key",
  meta: "relay-key",
};
const getApiKey = (provider: ProviderId) => testKeys[provider] ?? null;

describe("resolveProviderForSlot", () => {
  it("treats an explicit relay preference as authoritative", () => {
    const togetherSelected = { ...keys, metaRelayProvider: "together" as const };
    const google = resolveProviderForSlot("google", "vendor:model", togetherSelected, getApiKey);
    expect(google).toMatchObject({
      name: "meta",
      model: "vendor:model",
      key: "relay-key",
    });
    const openRouterUrl = PROVIDER_CONFIG.meta.relayConfig?.options.find((option) => option.id === "openrouter")?.baseUrl;
    const togetherUrl = PROVIDER_CONFIG.meta.relayConfig?.options.find((option) => option.id === "together")?.baseUrl;
    expect(google?.extras.base_url).toBe(openRouterUrl);
    expect(google?.extras.base_url).not.toBe(togetherUrl);
    expect(resolveProviderForSlot("anthropic", "claude", keys, getApiKey)?.name).toBe("meta");
  });
});
