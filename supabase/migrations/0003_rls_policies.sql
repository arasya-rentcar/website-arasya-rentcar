-- Migration: 0003_rls_policies.sql
-- Purpose:   Enable Row Level Security and install the policy matrix on every
--            table created by 0001_init_leads.sql and 0002_init_structured_content.sql.
--            Locks `leads` and `rate_limit` to service_role (+ future admin),
--            and exposes the Structured_Content_Store to the anon role for
--            public read paths, gated by coverage_state / active flags so that
--            unlaunched or inactive rows never leak to the website.
--
-- Requirements:
--   R12.3   RLS on `leads`: deny-all for anon; service_role has insert/select/update;
--           delete restricted to explicit Admin-managed roles only.
--   R21.15  RLS on every Structured_Content_Store table: anon SELECT only for
--           `cities` rows where `coverage_state in ('launched','coverable')`
--           and for other content tables where the corresponding `active` flag
--           is true; writes restricted to service_role and the authenticated
--           admin role.
--   R22.2   Coverage_Page gating: anon reads of `cities` (and child tables that
--           reference a city) must be filtered by `coverage_state`, so that
--           `inactive` cities are never returned to the browser.
--   R24.1   Supabase Studio admin workflow: authenticated users whose JWT
--           claim `role = 'admin'` may INSERT / UPDATE / DELETE on every
--           content table (and on `leads`, for the future admin console).
--
-- Scope / out of scope:
--   * Only ALTER TABLE ... ENABLE RLS and CREATE POLICY statements live here.
--     Table DDL is owned by 0001 / 0002. Trigger functions (revalidate /
--     touch_updated_at) are owned by 0004+ and 0005.
--   * Policy naming convention (per task 3.4):
--       <table>_anon_read   - SELECT policy for anon with the matrix predicate
--       <table>_anon_deny   - explicit FOR ALL deny policy (leads, rate_limit)
--       <table>_service_rw  - FOR ALL policy for service_role
--       <table>_admin_write - FOR ALL policy for authenticated admins
--   * Absence of an INSERT / UPDATE / DELETE policy for anon on the content
--     tables is intentional: with RLS enabled and no grant, anon writes are
--     rejected by Postgres. Per-action deny policies are only added on
--     `leads` / `rate_limit`, where we want the FOR ALL `using (false)` form
--     to be explicit and self-documenting.

-- ---------------------------------------------------------------------------
-- leads  (R12.3, R24.1)
-- ---------------------------------------------------------------------------
alter table public.leads enable row level security;

create policy leads_anon_deny
  on public.leads
  for all
  to anon
  using (false)
  with check (false);

create policy leads_service_rw
  on public.leads
  for all
  to service_role
  using (true)
  with check (true);

create policy leads_admin_write
  on public.leads
  for all
  to authenticated
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ---------------------------------------------------------------------------
-- rate_limit  (R12.3, R19.5 -- abuse-control table, anon has no business here)
-- ---------------------------------------------------------------------------
alter table public.rate_limit enable row level security;

create policy rate_limit_anon_deny
  on public.rate_limit
  for all
  to anon
  using (false)
  with check (false);

create policy rate_limit_service_rw
  on public.rate_limit
  for all
  to service_role
  using (true)
  with check (true);

create policy rate_limit_admin_write
  on public.rate_limit
  for all
  to authenticated
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ---------------------------------------------------------------------------
-- cities  (R21.15, R22.2)
--   anon SELECT gated by coverage_state; `inactive` rows are invisible.
-- ---------------------------------------------------------------------------
alter table public.cities enable row level security;

create policy cities_anon_read
  on public.cities
  for select
  to anon
  using (coverage_state in ('launched','coverable'));

create policy cities_service_rw
  on public.cities
  for all
  to service_role
  using (true)
  with check (true);

create policy cities_admin_write
  on public.cities
  for all
  to authenticated
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ---------------------------------------------------------------------------
-- city_translations  (R21.15, R22.2)
--   Inherits the cities coverage gate via EXISTS subquery so translations
--   for `inactive` cities are never exposed to anon.
-- ---------------------------------------------------------------------------
alter table public.city_translations enable row level security;

create policy city_translations_anon_read
  on public.city_translations
  for select
  to anon
  using (
    exists (
      select 1
      from public.cities c
      where c.id = city_translations.city_id
        and c.coverage_state in ('launched','coverable')
    )
  );

create policy city_translations_service_rw
  on public.city_translations
  for all
  to service_role
  using (true)
  with check (true);

create policy city_translations_admin_write
  on public.city_translations
  for all
  to authenticated
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ---------------------------------------------------------------------------
-- countries  (R21.15)
--   anon SELECT only for active rows.
-- ---------------------------------------------------------------------------
alter table public.countries enable row level security;

create policy countries_anon_read
  on public.countries
  for select
  to anon
  using (active = true);

create policy countries_service_rw
  on public.countries
  for all
  to service_role
  using (true)
  with check (true);

create policy countries_admin_write
  on public.countries
  for all
  to authenticated
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ---------------------------------------------------------------------------
-- country_translations  (R21.15)
--   Gated through parent country.active = true.
-- ---------------------------------------------------------------------------
alter table public.country_translations enable row level security;

create policy country_translations_anon_read
  on public.country_translations
  for select
  to anon
  using (
    exists (
      select 1
      from public.countries c
      where c.id = country_translations.country_id
        and c.active = true
    )
  );

create policy country_translations_service_rw
  on public.country_translations
  for all
  to service_role
  using (true)
  with check (true);

