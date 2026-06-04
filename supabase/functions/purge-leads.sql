-- =====================================================================
-- File:      supabase/functions/purge-leads.sql
-- Purpose:   Convenience wrapper that (re)defines public.purge_expired_leads()
--            for manual ops invocations via `psql -f supabase/functions/
--            purge-leads.sql`. This is NOT the canonical definition — the
--            canonical, migration-tracked definition lives in
--            supabase/migrations/0006_lead_retention.sql and is what
--            actually provisions the function into a fresh Supabase
--            project. This file exists so that a release owner can
--            refresh / reapply the function out-of-band (e.g. after a
--            restore, or to pin a hotfix between migrations) without
--            having to touch the append-only migration stream.
--
-- Keep this file byte-for-byte in sync with the function body in
-- supabase/migrations/0006_lead_retention.sql. If the two drift, the
-- migration wins; treat this file as a copy.
--
-- Requirements: R19.2, R21.11
-- Design:       §3, §27
--
-- Usage:
--   psql "$SUPABASE_DB_URL" -f supabase/functions/purge-leads.sql
--
-- Execution (one-shot manual purge) after (re)defining the function:
--   psql "$SUPABASE_DB_URL" -c "select public.purge_expired_leads();"
-- =====================================================================

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
  'pg_cron job (see supabase/cron-schedule.sql). Canonical definition lives '
  'in supabase/migrations/0006_lead_retention.sql; this file is a convenience '
  'copy for manual ops invocations.';

revoke execute on function public.purge_expired_leads() from public;
grant  execute on function public.purge_expired_leads() to   service_role;
