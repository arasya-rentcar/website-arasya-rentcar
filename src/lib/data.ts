import 'server-only';
import { createPublicClient } from './supabase/server';
import {
  LOCATION_COLUMNS,
  POST_COLUMNS,
  SITE_COLUMNS,
  TRAVEL_COLUMNS,
  toLocation,
  toPost,
  toSite,
  toTravel,
  type LocationRow,
  type PostRow,
  type SiteRow,
  type TravelRow,
} from './hydrate';
import snapshot from '@/data/registry-snapshot.json';
import type { Location, Post, Site, Travel } from '@/types';

/**
 * Reads published content and hydrates it into the exact registry shapes
 * declared in `src/types.ts`, so templates and `shared.ts` consume the same
 * objects the `.dc.html` prototypes did.
 *
 * Queries go through the cookie-free anon client — these run at build time for
 * statically generated pages. RLS restricts them to published rows.
 *
 * When Supabase is unconfigured the app falls back to a JSON snapshot of the
 * handoff registries (`npm run snapshot`), so `dev` and `build` produce the
 * real site before a database exists. Production always has the env set and
 * never touches the snapshot.
 */

const USE_SNAPSHOT = !process.env.NEXT_PUBLIC_SUPABASE_URL;

if (USE_SNAPSHOT && process.env.NODE_ENV === 'production') {
  console.warn(
    '[data] NEXT_PUBLIC_SUPABASE_URL is unset — building from the registry snapshot. ' +
      'Set Supabase credentials before deploying.'
  );
}

const snapshotLocations = snapshot.locations as unknown as Location[];
const snapshotPosts = snapshot.posts as unknown as Post[];
const snapshotSite = snapshot.site as unknown as Site;
const snapshotTravel = snapshot.travel as unknown as Travel;

/** Every published landing page, in registry order. */
export async function getLocations(): Promise<Location[]> {
  if (USE_SNAPSHOT) return snapshotLocations;
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('locations')
    .select(LOCATION_COLUMNS)
    .eq('status', 'published')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`getLocations: ${error.message}`);
  return (data as unknown as LocationRow[]).map(toLocation);
}

export async function getLocationBySlug(slug: string): Promise<Location | null> {
  if (USE_SNAPSHOT) return snapshotLocations.find((l) => l.slug === slug) ?? null;
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('locations')
    .select(LOCATION_COLUMNS)
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`getLocationBySlug(${slug}): ${error.message}`);
  return data ? toLocation(data as unknown as LocationRow) : null;
}

/** Resolves an EN slug back to its entry, for /en/[slug] routing. */
export async function getLocationBySlugEn(slugEn: string): Promise<Location | null> {
  if (USE_SNAPSHOT) return snapshotLocations.find((l) => l.slugEn === slugEn) ?? null;
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('locations')
    .select(LOCATION_COLUMNS)
    .eq('status', 'published')
    .eq('slug_en', slugEn)
    .maybeSingle();
  if (error) throw new Error(`getLocationBySlugEn(${slugEn}): ${error.message}`);
  return data ? toLocation(data as unknown as LocationRow) : null;
}

export async function getPosts(): Promise<Post[]> {
  if (USE_SNAPSHOT) return snapshotPosts;
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .eq('status', 'published')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`getPosts: ${error.message}`);
  return (data as unknown as PostRow[]).map(toPost);
}

/** `slug` is the bare route segment; the stored slug carries a `blog/` prefix. */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const full = slug.startsWith('blog/') ? slug : `blog/${slug}`;
  if (USE_SNAPSHOT) return snapshotPosts.find((p) => p.slug === full) ?? null;
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .eq('status', 'published')
    .eq('slug', full)
    .maybeSingle();
  if (error) throw new Error(`getPostBySlug(${slug}): ${error.message}`);
  return data ? toPost(data as unknown as PostRow) : null;
}

export async function getSite(): Promise<Site> {
  if (USE_SNAPSHOT) return snapshotSite;
  const supabase = createPublicClient();
  const { data, error } = await supabase.from('site_settings').select(SITE_COLUMNS).single();
  if (error) throw new Error(`getSite: ${error.message}`);
  return toSite(data as unknown as SiteRow);
}

/** Charter registry behind the /travel tariff checker. */
export async function getTravel(): Promise<Travel> {
  if (USE_SNAPSHOT) return snapshotTravel;
  const supabase = createPublicClient();
  const { data, error } = await supabase.from('travel_settings').select(TRAVEL_COLUMNS).single();
  if (error) throw new Error(`getTravel: ${error.message}`);
  return toTravel(data as unknown as TravelRow);
}
