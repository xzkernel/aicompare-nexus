import type { AppLocale } from "@/i18n";
import { ENTITY_SCHEMA_VERSION } from "@/types/sync";
import { getDeviceId } from "./device-id";
import { getLocalDb, notifyLocalDbChange } from "./db";

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
let memoryPreferences: PreferencesRecord = { ...DEFAULTS };

export async function getPreferencesRecord(): Promise<PreferencesRecord> {
  try {
    const db = await getLocalDb();
    const row = await db.get("preferences", PREFERENCES_ID);
    if (row) {
      memoryPreferences = row;
      return row;
    }
    await db.put("preferences", memoryPreferences);
  } catch {
    // Private browsing and storage policies can make IndexedDB unavailable.
  }
  return memoryPreferences;
}

export async function patchPreferencesRecord(
  patch: Partial<Omit<PreferencesRecord, "id">>,
  _options?: { skipSync?: boolean }
): Promise<PreferencesRecord> {
  const current = await getPreferencesRecord();
  const next: PreferencesRecord = {
    ...current,
    ...patch,
    id: PREFERENCES_ID,
    schemaVersion: ENTITY_SCHEMA_VERSION,
    updatedAt: Date.now(),
    deviceId: getDeviceId(),
  };
  memoryPreferences = next;
  try {
    const db = await getLocalDb();
    await db.put("preferences", next);
  } catch {
    // Keep the preference for this tab when persistent storage is unavailable.
  }
  notifyLocalDbChange();
  return next;
}
