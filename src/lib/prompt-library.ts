/**
 * User prompt library — local-first, optional cloud sync via IDB layer.
 */

import {
  listPromptRecords,
  putPromptRecord,
  softDeletePromptRecord,
  type SavedPromptRecord,
} from "@/lib/idb/prompts-store";
import { ensureLocalDbReady } from "@/lib/session-store";

export type SavedPrompt = SavedPromptRecord;

export async function listSavedPrompts(): Promise<SavedPrompt[]> {
  await ensureLocalDbReady();
  return listPromptRecords();
}

export async function savePrompt(title: string, content: string, id?: string): Promise<SavedPrompt> {
  await ensureLocalDbReady();
  return putPromptRecord({ title, content, id });
}

export async function deleteSavedPrompt(id: string): Promise<void> {
  await ensureLocalDbReady();
  return softDeletePromptRecord(id);
}

/** Seed from static templates when library is empty (no auth required). */
export async function ensureDefaultPrompts(
  templates: Array<{ title: string; content: string }>
): Promise<void> {
  const existing = await listSavedPrompts();
  if (existing.length > 0) return;
  for (const t of templates) {
    await putPromptRecord({ title: t.title, content: t.content }, { skipSync: true });
  }
}
