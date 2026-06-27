import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { SyncEntityType } from "@/types/sync";
import { getAppMetadata, notifyLocalDbChange, patchAppMetadata, getLocalDb } from "@/lib/idb/db";
import {
  getSessionRecord,
  listSessionRecords,
  upsertSessionRecordLocal,
  type ComparisonSessionRecord,
} from "@/lib/idb/sessions-store";
import {
  getPreferencesRecord,
  patchPreferencesRecord,
  type PreferencesRecord,
} from "@/lib/idb/preferences-store";
import {
  listPromptRecords,
  upsertPromptRecordLocal,
  type SavedPromptRecord,
} from "@/lib/idb/prompts-store";
import {
  listSyncQueue,
  markSyncQueueAttempt,
  removeSyncQueueItem,
} from "@/lib/idb/sync-queue";

function toRemoteSession(row: ComparisonSessionRecord, userId: string) {
  return {
    id: row.id,
    user_id: userId,
    prompt: row.prompt,
    left_model: row.leftModel,
    right_model: row.rightModel,
    left_response: row.leftResponse ?? null,
    right_response: row.rightResponse ?? null,
    left_time_ms: row.leftTimeMs ?? null,
    right_time_ms: row.rightTimeMs ?? null,
    left_tokens: row.leftTokens ?? null,
    right_tokens: row.rightTokens ?? null,
    pinned: Boolean(row.pinned),
    device_id: row.deviceId,
    schema_version: row.schemaVersion,
    created_at: new Date(row.timestamp).toISOString(),
    updated_at: new Date(row.updatedAt).toISOString(),
    deleted_at: row.deletedAt != null ? new Date(row.deletedAt).toISOString() : null,
  };
}

function fromRemoteSession(row: Record<string, unknown>): ComparisonSessionRecord {
  return {
    id: String(row.id),
    schemaVersion: Number(row.schema_version ?? 1),
    timestamp: new Date(String(row.created_at)).getTime(),
    updatedAt: new Date(String(row.updated_at)).getTime(),
    deviceId: String(row.device_id ?? "remote"),
    deletedAt: row.deleted_at ? new Date(String(row.deleted_at)).getTime() : null,
    prompt: String(row.prompt),
    leftModel: String(row.left_model),
    rightModel: String(row.right_model),
    leftResponse: row.left_response != null ? String(row.left_response) : undefined,
    rightResponse: row.right_response != null ? String(row.right_response) : undefined,
    leftTimeMs: row.left_time_ms != null ? Number(row.left_time_ms) : undefined,
    rightTimeMs: row.right_time_ms != null ? Number(row.right_time_ms) : undefined,
    leftTokens: row.left_tokens != null ? Number(row.left_tokens) : undefined,
    rightTokens: row.right_tokens != null ? Number(row.right_tokens) : undefined,
    pinned: Boolean(row.pinned),
  };
}

function toRemotePrompt(row: SavedPromptRecord, userId: string) {
  return {
    id: row.id,
    user_id: userId,
    title: row.title,
    content: row.content,
    device_id: row.deviceId,
    schema_version: row.schemaVersion,
    created_at: new Date(row.updatedAt).toISOString(),
    updated_at: new Date(row.updatedAt).toISOString(),
    deleted_at: row.deletedAt != null ? new Date(row.deletedAt).toISOString() : null,
  };
}

function fromRemotePrompt(row: Record<string, unknown>): SavedPromptRecord {
  return {
    id: String(row.id),
    schemaVersion: Number(row.schema_version ?? 1),
    updatedAt: new Date(String(row.updated_at)).getTime(),
    deviceId: String(row.device_id ?? "remote"),
    deletedAt: row.deleted_at ? new Date(String(row.deleted_at)).getTime() : null,
    title: String(row.title),
    content: String(row.content),
  };
}

function toRemotePreferences(row: PreferencesRecord, userId: string) {
  return {
    user_id: userId,
    theme: row.theme,
    sync_enabled: row.syncEnabled,
    device_id: row.deviceId,
    schema_version: row.schemaVersion,
    updated_at: new Date(row.updatedAt).toISOString(),
  };
}

async function loadEntityForPush(
  entityType: SyncEntityType,
  entityId: string
): Promise<ComparisonSessionRecord | SavedPromptRecord | PreferencesRecord | null> {
  if (entityType === "comparison_sessions") {
    const rows = await listSessionRecords(true);
    return rows.find((r) => r.id === entityId) ?? null;
  }
  if (entityType === "saved_prompts") {
    const rows = await listPromptRecords(true);
    return rows.find((r) => r.id === entityId) ?? null;
  }
  if (entityType === "preferences") {
    return getPreferencesRecord();
  }
  return null;
}

function mergeRecord<T extends { id?: string; updatedAt: number }>(
  local: T | undefined,
  remote: T,
  localWinsOnTie: boolean
): T {
  if (!local) return remote;
  if (remote.updatedAt > local.updatedAt) return remote;
  if (remote.updatedAt < local.updatedAt) return local;
  return localWinsOnTie ? local : remote;
}

async function stampEntitySynced(
  entityType: SyncEntityType,
  entityId: string,
  syncedAt: number
): Promise<void> {
  const db = await getLocalDb();
  if (entityType === "comparison_sessions") {
    const row = await db.get("comparison_sessions", entityId);
    if (row) await db.put("comparison_sessions", { ...row, lastSyncedAt: syncedAt });
  } else if (entityType === "saved_prompts") {
    const row = await db.get("saved_prompts", entityId);
    if (row) await db.put("saved_prompts", { ...row, lastSyncedAt: syncedAt });
  } else if (entityType === "preferences") {
    const row = await db.get("preferences", entityId);
    if (row) await db.put("preferences", { ...row, lastSyncedAt: syncedAt });
  }
}

