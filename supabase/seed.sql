-- =====================================================================
-- supabase/seed.sql
-- =====================================================================
-- Supabase runs this file after `supabase db reset` applies the
-- migrations (see [db.seed] in config.toml). Put work here that must
-- exist on a fresh local database but that is not schema DDL — schema
-- DDL belongs in supabase/migrations/.
--
-- This file owns two responsibilities for task 3.8:
--
--   1. Database-level configuration needed by the revalidate trigger
--      created in migration 0004_triggers_revalidate.sql, namely the
--      `app.revalidate_url` and `app.revalidate_secret` GUCs (§7.2).
--
--   2. A `admin_web` Postgres group role that mirrors the write
--      capabilities of the JWT-based admin used by the RLS policies
--      in migration 0003_rls_policies.sql (§3.2, R24.1). This role
--      is intended for direct-DB admin clients (e.g. a CLI, a future
--      ops container) that connect to Postgres without going through
--      Supabase Auth and therefore cannot populate `auth.jwt()`.
--
-- Admin user provisioning is explicitly OUT OF SCOPE for this file.
-- Per R24.5 the MVP has no public-facing admin panel; admin users are
-- created through Supabase Studio (or the dashboard / Auth SDK) and
-- then tagged with the JWT claim `role = 'admin'` so the RLS policies
-- in 0003_rls_policies.sql recognise them. Commented reference SQL is
-- included below, but the seed NEVER creates a real user: running this
-- file must be idempotent on any environment and must not inject
-- credentials.
--
-- Requirements: R24.1
-- Design:       §3.2 (RLS matrix — admin predicate), §7.2 (revalidate
--               GUCs read by notify_revalidate / retry_revalidate_outbox)
--
-- Layout:
--   [1] Revalidate GUCs (app.revalidate_url, app.revalidate_secret)
--   [2] Admin provisioning reference (commented-out, informational)
--   [3] admin_web direct-DB group role + grants
--   [4] TASK 3.8 END MARKER — later seed tasks (5.1–5.3) append below.
-- =====================================================================


-- ---------------------------------------------------------------------
-- [1] Revalidate GUCs  (Design §7.2, R24.2/R24.3 support)
-- ---------------------------------------------------------------------
-- The notify_revalidate() and the forthcoming retry_revalidate_outbox()
-- functions in migration 0004 read these two settings at runtime:
--
--   current_setting('app.revalidate_url')
--   current_setting('app.revalidate_secret')
--
-- For a fresh local Supabase stack we default them to a dev URL and a
-- placeholder secret so `supabase db reset` leaves the triggers in a
-- runnable state. In production these values are configured once on
-- the managed database via the Supabase dashboard (Database → Settings
-- → Custom Postgres config) and MUST be rotated to real values — the
-- placeholder is intentionally obvious so it fails loudly if leaked.
--
-- ALTER DATABASE requires the role running `db reset` to own the
-- database. On local dev that role is `postgres` (superuser) and the
-- statements succeed. On a managed/remote project the connection used
-- to apply this seed may lack that privilege; in that case we catch
-- the error and emit a WARNING rather than failing the reset, because
-- production operators will have already set these GUCs out-of-band.
do $$
begin
  execute $ddl$alter database postgres set app.revalidate_url = 'http://localhost:3000/api/revalidate'$ddl$;
  execute $ddl$alter database postgres set app.revalidate_secret = 'dev-insecure-placeholder-32+chars-please-replace'$ddl$;
  raise notice 'seed: configured app.revalidate_url and app.revalidate_secret at the database level (local dev values).';
exception
  when insufficient_privilege then
    raise warning 'seed: skipping ALTER DATABASE for app.revalidate_url / app.revalidate_secret (insufficient privilege). Configure these GUCs via the Supabase dashboard.';
  when invalid_catalog_name then
    -- `alter database postgres` fails with invalid_catalog_name if the
    -- target database has been renamed. Treat that as a configuration
    -- mismatch the operator needs to fix, but do not abort the whole
    -- seed run.
    raise warning 'seed: database "postgres" does not exist on this server; revalidate GUCs were not set. Rerun the ALTER DATABASE statements against the correct database name.';
end $$;


