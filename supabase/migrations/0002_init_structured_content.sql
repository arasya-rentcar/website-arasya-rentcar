-- =============================================================================
-- Migration: 0002_init_structured_content.sql
-- Purpose:   Create the Structured_Content_Store tables for the Arasya
--            RentCar website. Defines the 13 core content tables (cities,
--            city_translations, countries, country_translations, vehicles,
--            vehicle_translations, services, service_translations, airports,
--            city_vehicles, city_airports, city_related, city_aliases),
--            their CHECK constraints (slug format regex, length bounds,
--            coverage_state enum, locale enum, chauffeur_only = true,
--            passengers/seats bounds, city_related not-self), supporting
--            indexes, the `touch_updated_at()` function, and BEFORE UPDATE
--            triggers that maintain `updated_at`.
--
--            RLS policies are intentionally NOT part of this migration;
--            they live in 0003_rls_policies.sql. Revalidate triggers live
--            in 0004_triggers_revalidate.sql. Seed rows land in later
--            migrations.
--
-- Requirements: R5.2, R5.4, R21.13, R21.14 (`coverage_state` check),
--               R21.16 (unique + composite PKs), R22.1
-- Design:       §3.1
-- =============================================================================

-- -----------------------------------------------------------------------------
-- cities
-- -----------------------------------------------------------------------------
create table public.cities (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique
                    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 1 and 80),
  parent_region     text,
  country_code      text not null default 'ID',
  latitude          double precision,
  longitude         double precision,
  coverage_state    text not null default 'coverable'
                    check (coverage_state in ('launched','coverable','inactive')),
  allow_index       boolean not null default false,
  featured_order    integer,
  launch_priority   integer not null default 0,
  pricing_hint_from integer,
  pricing_hint_to   integer,
  chauffeur_only    boolean not null default true check (chauffeur_only = true),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index cities_coverage_idx       on public.cities (coverage_state);
create index cities_coverage_prio_idx  on public.cities (coverage_state, launch_priority desc);
create index cities_featured_idx       on public.cities (featured_order) where featured_order is not null;

-- -----------------------------------------------------------------------------
-- city_translations
-- -----------------------------------------------------------------------------
create table public.city_translations (
  city_id        uuid not null references public.cities(id) on delete cascade,
  locale         text not null check (locale in ('id','en')),
  display_name   text not null check (char_length(display_name) between 1 and 120),
  short_blurb    text,
  primary key (city_id, locale)
);

-- -----------------------------------------------------------------------------
-- countries
-- -----------------------------------------------------------------------------
create table public.countries (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  country_code  text not null unique,
  chauffeur_only boolean not null default true check (chauffeur_only = true),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- country_translations
-- -----------------------------------------------------------------------------
create table public.country_translations (
  country_id   uuid not null references public.countries(id) on delete cascade,
  locale       text not null check (locale in ('id','en')),
  display_name text not null,
  primary key (country_id, locale)
);

-- -----------------------------------------------------------------------------
-- vehicles
-- -----------------------------------------------------------------------------
create table public.vehicles (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  seats         integer not null check (seats between 1 and 30),
  luggage       integer not null check (luggage >= 0),
  active        boolean not null default true,
  chauffeur_only boolean not null default true check (chauffeur_only = true),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- vehicle_translations
-- -----------------------------------------------------------------------------
create table public.vehicle_translations (
  vehicle_id   uuid not null references public.vehicles(id) on delete cascade,
  locale       text not null check (locale in ('id','en')),
  display_name text not null,
  primary key (vehicle_id, locale)
);

-- -----------------------------------------------------------------------------
-- services
-- -----------------------------------------------------------------------------
create table public.services (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  active        boolean not null default true,
  chauffeur_only boolean not null default true check (chauffeur_only = true),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- service_translations
-- -----------------------------------------------------------------------------
create table public.service_translations (
  service_id   uuid not null references public.services(id) on delete cascade,
  locale       text not null check (locale in ('id','en')),
  display_name text not null,
  primary key (service_id, locale)
);

-- -----------------------------------------------------------------------------
-- airports
-- -----------------------------------------------------------------------------
create table public.airports (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,      -- IATA, e.g. CGK
  city_id    uuid not null references public.cities(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- city_vehicles (join: cities <-> vehicles)
-- -----------------------------------------------------------------------------
create table public.city_vehicles (
  city_id    uuid not null references public.cities(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  primary key (city_id, vehicle_id)
);

-- -----------------------------------------------------------------------------
-- city_airports (join: cities <-> airports)
-- -----------------------------------------------------------------------------
create table public.city_airports (
  city_id    uuid not null references public.cities(id) on delete cascade,
  airport_id uuid not null references public.airports(id) on delete cascade,
  primary key (city_id, airport_id)
);

-- -----------------------------------------------------------------------------
-- city_related (self-referential: cities <-> cities, not-self enforced)
-- -----------------------------------------------------------------------------
create table public.city_related (
  city_id          uuid not null references public.cities(id) on delete cascade,
  related_city_id  uuid not null references public.cities(id) on delete cascade,
  rank             integer not null default 0,
  primary key (city_id, related_city_id),
  check (city_id <> related_city_id)
);

-- -----------------------------------------------------------------------------
-- city_aliases (slug redirects to canonical city)
-- -----------------------------------------------------------------------------
create table public.city_aliases (
  alias_slug      text primary key
                  check (alias_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  canonical_city_id uuid not null references public.cities(id) on delete cascade,
  created_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- updated_at trigger function + BEFORE UPDATE triggers
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$ declare t text; begin
  for t in select unnest(array['cities','countries','vehicles','services','airports']) loop
    execute format('create trigger %I_touch before update on public.%I
                    for each row execute function public.touch_updated_at();', t||'_touch', t);
  end loop;
end $$;
