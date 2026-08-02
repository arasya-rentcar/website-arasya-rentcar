'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { discardDraft, saveDraft } from '@/lib/cms';

/**
 * Staging and discarding edits to a landing page.
 *
 * Every action re-derives the session through `requireAdmin()` rather than
 * trusting anything the client sent. A server action is a public HTTP endpoint
 * with a generated name — it is reachable by anyone who can read the bundle,
 * so the arguments are the only thing the caller controls and none of them may
 * carry authority.
 */

export interface SaveState {
  ok?: boolean;
  error?: string;
  /** Server clock, so two tabs cannot disagree about which save was last. */
  savedAt?: string;
}

export async function saveLocation(
  key: string,
  patch: Record<string, unknown>
): Promise<SaveState> {
  const { supabase, user } = await requireAdmin();

  try {
    await saveDraft(supabase, 'location', key, patch, user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal menyimpan.' };
  }

  // The editor reads the draft back on load, and the list view shows a dot for
  // entries with pending edits. Both are `force-dynamic`, but the client-side
  // Router Cache would still serve a stale copy on a back-navigation within the
  // same session — which is exactly the moment the owner checks their work
  // saved.
  revalidatePath('/admin');
  revalidatePath(`/admin/lokasi/${key}`);

  return { ok: true, savedAt: new Date().toISOString() };
}

export async function discardLocation(key: string): Promise<SaveState> {
  const { supabase } = await requireAdmin();

  try {
    await discardDraft(supabase, 'location', key);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal membuang draf.' };
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/lokasi/${key}`);

  return { ok: true };
}