export async function pushSyncQueue(userId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const queue = await listSyncQueue();
  for (const item of queue) {
    try {
      const entity = await loadEntityForPush(item.entityType, item.entityId);
      if (!entity) {
        await removeSyncQueueItem(item.id);
        continue;
      }

      if (item.entityType === "comparison_sessions") {
        const session = entity as ComparisonSessionRecord;
        const payload = toRemoteSession(session, userId);
        const { error } = await supabase.from("comparison_sessions").upsert(payload);
        if (error) throw error;
      } else if (item.entityType === "saved_prompts") {
        const prompt = entity as SavedPromptRecord;
        const { error } = await supabase.from("saved_prompts").upsert(toRemotePrompt(prompt, userId));
        if (error) throw error;
      } else if (item.entityType === "preferences") {
        const prefs = entity as PreferencesRecord;
        const { error } = await supabase.from("preferences").upsert(
          toRemotePreferences(prefs, userId),
          { onConflict: "user_id" }
        );
        if (error) throw error;
      }

      await removeSyncQueueItem(item.id);
      await stampEntitySynced(item.entityType, item.entityId, Date.now());
    } catch (e) {
      await markSyncQueueAttempt(item.id, e instanceof Error ? e.message : "push failed");
    }
  }

  await patchAppMetadata({ lastPushAt: Date.now() });
}

export async function pullRemoteUpdates(userId: string, since?: number | null): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const sinceIso = since ? new Date(since).toISOString() : new Date(0).toISOString();

  const { data: sessions, error: sErr } = await supabase
    .from("comparison_sessions")
    .select("*")
    .eq("user_id", userId)
    .gt("updated_at", sinceIso);
  if (sErr) throw sErr;

  if (sessions?.length) {
    const localRows = await listSessionRecords(true);
    const localById = new Map(localRows.map((r) => [r.id, r]));

    for (const remote of sessions) {
      const parsed = fromRemoteSession(remote as Record<string, unknown>);
      const local = localById.get(parsed.id);
      const winner = mergeRecord(local, parsed, true);
      await upsertSessionRecordLocal(winner, { skipSync: true });
    }
  }

  const { data: prompts, error: pErr } = await supabase
    .from("saved_prompts")
    .select("*")
    .eq("user_id", userId)
    .gt("updated_at", sinceIso);
  if (pErr) throw pErr;

  if (prompts?.length) {
    const localPrompts = await listPromptRecords(true);
    const byId = new Map(localPrompts.map((p) => [p.id, p]));
    for (const remote of prompts) {
      const parsed = fromRemotePrompt(remote as Record<string, unknown>);
      const local = byId.get(parsed.id);
      const winner = mergeRecord(local, parsed, true);
      await upsertPromptRecordLocal(winner, { skipSync: true });
    }
  }

  const { data: prefsRow, error: prefErr } = await supabase
    .from("preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (prefErr) throw prefErr;

  if (prefsRow) {
    const local = await getPreferencesRecord();
    const remoteUpdated = new Date(String(prefsRow.updated_at)).getTime();
    if (remoteUpdated > local.updatedAt) {
      await patchPreferencesRecord(
        {
          theme: prefsRow.theme as PreferencesRecord["theme"],
          syncEnabled: Boolean(prefsRow.sync_enabled),
        },
        { skipSync: true }
      );
    }
  }

  await patchAppMetadata({ lastPullAt: Date.now() });
  notifyLocalDbChange();
}

export async function runFullSync(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const meta = await getAppMetadata();
  await pushSyncQueue(userId);
  await pullRemoteUpdates(userId, meta.lastPullAt);
}

/** Upload all local sessions — explicit user consent only. */
export async function uploadAllLocalSessions(userId: string): Promise<number> {
  const rows = await listSessionRecords();
  const supabase = getSupabase();
  if (!supabase || !rows.length) return 0;

  const payload = rows.map((r) => toRemoteSession(r, userId));
  const { error } = await supabase.from("comparison_sessions").upsert(payload);
  if (error) throw error;
  return rows.length;
}

export async function ensureProfile(userId: string, meta?: { name?: string; avatar?: string }) {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("profiles").upsert(
    {
      user_id: userId,
      display_name: meta?.name ?? null,
      avatar_url: meta?.avatar ?? null,
    },
    { onConflict: "user_id" }
  );
}

export async function clearCloudData(userId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("comparison_sessions").delete().eq("user_id", userId);
  await supabase.from("saved_prompts").delete().eq("user_id", userId);
  await supabase.from("preferences").delete().eq("user_id", userId);
}

/** For sync queue delete ops when entity was soft-deleted locally. */
export async function pushSoftDelete(
  userId: string,
  entityType: "comparison_sessions" | "saved_prompts",
  entityId: string
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const now = new Date().toISOString();
  if (entityType === "comparison_sessions") {
    const row = await getSessionRecord(entityId);
    if (!row) {
      await supabase
        .from("comparison_sessions")
        .update({ deleted_at: now, updated_at: now })
        .eq("id", entityId)
        .eq("user_id", userId);
    }
  }
}
