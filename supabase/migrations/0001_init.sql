-- Arasya Rent Car — pSEO content schema.
--
-- Mirrors the four design-handoff registries one table each:
--   cities.js -> locations         (one row = one indexable landing page)
--   posts.js  -> posts             (one row = one /blog/{slug} page)
--   site.js   -> site_settings     (singleton row, id = true)
--   travel.js -> travel_settings   (singleton row — /travel tariff checker)
--
-- Field names match the registries; columns are snake_case and are hydrated
-- back into the camelCase registry shapes by src/lib/hydrate.ts.
--
-- Every content table carries:
--   status      draft | published   — public pages read published only
--   updated_at  timestamptz         — bumped by trigger
--
-- Staged edits live in `content_drafts`, NOT in a column on the row. The
-- original handoff spec lists only `status`; `status` models "this page is not
-- live yet" but cannot model "this live page has unpublished edits", which is
-- exactly what Content Studio's draft overlay (localStorage `arasya-cms-*`)
-- did. See the content_drafts block for why it is a separate table.
--
-- BILINGUAL. The handoff allows "`_en` columns (or a translations table)".
-- Translatable content lives in a single `en` jsonb overlay per row plus a
-- `slug_en` column, rather than ~16 parallel `*_en` columns, because:
--   - translation is partial by design (an entry publishes ID-only until EN is
--     filled, then joins the /en/ sitemap + hreflang set), and
--   - nothing ever queries *by* translated content, only reads whole rows.
-- The `en` object uses the same field names as the parent row, so Content
-- Studio's EN language tab writes identical field paths.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums

do $$ begin
  create type publish_status as enum ('draft', 'published');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type page_type as enum ('city', 'region', 'country');
exception when duplicate_object then null;
end $$;

-- ------------------------------------------------------- updated_at trigger

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------------ admins

-- Allowlist. Sign-up is disabled in Supabase Auth; a row here is what makes an
-- authenticated user an admin. Checked by middleware AND by every RLS policy,
-- so a stolen anon key still cannot write.
create table if not exists admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- --------------------------------------------------------------- locations

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),

  -- Registry key ("bogor"). Stable identity; posts.city_key references it and
  -- the slug may change without breaking the relation.
  key text not null unique,
  slug text not null unique,
  -- EN slug, e.g. "car-rental-bogor" -> /en/car-rental-bogor. NULL until the
  -- entry has been translated; such entries stay out of the /en/ sitemap.
  slug_en text unique,

  name text not null,
  code text not null,
  page_type page_type not null,
  template page_type not null,
  variant text not null,
  country text not null,

  hero_image text,
  h1 text not null,
  hero_subtitle text not null default '',
  hero_stat text not null default '',

  meta_title text not null default '',
  meta_description text not null default '',

  trust_route_desc text,
  service_line text not null default '',

  editorial jsonb not null default '{}'::jsonb,
  destinations_subtitle text not null default '',
  destinations jsonb not null default '[]'::jsonb,

  out_of_town_examples text not null default '',
  pickup_points text not null default '',
  area_served text[] not null default '{}',
  routes jsonb not null default '[]'::jsonb,
  faq_extra jsonb not null default '[]'::jsonb,

  -- Present only on entries that override the global trust defaults.
  trust jsonb,
  -- Country pages only.
  city_directory jsonb,

  -- English overlay; same field names as above. See the header note.
  en jsonb,

  status publish_status not null default 'draft',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),

  -- Slugs are the URL; enforce the same rule the CMS validates against.
  constraint locations_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint locations_slug_en_format check (slug_en is null or slug_en ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index if not exists locations_status_idx on locations (status);
create index if not exists locations_country_idx on locations (country);
create index if not exists locations_slug_en_idx on locations (slug_en) where slug_en is not null;

drop trigger if exists locations_set_updated_at on locations;
create trigger locations_set_updated_at
  before update on locations
  for each row execute function set_updated_at();

-- -------------------------------------------------------------------- posts

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),

  key text not null unique,
  -- Stored with the "blog/" prefix, exactly as the prototype registry does,
  -- so canonical URLs and sitemap entries match byte-for-byte.
  slug text not null unique,
  slug_en text unique,

  title text not null,
  category text not null default '',

  -- Every article links to exactly one city page (editorial rule).
  city_key text references locations (key) on update cascade on delete set null,
  city_name text not null default '',
  city_slug text not null default '',

  author text not null default 'Tim Arasya',
  date_published date,
  date_modified date,
  date_display text not null default '',
  updated_display text not null default '',
  read_minutes integer not null default 5,

  meta_title text not null default '',
  meta_description text not null default '',
  excerpt text not null default '',

  sections jsonb not null default '[]'::jsonb,
  related text[] not null default '{}',

  en jsonb,

  status publish_status not null default 'draft',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),

  constraint posts_slug_format check (slug ~ '^[a-z0-9]+([/-][a-z0-9]+)*$'),
  constraint posts_slug_en_format check (slug_en is null or slug_en ~ '^[a-z0-9]+([/-][a-z0-9]+)*$')
);

create index if not exists posts_status_idx on posts (status);
create index if not exists posts_city_key_idx on posts (city_key);

drop trigger if exists posts_set_updated_at on posts;
create trigger posts_set_updated_at
  before update on posts
  for each row execute function set_updated_at();

-- ------------------------------------------------------------ site_settings

