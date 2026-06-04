-- =====================================================================
-- Migration: 0004_triggers_revalidate.sql
-- Purpose:   Supabase-side revalidation plumbing. Emits an HTTP POST to
--            the Website's on-demand revalidation endpoint whenever a
--            row in any page-backing table is inserted, updated, or
--            deleted. Payload shape: { entityType, slug }.
--
-- Requirements:
--   R5.10 - Structured content surfaces published via revalidation
--   R5.11 - Revalidation endpoint accepts entityType + slug
--   R24.2 - Supabase database trigger invokes on-demand revalidation
--           with REVALIDATE_SECRET when structured-content rows change
--   R24.3 - Revalidation failures must be logged and retried with
--           exponential backoff (retry plumbing is added in task 3.6
--           via the revalidate_outbox table and cron function).
--
-- Design reference: §7.2
--
-- GUCs expected to be set at the database / role level:
--   app.revalidate_url     -- e.g. https://arasyarentcar.com/api/revalidate
--   app.revalidate_secret  -- matches REVALIDATE_SECRET env on the Website
--
-- Extension prerequisites: `pg_net` must be enabled (exposes schema `net`).
-- =====================================================================

-- Ensure pg_net is available. Idempotent; safe to run if already enabled.
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------
-- notify_revalidate()
-- ---------------------------------------------------------------------
-- Generic trigger function used by tables whose row carries its own
-- `slug` column (cities, countries, vehicles, services). The airports
-- table is also routed through this function but uses its `code` column
-- as the slug (handled inline via TG_ARGV[1] = 'code' override).
--
-- Matches design §7.2 verbatim, with one intentional, minimal addition:
-- we coalesce(new, old) so DELETE triggers also fire correctly (on
-- DELETE, NEW is null). Without this, the R24.2 requirement — which
-- mandates revalidation on INSERT, UPDATE, and DELETE — cannot be met.
--
-- TG_ARGV[0] — entity type string passed to the Website
--              ('city' | 'country' | 'vehicle' | 'service' | 'airport')
-- TG_ARGV[1] — optional override for the column name holding the slug.
--              Defaults to 'slug'. airports uses 'code'.
-- ---------------------------------------------------------------------
create or replace function public.notify_revalidate()
returns trigger
language plpgsql
as $$
declare
  payload    jsonb;
  rec        record;
  slug_col   text := coalesce(TG_ARGV[1], 'slug');
  slug_value text;
begin
  -- Handle INSERT/UPDATE via NEW, DELETE via OLD.
  rec := coalesce(new, old);

  -- Pull slug_col off the row dynamically so the same function works
  -- for tables that use 'slug' and for airports that use 'code'.
  execute format('select ($1).%I::text', slug_col) into slug_value using rec;

  payload := jsonb_build_object(
    'entityType', TG_ARGV[0],
    'slug',       slug_value
  );

  perform net.http_post(
    url := current_setting('app.revalidate_url'),
    headers := jsonb_build_object(
      'x-revalidate-secret', current_setting('app.revalidate_secret'),
      'content-type',        'application/json'
    ),
    body := payload,
    timeout_milliseconds := 5000
  );

  return rec;
end $$;

comment on function public.notify_revalidate() is
  'Fires an HTTP POST to app.revalidate_url with { entityType, slug } on row changes. Generic across tables that expose a slug-like column; see migration 0004 header.';

-- ---------------------------------------------------------------------
-- notify_revalidate_via_parent_city()
-- ---------------------------------------------------------------------
-- Helper used by join tables that do NOT have their own slug column
-- (city_vehicles, city_airports, city_related). The Website treats
-- changes to these edges as content changes on the parent city page,
-- so we resolve the parent city's slug and fire entityType = 'city'.
--
-- city_aliases uses notify_revalidate() directly with TG_ARGV[1] =
-- 'alias_slug' because alias edits need to invalidate the alias lookup.
-- ---------------------------------------------------------------------
create or replace function public.notify_revalidate_via_parent_city()
returns trigger
language plpgsql
as $$
declare
  rec         record;
  city_uuid   uuid;
  city_slug   text;
  payload     jsonb;
begin
  rec := coalesce(new, old);

  -- Every join table routed through this function has a `city_id`
  -- column referencing public.cities(id). Extract it dynamically so
  -- the generic `record` type does not require a compile-time known
  -- rowtype for field access.
  execute 'select ($1).city_id::uuid' into city_uuid using rec;

  select c.slug into city_slug
    from public.cities c
   where c.id = city_uuid;

  -- If the parent city has already been deleted (cascading delete),
  -- skip the notification silently — the cities DELETE trigger on the
  -- parent row already fired and handles revalidation.
  if city_slug is null then
    return rec;
  end if;

  payload := jsonb_build_object(
    'entityType', 'city',
    'slug',       city_slug
  );

  perform net.http_post(
    url := current_setting('app.revalidate_url'),
    headers := jsonb_build_object(
      'x-revalidate-secret', current_setting('app.revalidate_secret'),
      'content-type',        'application/json'
    ),
    body := payload,
    timeout_milliseconds := 5000
  );

  return rec;
