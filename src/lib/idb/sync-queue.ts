import type { SyncEntityType, SyncQueueItem, SyncQueueOperation } from "@/types/sync";
import { getLocalDb } from "./db";

export async function enqueueSync(
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncQueueOperation
): Promise<void> {
  const db = await getLocalDb();
  const id = `${entityType}:${entityId}:${operation}`;
  const item: SyncQueueItem = {
    id,
    entityType,
    entityId,
    operation,
    createdAt: Date.now(),
    attempts: 0,
  };
  await db.put("sync_queue", item);
}

export async function listSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getLocalDb();
  return db.getAllFromIndex("sync_queue", "by-created");
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getLocalDb();
  await db.delete("sync_queue", id);
}

export async function markSyncQueueAttempt(id: string, error?: string): Promise<void> {
  const db = await getLocalDb();
  const item = await db.get("sync_queue", id);
  if (!item) return;
  await db.put("sync_queue", {
    ...item,
    attempts: item.attempts + 1,
    lastError: error,
  });
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getLocalDb();
  await db.clear("sync_queue");
}
