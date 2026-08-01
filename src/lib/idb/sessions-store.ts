import { ENTITY_SCHEMA_VERSION, type SyncMeta } from "@/types/sync";
import { getDeviceId } from "./device-id";
import { getLocalDb, notifyLocalDbChange } from "./db";

export type ComparisonVerdict = "left" | "tie" | "right";

export interface ComparisonSessionRecord extends SyncMeta {
  id: string;
  timestamp: number;
  deletedAt: number | null;
  prompt: string;
  leftModel: string;
  rightModel: string;
  leftResponse?: string;
  rightResponse?: string;
  leftTimeMs?: number;
  rightTimeMs?: number;
  leftTokens?: number;
  rightTokens?: number;
  pinned?: boolean;
  verdict?: ComparisonVerdict;
}

export type ComparisonSessionInput = Omit<
  ComparisonSessionRecord,
  "id" | "timestamp" | "schemaVersion" | "updatedAt" | "deviceId" | "deletedAt"
>;

export const MAX_SESSIONS = 100;

export type SessionImportResult = {
  imported: number;
  skipped: number;
};

function sortSessions(rows: ComparisonSessionRecord[]): ComparisonSessionRecord[] {
  return [...rows].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.timestamp - a.timestamp;
  });
}

export async function listSessionRecords(includeDeleted = false): Promise<ComparisonSessionRecord[]> {
  const db = await getLocalDb();
  const all = await db.getAll("comparison_sessions");
  const active = includeDeleted ? all : all.filter((s) => s.deletedAt == null);
  return sortSessions(active).slice(0, MAX_SESSIONS);
}

export async function getSessionRecord(id: string): Promise<ComparisonSessionRecord | undefined> {
  const db = await getLocalDb();
  const row = await db.get("comparison_sessions", id);
  if (!row || row.deletedAt != null) return undefined;
  return row;
}

export async function putSessionRecord(
  input: ComparisonSessionInput & { id?: string; timestamp?: number },
  _options?: { skipSync?: boolean }
): Promise<ComparisonSessionRecord> {
  const db = await getLocalDb();
  const now = Date.now();
  const existing = input.id ? await db.get("comparison_sessions", input.id) : undefined;
  const record: ComparisonSessionRecord = {
    ...input,
    id: input.id ?? crypto.randomUUID(),
    timestamp: input.timestamp ?? existing?.timestamp ?? now,
    schemaVersion: ENTITY_SCHEMA_VERSION,
    updatedAt: now,
    deviceId: getDeviceId(),
    deletedAt: null,
  };

  await db.put("comparison_sessions", record);

  const all = await db.getAll("comparison_sessions");
  const sorted = sortSessions(all.filter((s) => s.deletedAt == null));
  if (sorted.length > MAX_SESSIONS) {
    const toRemove = sorted.slice(MAX_SESSIONS);
    const tx = db.transaction("comparison_sessions", "readwrite");
    for (const s of toRemove) {
      await tx.store.delete(s.id);
    }
    await tx.done;
  }

  notifyLocalDbChange();
  return record;
}

export async function deleteSessionRecord(id: string): Promise<void> {
  const db = await getLocalDb();
  await db.delete("comparison_sessions", id);
  notifyLocalDbChange();
}

export async function clearSessionRecords(): Promise<void> {
  const db = await getLocalDb();
  await db.clear("comparison_sessions");
  notifyLocalDbChange();
}

export async function toggleSessionPinnedRecord(id: string): Promise<void> {
  const db = await getLocalDb();
  const row = await db.get("comparison_sessions", id);
  if (!row || row.deletedAt != null) return;
  await putSessionRecord({ ...row, pinned: !row.pinned, id: row.id, timestamp: row.timestamp });
}

export async function updateSessionVerdictRecord(
  id: string,
  verdict: ComparisonVerdict | undefined
): Promise<ComparisonSessionRecord | undefined> {
  const db = await getLocalDb();
  const row = await db.get("comparison_sessions", id);
  if (!row || row.deletedAt != null) return undefined;
  return putSessionRecord({ ...row, verdict, id: row.id, timestamp: row.timestamp });
}

export async function upsertSessionRecordLocal(
  record: ComparisonSessionRecord,
  _options?: { skipSync?: boolean }
): Promise<void> {
  const db = await getLocalDb();
  await db.put("comparison_sessions", record);
  notifyLocalDbChange();
}

export async function importSessionRecords(
  sessions: Array<ComparisonSessionInput & { id?: string; timestamp?: number }>,
  _options?: { skipSync?: boolean }
): Promise<SessionImportResult> {
  const db = await getLocalDb();
  const tx = db.transaction("comparison_sessions", "readwrite");
  const existing = await tx.store.getAll();
  const usedIds = new Set(existing.map((record) => record.id));
  let remaining = Math.max(0, MAX_SESSIONS - existing.filter((record) => record.deletedAt == null).length);
  let imported = 0;

  for (const s of sessions) {
    if (!s.prompt || remaining === 0) continue;
    let id = s.id;
    if (!id || usedIds.has(id)) id = crypto.randomUUID();
    usedIds.add(id);
    const now = Date.now();
    await tx.store.put({
      ...s,
      id,
      timestamp: s.timestamp ?? now,
      schemaVersion: ENTITY_SCHEMA_VERSION,
      updatedAt: now,
      deviceId: getDeviceId(),
      deletedAt: null,
    });
    imported += 1;
    remaining -= 1;
  }
  await tx.done;
  if (imported > 0) notifyLocalDbChange();
  return { imported, skipped: sessions.length - imported };
}

export async function getSessionRecordStats() {
  const sessions = await listSessionRecords();
  const withLatency = sessions.filter((s) => s.leftTimeMs || s.rightTimeMs);
  const modelUse = new Map<string, number>();
  let latencySum = 0;
  let latencyCount = 0;

  for (const s of sessions) {
    modelUse.set(s.leftModel, (modelUse.get(s.leftModel) ?? 0) + 1);
    modelUse.set(s.rightModel, (modelUse.get(s.rightModel) ?? 0) + 1);
    if (s.leftTimeMs) {
      latencySum += s.leftTimeMs;
      latencyCount++;
    }
    if (s.rightTimeMs) {
      latencySum += s.rightTimeMs;
      latencyCount++;
    }
  }

  return {
    total: sessions.length,
    pinned: sessions.filter((s) => s.pinned).length,
    avgLatencyMs: latencyCount ? Math.round(latencySum / latencyCount) : null,
    topModels: [...modelUse.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([model, count]) => ({ model, count })),
    recent: sessions.slice(0, 8),
    withLatency: withLatency.length,
  };
}