create policy country_translations_admin_write
  on public.country_translations
  for all
  to authenticated
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ---------------------------------------------------------------------------
-- vehicles  (R21.15)
-- ---------------------------------------------------------------------------
alter table public.vehicles enable row level security;

create policy vehicles_anon_read
  on public.vehicles
  for select
  to anon
  using (active = true);

create policy vehicles_service_rw
  on public.vehicles
  for all
  to service_role
  using (true)
  with check (true);

create policy vehicles_admin_write
  on public.vehicles
  for all
  to authenticated
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ---------------------------------------------------------------------------
-- vehicle_translations  (R21.15)
-- ---------------------------------------------------------------------------
alter table public.vehicle_translations enable row level security;

create policy vehicle_translations_anon_read
  on public.vehicle_translations
  for select
  to anon
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = vehicle_translations.vehicle_id
        and v.active = true
    )
  );

create policy vehicle_translations_service_rw
  on public.vehicle_translations
  for all
  to service_role
  using (true)
  with check (true);

create policy vehicle_translations_admin_write
  on public.vehicle_translations
  for all
  to authenticated
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ---------------------------------------------------------------------------
-- services  (R21.15)
-- ---------------------------------------------------------------------------
alter table public.services enable row level security;

create policy services_anon_read
  on public.services
  for select
  to anon
  using (active = true);

create policy services_service_rw
  on public.services
  for all
  to service_role
  using (true)
  with check (true);

create policy services_admin_write
  on public.services
  for all
  to authenticated
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ---------------------------------------------------------------------------
-- service_translations  (R21.15)
-- ---------------------------------------------------------------------------
alter table public.service_translations enable row level security;

create policy service_translations_anon_read
  on public.service_translations
  for select
  to anon
  using (
    exists (
      select 1
      from public.services s
      where s.id = service_translations.service_id
        and s.active = true
    )
  );

create policy service_translations_service_rw
  on public.service_translations
  for all
  to service_role
  using (true)
  with check (true);

create policy service_translations_admin_write
  on public.service_translations
  for all
  to authenticated
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ---------------------------------------------------------------------------
-- airports  (R21.15)
--   anon SELECT is unconditional per the matrix (airports list is a public
--   directory and airport rows carry no visitor-facing gating flag).
-- ---------------------------------------------------------------------------
alter table public.airports enable row level security;

create policy airports_anon_read
  on public.airports
  for select
  to anon
  using (true);

create policy airports_service_rw
  on public.airports
  for all
  to service_role
  using (true)
  with check (true);

create policy airports_admin_write
  on public.airports
  for all
  to authenticated
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ---------------------------------------------------------------------------
-- city_vehicles  (R21.15, R22.2)
--   Junction row is visible to anon only when both parents are visible:
--   the city's coverage_state is launched/coverable AND the vehicle is active.
-- ---------------------------------------------------------------------------
alter table public.city_vehicles enable row level security;

create policy city_vehicles_anon_read
  on public.city_vehicles
  for select
  to anon
  using (
    exists (
      select 1
      from public.cities c
      where c.id = city_vehicles.city_id
        and c.coverage_state in ('launched','coverable')
    )
    and exists (
      select 1
      from public.vehicles v
      where v.id = city_vehicles.vehicle_id
        and v.active = true
    )
  );

create policy city_vehicles_service_rw
  on public.city_vehicles
  for all
  to service_role
  using (true)
  with check (true);

create policy city_vehicles_admin_write
  on public.city_vehicles
  for all
  to authenticated
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ---------------------------------------------------------------------------
-- city_airports  (R21.15, R22.2)
--   Junction row is visible to anon only when the city side is visible.
--   Airports have no gating flag, so no airport-side predicate is needed.
-- ---------------------------------------------------------------------------
alter table public.city_airports enable row level security;

create policy city_airports_anon_read
  on public.city_airports
  for select
  to anon
  using (
    exists (
      select 1
      from public.cities c
      where c.id = city_airports.city_id
        and c.coverage_state in ('launched','coverable')
    )
  );

create policy city_airports_service_rw
  on public.city_airports
  for all
  to service_role
  using (true)
  with check (true);

create policy city_airports_admin_write
  on public.city_airports
  for all
  to authenticated
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ---------------------------------------------------------------------------
-- city_related  (R21.15, R22.2)
--   Both the source and the related city must pass the cities coverage gate
--   before the relationship is exposed to anon.
-- ---------------------------------------------------------------------------
alter table public.city_related enable row level security;

create policy city_related_anon_read
  on public.city_related
  for select
  to anon
  using (
    exists (
      select 1
      from public.cities c
      where c.id = city_related.city_id
        and c.coverage_state in ('launched','coverable')
    )
    and exists (
      select 1
      from public.cities r
      where r.id = city_related.related_city_id
        and r.coverage_state in ('launched','coverable')
    )
  );

create policy city_related_service_rw
  on public.city_related
  for all
  to service_role
  using (true)
  with check (true);

create policy city_related_admin_write
  on public.city_related
  for all
  to authenticated
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ---------------------------------------------------------------------------
-- city_aliases  (R21.15)
--   anon SELECT is unconditional: the 301-lookup from misspellings has to
--   happen at request time before we know which city the alias resolves to.
--   Gating happens downstream (Requirement 22 criterion 8) by checking the
--   target city's coverage_state during the redirect handler.
-- ---------------------------------------------------------------------------
alter table public.city_aliases enable row level security;

create policy city_aliases_anon_read
  on public.city_aliases
  for select
  to anon
  using (true);

create policy city_aliases_service_rw
  on public.city_aliases
  for all
  to service_role
  using (true)
  with check (true);

create policy city_aliases_admin_write
  on public.city_aliases
  for all
  to authenticated
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');
