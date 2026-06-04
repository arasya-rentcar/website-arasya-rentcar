-- =====================================================================
-- File:      supabase/cron-schedule.sql
-- Purpose:   Wire the three scheduled housekeeping jobs that keep the
--            Supabase project within its operational bounds:
--
--              1. retry_revalidate_outbox()    — every minute
--                 Drains public.revalidate_outbox, retrying failed
--                 on-demand revalidation notifications with
--                 exponential backoff (R24.3, design §7.2; task 3.6).
--                 Function: supabase/functions/retry-revalidate.sql
--
--              2. purge_expired_leads()        — daily at 03:10 UTC
--                 Deletes public.leads rows with status in
--                 ('spam','cancelled') whose created_at is older than
--                 180 days (R19.2, R21.11, design §3 / §27; task 3.13).
--                 Function: supabase/migrations/0006_lead_retention.sql
--
--              3. purge_expired_rate_limit()   — hourly
--                 Deletes public.rate_limit counter rows whose
--                 window_start is older than 24 hours (R12.8,
--                 design §23; task 3.7).
--                 Function: supabase/migrations/0005_rate_limit.sql
--
-- =====================================================================
-- MANUAL APPLY ONLY.
--
-- This file is NOT part of the Supabase migration stream. It must be
-- applied once by the release owner per environment, via:
--
--     psql "$SUPABASE_DB_URL" -f supabase/cron-schedule.sql
--
-- Rationale:
--   * pg_cron schedules are environment-scoped (staging vs production
--     cadences may differ) and changing a cadence must not force a
--     schema migration on every project.
--   * Supabase Cloud ships with pg_cron pre-enabled on the `postgres`
--     database; on a brand-new project or a self-hosted instance the
--     operator may still need to run, once, as a superuser:
--
--         create extension if not exists pg_cron;
--         grant usage on schema cron to postgres;
--
-- This script is idempotent: each job is identified by a stable
-- `jobname` and any existing job with that name is unscheduled before
-- the schedule is (re)created, so re-running the file is safe.
-- =====================================================================

-- ---------------------------------------------------------------------------
-- 1) retry_revalidate_outbox — every minute
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'retry-revalidate-outbox') then
    perform cron.unschedule('retry-revalidate-outbox');
  end if;

  perform cron.schedule(
    'retry-revalidate-outbox',
    '* * * * *',
    $job$select public.retry_revalidate_outbox();$job$
  );
end $$;

-- ---------------------------------------------------------------------------
-- 2) purge_expired_leads — once per day at 03:10 UTC
--
-- 03:10 UTC picks the quietest window for the Asia/Jakarta audience
-- (10:10 WIB, mid-morning for the ops team) while still staying well
-- clear of Supabase's default backup window.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-expired-leads') then
    perform cron.unschedule('purge-expired-leads');
  end if;

  perform cron.schedule(
    'purge-expired-leads',
    '10 3 * * *',
    $job$select public.purge_expired_leads();$job$
  );
end $$;

-- ---------------------------------------------------------------------------
-- 3) purge_expired_rate_limit — once per hour, at minute 5
--
-- Minute 5 offsets the hourly purge from the top-of-the-hour rate-limit
-- window boundary (counters are keyed by date_trunc('hour', now())) so
-- the cleanup never races with active in-window writes from callers
-- whose clocks are slightly ahead.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-expired-rate-limit') then
    perform cron.unschedule('purge-expired-rate-limit');
  end if;

  perform cron.schedule(
    'purge-expired-rate-limit',
    '5 * * * *',
    $job$select public.purge_expired_rate_limit();$job$
  );
end $$;
