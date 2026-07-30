import type { ModelRegistryResponse, NormalizedRegistry } from "@/types/registry";
import { apiUrl } from "@/lib/api-url";
import { BUNDLED_FRONTIER_RESPONSE, isLegacyApiRegistry } from "./bundled-catalog";
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
    ...normalizeRegistryResponse(data),
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
