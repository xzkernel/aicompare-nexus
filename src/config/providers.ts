/**
 * Provider configuration (BYOK keys, relay, branding).
 * Model lists come from GET /api/v1/models — see src/lib/model-registry.
 */

export type ProviderId = "openai" | "google" | "anthropic" | "meta" | "custom";

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  description: string;
  logo: string;
  color: string;
  keyName: string;
  docUrl?: string;
  status: "active" | "coming-soon";
  website?: string;
  relayLabel?: string | null;
  apiKeyFormat?: {
    prefix: string;
    example: string;
    validation: RegExp;
  };
  relayConfig?: {
    options: Array<{
      id: string;
      label: string;
      baseUrl: string;
      keyHeader: string;
    }>;
  };
}

/** Static provider metadata — models hydrated from registry API. */
export const PROVIDER_CONFIG: Record<ProviderId, ProviderConfig> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    description: "GPT-4o family",
    logo: "/logos/openai.svg",
    color: "from-[#10A37F] to-[#0D8A6F]",
    keyName: "openaiKey",
    docUrl: "https://platform.openai.com/docs",
    status: "active",
    website: "https://openai.com",
    apiKeyFormat: {
      prefix: "sk-",
      example: "sk-...",
      validation: /^sk-[a-zA-Z0-9]{20,}$/,
    },
  },
  google: {
    id: "google",
    label: "Google",
    description: "Gemini 2.5 models",
    logo: "/logos/google-ai.svg",
    color: "from-[#4285F4] to-[#34A853]",
    keyName: "googleKey",
    docUrl: "https://ai.google.dev/docs",
    status: "active",
    website: "https://ai.google.dev",
    apiKeyFormat: {
      prefix: "AIza",
      example: "AIzaSy...",
      validation: /^AIza[a-zA-Z0-9]{20,}$/,
    },
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    description: "Claude 4 family",
    logo: "/logos/anthropic.svg",
    color: "from-[#6B46C1] to-[#805AD5]",
    keyName: "anthropicKey",
    relayLabel: "OpenRouter",
    docUrl: "https://docs.anthropic.com",
    status: "active",
    website: "https://anthropic.com",
    apiKeyFormat: {
      prefix: "sk-ant-",
      example: "sk-ant-...",
      validation: /^sk-ant-[a-zA-Z0-9]{20,}$/,
    },
  },
  meta: {
    id: "meta",
    label: "OpenRouter",
    description: "Frontier OSS & relay endpoints",
    logo: "/logos/meta-ai.svg",
    color: "from-[#1877F2] to-[#42A5F5]",
    keyName: "metaRelayKey",
    relayLabel: "OpenRouter",
    docUrl: "https://openrouter.ai/docs",
    status: "active",
    website: "https://openrouter.ai",
    apiKeyFormat: {
      prefix: "sk-or-",
      example: "sk-or-...",
      validation: /^sk-[a-zA-Z0-9-]{20,}$/,
    },
    relayConfig: {
      options: [
        {
          id: "openrouter",
          label: "OpenRouter",
          baseUrl: "https://openrouter.ai/api",
          keyHeader: "Authorization",
        },
        {
          id: "together",
          label: "Together AI",
          baseUrl: "https://api.together.ai",
          keyHeader: "Authorization",
        },
      ],
    },
  },
  custom: {
    id: "custom",
    label: "Custom HTTP",
    description: "OpenAI-compatible endpoint",
    logo: "/logos/api.svg",
    color: "from-[#F59E0B] to-[#FBBF24]",
    keyName: "customApiKey",
    status: "active",
    apiKeyFormat: {
      prefix: "custom-",
      example: "custom-...",
      validation: /^custom-[a-zA-Z0-9]{10,}$/,
    },
  },
};

/** @deprecated Use PROVIDER_CONFIG — kept for gradual migration */
export const PROVIDERS = PROVIDER_CONFIG;

export type ProviderDef = ProviderConfig;

export const getProvider = (id: ProviderId): ProviderConfig => PROVIDER_CONFIG[id];

export const getAllProviders = (): ProviderConfig[] => Object.values(PROVIDER_CONFIG);

export const getActiveProviders = (): ProviderConfig[] =>
  Object.values(PROVIDER_CONFIG).filter((p) => p.status === "active");

export const validateApiKey = (providerId: ProviderId, apiKey: string): boolean => {
  const provider = PROVIDER_CONFIG[providerId];
  if (!provider?.apiKeyFormat) return false;
  return provider.apiKeyFormat.validation.test(apiKey);
};

export const getApiKeyExample = (providerId: ProviderId): string =>
  PROVIDER_CONFIG[providerId]?.apiKeyFormat?.example || "your-api-key";

export const getProviderDisplayName = (id: ProviderId): string =>
  PROVIDER_CONFIG[id]?.label || id;

export const getProviderLogo = (id: ProviderId): string =>
  PROVIDER_CONFIG[id]?.logo || "/logos/api.svg";

export const getProviderColor = (id: ProviderId): string =>
  PROVIDER_CONFIG[id]?.color || "from-[#6B7280] to-[#9CA3AF]";