-- ---------------------------------------------------------------------
-- [2] Admin provisioning reference  (R24.1, R24.5 — commented-out)
-- ---------------------------------------------------------------------
-- The JWT-based admin predicate in migration 0003_rls_policies.sql is:
--
--     (auth.jwt() ->> 'role') = 'admin'
--
-- To make a specific Supabase Auth user satisfy that predicate, tag
-- their `raw_app_meta_data` with `{"role": "admin"}`. `raw_app_meta_data`
-- is signed into the JWT by Supabase Auth; `raw_user_meta_data` is not,
-- so user-controlled metadata MUST NOT be used here.
--
-- Recommended path (production and staging):
--   Supabase Dashboard → Authentication → Users → select user → edit
--   App Metadata → set role = "admin" → Save. The change takes effect
--   on the user's next token refresh.
--
-- Programmatic path (from a secure server using the service-role key):
--   // JS — @supabase/supabase-js admin API
--   await supabaseAdmin.auth.admin.updateUserById(userId, {
--     app_metadata: { role: 'admin' },
--   });
--
-- DB-level path (local dev only — requires direct access to the `auth`
-- schema, which the seed runner has but regular clients do not):
--
--   -- update auth.users
--   --   set raw_app_meta_data =
--   --         coalesce(raw_app_meta_data, '{}'::jsonb)
--   --         || jsonb_build_object('role', 'admin')
--   -- where email = 'ops@example.com';
--
-- These reference snippets stay commented on purpose. This seed file
-- must NEVER create or modify a real user: credential provisioning is
-- an operator action, not a migration artifact.


-- ---------------------------------------------------------------------
-- [3] admin_web direct-DB group role  (R24.1)
-- ---------------------------------------------------------------------
-- `admin_web` is a NOLOGIN group role. It cannot authenticate on its
-- own; other roles GRANT it to inherit its privileges. Use cases:
--
--   * A future ops CLI or job that connects directly to Postgres with
--     a login role and needs the same CRUD surface as a JWT admin.
--   * Local-dev scripts that drive the database outside the PostgREST
--     layer, where `auth.jwt()` is NULL and the JWT-based admin_write
--     RLS policies would otherwise deny the write.
--
-- Note on RLS: table GRANTs alone are not sufficient to bypass the
-- RLS policies installed in migration 0003. Sessions operating as
-- members of `admin_web` must also either (a) connect with a role
-- that has BYPASSRLS, or (b) satisfy one of the existing admin_write
-- predicates. This seed deliberately does NOT grant BYPASSRLS to
-- `admin_web`; that is an operator decision per environment.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'admin_web') then
    create role admin_web nologin;
    raise notice 'seed: created role admin_web (NOLOGIN).';
  else
    raise notice 'seed: role admin_web already exists, skipping create.';
  end if;
end $$;

comment on role admin_web is
  'R24.1 — direct-DB admin group role. NOLOGIN. Mirrors the JWT admin (auth.jwt() ->> ''role'' = ''admin'') for clients that connect to Postgres without going through Supabase Auth. Grant to a concrete login role to confer write access on public tables. Does NOT bypass RLS — see supabase/seed.sql for notes.';

-- Schema usage.
grant usage on schema public to admin_web;

-- Existing tables: full CRUD across the public schema. This covers
-- every table created by migrations 0001 (leads, rate_limit) and 0002
-- (cities, city_translations, countries, country_translations,
-- vehicles, vehicle_translations, services, service_translations,
-- airports, city_vehicles, city_airports, city_related, city_aliases).
grant select, insert, update, delete on all tables in schema public to admin_web;
grant usage, select on all sequences in schema public to admin_web;

-- Future tables: later migrations (or ad-hoc admin DDL) will pick up
-- these defaults automatically, so operators don't have to re-grant
-- after every schema change.
alter default privileges in schema public
  grant select, insert, update, delete on tables to admin_web;
alter default privileges in schema public
  grant usage, select on sequences to admin_web;


-- =====================================================================
-- [4] END OF TASK 3.8 SECTION
-- =====================================================================
-- Do not move, edit, or remove the marker below. Later seed tasks
-- (5.1 cities, 5.2 countries/vehicles/services, 5.3 relationships)
-- MUST append their INSERTs after this divider so the database-config
-- and role-provisioning steps above always run first.
-- =====================================================================
-- >>> SEED CONTENT APPEND POINT (tasks 5.1–5.3) <<<
-- =====================================================================

