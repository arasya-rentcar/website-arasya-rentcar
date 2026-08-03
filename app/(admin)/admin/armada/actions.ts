'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { getStagedSite, saveDraft } from '@/lib/cms';
import { publishSite, type PublishResult } from '@/lib/publish';
import { canPublish, validateSite } from '@/lib/validate';
import type { SaveState } from '../lokasi/[key]/actions';

/**
 * Staging the fleet, the unit classes and the gallery.
 *
 * These live in the same `site_settings` row as the contact details, and stage
 * into the same `('site', 'site')` draft — so the write merges rather than
 * replaces. Without that, saving here would discard an unpublished phone-number
 * change made on the other screen, silently and with no error to notice.
 */

export async function saveFleet(patch: Record<string, unknown>): Promise<SaveState> {
  const { supabase, user } = await requireAdmin();

  try {
    await saveDraft(supabase, 'site', 'site', patch, user.id, true);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal menyimpan.' };
  }

  revalidatePath('/admin/armada');
  revalidatePath('/admin/situs');

  return { ok: true, savedAt: new Date().toISOString() };
}

/**
 * Publishes the whole settings row, not only the fleet fields.
 *
 * There is one draft and one row, so "publish the fleet" cannot mean anything
 * narrower. The confirmation on this screen says so, because an owner who
 * staged a phone-number change yesterday and publishes the fleet today needs to
 * know both go live together.
 */
export async function publishFleetAction(): Promise<PublishResult> {
  const { supabase } = await requireAdmin();

  const staged = await getStagedSite(supabase);
  if (!staged.draft) return { ok: false, error: 'Tidak ada draf untuk diterbitkan.' };

  const issues = validateSite(staged.merged);
  if (!canPublish(issues)) {
    const errors = issues.filter((i) => i.level === 'error');
    return {
      ok: false,
      error: `${errors.length} masalah wajib diperbaiki: ${errors.map((i) => i.field).join(', ')}`,
    };
  }

  const result = await publishSite(supabase, staged.draft.data);

  revalidatePath('/admin/armada');
  revalidatePath('/admin/situs');
  revalidatePath('/admin');

  return result;
}
