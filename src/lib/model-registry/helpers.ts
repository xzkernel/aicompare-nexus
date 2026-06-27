import type { RegistryModel, RegistryProviderId } from "@/types/registry";
import { getCachedRegistry } from "./client";
import { parseModelValue } from "./normalize";
import { PROVIDER_CONFIG } from "@/config/providers";

export function getModelDisplayName(fullId: string): string {
  const reg = getCachedRegistry();
  const hit = reg?.byFullId.get(fullId);
  if (hit) return hit.name;
  const { modelId } = parseModelValue(fullId);
  return modelId;
}

export function getProviderLabel(providerId: string): string {
  const reg = getCachedRegistry();
  const p = reg?.providers.find((x) => x.id === providerId);
  if (p) return p.label;
  return PROVIDER_CONFIG[providerId as RegistryProviderId]?.label ?? providerId;
}

export function getRelayLabel(providerId: string): string | null {
  const reg = getCachedRegistry();
  const p = reg?.providers.find((x) => x.id === providerId);
  return p?.relayLabel ?? PROVIDER_CONFIG[providerId as RegistryProviderId]?.relayLabel ?? null;
}

export type CapabilityBadge = "FREE" | "OSS" | "STREAM" | "VISION" | "REASONING" | "SEARCH";

export function getModelCapabilities(model: RegistryModel): CapabilityBadge[] {
  const badges: CapabilityBadge[] = [];
  if (model.freeTier) badges.push("FREE");
  if (model.openSource) badges.push("OSS");
  if (model.supportsStreaming) badges.push("STREAM");
  if (model.multimodal) badges.push("VISION");
  if (model.reasoning) badges.push("REASONING");
  if (model.supportsWebSearch) badges.push("SEARCH");
  return badges;
}