end $$;

comment on function public.notify_revalidate_via_parent_city() is
  'Resolves parent city slug from NEW/OLD.city_id and notifies the Website with entityType = ''city''. Used by join tables that have no slug of their own.';

-- =====================================================================
-- Per-table triggers
-- =====================================================================

-- Drop then create so this migration is rerunnable in local dev.
-- 1) Tables carrying their own slug-like column.
do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('cities',    'city',     'slug'),
      ('countries', 'country',  'slug'),
      ('vehicles',  'vehicle',  'slug'),
      ('services',  'service',  'slug'),
      ('airports',  'airport',  'code')
    ) as t(tbl, entity_type, slug_col)
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      spec.tbl || '_revalidate', spec.tbl
    );
    execute format(
      'create trigger %I
         after insert or update or delete on public.%I
         for each row execute function public.notify_revalidate(%L, %L)',
      spec.tbl || '_revalidate',
      spec.tbl,
      spec.entity_type,
      spec.slug_col
    );
  end loop;
end $$;

-- 2) Join tables that revalidate the parent city page.
do $$
declare
  tbl text;
begin
  foreach tbl in array array['city_vehicles', 'city_airports', 'city_related']
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      tbl || '_revalidate', tbl
    );
    execute format(
      'create trigger %I
         after insert or update or delete on public.%I
         for each row execute function public.notify_revalidate_via_parent_city()',
      tbl || '_revalidate',
      tbl
    );
  end loop;
end $$;

-- 3) city_aliases — its own slug column is `alias_slug`, and changes
--    must revalidate the alias lookup path, so we notify as entity
--    type 'city' (the Website resolves aliases against the cities
--    surface) using the alias_slug as the slug value.
drop trigger if exists city_aliases_revalidate on public.city_aliases;
create trigger city_aliases_revalidate
  after insert or update or delete on public.city_aliases
  for each row execute function public.notify_revalidate('city', 'alias_slug');

-- =====================================================================
-- R24.3 retry/backoff plumbing (task 3.6, appended).
-- ---------------------------------------------------------------------
-- pg_net's net.http_post is asynchronous: it enqueues the outbound
-- request and returns a `request_id`, *not* the HTTP response. That
-- means the trigger can only observe failures that occur *before* the
-- request enters the queue (missing GUCs, malformed URL, pg_net
-- unavailable, etc.). Out-of-band transport failures (connection
-- refused, 5xx from the Website, timeouts) are surfaced later via
-- pg_net's own request/response log tables.
--
-- The `revalidate_outbox` table below is the durable fallback for the
-- synchronous-failure case: if net.http_post raises, the trigger
-- writes a 'pending' row here so the companion `retry_revalidate_outbox`
-- function (see supabase/functions/retry-revalidate.sql, design §7.2)
-- can retry the notification with exponential backoff on a scheduled
-- cron tick. Status transitions are pending -> delivered on success,
-- or pending -> failed after the retry budget is exhausted.
--
-- RLS follows the same matrix as `rate_limit` in 0003_rls_policies.sql:
-- anon deny-all, service_role full, authenticated admin full.
-- =====================================================================

create table if not exists public.revalidate_outbox (
  id              uuid         primary key default gen_random_uuid(),
  enqueued_at     timestamptz  not null default now(),
  entity_type     text         not null,
  slug            text         not null,
  attempt_count   integer      not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz  not null default now(),
  last_error      text,
  status          text         not null default 'pending'
                               check (status in ('pending','delivered','failed'))
);

comment on table public.revalidate_outbox is
  'R24.3 retry/backoff queue for on-demand revalidation notifications. '
  'Rows are enqueued by notify_revalidate()/notify_revalidate_via_parent_city() '
  'when net.http_post fails synchronously, and drained by '
  'public.retry_revalidate_outbox() via a Supabase scheduled cron every minute. '
  'See design §7.2.';

comment on column public.revalidate_outbox.attempt_count is
  'Number of delivery attempts already made. Increments each time the cron '
  'retries and the POST still fails; the row is marked status=''failed'' when '
  'attempt_count reaches the retry budget (see retry_revalidate_outbox).';

comment on column public.revalidate_outbox.next_attempt_at is
  'Earliest wall-clock time at which the cron is allowed to retry this row. '
  'Exponential backoff: now() + (2^attempt_count) minutes, capped at 60 minutes.';

-- Hot-path index for the cron drain query (status = 'pending' and due now).
create index if not exists revalidate_outbox_status_next_attempt_idx
  on public.revalidate_outbox (status, next_attempt_at);