-- =====================================================================
-- [5] TASK 5.1 — Launched cities (Bogor, Jakarta, Bandung)
--                 + coverable (Purwakarta)
-- =====================================================================
-- Requirements: R5.2 (launched vs coverable), R5.5 (allow_index only
--               for launched), R5.6 (pricing hints present for
--               launched cities), R22.1 (chauffeur_only = true).
-- Design:       §3.1
--
-- Seeds four `public.cities` rows and their `public.city_translations`
-- (one per locale × four cities = 8 rows).
--
-- IDs are FIXED UUID literals, not gen_random_uuid(). Tasks 5.2 and
-- 5.3 reference these same IDs to build the join tables
-- (city_vehicles, city_airports, city_related, city_aliases) without
-- a slug-to-id subquery, so changing these values here requires
-- updating those downstream seeds too. Format is valid RFC 4122 v4
-- (variant bits in the third group = 4xxx, variant in the fourth = 8xxx).
--
--   11111111-1111-4111-8111-111111111111  → bogor
--   11111111-1111-4111-8111-222222222222  → jakarta
--   11111111-1111-4111-8111-333333333333  → bandung
--   11111111-1111-4111-8111-444444444444  → purwakarta
--
-- Idempotency: every INSERT uses ON CONFLICT DO NOTHING. Re-running
-- the seed on an already-seeded database is a no-op — it will not
-- overwrite edits made through the admin path, and it will not fail
-- on duplicate keys.
-- =====================================================================

-- ---------------------------------------------------------------------
-- [5.a] cities
-- ---------------------------------------------------------------------
insert into public.cities (
  id, slug, parent_region, country_code,
  latitude, longitude,
  coverage_state, allow_index,
  featured_order, launch_priority,
  pricing_hint_from, pricing_hint_to
) values (
  '11111111-1111-4111-8111-111111111111',
  'bogor', 'Jawa Barat', 'ID',
  -6.5950, 106.8167,
  'launched', true,
  1, 100,
  350000, 700000
) on conflict (slug) do nothing;

insert into public.cities (
  id, slug, parent_region, country_code,
  latitude, longitude,
  coverage_state, allow_index,
  featured_order, launch_priority,
  pricing_hint_from, pricing_hint_to
) values (
  '11111111-1111-4111-8111-222222222222',
  'jakarta', 'DKI Jakarta', 'ID',
  -6.2088, 106.8456,
  'launched', true,
  2, 90,
  400000, 900000
) on conflict (slug) do nothing;

insert into public.cities (
  id, slug, parent_region, country_code,
  latitude, longitude,
  coverage_state, allow_index,
  featured_order, launch_priority,
  pricing_hint_from, pricing_hint_to
) values (
  '11111111-1111-4111-8111-333333333333',
  'bandung', 'Jawa Barat', 'ID',
  -6.9175, 107.6191,
  'launched', true,
  3, 80,
  400000, 800000
) on conflict (slug) do nothing;

insert into public.cities (
  id, slug, parent_region, country_code,
  latitude, longitude,
  coverage_state, allow_index,
  featured_order, launch_priority,
  pricing_hint_from, pricing_hint_to
) values (
  '11111111-1111-4111-8111-444444444444',
  'purwakarta', 'Jawa Barat', 'ID',
  -6.5569, 107.4434,
  'coverable', false,
  null, 10,
  350000, 700000
) on conflict (slug) do nothing;


-- ---------------------------------------------------------------------
-- [5.b] city_translations (id, en per city)
-- ---------------------------------------------------------------------
-- Bogor
insert into public.city_translations (city_id, locale, display_name, short_blurb) values
  ('11111111-1111-4111-8111-111111111111', 'id', 'Bogor',
   'Kota hujan dengan udara sejuk, dekat Jakarta — ideal untuk getaway akhir pekan bersama sopir.')
on conflict (city_id, locale) do nothing;

insert into public.city_translations (city_id, locale, display_name, short_blurb) values
  ('11111111-1111-4111-8111-111111111111', 'en', 'Bogor',
   'Cool hill town just outside Jakarta — great for a chauffeured weekend escape.')
on conflict (city_id, locale) do nothing;

