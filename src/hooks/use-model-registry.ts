import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import {

  applyRegistryFilters,

  fetchModelRegistry,

  getCachedRegistry,

  getRegistryCacheAgeMs,

  groupOptionsByProvider,

  REGISTRY_REVALIDATE_MS,

  subscribeRegistry,

} from "@/lib/model-registry";

import type { NormalizedRegistry, RegistryFilters } from "@/types/registry";

import { useSecureApiKeys } from "@/lib/secure-api-keys";



function getRegistrySnapshot(): NormalizedRegistry | null {

  return getCachedRegistry();

}



export function useModelRegistry(

  profileId = "default",

  filters: RegistryFilters = {}

) {

  const { getApiKey } = useSecureApiKeys(profileId);



  const registry = useSyncExternalStore(

    subscribeRegistry,

    getRegistrySnapshot,

    getRegistrySnapshot

  );



  const reload = useCallback(async () => {

    const metaKey = getApiKey("meta");

    await fetchModelRegistry(metaKey, true);

  }, [getApiKey]);



  useEffect(() => {

    let cancelled = false;

    const metaKey = getApiKey("meta");

    const shouldForce = getRegistryCacheAgeMs() > REGISTRY_REVALIDATE_MS;



    void fetchModelRegistry(metaKey, shouldForce).then(() => {

      if (cancelled) return;

    });



    return () => {

      cancelled = true;

    };

  }, [getApiKey]);



  const loading = registry == null;

  const error = registry?.degraded ? "offline registry" : null;



  const filteredOptions = useMemo(() => {

    if (!registry) return [];

    return applyRegistryFilters(registry.options, filters);

  }, [registry, filters.freeOnly, filters.streamingOnly, filters.ossOnly]);



  const groupedOptions = useMemo(

    () => groupOptionsByProvider(filteredOptions),

    [filteredOptions]

  );



  return {

    registry,

    loading,

    error,

    options: filteredOptions,

    groupedOptions,

    reload,

  };

}


