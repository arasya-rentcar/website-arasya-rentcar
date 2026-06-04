-- Migration: 0005_rate_limit.sql
-- Purpose:   Install the server-side rate-limit machinery that enforces the
--            booking endpoint's abuse-control contract: 10 submissions per
--            60-minute window per `ip_hash`. Adds the `rl_increment` RPC
--            (atomic "insert-or-increment-and-return-count" against the
--            hour-aligned window) and the `purge_expired_rate_limit` helper
--            that the scheduled janitor will call to keep the counter table
--            bounded. The `rate_limit` table itself is created in
--            0001_init_leads.sql and its RLS policies are installed in
--            0003_rls_policies.sql; this migration does NOT redeclare either.
--
-- Requirements:
--   R12.8   IF a client IP address exceeds 10 Booking_Form submissions within
--           a rolling 60-minute window, THEN the Route Handler SHALL reject
--           subsequent submissions with a rate-limit error response and SHALL
--           NOT write to the Supabase Lead_Store. This migration provides the
--           atomic counter-and-read primitive the Route Handler uses to make
--           that decision (design §23).
--
-- Design:   §23 (Migration Example / rate-limit primitives).
--
-- Scope / out of scope:
--   * Table DDL for `rate_limit`               -> owned by 0001_init_leads.sql
--   * RLS policies on `rate_limit`             -> owned by 0003_rls_policies.sql
--                                                 (already: anon deny,
--                                                  service_role full,
--                                                  authenticated admin full)
--   * TypeScript caller (`consumeRateLimit`)   -> owned by task 8.10
--                                                 (`lib/security/rateLimit.ts`)
--   * Cron schedule for `purge_expired_rate_limit`
--                                              -> owned by a later ops /
--                                                 scheduling task; the helper
--                                                 is defined here so it is
--                                                 ready to be wired up.
--
-- Design notes:
--   * Both functions are marked `security definer` so that the server-side
--     caller (service-role client in `lib/security/rateLimit.ts`) can invoke
--     the RPC while anon/auth roles remain denied by RLS. The function owner
--     is the role that executes the migration (typically the Supabase
--     `postgres` superuser), whose writes bypass RLS. `set search_path = public`
--     neutralises the usual `security definer` search_path hijack risk.
--   * Execute is granted only to `service_role`. `public` is revoked so
--     future roles do not accidentally inherit execute rights.
--   * `rl_increment` uses a single `insert ... on conflict do update ...
--     returning count` round-trip so the read-modify-write is atomic under
--     concurrent callers; the RETURNING projection returns the just-written
--     row in both the insert-path (count = 1) and the update-path
--     (count = existing + 1), so the caller always sees the post-increment
--     value.

-- ---------------------------------------------------------------------------
-- rl_increment(p_ip_hash text) returns integer
--   Atomically:
--     1. align "now" to the start of the current hour (sliding window key),
--     2. insert a new counter row for (ip_hash, window_start) with count=1
--        OR, if the row already exists, increment its count by 1,
--     3. return the resulting count.
--   Callers compare the returned value against the R12.8 threshold (10).
-- ---------------------------------------------------------------------------
create or replace function public.rl_increment(p_ip_hash text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz := date_trunc('hour', now());
  v_count        integer;
begin
  insert into public.rate_limit (ip_hash, window_start, count)
  values (p_ip_hash, v_window_start, 1)
  on conflict (ip_hash, window_start) do update
    set count = public.rate_limit.count + 1
  returning public.rate_limit.count into v_count;

  return v_count;
end;
$$;

comment on function public.rl_increment(text) is
  'R12.8 rate-limit primitive: atomically inserts or increments the '
  'hour-aligned (ip_hash, window_start) counter and returns the new count. '
  'Invoked by lib/security/rateLimit.ts via the service-role client.';

revoke execute on function public.rl_increment(text) from public;
grant  execute on function public.rl_increment(text) to   service_role;

-- ---------------------------------------------------------------------------
-- purge_expired_rate_limit() returns integer
--   Housekeeping helper: deletes counter rows whose window_start is older
--   than 24 hours. Returns the number of rows deleted so a scheduled job
--   can log / alert on unexpected volume. The 24h horizon is intentionally
--   longer than the 60-minute enforcement window so that callers running
--   slightly behind wall-clock (e.g. a replica lagging, a late retry) still
--   observe a consistent counter for the window they were rate-limited in.
-- ---------------------------------------------------------------------------
create or replace function public.purge_expired_rate_limit()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  with deleted as (
    delete from public.rate_limit
    where window_start < now() - interval '24 hours'
    returning 1
  )
  select count(*)::int into v_deleted from deleted;

  return coalesce(v_deleted, 0);
end;
$$;

comment on function public.purge_expired_rate_limit() is
  'R12.8 rate-limit janitor: deletes rate_limit rows older than 24 hours. '
  'Intended to be invoked by a scheduled pg_cron / Supabase cron job '
  '(wiring owned by a later ops task).';

revoke execute on function public.purge_expired_rate_limit() from public;
grant  execute on function public.purge_expired_rate_limit() to   service_role;
