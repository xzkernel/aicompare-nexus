import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { LocalMetadata, SyncQueueItem } from "@/types/sync";
import type { ComparisonSessionRecord } from "./sessions-store";
import type { SavedPromptRecord } from "./prompts-store";
import type { PreferencesRecord } from "./preferences-store";
import { getDeviceId } from "./device-id";
import { ENTITY_SCHEMA_VERSION } from "@/types/sync";

export const DB_NAME = "modelwise-local";
export const DB_VERSION = 1;

export interface ModelWiseDBSchema extends DBSchema {
  comparison_sessions: {
    key: string;
    value: ComparisonSessionRecord;
    indexes: { "by-updated": number };
  };
  saved_prompts: {
    key: string;
    value: SavedPromptRecord;
    indexes: { "by-updated": number };
  };
  preferences: {
    key: string;
    value: PreferencesRecord;
  };
  sync_queue: {
    key: string;
    value: SyncQueueItem;
    indexes: { "by-created": number };
  };
  metadata: {
    key: string;
    value: LocalMetadata;
  };
}

let dbPromise: Promise<IDBPDatabase<ModelWiseDBSchema>> | null = null;

const LEGACY_SESSIONS_KEY = "modelwise-comparison-sessions";

async function migrateLegacyLocalStorage(db: IDBPDatabase<ModelWiseDBSchema>) {
  const meta = await db.get("metadata", "app");
  if (meta?.legacyLocalStorageMigrated) return;

  try {
    const raw = localStorage.getItem(LEGACY_SESSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
      if (Array.isArray(parsed)) {
        const deviceId = getDeviceId();
        const now = Date.now();
        const tx = db.transaction("comparison_sessions", "readwrite");
        for (const row of parsed) {
          if (!row.id || !row.prompt) continue;
          const record: ComparisonSessionRecord = {
            id: String(row.id),
            schemaVersion: ENTITY_SCHEMA_VERSION,
            timestamp: Number(row.timestamp ?? now),
            updatedAt: Number(row.timestamp ?? now),
            deviceId,
            deletedAt: null,
            prompt: String(row.prompt),
            leftModel: String(row.leftModel ?? ""),
            rightModel: String(row.rightModel ?? ""),
            leftResponse: row.leftResponse != null ? String(row.leftResponse) : undefined,
            rightResponse: row.rightResponse != null ? String(row.rightResponse) : undefined,
            leftTimeMs: row.leftTimeMs != null ? Number(row.leftTimeMs) : undefined,
            rightTimeMs: row.rightTimeMs != null ? Number(row.rightTimeMs) : undefined,
            leftTokens: row.leftTokens != null ? Number(row.leftTokens) : undefined,
            rightTokens: row.rightTokens != null ? Number(row.rightTokens) : undefined,
            pinned: Boolean(row.pinned),
          };
          await tx.store.put(record);
        }
        await tx.done;
      }
      localStorage.removeItem(LEGACY_SESSIONS_KEY);
    }
  } catch {
    // keep legacy data if migration fails
  }

  await db.put("metadata", {
    id: "app",
    schemaVersion: ENTITY_SCHEMA_VERSION,
    legacyLocalStorageMigrated: true,
    lastPullAt: meta?.lastPullAt ?? null,
    lastPushAt: meta?.lastPushAt ?? null,
    deviceId: getDeviceId(),
  });
}

export function getLocalDb(): Promise<IDBPDatabase<ModelWiseDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<ModelWiseDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const sessions = db.createObjectStore("comparison_sessions", { keyPath: "id" });
        sessions.createIndex("by-updated", "updatedAt");

        const prompts = db.createObjectStore("saved_prompts", { keyPath: "id" });
        prompts.createIndex("by-updated", "updatedAt");

        db.createObjectStore("preferences", { keyPath: "id" });
        const queue = db.createObjectStore("sync_queue", { keyPath: "id" });
        queue.createIndex("by-created", "createdAt");
        db.createObjectStore("metadata", { keyPath: "id" });
      },
    }).then(async (db) => {
      const meta = await db.get("metadata", "app");
      if (!meta) {
        await db.put("metadata", {
          id: "app",
          schemaVersion: ENTITY_SCHEMA_VERSION,
          legacyLocalStorageMigrated: false,
          lastPullAt: null,
          lastPushAt: null,
          deviceId: getDeviceId(),
        });
      }
      await migrateLegacyLocalStorage(db);
      return db;
    });
  }
  return dbPromise;
}

export async function initLocalDatabase(): Promise<void> {
  await getLocalDb();
}

export async function getAppMetadata(): Promise<LocalMetadata> {
  const db = await getLocalDb();
  const meta = await db.get("metadata", "app");
  if (meta) return meta;
  const fresh: LocalMetadata = {
    id: "app",
    schemaVersion: ENTITY_SCHEMA_VERSION,
    legacyLocalStorageMigrated: true,
    lastPullAt: null,
    lastPushAt: null,
    deviceId: getDeviceId(),
  };
  await db.put("metadata", fresh);
  return fresh;
}

export async function patchAppMetadata(patch: Partial<LocalMetadata>): Promise<void> {
  const db = await getLocalDb();
  const current = await getAppMetadata();
  await db.put("metadata", { ...current, ...patch });
}

const CHANGE_EVENT = "modelwise-local-db-changed";

export function notifyLocalDbChange() {
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function subscribeLocalDb(handler: () => void): () => void {
  const listener = () => handler();
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}
