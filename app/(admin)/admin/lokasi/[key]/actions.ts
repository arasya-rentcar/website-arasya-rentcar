'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { discardDraft, getStagedLocation, getStagedSite, listLocations, saveDraft } from '@/lib/cms';
import { publishLocation } from '@/lib/publish';
import { canPublish, validateLocation } from '@/lib/validate';
import type { PublishResult } from '@/lib/publish';

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

/**
 * Publishes the staged edit.
 *
 * Validation runs here, server-side, and not only in the form. The form's copy
 * of the rules is there so the owner sees a problem while typing; this one is
 * there because a server action is a public endpoint and the browser's opinion
 * of whether the content is valid cannot be the thing that decides.
 *
 * Both call the same module, so the two answers cannot differ.
 */
export async function publishLocationAction(key: string): Promise<PublishResult> {
  const { supabase } = await requireAdmin();

  const [staged, siteStaged, all] = await Promise.all([
    getStagedLocation(supabase, key),
    getStagedSite(supabase),
    listLocations(supabase),
  ]);

  if (!staged) return { ok: false, error: 'Entri tidak ditemukan.' };
  if (!staged.draft) return { ok: false, error: 'Tidak ada draf untuk diterbitkan.' };

  const issues = validateLocation(staged.merged, {
    otherSlugs: all.filter((l) => l.key !== key).map((l) => l.slug),
    otherSlugsEn: all
      .filter((l) => l.key !== key)
      .map((l) => l.slugEn)
      .filter((s): s is string => Boolean(s)),
    site: siteStaged.merged,
  });

  if (!canPublish(issues)) {
    const first = issues.filter((i) => i.level === 'error');
    return {
      ok: false,
      error: `${first.length} masalah wajib diperbaiki: ${first.map((i) => i.field).join(', ')}`,
    };
  }

  const result = await publishLocation(supabase, staged.live, staged.draft.data, true);

  revalidatePath('/admin');
  revalidatePath(`/admin/lokasi/${key}`);

  return result;
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
