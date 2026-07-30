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

function getRegistrySnapshot(): NormalizedRegistry | null {

  return getCachedRegistry();

}



export function useModelRegistry(

  _profileId = "default",

  filters: RegistryFilters = {}

) {

  const registry = useSyncExternalStore(

    subscribeRegistry,

    getRegistrySnapshot,

    getRegistrySnapshot

  );



  const reload = useCallback(async () => {

    await fetchModelRegistry(true);

  }, []);



  useEffect(() => {

    let cancelled = false;

    const shouldForce = getRegistryCacheAgeMs() > REGISTRY_REVALIDATE_MS;



    void fetchModelRegistry(shouldForce).then(() => {

      if (cancelled) return;

    });



    return () => {

      cancelled = true;

    };

  }, []);



  const loading = registry == null;

  const error = registry?.degraded ? "offline registry" : null;



  const filteredOptions = useMemo(() => {

    if (!registry) return [];

    return applyRegistryFilters(registry.options, filters);

  }, [registry, filters]);



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