-- Jakarta
insert into public.city_translations (city_id, locale, display_name, short_blurb) values
  ('11111111-1111-4111-8111-222222222222', 'id', 'Jakarta',
   'Ibu kota yang sibuk; sopir kami tahu jalan tikus dan jadwal ganjil-genap.')
on conflict (city_id, locale) do nothing;

insert into public.city_translations (city_id, locale, display_name, short_blurb) values
  ('11111111-1111-4111-8111-222222222222', 'en', 'Jakarta',
   'Indonesia''s busy capital — our chauffeurs know the shortcuts and odd-even schedule.')
on conflict (city_id, locale) do nothing;

-- Bandung
insert into public.city_translations (city_id, locale, display_name, short_blurb) values
  ('11111111-1111-4111-8111-333333333333', 'id', 'Bandung',
   'Kota sejuk di dataran tinggi Priangan, pusat kuliner dan factory outlet.')
on conflict (city_id, locale) do nothing;

insert into public.city_translations (city_id, locale, display_name, short_blurb) values
  ('11111111-1111-4111-8111-333333333333', 'en', 'Bandung',
   'Highland city known for its cool weather, food scene, and factory outlets.')
on conflict (city_id, locale) do nothing;

-- Purwakarta
insert into public.city_translations (city_id, locale, display_name, short_blurb) values
  ('11111111-1111-4111-8111-444444444444', 'id', 'Purwakarta',
   'Jalur Bandung–Jakarta; armada dengan sopir tersedia atas permintaan.')
on conflict (city_id, locale) do nothing;

insert into public.city_translations (city_id, locale, display_name, short_blurb) values
  ('11111111-1111-4111-8111-444444444444', 'en', 'Purwakarta',
   'On the Jakarta–Bandung corridor; chauffeur cars available by request.')
on conflict (city_id, locale) do nothing;


-- =====================================================================
-- END OF TASK 5.1 SECTION
-- =====================================================================
-- The four city UUIDs above are the anchor points for:
--   * task 5.2 — countries / vehicles / services + their translations.
--   * task 5.3 — join tables (city_vehicles, city_airports,
--                city_related, city_aliases) which reference the
--                cities seeded here by UUID, not by slug.
-- Do not rename or re-number these UUIDs without updating 5.2 and 5.3.
-- =====================================================================

-- =====================================================================
-- [6] TASK 5.2 — Country (Singapore) + vehicles (Innova, Hiace)
--                 + services (corporate, airport-transfer)
-- =====================================================================
-- Requirements: R5.4 (structured content rows for country / vehicle /
--               service with locale-split display names), R5.8
--               (country landing + service pages need seed rows to
--               render during build / tests), R22.1 (chauffeur_only
--               is enforced by CHECK in migration 0002 — every row
--               below leaves it at its default `true`).
-- Design:       §3.1
--
-- Seeds the minimum structured-content rows that task 5.3 and the
-- programmatic page generators (tasks 7.11–7.13) depend on:
--
--   * 1 country        (singapore)
--   * 2 country_translations rows  (id, en)
--   * 2 vehicles       (innova, hiace)
--   * 4 vehicle_translations rows  (id+en × 2 vehicles)
--   * 2 services       (corporate, airport-transfer)
--   * 4 service_translations rows  (id+en × 2 services)
--
-- IDs are FIXED UUID literals, not gen_random_uuid(). Task 5.3
-- references these exact values when populating city_vehicles and
-- related join tables, so changing them here requires updating 5.3.
-- Format is valid RFC 4122 v4 (third group starts with 4, fourth
-- group starts with 8).
--
--   22222222-2222-4222-8222-111111111111  → singapore (country)
--   33333333-3333-4333-8333-111111111111  → innova    (vehicle)
--   33333333-3333-4333-8333-222222222222  → hiace     (vehicle)
--   44444444-4444-4444-8444-111111111111  → corporate        (service)
--   44444444-4444-4444-8444-222222222222  → airport-transfer (service)
--
-- Idempotency: every INSERT uses ON CONFLICT DO NOTHING. Parent rows
-- key on `slug` (unique); translation rows key on the composite
-- primary key (<entity>_id, locale). Re-running the seed on an
-- already-seeded database is a no-op and will not overwrite edits
-- made through the admin path.
--
-- Note on chauffeur_only / active: migration 0002 defines
-- `chauffeur_only boolean not null default true check (chauffeur_only
-- = true)` and `active boolean not null default true` on all three
-- parent tables. We rely on those defaults rather than spelling the
-- columns out on every row; any attempt to set chauffeur_only = false
-- would fail the CHECK (R22.1) and we do not need that here.
-- =====================================================================

