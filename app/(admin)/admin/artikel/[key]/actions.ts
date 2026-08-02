'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { discardDraft, getStagedPost, listLocations, listPosts, saveDraft } from '@/lib/cms';
import { publishPost, type PublishResult } from '@/lib/publish';
import { canPublish, validatePost } from '@/lib/validate';
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

/** Publishes the staged article. Validates server-side; see the location action. */
export async function publishPostAction(key: string): Promise<PublishResult> {
  const { supabase } = await requireAdmin();

  const [staged, locations, posts] = await Promise.all([
    getStagedPost(supabase, key),
    listLocations(supabase),
    listPosts(supabase),
  ]);

  if (!staged) return { ok: false, error: 'Artikel tidak ditemukan.' };
  if (!staged.draft) return { ok: false, error: 'Tidak ada draf untuk diterbitkan.' };

  // Locations and posts share one URL space, so uniqueness spans both tables.
  const issues = validatePost(staged.merged, {
    otherSlugs: [
      ...locations.map((l) => l.slug),
      ...posts.filter((p) => p.key !== key).map((p) => p.slug),
    ],
    otherSlugsEn: [
      ...locations.map((l) => l.slugEn),
      ...posts.filter((p) => p.key !== key).map((p) => p.slugEn),
    ].filter((s): s is string => Boolean(s)),
    locationKeys: locations.map((l) => l.key),
  });

  if (!canPublish(issues)) {
    const first = issues.filter((i) => i.level === 'error');
    return {
      ok: false,
      error: `${first.length} masalah wajib diperbaiki: ${first.map((i) => i.field).join(', ')}`,
    };
  }

  const result = await publishPost(supabase, staged.live, staged.draft.data, true);

  revalidatePath('/admin');
  revalidatePath(`/admin/artikel/${key}`);

  return result;
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
