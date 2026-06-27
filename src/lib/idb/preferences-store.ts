import type { AppLocale } from "@/i18n";
import { ENTITY_SCHEMA_VERSION } from "@/types/sync";
import { getDeviceId } from "./device-id";
import { getLocalDb, notifyLocalDbChange } from "./db";
import { enqueueSync } from "./sync-queue";

export const PREFERENCES_ID = "default";

export interface PreferencesRecord {
  id: typeof PREFERENCES_ID;
  schemaVersion: number;
  updatedAt: number;
  deviceId: string;
  theme: "dark" | "light" | "system";
  syncEnabled: boolean;
  locale?: AppLocale;
}

const DEFAULTS: PreferencesRecord = {
  id: PREFERENCES_ID,
  schemaVersion: ENTITY_SCHEMA_VERSION,
  updatedAt: Date.now(),
  deviceId: getDeviceId(),
  theme: "dark",
  syncEnabled: false,
  locale: "en",
};

export async function getPreferencesRecord(): Promise<PreferencesRecord> {
  const db = await getLocalDb();
  const row = await db.get("preferences", PREFERENCES_ID);
  if (row) return row;
  await db.put("preferences", DEFAULTS);
  return DEFAULTS;
}

export async function patchPreferencesRecord(
  patch: Partial<Omit<PreferencesRecord, "id">>,
  options?: { skipSync?: boolean }
): Promise<PreferencesRecord> {
  const db = await getLocalDb();
  const current = await getPreferencesRecord();
  const next: PreferencesRecord = {
    ...current,
    ...patch,
    id: PREFERENCES_ID,
    schemaVersion: ENTITY_SCHEMA_VERSION,
    updatedAt: Date.now(),
    deviceId: getDeviceId(),
  };
  await db.put("preferences", next);
  if (!options?.skipSync) {
    await enqueueSync("preferences", PREFERENCES_ID, "upsert");
  }
  notifyLocalDbChange();
  return next;
}
