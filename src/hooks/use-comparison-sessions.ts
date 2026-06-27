import { useCallback, useEffect, useState } from "react";
import {
  clearComparisonSessions,
  deleteComparisonSession,
  getSessionStats,
  listComparisonSessions,
  subscribeSessions,
  toggleSessionPinned,
  type ComparisonSession,
} from "@/lib/session-store";

export function useComparisonSessions() {
  const [sessions, setSessions] = useState<ComparisonSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pinned: 0,
    avgLatencyMs: null as number | null,
    topModels: [] as { model: string; count: number }[],
    recent: [] as ComparisonSession[],
    withLatency: 0,
  });

  const refresh = useCallback(async () => {
    const [list, s] = await Promise.all([listComparisonSessions(), getSessionStats()]);
    setSessions(list);
    setStats(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    return subscribeSessions(() => {
      void refresh();
    });
  }, [refresh]);

  return {
    sessions,
    stats,
    loading,
    refresh,
    remove: (id: string) => void deleteComparisonSession(id).then(refresh),
    clearAll: () => void clearComparisonSessions().then(refresh),
    togglePin: (id: string) => void toggleSessionPinned(id).then(refresh),
  };
}