-- ---------------------------------------------------------------------
-- [6.a] countries  (+ country_translations)
-- ---------------------------------------------------------------------
insert into public.countries (
  id, slug, country_code
) values (
  '22222222-2222-4222-8222-111111111111',
  'singapore', 'SG'
) on conflict (slug) do nothing;

-- Singapore translations (id, en)
insert into public.country_translations (country_id, locale, display_name) values
  ('22222222-2222-4222-8222-111111111111', 'id', 'Singapura')
on conflict (country_id, locale) do nothing;

insert into public.country_translations (country_id, locale, display_name) values
  ('22222222-2222-4222-8222-111111111111', 'en', 'Singapore')
on conflict (country_id, locale) do nothing;


-- ---------------------------------------------------------------------
-- [6.b] vehicles  (+ vehicle_translations)
-- ---------------------------------------------------------------------
-- Innova: 7 seats, 4 luggage
insert into public.vehicles (
  id, slug, seats, luggage
) values (
  '33333333-3333-4333-8333-111111111111',
  'innova', 7, 4
) on conflict (slug) do nothing;

-- Hiace: 14 seats, 8 luggage
insert into public.vehicles (
  id, slug, seats, luggage
) values (
  '33333333-3333-4333-8333-222222222222',
  'hiace', 14, 8
) on conflict (slug) do nothing;

-- Innova translations (id, en)
insert into public.vehicle_translations (vehicle_id, locale, display_name) values
  ('33333333-3333-4333-8333-111111111111', 'id', 'Toyota Innova Reborn')
on conflict (vehicle_id, locale) do nothing;

insert into public.vehicle_translations (vehicle_id, locale, display_name) values
  ('33333333-3333-4333-8333-111111111111', 'en', 'Toyota Innova Reborn')
on conflict (vehicle_id, locale) do nothing;

-- Hiace translations (id, en)
insert into public.vehicle_translations (vehicle_id, locale, display_name) values
  ('33333333-3333-4333-8333-222222222222', 'id', 'Toyota Hiace Premio')
on conflict (vehicle_id, locale) do nothing;

insert into public.vehicle_translations (vehicle_id, locale, display_name) values
  ('33333333-3333-4333-8333-222222222222', 'en', 'Toyota Hiace Premio')
on conflict (vehicle_id, locale) do nothing;


-- ---------------------------------------------------------------------
-- [6.c] services  (+ service_translations)
-- ---------------------------------------------------------------------
insert into public.services (
  id, slug
) values (
  '44444444-4444-4444-8444-111111111111',
  'corporate'
) on conflict (slug) do nothing;

insert into public.services (
  id, slug
) values (
  '44444444-4444-4444-8444-222222222222',
  'airport-transfer'
) on conflict (slug) do nothing;

-- corporate translations (id, en)
insert into public.service_translations (service_id, locale, display_name) values
  ('44444444-4444-4444-8444-111111111111', 'id', 'Sewa Mobil Korporat dengan Supir')
on conflict (service_id, locale) do nothing;

insert into public.service_translations (service_id, locale, display_name) values
  ('44444444-4444-4444-8444-111111111111', 'en', 'Corporate Chauffeur Service')
on conflict (service_id, locale) do nothing;

-- airport-transfer translations (id, en)
insert into public.service_translations (service_id, locale, display_name) values
  ('44444444-4444-4444-8444-222222222222', 'id', 'Antar Jemput Bandara dengan Sopir')
on conflict (service_id, locale) do nothing;

insert into public.service_translations (service_id, locale, display_name) values
  ('44444444-4444-4444-8444-222222222222', 'en', 'Airport Transfer with Chauffeur')
on conflict (service_id, locale) do nothing;


