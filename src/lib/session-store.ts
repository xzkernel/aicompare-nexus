/**
 * Public session API — backed by IndexedDB (primary local store).
 */

export type {
  ComparisonSessionRecord as ComparisonSession,
  ComparisonSessionInput,
} from "@/lib/idb/sessions-store";

import {
  clearSessionRecords,
  getSessionRecord,
  getSessionRecordStats,
  importSessionRecords,
  listSessionRecords,
  putSessionRecord,
  softDeleteSessionRecord,
  toggleSessionPinnedRecord,
  type ComparisonSessionInput,
  type ComparisonSessionRecord,
} from "@/lib/idb/sessions-store";
import { initLocalDatabase, subscribeLocalDb } from "@/lib/idb/db";

let initPromise: Promise<void> | null = null;

export function ensureLocalDbReady(): Promise<void> {
  if (!initPromise) initPromise = initLocalDatabase();
  return initPromise;
}

export async function listComparisonSessions(): Promise<ComparisonSessionRecord[]> {
  await ensureLocalDbReady();
  return listSessionRecords();
}

export async function getComparisonSession(id: string): Promise<ComparisonSessionRecord | undefined> {
  await ensureLocalDbReady();
  return getSessionRecord(id);
}

export async function saveComparisonSession(
  input: ComparisonSessionInput
): Promise<ComparisonSessionRecord> {
  await ensureLocalDbReady();
  return putSessionRecord(input);
}

export async function deleteComparisonSession(id: string): Promise<void> {
  await ensureLocalDbReady();
  return softDeleteSessionRecord(id);
}

export async function clearComparisonSessions(): Promise<void> {
  await ensureLocalDbReady();
  return clearSessionRecords();
}

export async function toggleSessionPinned(id: string): Promise<void> {
  await ensureLocalDbReady();
  return toggleSessionPinnedRecord(id);
}

export async function importComparisonSessions(
  sessions: ComparisonSessionRecord[],
  options?: { skipSync?: boolean }
): Promise<void> {
  await ensureLocalDbReady();
  return importSessionRecords(sessions, options);
}

export async function getSessionStats() {
  await ensureLocalDbReady();
  return getSessionRecordStats();
}

export function subscribeSessions(handler: () => void): () => void {
  return subscribeLocalDb(handler);
}
