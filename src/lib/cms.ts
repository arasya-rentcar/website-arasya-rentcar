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
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('content_drafts')
    .upsert({ entity, entity_id: entityId, data, updated_by: userId }, { onConflict: 'entity,entity_id' });
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

export async function getStagedSite(supabase: SupabaseClient): Promise<Staged<Site>> {
  const { data, error } = await supabase.from('site_settings').select(SITE_COLUMNS).single();
  if (error) throw new Error(`getStagedSite: ${error.message}`);

  const live = toSite(data as unknown as SiteRow);
  const draft = await getDraft(supabase, 'site', 'site');
  return { live, merged: applyDraft(live, draft?.data), draft };
}
