import type { ModelRegistryResponse, NormalizedRegistry } from "@/types/registry";
import { apiUrl } from "@/lib/api-url";
import {
  BUNDLED_FRONTIER_RESPONSE,
  BUNDLED_OPENCODE_PROVIDERS,
  isLegacyApiRegistry,
} from "./bundled-catalog";
import { normalizeRegistryResponse } from "./normalize";

const API_PATH = "/api/v1/models";

export const REGISTRY_CACHE_TTL_MS = 45_000;
export const REGISTRY_REVALIDATE_MS = 15_000;
export const REGISTRY_POLL_MS = 45_000;

let cached: NormalizedRegistry | null = null;
let cachedAt = 0;
let inflight: Promise<NormalizedRegistry> | null = null;
const listeners = new Set<() => void>();

function emitRegistryChange(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeRegistry(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function bundledRegistry(source: NormalizedRegistry["syncSource"] = "offline"): NormalizedRegistry {
  return {
    ...normalizeRegistryResponse({
      ...BUNDLED_FRONTIER_RESPONSE,
      degraded: true,
    }),
    syncSource: source,
  };
}

function mergeOpenCodeFallback(data: ModelRegistryResponse): ModelRegistryResponse {
  const providers = data.providers ?? [];
  const seenProviderIds = new Set<string>();
  let addedFallback = false;
  const needsFallback = (providerId: string): boolean => {
    if (data.degraded) return true;
    if (providerId === "opencode-go") return data.openCodeGoHydrated === false;
    if (providerId === "opencode-zen") return data.openCodeZenHydrated === false;
    return false;
  };

  const mergedProviders = providers.map((provider) => {
    seenProviderIds.add(provider.id);
    if (!needsFallback(provider.id)) return provider;
    const fallback = BUNDLED_OPENCODE_PROVIDERS.find((candidate) => candidate.id === provider.id);
    if (!fallback) return provider;

    const models = provider.models ?? [];
    const seenModelIds = new Set(models.map((model) => model.id));
    const missingModels = fallback.models.filter((model) => !seenModelIds.has(model.id));
    if (!missingModels.length) return provider;

    addedFallback = true;
    return { ...provider, models: [...models, ...missingModels] };
  });

  for (const fallback of BUNDLED_OPENCODE_PROVIDERS) {
    if (seenProviderIds.has(fallback.id) || !needsFallback(fallback.id)) continue;
    addedFallback = true;
    mergedProviders.push({ ...fallback, models: [...fallback.models] });
  }

  if (!addedFallback) return data;
  return {
    ...data,
    providers: mergedProviders,
    fingerprint: `${data.fingerprint ?? "unknown"}:opencode-fallback`,
  };
}

export function getCachedRegistry(): NormalizedRegistry | null {
  if (cached && Date.now() - cachedAt < REGISTRY_CACHE_TTL_MS) return cached;
  return null;
}

export function getRegistryCacheAgeMs(): number {
  if (!cached) return Number.POSITIVE_INFINITY;
  return Date.now() - cachedAt;
}

export function setCachedRegistry(registry: NormalizedRegistry): void {
  const changed = cached == null || cached.fingerprint !== registry.fingerprint;
  cached = registry;
  cachedAt = Date.now();
  if (changed) emitRegistryChange();
}

async function fetchRegistryFromNetwork(): Promise<NormalizedRegistry> {
  const res = await fetch(`${apiUrl(API_PATH)}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`registry ${res.status}`);

  const data = (await res.json()) as ModelRegistryResponse;

  if (isLegacyApiRegistry(data)) {
    return bundledRegistry("legacy-backend");
  }

  return {
    ...normalizeRegistryResponse(mergeOpenCodeFallback(data)),
    syncSource: "live",
  };
}

export async function fetchModelRegistry(force = false): Promise<NormalizedRegistry> {
  const cacheAge = getRegistryCacheAgeMs();
  const cacheValid = cached != null && cacheAge < REGISTRY_CACHE_TTL_MS;

  if (!force && cacheValid && cached) {
    if (cacheAge > REGISTRY_REVALIDATE_MS) {
      void fetchModelRegistry(true);
    }
    return cached;
  }

  if (inflight && !force) return inflight;

  inflight = (async () => {
    try {
      const normalized = await fetchRegistryFromNetwork();
      setCachedRegistry(normalized);
      return normalized;
    } catch {
      if (cached && !force) return cached;
      const fb = bundledRegistry("offline");
      setCachedRegistry(fb);
      return fb;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function invalidateModelRegistry(): void {
  cached = null;
  cachedAt = 0;
  inflight = null;
  emitRegistryChange();
}
