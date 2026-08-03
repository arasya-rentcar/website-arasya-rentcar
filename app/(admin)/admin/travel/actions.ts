'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { discardDraft, getStagedTravel, saveDraft } from '@/lib/cms';
import { publishTravel, type PublishResult } from '@/lib/publish';
import { canPublish, validateTravel } from '@/lib/validate';
import type { SaveState } from '../lokasi/[key]/actions';

/** Staging and publishing the charter registry behind `/travel`. */

export async function saveTravel(patch: Record<string, unknown>): Promise<SaveState> {
  const { supabase, user } = await requireAdmin();

  try {
    await saveDraft(supabase, 'travel', 'travel', patch, user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal menyimpan.' };
  }

  revalidatePath('/admin/travel');
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function publishTravelAction(): Promise<PublishResult> {
  const { supabase } = await requireAdmin();

  const staged = await getStagedTravel(supabase);
  if (!staged.draft) return { ok: false, error: 'Tidak ada draf untuk diterbitkan.' };

  const issues = validateTravel(staged.merged);
  if (!canPublish(issues)) {
    const errors = issues.filter((i) => i.level === 'error');
    return {
      ok: false,
      error: `${errors.length} masalah wajib diperbaiki: ${errors.map((i) => i.field).join(', ')}`,
    };
  }

  const result = await publishTravel(supabase, staged.draft.data);

  revalidatePath('/admin/travel');
  revalidatePath('/admin');

  return result;
}

export async function discardTravel(): Promise<SaveState> {
  const { supabase } = await requireAdmin();

  try {
    await discardDraft(supabase, 'travel', 'travel');
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Gagal membuang draf.' };
  }

  revalidatePath('/admin/travel');
  return { ok: true };
}
