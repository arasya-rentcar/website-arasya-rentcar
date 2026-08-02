'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { discardDraft, saveDraft } from '@/lib/cms';
import type { SaveState } from '../../lokasi/[key]/actions';

/** Staging edits to a blog article. Mirrors the location actions exactly. */

export async function savePost(key: string, patch: Record<string, unknown>): Promise<SaveState> {
  const { supabase, user } = await requireAdmin();

  try {
    await saveDraft(supabase, 'post', key, patch, user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal menyimpan.' };
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/artikel/${key}`);

  return { ok: true, savedAt: new Date().toISOString() };
}

export async function discardPost(key: string): Promise<SaveState> {
  const { supabase } = await requireAdmin();

  try {
    await discardDraft(supabase, 'post', key);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal membuang draf.' };
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/artikel/${key}`);

  return { ok: true };
}
