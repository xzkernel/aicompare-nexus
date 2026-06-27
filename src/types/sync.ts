/** Shared sync entity metadata — required on all synced records. */



export const ENTITY_SCHEMA_VERSION = 1;



export type SyncEntityType = "comparison_sessions" | "saved_prompts" | "preferences";



/** Wire / API representation of sync metadata (ISO timestamps). */

export type SyncMetadata = {

  id: string;

  updatedAt: string;

  lastSyncedAt?: string;

  version: number;

  deviceId: string;

};



/** IndexedDB runtime metadata (epoch ms). */

export interface SyncMeta {

  schemaVersion: number;

  updatedAt: number;

  lastSyncedAt?: number;

  deviceId: string;

}



export function toSyncMetadata(

  id: string,

  meta: Pick<SyncMeta, "updatedAt" | "lastSyncedAt" | "schemaVersion" | "deviceId">

): SyncMetadata {

  return {

    id,

    updatedAt: new Date(meta.updatedAt).toISOString(),

    lastSyncedAt: meta.lastSyncedAt != null ? new Date(meta.lastSyncedAt).toISOString() : undefined,

    version: meta.schemaVersion,

    deviceId: meta.deviceId,

  };

}



export type SyncStatus = "idle" | "syncing" | "error" | "offline" | "disabled";



export type SyncQueueOperation = "upsert" | "delete";



export interface SyncQueueItem {

  id: string;

  entityType: SyncEntityType;

  entityId: string;

  operation: SyncQueueOperation;

  createdAt: number;

  attempts: number;

  lastError?: string;

}



export interface LocalMetadata {

  id: "app";

  schemaVersion: number;

  legacyLocalStorageMigrated: boolean;

  lastPullAt: number | null;

  lastPushAt: number | null;

  deviceId: string;

}

