import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAppMetadata, subscribeLocalDb } from "@/lib/idb/db";
import { getPreferencesRecord } from "@/lib/idb/preferences-store";
import { runFullSync } from "@/lib/sync-engine";
import type { SyncStatus } from "@/types/sync";

const SYNC_INTERVAL_MS = 60_000;

type CloudSyncContextValue = {
  status: SyncStatus;
  syncEnabled: boolean;
  lastSyncAt: number | null;
  error: string | null;
  syncNow: () => Promise<void>;
  configured: boolean;
  isCloudActive: boolean;
};

const CloudSyncContext = createContext<CloudSyncContextValue | null>(null);

/** Single background sync loop — mount once at app root. */
export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const { user, configured } = useAuth();
  const [status, setStatus] = useState<SyncStatus>("disabled");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPrefs = useCallback(async () => {
    const prefs = await getPreferencesRecord();
    setSyncEnabled(prefs.syncEnabled);
  }, []);

  useEffect(() => {
    void refreshPrefs();
    return subscribeLocalDb(() => {
      void refreshPrefs();
    });
  }, [refreshPrefs]);

  const syncNow = useCallback(async () => {
    if (!user || !configured || !syncEnabled) {
      setStatus("disabled");
      return;
    }
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }

    setStatus("syncing");
    setError(null);
    try {
      await runFullSync(user.id);
      const meta = await getAppMetadata();
      setLastSyncAt(meta.lastPullAt ?? meta.lastPushAt ?? Date.now());
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Sync failed");
    }
  }, [user, configured, syncEnabled]);

  useEffect(() => {
    if (!user || !syncEnabled) {
      setStatus("disabled");
      return;
    }

    void syncNow();
    const id = window.setInterval(() => void syncNow(), SYNC_INTERVAL_MS);
    const onOnline = () => void syncNow();
    window.addEventListener("online", onOnline);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", onOnline);
    };
  }, [user?.id, syncEnabled, syncNow]);

  useEffect(() => {
    void getAppMetadata().then((m) => {
      setLastSyncAt(m.lastPullAt ?? m.lastPushAt);
    });
  }, [status]);

  const value = useMemo<CloudSyncContextValue>(
    () => ({
      status: !configured ? "disabled" : !user ? "disabled" : !syncEnabled ? "disabled" : status,
      syncEnabled,
      lastSyncAt,
      error,
      syncNow,
      configured,
      isCloudActive: Boolean(user && syncEnabled && configured),
    }),
    [configured, user, syncEnabled, status, lastSyncAt, error, syncNow]
  );

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}

export function useCloudSync(): CloudSyncContextValue {
  const ctx = useContext(CloudSyncContext);
  if (!ctx) {
    return {
      status: "disabled",
      syncEnabled: false,
      lastSyncAt: null,
      error: null,
      syncNow: async () => {},
      configured: false,
      isCloudActive: false,
    };
  }
  return ctx;
}
