import { describe, expect, it } from "vitest";

import type { ApiKeys } from "@/lib/secure-api-keys";
import { getRoutingLabel } from "./model-metadata";

const keys: ApiKeys = {
  openaiKey: "",
  googleKey: "direct-google-key",
  anthropicKey: "direct-anthropic-key",
  opencodeKey: "opencode-key",
  metaRelayKey: "relay-key-123456789012345",
  customApiKey: "",
  googleProvider: "openrouter",
  claudeProvider: "openrouter",
  metaRelayProvider: "together",
};

describe("getRoutingLabel", () => {
  it("matches forced OpenRouter execution and keeps OpenCode independent", () => {
    expect(getRoutingLabel("google", keys)).toBe("OpenRouter");
    expect(getRoutingLabel("anthropic", keys)).toBe("OpenRouter");
    expect(getRoutingLabel("opencode-go", keys)).toBe("OpenCode");
    expect(getRoutingLabel("anthropic", {
      ...keys,
      claudeProvider: "anthropic",
      anthropicKey: "",
    })).toBe("no routes");
  });
});
