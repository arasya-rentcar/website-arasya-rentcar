'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { discardDraft, getStagedSite, saveDraft } from '@/lib/cms';
import { publishSite, type PublishResult } from '@/lib/publish';
import { canPublish, validateSite } from '@/lib/validate';
import type { SaveState } from '../lokasi/[key]/actions';

/**
 * Staging and publishing the global settings.
 *
 * `entity_id` is the literal string 'site' because `content_drafts` is
 * polymorphic and its primary key is `(entity, entity_id)` — a singleton still
 * needs an id to occupy that slot. The CHECK constraint on `entity` already
 * allows 'site'.
 */

export async function saveSite(patch: Record<string, unknown>): Promise<SaveState> {
  const { supabase, user } = await requireAdmin();

  try {
    await saveDraft(supabase, 'site', 'site', patch, user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal menyimpan.' };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/situs');

  return { ok: true, savedAt: new Date().toISOString() };
}

export async function publishSiteAction(): Promise<PublishResult> {
  const { supabase } = await requireAdmin();

  const staged = await getStagedSite(supabase);
  if (!staged.draft) return { ok: false, error: 'Tidak ada draf untuk diterbitkan.' };

  // Server-side, for the same reason the other publish actions do it: a server
  // action is a public endpoint, and the form's copy of the rules exists to
  // help the owner, not to authorise the write.
  const issues = validateSite(staged.merged);
  if (!canPublish(issues)) {
    const errors = issues.filter((i) => i.level === 'error');
    return {
      ok: false,
      error: `${errors.length} masalah wajib diperbaiki: ${errors.map((i) => i.field).join(', ')}`,
    };
  }

  const result = await publishSite(supabase, staged.draft.data);

  revalidatePath('/admin');
  revalidatePath('/admin/situs');

  return result;
}

export async function discardSite(): Promise<SaveState> {
  const { supabase } = await requireAdmin();

  try {
    await discardDraft(supabase, 'site', 'site');
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal membuang draf.' };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/situs');

  return { ok: true };
}
