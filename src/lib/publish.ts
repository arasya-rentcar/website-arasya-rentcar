import 'server-only';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { discardDraft, listLocations, listPosts, toColumns, type Entity } from './cms';
import type { Location, Post } from '@/types';

/**
 * Turning staged edits into live pages.
 *
 * Three things have to happen together and in this order: the row is written,
 * the draft is removed, and the affected pages are regenerated. Getting the
 * order wrong is not cosmetic — deleting the draft first would lose the edit if
 * the write failed, and skipping revalidation leaves a published change
 * invisible for up to an hour behind the ISR window.
 */

/* --------------------------------------------------------------- what to
 * revalidate */

/**
 * Every path a content change can affect — which is, in practice, all of them.
 *
 * It is tempting to revalidate only `/{slug}`. That is wrong here, and not by a
 * little. `siteNav()` builds the header and footer from every published
 * location, so renaming one city or changing its slug changes the navigation on
 * all 31 pages; the hub directory lists them; the home page cards do too. A
 * targeted revalidation would leave correct content behind stale links, which
 * is worse than a stale page because the link looks trustworthy and 404s.
 *
 * Regenerating 31 static pages costs one render each on next request. That is
 * the cheaper mistake by a wide margin.
 */
async function allPaths(supabase: SupabaseClient): Promise<string[]> {
  const [locations, posts] = await Promise.all([listLocations(supabase), listPosts(supabase)]);

  const published = <T extends { status: string }>(rows: T[]) =>
    rows.filter((r) => r.status === 'published');

  const paths = [
    '/',
    '/en',
    '/sewa-mobil',
    '/en/sewa-mobil',
    '/travel',
    '/en/travel',
    '/blog',
    '/en/blog',
    '/sitemap.xml',
    '/robots.txt',
  ];

  for (const l of published(locations)) {
    paths.push(`/${l.slug}`);
    if (l.slugEn) paths.push(`/en/${l.slugEn}`);
  }
  for (const p of published(posts)) {
    // Stored slugs already carry the `blog/` prefix.
    paths.push(`/${p.slug}`);
    if (p.slugEn) paths.push(`/en/${p.slugEn}`);
  }

  return paths;
}

/* ------------------------------------------------------------- deploy hook */

/**
 * Asks the host to rebuild. Optional, and no longer load-bearing.
 *
 * The original plan was that a new page could not work until a rebuild, because
 * `dynamicParams = false` fixed the set of valid slugs at build time. That flag
 * turned out to be incompatible with on-demand revalidation altogether — see
 * the note in the README — so it is now `true`, and a newly published page
 * renders on its first request like any other ISR page.
 *
 * The hook is kept because it still buys something real, just something
 * smaller: it folds the new URL into the prerendered set, so the first visitor
 * gets a cached page rather than paying for the render. Publishing is correct
 * with or without it.
 */
async function triggerRebuild(reason: string): Promise<'triggered' | 'unavailable' | 'failed'> {
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) return 'unavailable';

  try {
    const res = await fetch(hook, { method: 'POST' });
    if (!res.ok) return 'failed';
    console.log(`[publish] rebuild triggered — ${reason}`);
    return 'triggered';
  } catch {
    return 'failed';
  }
}

/**
 * Does this change add a URL the current build has never prerendered?
 *
 * Two cases: a page becoming published for the first time, and a slug moving.
 * Both work immediately either way; this only decides whether it is worth
 * asking for a rebuild so the new address joins the static set.
 */
function changesTheUrlSpace(
  live: { slug: string; slugEn?: string; status: string },
  next: Record<string, unknown>,
  publishing: boolean
): string | null {
  if (publishing && live.status !== 'published') return 'entry published for the first time';
  if (typeof next.slug === 'string' && next.slug !== live.slug) return 'slug changed';
  const nextEn = next.slugEn as string | undefined;
  if ('slugEn' in next && (nextEn || undefined) !== (live.slugEn || undefined))
    return 'English slug changed';
  return null;
}

/* ------------------------------------------------------------------ result */

export interface PublishResult {
  ok: boolean;
  error?: string;
  /** Draft fields that are not writable columns, if any survived a stale draft. */
  ignored?: string[];
  revalidated?: number;
  rebuild?: 'triggered' | 'unavailable' | 'failed' | 'not-needed';
  rebuildReason?: string;
}

/* ---------------------------------------------------------------- publish */

async function publishEntity(
  supabase: SupabaseClient,
  entity: Extract<Entity, 'location' | 'post'>,
  key: string,
  live: { slug: string; slugEn?: string; status: string },
  patch: Record<string, unknown>,
  setPublished: boolean
): Promise<PublishResult> {
  const table = entity === 'location' ? 'locations' : 'posts';
  const { columns, ignored } = toColumns(entity, patch);

  if (setPublished) columns.status = 'published';

  if (!Object.keys(columns).length) {
    return { ok: false, error: 'Tidak ada perubahan untuk diterbitkan.' };
  }

  const { error } = await supabase.from(table).update(columns).eq('key', key);
  if (error) return { ok: false, error: error.message };

  // Only after the write succeeded. The draft is the only copy of the edit
  // until this point, so removing it first would turn a failed update into
  // lost work.
  await discardDraft(supabase, entity, key);

  const rebuildReason = changesTheUrlSpace(live, patch, setPublished);
  const rebuild = rebuildReason ? await triggerRebuild(rebuildReason) : ('not-needed' as const);

  const paths = await allPaths(supabase);
  for (const path of paths) revalidatePath(path);

  return {
    ok: true,
    ignored: ignored.length ? ignored : undefined,
    revalidated: paths.length,
    rebuild,
    rebuildReason: rebuildReason ?? undefined,
  };
}

export function publishLocation(
  supabase: SupabaseClient,
  live: Location,
  patch: Record<string, unknown>,
  setPublished: boolean
): Promise<PublishResult> {
  return publishEntity(supabase, 'location', live.key, live, patch, setPublished);
}

export function publishPost(
  supabase: SupabaseClient,
  live: Post,
  patch: Record<string, unknown>,
  setPublished: boolean
): Promise<PublishResult> {
  return publishEntity(supabase, 'post', live.key, live, patch, setPublished);
}

/**
 * Regenerates every page without changing content.
 *
 * The escape hatch for the case ISR cannot see: content edited directly in the
 * Supabase dashboard, or a revalidation that failed while a deploy was in
 * flight. Without it the only remedy is waiting out the hour.
 */
export async function revalidateAll(supabase: SupabaseClient): Promise<number> {
  const paths = await allPaths(supabase);
  for (const path of paths) revalidatePath(path);
  return paths.length;
}
