import "fake-indexeddb/auto";
import { beforeAll, describe, expect, it } from "vitest";

import { ENTITY_SCHEMA_VERSION } from "@/types/sync";

let stores: typeof import("./sessions-store");
let getLocalDb: typeof import("./db").getLocalDb;
let migrateLegacyLocalStorage: typeof import("./db").migrateLegacyLocalStorage;

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("modelwise-local", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const sessions = db.createObjectStore("comparison_sessions", { keyPath: "id" });
      sessions.createIndex("by-updated", "updatedAt");
      const prompts = db.createObjectStore("saved_prompts", { keyPath: "id" });
      prompts.createIndex("by-updated", "updatedAt");
      db.createObjectStore("preferences", { keyPath: "id" });
      const queue = db.createObjectStore("sync_queue", { keyPath: "id" });
      queue.createIndex("by-created", "createdAt");
      db.createObjectStore("metadata", { keyPath: "id" });
      sessions.put({
        id: "old-tombstone",
        timestamp: 1,
        deletedAt: 2,
        schemaVersion: ENTITY_SCHEMA_VERSION,
        updatedAt: 2,
        deviceId: "old-device",
        prompt: "old",
        leftModel: "a:model",
        rightModel: "b:model",
      });
    };
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });

  ({ getLocalDb, migrateLegacyLocalStorage } = await import("./db"));
  stores = await import("./sessions-store");
  await getLocalDb();
});

describe("local session storage", () => {
  it("marks legacy migration complete only after a successful retry", async () => {
    const db = await getLocalDb();
    const failingStorage = {
      getItem: () => "[]",
      removeItem: () => { throw new Error("blocked"); },
    };
    expect(await migrateLegacyLocalStorage(db, failingStorage)).toBe(false);
    expect((await db.get("metadata", "app"))?.legacyLocalStorageMigrated).toBe(false);

    const availableStorage = {
      getItem: () => null,
      removeItem: () => undefined,
    };
    expect(await migrateLegacyLocalStorage(db, availableStorage)).toBe(true);
    expect((await db.get("metadata", "app"))?.legacyLocalStorageMigrated).toBe(true);
  });

  it("purges old tombstones and hard-deletes records", async () => {
    const db = await getLocalDb();
    expect(await db.get("comparison_sessions", "old-tombstone")).toBeUndefined();

    const record = await stores.putSessionRecord({
      prompt: "delete me",
      leftModel: "a:model",
      rightModel: "b:model",
    });
    await stores.deleteSessionRecord(record.id);
    expect(await db.get("comparison_sessions", record.id)).toBeUndefined();
  });

  it("keeps existing records when imported IDs collide", async () => {
    const existing = await stores.putSessionRecord({
      id: "collision",
      prompt: "existing",
      leftModel: "a:model",
      rightModel: "b:model",
    });
    await stores.importSessionRecords([{
      id: existing.id,
      prompt: "imported",
      leftModel: "a:model",
      rightModel: "b:model",
    }]);

    const records = await stores.listSessionRecords();
    expect(records.some((record) => record.id === "collision" && record.prompt === "existing")).toBe(true);
    expect(records.some((record) => record.id !== "collision" && record.prompt === "imported")).toBe(true);
  });

  it("skips overflow imports without evicting existing history", async () => {
    const db = await getLocalDb();
    await db.clear("comparison_sessions");
    const existingIds = Array.from({ length: 99 }, (_, index) => `existing-${index}`);
    for (const [index, id] of existingIds.entries()) {
      await db.put("comparison_sessions", {
        id,
        timestamp: index,
        deletedAt: null,
        schemaVersion: ENTITY_SCHEMA_VERSION,
        updatedAt: index,
        deviceId: "test-device",
        prompt: `existing ${index}`,
        leftModel: "a:model",
        rightModel: "b:model",
      });
    }

    const result = await stores.importSessionRecords([
      { prompt: "first import", leftModel: "a:model", rightModel: "b:model" },
      { prompt: "second import", leftModel: "a:model", rightModel: "b:model" },
    ]);
    const records = await db.getAll("comparison_sessions");

    expect(result).toEqual({ imported: 1, skipped: 1 });
    expect(records).toHaveLength(100);
    expect(existingIds.every((id) => records.some((record) => record.id === id))).toBe(true);
    expect(records.some((record) => record.prompt === "first import")).toBe(true);
    expect(records.some((record) => record.prompt === "second import")).toBe(false);
  });
});
