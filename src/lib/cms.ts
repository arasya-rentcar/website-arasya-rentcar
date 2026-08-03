import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  LOCATION_COLUMNS,
  POST_COLUMNS,
  SITE_COLUMNS,
  toLocation,
  toPost,
  toSite,
  type LocationRow,
  type PostRow,
  type SiteRow,
} from './hydrate';
import type { Location, Post, Site } from '@/types';

/**
 * Reading and staging content for Content Studio.
 *
 * Two things separate this from `src/lib/data.ts`, which the public pages use:
 *
 *  1. It reads through the caller's *session* client, so RLS resolves
 *     `is_admin()` and drafts become visible. `data.ts` uses the cookie-free
 *     anon client and can only ever see published rows.
 *
 *  2. It overlays staged edits. What the editor shows is the live row with any
 *     pending draft applied on top — the state that *would* go live — rather
 *     than either one alone.
 *
 * Drafts are stored as partial domain objects in camelCase, the same shape
 * `src/types.ts` declares, not as database rows. Two reasons: the form already
 * speaks that shape, and a draft then survives a column rename. The conversion
 * to snake_case happens once, at publish.
 */

/* ------------------------------------------------------------------- types */

export type Entity = 'location' | 'post' | 'site' | 'travel';

export interface DraftRow {
  entity: Entity;
  entity_id: string;
  data: Record<string, unknown>;
  updated_at: string;
}

/** A row plus whatever is staged on top of it. */
export interface Staged<T> {
  /** The row exactly as it is live. */
  live: T;
  /** The live row with the pending draft applied — what publishing would set. */
  merged: T;
  /** Null when there is nothing staged. */
  draft: DraftRow | null;
}

/* ---------------------------------------------------------------- overlay */

/**
 * Applies a draft patch over a live record.
 *
 * Shallow by design, and that is a decision rather than an omission. The draft
 * always carries whole fields as the form submitted them: editing one
 * destination sends the entire `destinations` array, because the list editor
 * owns that array. A deep merge would try to reconcile two versions of a list
 * element-wise and would silently resurrect a row the owner had just deleted.
 *
 * (`localize.ts` merges by index for the opposite reason — there, a translation
 * legitimately carries only some fields of each element and must not drop the
 * image and licence attribution sitting in the others.)
 */
function applyDraft<T>(live: T, patch: Record<string, unknown> | undefined): T {
  if (!patch) return live;
  return { ...live, ...patch } as T;
}

/* ------------------------------------------------------------------ drafts */

/** Every staged edit, for the list view's "pending" markers. */
export async function listDrafts(supabase: SupabaseClient): Promise<DraftRow[]> {
  const { data, error } = await supabase
    .from('content_drafts')
    .select('entity, entity_id, data, updated_at');
  if (error) throw new Error(`listDrafts: ${error.message}`);
  return (data ?? []) as DraftRow[];
}

async function getDraft(
  supabase: SupabaseClient,
  entity: Entity,
  entityId: string
): Promise<DraftRow | null> {
  const { data, error } = await supabase
    .from('content_drafts')
    .select('entity, entity_id, data, updated_at')
    .eq('entity', entity)
    .eq('entity_id', entityId)
    .maybeSingle();
  if (error) throw new Error(`getDraft(${entity}/${entityId}): ${error.message}`);
  return (data as DraftRow) ?? null;
}

/**
 * Stages an edit.
 *
 * Upsert on the composite key, so repeated saves of the same entry replace one
 * another instead of accumulating. The whole editable patch is written each
 * time rather than a diff — a diff would need a base version to be meaningful,
 * and two tabs open on the same entry would interleave into a state neither
 * author ever saw.
 */
export async function saveDraft(
  supabase: SupabaseClient,
  entity: Entity,
  entityId: string,
  data: Record<string, unknown>,
  userId: string,
  /**
   * Merge into the existing draft's top-level fields instead of replacing it.
   *
   * Needed because two screens edit one row: `/admin/situs` owns settings,
   * services, testimonials and trust cards, while `/admin/armada` owns fleet,
   * unit classes and the gallery. Both stage into `('site', 'site')`, so a
   * replacing write from either would silently discard whatever the other had
   * staged — the owner would edit the fleet, save, and find their unpublished
   * phone-number change gone with no error anywhere.
   *
   * Safe precisely because the two field sets are disjoint. Within a single
   * form the patch still carries whole fields, so the reasoning in `applyDraft`
   * is unchanged.
   */
  merge = false
): Promise<void> {
  let payload = data;

  if (merge) {
    const existing = await getDraft(supabase, entity, entityId);
    if (existing) payload = { ...existing.data, ...data };
  }

  const { error } = await supabase
    .from('content_drafts')
    .upsert(
      { entity, entity_id: entityId, data: payload, updated_by: userId },
      { onConflict: 'entity,entity_id' }
    );
  if (error) throw new Error(`saveDraft(${entity}/${entityId}): ${error.message}`);
}

/** Throws away a staged edit, reverting the editor to the live row. */
export async function discardDraft(
  supabase: SupabaseClient,
  entity: Entity,
  entityId: string
): Promise<void> {
  const { error } = await supabase
    .from('content_drafts')
    .delete()
    .eq('entity', entity)
    .eq('entity_id', entityId);
  if (error) throw new Error(`discardDraft(${entity}/${entityId}): ${error.message}`);
}

/* --------------------------------------------------------------- locations */

/** Every entry, published or not, in registry order. */
export async function listLocations(supabase: SupabaseClient): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations')
    .select(LOCATION_COLUMNS)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`listLocations: ${error.message}`);
  return (data as unknown as LocationRow[]).map(toLocation);
}

