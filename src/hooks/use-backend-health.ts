import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-url";

export type BackendStatus = "checking" | "online" | "offline";

const HEALTH_URL = "/health";
const POLL_MS = 30_000;

export function useBackendHealth(enabled = true) {
  const [status, setStatus] = useState<BackendStatus>("checking");

  const check = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(HEALTH_URL), { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        setStatus("offline");
        return;
      }
      const data = (await res.json()) as { status?: string };
      setStatus(data.status === "ok" ? "online" : "offline");
    } catch {
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void check();
    const id = window.setInterval(() => void check(), POLL_MS);
    return () => window.clearInterval(id);
  }, [check, enabled]);

  return { status, recheck: check };
}