-- =====================================================================
-- END OF TASK 5.2 SECTION
-- =====================================================================
-- The UUIDs above — singapore (country), innova + hiace (vehicles),
-- corporate + airport-transfer (services) — are the anchor points for:
--   * task 5.3 — join tables (city_vehicles links city UUIDs from
--                [5] TASK 5.1 to the vehicle UUIDs seeded here; the
--                country / service UUIDs are consumed by the
--                programmatic page generators in tasks 7.11–7.13).
-- Do not rename or re-number these UUIDs without updating 5.3.
-- =====================================================================

-- =====================================================================
-- [7] TASK 5.3 — Relationships
--                (airports + city_vehicles + city_airports +
--                 city_related + city_aliases)
-- =====================================================================
-- Requirements: R5.9 (City_Page shows every Vehicle whose
--               `city_vehicles` row links the launched City to an
--               active Vehicle; City_Page shows airport transfers
--               for every City with a non-empty `city_airports`
--               reference), R21.16 (structured join tables —
--               `city_vehicles`, `city_airports`, `city_related`,
--               `city_aliases` — are part of the Supabase schema
--               and must be populated with chauffeur-only data).
-- Design:       §3.1
--
-- Seeds the join-table rows that wire the structured content from
-- tasks 5.1 (cities) and 5.2 (vehicles) together, plus the three
-- airport parent rows those joins reference:
--
--   * 3 airports          (CGK, HLP, BDO)
--   * 6 city_vehicles     (3 launched cities × 2 vehicles)
--   * 4 city_airports     (jakarta↔CGK,HLP; bandung↔BDO; bogor↔CGK)
--   * 10 city_related     (directed, ranked internal-link graph)
--   * 2 city_aliases      (jakarta-pusat, bandoeng)
--
-- IDs are FIXED UUID literals for airports so future seeds can
-- reference them by value rather than by IATA-code subquery. The
-- `code` column is UNIQUE (migration 0002), so `on conflict (code)`
-- is the right idempotency anchor for the airport inserts. Join
-- tables use their composite primary keys as the conflict target;
-- `city_aliases` uses its single-column PK `alias_slug`.
--
-- Airport UUIDs (fifth family, RFC 4122 v4 — third group starts with
-- 4, fourth group starts with 8):
--
--   55555555-5555-4555-8555-111111111111  → CGK (Soekarno–Hatta)
--   55555555-5555-4555-8555-222222222222  → HLP (Halim Perdanakusuma)
--   55555555-5555-4555-8555-333333333333  → BDO (Husein Sastranegara)
--
-- City UUIDs (from [5] TASK 5.1, reproduced for grep-ability):
--
--   11111111-1111-4111-8111-111111111111  → bogor      (launched)
--   11111111-1111-4111-8111-222222222222  → jakarta    (launched)
--   11111111-1111-4111-8111-333333333333  → bandung    (launched)
--   11111111-1111-4111-8111-444444444444  → purwakarta (coverable)
--
-- Vehicle UUIDs (from [6] TASK 5.2, reproduced for grep-ability):
--
--   33333333-3333-4333-8333-111111111111  → innova
--   33333333-3333-4333-8333-222222222222  → hiace
--
-- Bogor has no major commercial airport — the airport-transfer
-- landing for Bogor is served through Jakarta's CGK, so a
-- `city_airports (bogor, CGK)` row is included deliberately. The
-- coverable city Purwakarta is intentionally omitted from
-- `city_vehicles` and `city_airports` (it surfaces only through
-- Coverage_Page, per R5.6/R22.*), but it IS a valid endpoint in
-- `city_related` so its Coverage_Page can link back to nearby
-- launched cities.
--
-- Idempotency: every INSERT uses ON CONFLICT DO NOTHING against the
-- correct constraint (code for airports, composite PK for the join
-- tables, alias_slug for aliases). Re-running the seed on an already
-- seeded database is a no-op.
-- =====================================================================

-- ---------------------------------------------------------------------
-- [7.a] airports  (CGK, HLP, BDO)
-- ---------------------------------------------------------------------
insert into public.airports (
  id, code, city_id, name
) values (
  '55555555-5555-4555-8555-111111111111',
  'CGK',
  '11111111-1111-4111-8111-222222222222',
  'Soekarno–Hatta International Airport'
) on conflict (code) do nothing;

