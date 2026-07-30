import { useEffect } from "react";
import {
  fetchModelRegistry,
  invalidateModelRegistry,
  REGISTRY_POLL_MS,
} from "@/lib/model-registry";

/** Keep registry synced with OpenRouter via backend (poll + focus refresh). */
export function RegistryBootstrap() {
  useEffect(() => {
    invalidateModelRegistry();
    void fetchModelRegistry(true);

    const poll = window.setInterval(() => {
      void fetchModelRegistry(true);
    }, REGISTRY_POLL_MS);

    const onFocus = () => {
      void fetchModelRegistry(true);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void fetchModelRegistry(true);
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
