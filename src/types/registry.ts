/**
 * Model registry schema — mirrors GET /api/v1/models.
 * @see docs/REGISTRY.md
 */

export type RegistryProviderId = "openai" | "google" | "anthropic" | "meta" | "custom";

export interface RegistryModel {
  id: string;
  name: string;
  provider: RegistryProviderId;
  supportsStreaming: boolean;
  contextWindow: string;
  multimodal: boolean;
  reasoning: boolean;
  supportsWebSearch?: boolean;
  freeTier: boolean;
  openSource: boolean;
  relaySupported: boolean;
  openRouterId?: string | null;
  typicalLatency?: string;
  source?: "catalog" | "openrouter";
}

export interface RegistryProvider {
  id: RegistryProviderId;
  label: string;
  description: string;
  relayLabel: string | null;
  models: RegistryModel[];
}

export interface ModelRegistryResponse {
  version: string;
  updatedAt: string | null;
  streaming: boolean;
  byok: boolean;
  openRouterHydrated?: boolean;
  providers: RegistryProvider[];
  modelCount?: number;
  degraded?: boolean;
  liveSync?: boolean;
  fingerprint?: string;
}

export interface NormalizedRegistry {
  version: string;
  updatedAt: string | null;
  providers: RegistryProvider[];
  byFullId: Map<string, RegistryModel>;
  options: ModelOption[];
  openRouterHydrated: boolean;
  degraded: boolean;
  fingerprint: string;
  /** Why the current registry snapshot was chosen */
  syncSource?: "live" | "legacy-backend" | "offline";
}

export interface ModelOption {
  value: string;
  label: string;
  group: string;
  providerId: RegistryProviderId;
  model: RegistryModel;
}

export type RegistryFilters = {
  freeOnly?: boolean;
  streamingOnly?: boolean;
  ossOnly?: boolean;
};