insert into public.airports (
  id, code, city_id, name
) values (
  '55555555-5555-4555-8555-222222222222',
  'HLP',
  '11111111-1111-4111-8111-222222222222',
  'Halim Perdanakusuma International Airport'
) on conflict (code) do nothing;

insert into public.airports (
  id, code, city_id, name
) values (
  '55555555-5555-4555-8555-333333333333',
  'BDO',
  '11111111-1111-4111-8111-333333333333',
  'Husein Sastranegara International Airport'
) on conflict (code) do nothing;


-- ---------------------------------------------------------------------
-- [7.b] city_vehicles  (launched cities × both vehicles = 6 rows)
-- ---------------------------------------------------------------------
-- Purwakarta (coverable) is intentionally omitted — Coverage_Pages
-- do not list specific vehicle inventory per R5.6.
insert into public.city_vehicles (city_id, vehicle_id) values
  ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-111111111111')  -- bogor   × innova
on conflict (city_id, vehicle_id) do nothing;

insert into public.city_vehicles (city_id, vehicle_id) values
  ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-222222222222')  -- bogor   × hiace
on conflict (city_id, vehicle_id) do nothing;

insert into public.city_vehicles (city_id, vehicle_id) values
  ('11111111-1111-4111-8111-222222222222', '33333333-3333-4333-8333-111111111111')  -- jakarta × innova
on conflict (city_id, vehicle_id) do nothing;

insert into public.city_vehicles (city_id, vehicle_id) values
  ('11111111-1111-4111-8111-222222222222', '33333333-3333-4333-8333-222222222222')  -- jakarta × hiace
on conflict (city_id, vehicle_id) do nothing;

insert into public.city_vehicles (city_id, vehicle_id) values
  ('11111111-1111-4111-8111-333333333333', '33333333-3333-4333-8333-111111111111')  -- bandung × innova
on conflict (city_id, vehicle_id) do nothing;

insert into public.city_vehicles (city_id, vehicle_id) values
  ('11111111-1111-4111-8111-333333333333', '33333333-3333-4333-8333-222222222222')  -- bandung × hiace
on conflict (city_id, vehicle_id) do nothing;


-- ---------------------------------------------------------------------
-- [7.c] city_airports  (4 rows)
-- ---------------------------------------------------------------------
-- Jakarta → CGK + HLP (both its own airports).
insert into public.city_airports (city_id, airport_id) values
  ('11111111-1111-4111-8111-222222222222', '55555555-5555-4555-8555-111111111111')  -- jakarta × CGK
on conflict (city_id, airport_id) do nothing;

insert into public.city_airports (city_id, airport_id) values
  ('11111111-1111-4111-8111-222222222222', '55555555-5555-4555-8555-222222222222')  -- jakarta × HLP
on conflict (city_id, airport_id) do nothing;

-- Bandung → BDO (its own airport).
insert into public.city_airports (city_id, airport_id) values
  ('11111111-1111-4111-8111-333333333333', '55555555-5555-4555-8555-333333333333')  -- bandung × BDO
on conflict (city_id, airport_id) do nothing;

-- Bogor → CGK. Bogor has no major commercial airport, so its airport
-- transfer landing is served through Jakarta's Soekarno–Hatta. The
-- foreign-key on city_airports is on airport_id (not on the airport's
-- own city_id), so this is schema-legal and exists purely to give
-- Bogor a non-empty city_airports reference per R5.9.
insert into public.city_airports (city_id, airport_id) values
  ('11111111-1111-4111-8111-111111111111', '55555555-5555-4555-8555-111111111111')  -- bogor × CGK
on conflict (city_id, airport_id) do nothing;


-- ---------------------------------------------------------------------
-- [7.d] city_related  (10 directed rows, ranked 1..n per origin)
-- ---------------------------------------------------------------------
-- Directed relationships; rank 1 is the most-prominent link on the
-- origin city's page. The CHECK (city_id <> related_city_id) in
-- migration 0002 forbids self-links, which is respected below.

-- Bogor → jakarta, bandung, purwakarta
insert into public.city_related (city_id, related_city_id, rank) values
  ('11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-222222222222', 1)  -- bogor → jakarta
on conflict (city_id, related_city_id) do nothing;

insert into public.city_related (city_id, related_city_id, rank) values
  ('11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-333333333333', 2)  -- bogor → bandung
