import { useEffect } from "react";
import {
  fetchModelRegistry,
  invalidateModelRegistry,
  REGISTRY_POLL_MS,
} from "@/lib/model-registry";
import { useSecureApiKeys } from "@/lib/secure-api-keys";

/** Keep registry synced with OpenRouter via backend (poll + focus refresh). */
export function RegistryBootstrap() {
  const { getApiKey } = useSecureApiKeys();

  useEffect(() => {
    invalidateModelRegistry();
    const metaKey = getApiKey("meta");
    void fetchModelRegistry(metaKey, true);

    const poll = window.setInterval(() => {
      void fetchModelRegistry(getApiKey("meta"), true);
    }, REGISTRY_POLL_MS);

    const onFocus = () => {
      void fetchModelRegistry(getApiKey("meta"), true);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void fetchModelRegistry(getApiKey("meta"), true);
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [getApiKey]);

  return null;
}
