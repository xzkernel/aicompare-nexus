/**
 * Provider configuration (BYOK keys, relay, branding).
 * Model lists come from GET /api/v1/models — see src/lib/model-registry.
 */

export type ProviderId =
  | "openai"
  | "google"
  | "anthropic"
  | "opencode-go"
  | "opencode-zen"
  | "meta"
  | "custom";

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
  "opencode-go": {
    id: "opencode-go",
    label: "OpenCode Go",
    description: "Go subscription models",
    logo: "/logos/api.svg",
    color: "from-[#5DE6FF] to-[#3B82F6]",
    keyName: "opencodeKey",
    docUrl: "https://opencode.ai/docs/go/",
    status: "active",
    website: "https://opencode.ai",
    apiKeyFormat: {
      prefix: "",
      example: "OpenCode workspace key",
      validation: /^\S{6,}$/,
    },
  },
  "opencode-zen": {
    id: "opencode-zen",
    label: "OpenCode Zen",
    description: "Zen pay-as-you-go models",
    logo: "/logos/api.svg",
    color: "from-[#A78BFA] to-[#5DE6FF]",
    keyName: "opencodeKey",
    docUrl: "https://opencode.ai/docs/zen/",
    status: "active",
    website: "https://opencode.ai",
    apiKeyFormat: {
      prefix: "",
      example: "OpenCode workspace key",
      validation: /^\S{6,}$/,
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

export const getProviderDisplayName = (id: ProviderId): string =>
  PROVIDER_CONFIG[id]?.label || id;