on conflict (city_id, related_city_id) do nothing;

insert into public.city_related (city_id, related_city_id, rank) values
  ('11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-444444444444', 3)  -- bogor → purwakarta
on conflict (city_id, related_city_id) do nothing;

-- Jakarta → bogor, bandung
insert into public.city_related (city_id, related_city_id, rank) values
  ('11111111-1111-4111-8111-222222222222', '11111111-1111-4111-8111-111111111111', 1)  -- jakarta → bogor
on conflict (city_id, related_city_id) do nothing;

insert into public.city_related (city_id, related_city_id, rank) values
  ('11111111-1111-4111-8111-222222222222', '11111111-1111-4111-8111-333333333333', 2)  -- jakarta → bandung
on conflict (city_id, related_city_id) do nothing;

-- Bandung → jakarta, bogor, purwakarta
insert into public.city_related (city_id, related_city_id, rank) values
  ('11111111-1111-4111-8111-333333333333', '11111111-1111-4111-8111-222222222222', 1)  -- bandung → jakarta
on conflict (city_id, related_city_id) do nothing;

insert into public.city_related (city_id, related_city_id, rank) values
  ('11111111-1111-4111-8111-333333333333', '11111111-1111-4111-8111-111111111111', 2)  -- bandung → bogor
on conflict (city_id, related_city_id) do nothing;

insert into public.city_related (city_id, related_city_id, rank) values
  ('11111111-1111-4111-8111-333333333333', '11111111-1111-4111-8111-444444444444', 3)  -- bandung → purwakarta
on conflict (city_id, related_city_id) do nothing;

-- Purwakarta → jakarta, bandung
insert into public.city_related (city_id, related_city_id, rank) values
  ('11111111-1111-4111-8111-444444444444', '11111111-1111-4111-8111-222222222222', 1)  -- purwakarta → jakarta
on conflict (city_id, related_city_id) do nothing;

insert into public.city_related (city_id, related_city_id, rank) values
  ('11111111-1111-4111-8111-444444444444', '11111111-1111-4111-8111-333333333333', 2)  -- purwakarta → bandung
on conflict (city_id, related_city_id) do nothing;


-- ---------------------------------------------------------------------
-- [7.e] city_aliases  (slug redirects to canonical city)
-- ---------------------------------------------------------------------
-- Common misspellings / alternative spellings that users may type or
-- that external sites may link using. The alias_slug CHECK in
-- migration 0002 requires lowercase alphanumeric segments joined
-- with single hyphens (matching the canonical slug format), which
-- both of the entries below satisfy.

-- jakarta-pusat → jakarta. "Jakarta Pusat" (Central Jakarta) is an
-- administrative district of DKI Jakarta; for our chauffeur coverage
-- it is the same serviceable market as the jakarta landing page.
insert into public.city_aliases (alias_slug, canonical_city_id) values
  ('jakarta-pusat', '11111111-1111-4111-8111-222222222222')
on conflict (alias_slug) do nothing;

-- bandoeng → bandung. Historical Dutch-era spelling of Bandung that
-- occasionally shows up in legacy external links and older travel
-- writing. Redirecting it to the canonical slug keeps equity on the
-- main landing page.
insert into public.city_aliases (alias_slug, canonical_city_id) values
  ('bandoeng', '11111111-1111-4111-8111-333333333333')
on conflict (alias_slug) do nothing;


-- =====================================================================
-- END OF TASK 5.3 SECTION
-- =====================================================================
-- Seed data for the Structured_Content_Store is now complete for the
-- MVP launch set:
--   * 4 cities (3 launched + 1 coverable) with id/en translations.
--   * 1 country (Singapore) with id/en translations.
--   * 2 vehicles (Innova, Hiace) with id/en translations.
--   * 2 services (Corporate, Airport Transfer) with id/en translations.
--   * 3 airports (CGK, HLP, BDO) attached to jakarta / bandung.
--   * city_vehicles / city_airports / city_related / city_aliases
--     join rows wiring the above together.
-- Tasks 5.4+ (MDX narrative) and 7.11–7.13 (programmatic page
-- generators) consume this data by slug or UUID. Do not delete any
-- of the fixed UUID literals above without updating those consumers.
-- =====================================================================
