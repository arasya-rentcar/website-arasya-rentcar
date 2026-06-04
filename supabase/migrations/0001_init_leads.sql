-- Migration: 0001_init_leads.sql
-- Purpose:   Initialize the `leads` capture table and `rate_limit` abuse-control
--            table for the Arasya RentCar MVP. Also enables required extensions
--            (`pgcrypto` for gen_random_uuid(), `pg_net` used later by the
--            ISR revalidate trigger in migration 0005).
-- Requirements:
--   R12.2            Leads are captured into Supabase and must persist with a
--                    server-generated uuid and created_at.
--   R12.8            Each lead row stores UTM + source_page provenance plus a
--                    salted ip_hash for abuse controls.
--   R19.5            IP-based rate limiting backed by a (ip_hash, window_start)
--                    counter table.
--   R21.1 / R21.2    Lead lifecycle status column with a fixed enum of values.
--   R21.3            `status` check constraint enforces the allowed set
--                    ('new','contacted','confirmed','completed','cancelled','spam').
--   R28 (forward-compat, §28.1)
--                    `leads.user_id` is a nullable FK to `auth.users(id)` so a
--                    future Accounts phase can back-link historical leads to a
--                    registered user without a schema migration.
--
-- Out of scope for this migration (owned by later migrations):
--   * RLS policies               -> 0003_rls_policies.sql
--   * pg_net revalidate trigger  -> 0005_revalidate_triggers.sql (or equiv.)
--   * rl_increment RPC           -> 0004_rl_increment.sql (or equiv.)
--   * Seed data                  -> handled by the seed task
--   * Structured content tables  -> 0002_init_structured_content.sql

create extension if not exists "pgcrypto";
create extension if not exists "pg_net";

-- ---------------------------------------------------------------------------
-- leads: primary capture table for WhatsApp-first booking inquiries.
-- ---------------------------------------------------------------------------
create table public.leads (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  full_name         text not null,
  whatsapp_number   text not null,
  pickup_city       text not null,
  pickup_location   text not null,
  destination       text,
  pickup_date       date not null,
  pickup_time       time not null,
  rental_duration   text not null,
  passengers        integer not null check (passengers between 1 and 30),
  preferred_vehicle text,
  trip_type         text not null,
  notes             text,
  locale            text not null check (locale in ('id','en')),
  source_page       text,
  utm_source        text,
  utm_medium        text,
  utm_campaign      text,
  status            text not null default 'new'
                    check (status in ('new','contacted','confirmed','completed','cancelled','spam')),
  ip_hash           text,
  user_agent        text,
  -- Forward compatibility (R28 / design §28.1):
  -- Nullable in MVP because there is no auth yet (R2.5). When the Accounts
  -- phase ships, a registering user's whatsapp_number / email is matched to
  -- historical leads and this column is back-filled. `on delete set null`
  -- keeps lead history intact if the linked account is later removed.
  user_id           uuid references auth.users(id) on delete set null
);

create index leads_created_at_desc_idx on public.leads (created_at desc);
create index leads_pickup_city_idx     on public.leads (pickup_city);
create index leads_trip_type_idx       on public.leads (trip_type);
create index leads_status_idx          on public.leads (status);
create index leads_user_id_idx         on public.leads (user_id) where user_id is not null;

-- ---------------------------------------------------------------------------
-- rate_limit: per-(ip_hash, window_start) request counter used by the
-- rl_increment RPC (created in a later migration) to enforce R19.5.
-- ---------------------------------------------------------------------------
create table public.rate_limit (
  ip_hash       text not null,
  window_start  timestamptz not null,
  count         integer not null default 1,
  primary key (ip_hash, window_start)
);

create index rate_limit_window_idx on public.rate_limit (window_start);
