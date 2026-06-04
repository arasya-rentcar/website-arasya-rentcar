-- Migration: 0006_lead_retention.sql
-- Purpose:   Install the server-side retention janitor that enforces the
--            Booking lead retention contract: rows whose `status` is in
--            ('spam','cancelled') are retained for at most 180 days from
--            `created_at`. This migration adds the `purge_expired_leads`
--            helper function only; the cron schedule that drives it lives
--            outside the migration stream in `supabase/cron-schedule.sql`
--            (applied manually by the release owner) so that enabling or
--            changing the schedule does not require a database migration.
--
-- Requirements:
--   R19.2   The Website SHALL publish a privacy policy page that states a
--           retention period of at most 180 days for Booking_Form data
--           (i.e. rows in `public.leads`). This function provides the
--           server-side cleanup path that makes the retention promise
--           technically enforceable.
--   R21.11  WHEN a `leads` row's `status` transitions to `spam` or
--           `cancelled`, THE Supabase_Project SHALL retain the row for at
--           most 180 days from `created_at`, and a scheduled Supabase
--           function or external scheduled job SHALL purge rows exceeding
--           the retention window. This migration defines the function;
--           `supabase/cron-schedule.sql` schedules it.
--
-- Design:   §3 (schema / housekeeping), §27 (operational compliance and
--           cleanup jobs that bound Supabase storage).
--
-- Scope / out of scope:
--   * Table DDL for `leads`                     -> owned by 0001_init_leads.sql
--   * RLS policies on `leads`                   -> owned by 0003_rls_policies.sql
--   * pg_cron schedule for this function        -> owned by
--                                                  supabase/cron-schedule.sql
--                                                  (manual apply, see file
--                                                  header)
--   * One-shot / manual ops invocation copy     -> owned by
--                                                  supabase/functions/purge-leads.sql
--                                                  (mirrors this definition
--                                                  for `psql -f` use)
--
-- Design notes:
--   * `security definer` + `set search_path = public` follows the same
--     pattern as `rl_increment` and `purge_expired_rate_limit` in
--     0005_rate_limit.sql: the function runs with the migration owner's
--     privileges (typically the Supabase `postgres` superuser, whose
--     writes bypass RLS) so that the scheduled caller — service_role via
--     pg_cron — does not need direct DML grants on `public.leads`.
--     Pinning `search_path` neutralises the usual security-definer
--     search_path hijack risk.
--   * EXECUTE is granted only to `service_role`. `public` is revoked so
--     anon / authenticated roles cannot invoke the purge.
--   * The deletion predicate uses `created_at < now() - interval '180 days'`
--     so the function is strictly retention-bounded. The 180-day window is
--     measured from row creation, not from the status transition, which
--     matches R19.2 wording ("retention period of at most 180 days") and
--     R21.11 wording ("at most 180 days from `created_at`").
--   * Returning the delete count lets a scheduled job log / alert on
--     unexpected volume (e.g. a spike in `spam` flagging).

-- ---------------------------------------------------------------------------
-- purge_expired_leads() returns integer
--   Deletes leads rows whose status is in ('spam','cancelled') and whose
--   created_at is older than 180 days. Returns the number of rows deleted.
-- ---------------------------------------------------------------------------
create or replace function public.purge_expired_leads()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  with deleted as (
    delete from public.leads
    where status in ('spam', 'cancelled')
      and created_at < now() - interval '180 days'
    returning 1
  )
  select count(*)::int into v_deleted from deleted;

  return coalesce(v_deleted, 0);
end;
$$;

comment on function public.purge_expired_leads() is
  'R19.2 / R21.11 retention janitor: deletes leads rows whose status is in '
  '(''spam'',''cancelled'') and whose created_at is older than 180 days. '
  'Returns the number of rows deleted. Intended to be invoked by a scheduled '
  'pg_cron job (see supabase/cron-schedule.sql). Canonical definition; the '
  'file supabase/functions/purge-leads.sql mirrors it for one-shot ops use.';

revoke execute on function public.purge_expired_leads() from public;
grant  execute on function public.purge_expired_leads() to   service_role;
