import { ENTITY_SCHEMA_VERSION, type SyncMeta } from "@/types/sync";
import { getDeviceId } from "./device-id";
import { getLocalDb, notifyLocalDbChange } from "./db";

export interface SavedPromptRecord extends SyncMeta {
  id: string;
  deletedAt: number | null;
  title: string;
  content: string;
}

export type SavedPromptInput = Omit<
  SavedPromptRecord,
  "id" | "schemaVersion" | "updatedAt" | "deviceId" | "deletedAt"
>;

export async function listPromptRecords(includeDeleted = false): Promise<SavedPromptRecord[]> {
  const db = await getLocalDb();
  const all = await db.getAll("saved_prompts");
  const rows = includeDeleted ? all : all.filter((p) => p.deletedAt == null);
  return rows.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function putPromptRecord(
  input: SavedPromptInput & { id?: string },
  _options?: { skipSync?: boolean }
): Promise<SavedPromptRecord> {
  const db = await getLocalDb();
  const now = Date.now();
  const record: SavedPromptRecord = {
    id: input.id ?? crypto.randomUUID(),
    title: input.title,
    content: input.content,
    schemaVersion: ENTITY_SCHEMA_VERSION,
    updatedAt: now,
    deviceId: getDeviceId(),
    deletedAt: null,
  };
  await db.put("saved_prompts", record);
  notifyLocalDbChange();
  return record;
}

export async function upsertPromptRecordLocal(
  record: SavedPromptRecord,
  _options?: { skipSync?: boolean }
): Promise<void> {
  const db = await getLocalDb();
  await db.put("saved_prompts", record);
  notifyLocalDbChange();
}

export async function deletePromptRecord(id: string): Promise<void> {
  const db = await getLocalDb();
  await db.delete("saved_prompts", id);
  notifyLocalDbChange();
}
