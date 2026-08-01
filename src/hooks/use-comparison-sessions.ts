import { useCallback, useEffect, useState } from "react";
import {
  clearComparisonSessions,
  deleteComparisonSession,
  getSessionStats,
  listComparisonSessions,
  subscribeSessions,
  toggleSessionPinned,
  updateComparisonSessionVerdict,
  type ComparisonVerdict,
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
    try {
      const [list, s] = await Promise.all([listComparisonSessions(), getSessionStats()]);
      setSessions(list);
      setStats(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
    return subscribeSessions(() => {
      void refresh().catch(() => undefined);
    });
  }, [refresh]);

  return {
    sessions,
    stats,
    loading,
    refresh,
    remove: (id: string) => void deleteComparisonSession(id).then(refresh).catch(() => undefined),
    clearAll: () => void clearComparisonSessions().then(refresh).catch(() => undefined),
    togglePin: (id: string) => void toggleSessionPinned(id).then(refresh).catch(() => undefined),
    updateVerdict: (id: string, verdict: ComparisonVerdict | undefined) =>
      void updateComparisonSessionVerdict(id, verdict).then(refresh).catch(() => undefined),
  };
}