-- Operational index for admin/ops inspection ("what got queued recently?").
create index if not exists revalidate_outbox_enqueued_idx
  on public.revalidate_outbox (enqueued_at desc);

-- ---------------------------------------------------------------------
-- RLS on revalidate_outbox (same matrix as rate_limit in 0003).
-- ---------------------------------------------------------------------
alter table public.revalidate_outbox enable row level security;

drop policy if exists revalidate_outbox_anon_deny    on public.revalidate_outbox;
drop policy if exists revalidate_outbox_service_rw   on public.revalidate_outbox;
drop policy if exists revalidate_outbox_admin_write  on public.revalidate_outbox;

create policy revalidate_outbox_anon_deny
  on public.revalidate_outbox
  for all
  to anon
  using (false)
  with check (false);

create policy revalidate_outbox_service_rw
  on public.revalidate_outbox
  for all
  to service_role
  using (true)
  with check (true);

create policy revalidate_outbox_admin_write
  on public.revalidate_outbox
  for all
  to authenticated
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ---------------------------------------------------------------------
-- Re-declare notify_revalidate() / notify_revalidate_via_parent_city()
-- with exception handling that enqueues into revalidate_outbox on any
-- synchronous failure from net.http_post. Function signatures are
-- identical to the initial definitions above; TG_ARGV continues to
-- drive entity_type and the slug column. Re-issuing `create or replace`
-- keeps the existing triggers wired to the newer body.
--
-- Semantics:
--   * On success (net.http_post returns a request_id): nothing extra;
--     the Website side processes the request and the trigger is done.
--   * On synchronous failure (missing GUCs, pg_net unavailable, invalid
--     URL, etc.): we swallow the exception, log it to revalidate_outbox
--     with status='pending', and still return the row so the originating
--     DML completes. Losing a notification is never allowed to break a
--     content write (R24.2 / R24.3).
-- ---------------------------------------------------------------------
create or replace function public.notify_revalidate()
returns trigger
language plpgsql
as $$
declare
  payload    jsonb;
  rec        record;
  slug_col   text := coalesce(TG_ARGV[1], 'slug');
  slug_value text;
  entity     text := TG_ARGV[0];
begin
  rec := coalesce(new, old);

  execute format('select ($1).%I::text', slug_col) into slug_value using rec;

  payload := jsonb_build_object(
    'entityType', entity,
    'slug',       slug_value
  );

  begin
    perform net.http_post(
      url := current_setting('app.revalidate_url'),
      headers := jsonb_build_object(
        'x-revalidate-secret', current_setting('app.revalidate_secret'),
        'content-type',        'application/json'
      ),
      body := payload,
      timeout_milliseconds := 5000
    );
  exception
    when others then
      -- Synchronous failure path: enqueue for retry so the cron companion
      -- can pick this up. SQLERRM is captured verbatim for diagnostics.
      insert into public.revalidate_outbox (entity_type, slug, last_error, status)
      values (entity, slug_value, sqlerrm, 'pending');
  end;

  return rec;
end $$;

comment on function public.notify_revalidate() is
  'Fires an HTTP POST to app.revalidate_url with { entityType, slug } on row '
  'changes. Generic across tables that expose a slug-like column. '
  'Synchronous net.http_post failures are captured into public.revalidate_outbox '
  'for retry with exponential backoff (R24.3, design §7.2).';

create or replace function public.notify_revalidate_via_parent_city()
returns trigger
language plpgsql
as $$
declare
  rec       record;
  city_uuid uuid;
  city_slug text;
  payload   jsonb;
begin
  rec := coalesce(new, old);

  execute 'select ($1).city_id::uuid' into city_uuid using rec;

  select c.slug into city_slug
    from public.cities c
   where c.id = city_uuid;

  if city_slug is null then
    return rec;
  end if;

  payload := jsonb_build_object(
    'entityType', 'city',
    'slug',       city_slug
  );

  begin
    perform net.http_post(
      url := current_setting('app.revalidate_url'),
      headers := jsonb_build_object(
        'x-revalidate-secret', current_setting('app.revalidate_secret'),
        'content-type',        'application/json'
      ),
      body := payload,
      timeout_milliseconds := 5000
    );
  exception
    when others then
      insert into public.revalidate_outbox (entity_type, slug, last_error, status)
      values ('city', city_slug, sqlerrm, 'pending');
  end;

  return rec;
end $$;

comment on function public.notify_revalidate_via_parent_city() is
  'Resolves parent city slug from NEW/OLD.city_id and notifies the Website '
  'with entityType = ''city''. Synchronous net.http_post failures are captured '
  'into public.revalidate_outbox for retry with exponential backoff '
  '(R24.3, design §7.2).';