-- Singleton: `id boolean primary key default true` + a check constraint means
-- a second row is physically impossible.
create table if not exists site_settings (
  id boolean primary key default true,

  settings jsonb not null default '{}'::jsonb,
  fleet jsonb not null default '[]'::jsonb,
  fleet_notes jsonb not null default '{}'::jsonb,
  generic_units text[] not null default '{}',
  services jsonb not null default '[]'::jsonb,
  testimonials jsonb not null default '[]'::jsonb,
  trust_defaults jsonb not null default '[]'::jsonb,
  gallery jsonb not null default '[]'::jsonb,

  -- EN overlays: services keyed by slug, trustDefaults keyed by preset,
  -- fleetNotes — mirroring i18n.js's SERVICES_EN / TRUST_EN / FLEET_NOTES_EN.
  en jsonb,

  updated_at timestamptz not null default now(),

  constraint site_settings_singleton check (id)
);

drop trigger if exists site_settings_set_updated_at on site_settings;
create trigger site_settings_set_updated_at
  before update on site_settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------- travel_settings

-- Singleton backing the /travel charter tariff checker. Content Studio edits
-- it as one entry ("Rute & Tarif"), so it is stored as one row rather than
-- normalised into unit/origin/route tables — the whole registry is ~10 routes
-- and the checker reads all of it client-side anyway.
--
-- The page's UI strings (travel.js TRAVEL_STR) are NOT here: they are interface
-- copy, not CMS content, and live in src/lib/i18n.ts with the other messages.
create table if not exists travel_settings (
  id boolean primary key default true,

  units jsonb not null default '[]'::jsonb,
  origins jsonb not null default '[]'::jsonb,
  -- routes[].prices is keyed by unit key; a missing key = unit not served.
  routes jsonb not null default '[]'::jsonb,

  updated_at timestamptz not null default now(),

  constraint travel_settings_singleton check (id)
);

drop trigger if exists travel_settings_set_updated_at on travel_settings;
create trigger travel_settings_set_updated_at
  before update on travel_settings
  for each row execute function set_updated_at();

-- ----------------------------------------------------------- content_drafts

-- Staged, unpublished edits for any content row.
--
-- Deliberately a separate table rather than a `draft_data jsonb` column on each
-- content table, for two reasons:
--
--  1. LEAKAGE. The anon key ships in the browser bundle by design, and RLS is
--     row-level — it cannot hide a column. A `draft_data` column on a published
--     row would be readable by anyone crafting their own PostgREST query
--     (`?select=draft_data`), exposing unpublished pricing and copy. Keeping
--     drafts in a table with no anon policy makes that impossible by
--     construction, with no column-privilege bookkeeping to drift out of sync.
--
--  2. The CMS list view needs "which entries have pending edits?" to render its
--     draft dots. Here that is one narrow `select entity, entity_id` instead of
--     dragging a large jsonb blob back for every row.
--
-- Publishing merges `data` into the live row and deletes the draft.
create table if not exists content_drafts (
  -- Which registry the draft belongs to.
  entity text not null,
  -- locations.key / posts.key, or 'site' / 'travel' for the singletons.
  -- Polymorphic, so no FK: a draft for a deleted entry is cleaned up by the
  -- CMS delete flow rather than by cascade.
  entity_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,

  primary key (entity, entity_id),
  constraint content_drafts_entity check (entity in ('location', 'post', 'site', 'travel'))
);

drop trigger if exists content_drafts_set_updated_at on content_drafts;
create trigger content_drafts_set_updated_at
  before update on content_drafts
  for each row execute function set_updated_at();

-- ------------------------------------------------------------------ RLS

alter table locations enable row level security;
alter table posts enable row level security;
alter table site_settings enable row level security;
alter table travel_settings enable row level security;
alter table admins enable row level security;
alter table content_drafts enable row level security;

-- Public pages read published rows only.
drop policy if exists "locations public read published" on locations;
create policy "locations public read published"
  on locations for select
  using (status = 'published');

drop policy if exists "posts public read published" on posts;
create policy "posts public read published"
  on posts for select
  using (status = 'published');

-- Global settings are needed to render any page, so they are always readable.
drop policy if exists "site_settings public read" on site_settings;
create policy "site_settings public read"
  on site_settings for select
  using (true);

drop policy if exists "travel_settings public read" on travel_settings;
create policy "travel_settings public read"
  on travel_settings for select
  using (true);

drop policy if exists "locations admin all" on locations;
create policy "locations admin all"
  on locations for all
  using (is_admin()) with check (is_admin());

drop policy if exists "posts admin all" on posts;
create policy "posts admin all"
  on posts for all
  using (is_admin()) with check (is_admin());

drop policy if exists "site_settings admin all" on site_settings;
create policy "site_settings admin all"
  on site_settings for all
  using (is_admin()) with check (is_admin());

drop policy if exists "travel_settings admin all" on travel_settings;
create policy "travel_settings admin all"
  on travel_settings for all
  using (is_admin()) with check (is_admin());

-- An admin may see the allowlist but not edit it — membership changes go
-- through the service role only.
drop policy if exists "admins self read" on admins;
create policy "admins self read"
  on admins for select
  using (is_admin());

-- Drafts are admin-only in every direction. No public policy exists, so the
-- anon key cannot read staged edits at all — see the content_drafts block.
drop policy if exists "content_drafts admin all" on content_drafts;
create policy "content_drafts admin all"
  on content_drafts for all
  using (is_admin()) with check (is_admin());