export async function getStagedLocation(
  supabase: SupabaseClient,
  key: string
): Promise<Staged<Location> | null> {
  const { data, error } = await supabase
    .from('locations')
    .select(LOCATION_COLUMNS)
    .eq('key', key)
    .maybeSingle();
  if (error) throw new Error(`getStagedLocation(${key}): ${error.message}`);
  if (!data) return null;

  const live = toLocation(data as unknown as LocationRow);
  const draft = await getDraft(supabase, 'location', key);
  return { live, merged: applyDraft(live, draft?.data), draft };
}

/* ------------------------------------------------------------------- posts */

export async function listPosts(supabase: SupabaseClient): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`listPosts: ${error.message}`);
  return (data as unknown as PostRow[]).map(toPost);
}

export async function getStagedPost(
  supabase: SupabaseClient,
  key: string
): Promise<Staged<Post> | null> {
  const { data, error } = await supabase.from('posts').select(POST_COLUMNS).eq('key', key).maybeSingle();
  if (error) throw new Error(`getStagedPost(${key}): ${error.message}`);
  if (!data) return null;

  const live = toPost(data as unknown as PostRow);
  const draft = await getDraft(supabase, 'post', key);
  return { live, merged: applyDraft(live, draft?.data), draft };
}

/* -------------------------------------------------------------------- site */

/* ------------------------------------------------------- domain → row map */

/**
 * Field-name maps for turning a draft patch back into database columns.
 *
 * Explicit tables rather than a camelCase→snake_case function. A generic
 * converter would happily forward any key the client sent, so a crafted request
 * could set `status`, `sort_order` or `key` through a form that shows none of
 * them. These lists are the allowlist: a field absent here cannot be written by
 * a draft, whatever the payload says.
 *
 * `en` is intentionally present — the translation tab writes through the same
 * path — while `status` and `key` are intentionally not. Publishing changes
 * status, and it does so from its own explicit statement.
 */
const LOCATION_FIELD_COLUMNS: Record<string, string> = {
  slug: 'slug',
  slugEn: 'slug_en',
  name: 'name',
  h1: 'h1',
  heroSubtitle: 'hero_subtitle',
  heroStat: 'hero_stat',
  heroImage: 'hero_image',
  metaTitle: 'meta_title',
  metaDescription: 'meta_description',
  trustRouteDesc: 'trust_route_desc',
  serviceLine: 'service_line',
  editorial: 'editorial',
  destinationsSubtitle: 'destinations_subtitle',
  destinations: 'destinations',
  outOfTownExamples: 'out_of_town_examples',
  pickupPoints: 'pickup_points',
  areaServed: 'area_served',
  routes: 'routes',
  faqExtra: 'faq_extra',
  trust: 'trust',
  cityDirectory: 'city_directory',
  waPhone: 'wa_phone',
  en: 'en',
};

const POST_FIELD_COLUMNS: Record<string, string> = {
  slug: 'slug',
  slugEn: 'slug_en',
  title: 'title',
  category: 'category',
  cityKey: 'city_key',
  cityName: 'city_name',
  citySlug: 'city_slug',
  author: 'author',
  datePublished: 'date_published',
  dateModified: 'date_modified',
  dateDisplay: 'date_display',
  updatedDisplay: 'updated_display',
  readMinutes: 'read_minutes',
  metaTitle: 'meta_title',
  metaDescription: 'meta_description',
  excerpt: 'excerpt',
  sections: 'sections',
  related: 'related',
  en: 'en',
};

const SITE_FIELD_COLUMNS: Record<string, string> = {
  settings: 'settings',
  fleet: 'fleet',
  fleetNotes: 'fleet_notes',
  genericUnits: 'generic_units',
  services: 'services',
  testimonials: 'testimonials',
  trustDefaults: 'trust_defaults',
  gallery: 'gallery',
  en: 'en',
};

const COLUMN_MAPS: Record<Entity, Record<string, string>> = {
  location: LOCATION_FIELD_COLUMNS,
  post: POST_FIELD_COLUMNS,
  site: SITE_FIELD_COLUMNS,
  travel: { units: 'units', origins: 'origins', routes: 'routes' },
};

/**
 * Converts a draft patch to a column update, dropping anything not allowlisted.
 *
 * Returns the ignored keys too, so publishing can say what it skipped rather
 * than silently discarding an edit the owner believed they had made.
 */
export function toColumns(
  entity: Entity,
  patch: Record<string, unknown>
): { columns: Record<string, unknown>; ignored: string[] } {
  const map = COLUMN_MAPS[entity];
  const columns: Record<string, unknown> = {};
  const ignored: string[] = [];

  for (const [field, value] of Object.entries(patch)) {
    const column = map[field];
    if (!column) {
      ignored.push(field);
      continue;
    }
    // `undefined` would be serialised out of the request entirely; null is how
    // "clear this optional column" is expressed.
    columns[column] = value === undefined ? null : value;
  }

  return { columns, ignored };
}

/* -------------------------------------------------------------------- site */

export async function getStagedSite(supabase: SupabaseClient): Promise<Staged<Site>> {
  const { data, error } = await supabase.from('site_settings').select(SITE_COLUMNS).single();
  if (error) throw new Error(`getStagedSite: ${error.message}`);

  const live = toSite(data as unknown as SiteRow);
  const draft = await getDraft(supabase, 'site', 'site');
  return { live, merged: applyDraft(live, draft?.data), draft };
}
