-- =====================================================================
-- File:      supabase/functions/retry-revalidate.sql
-- Purpose:   Define public.retry_revalidate_outbox(), the cron-driven
--            drain loop for public.revalidate_outbox. The table is
--            created in supabase/migrations/0004_triggers_revalidate.sql
--            and holds pending revalidation notifications that failed
--            to dispatch synchronously from the row-change triggers.
--            Each invocation of this function processes up to 50 rows
--            whose `next_attempt_at` is due, retries the POST against
--            the Website's /api/revalidate endpoint, and either marks
--            the row `delivered`, reschedules it with exponential
--            backoff, or gives up after the retry budget is spent.
--
-- Requirements:
--   R24.3  Revalidation failures must be logged and retried with
--          exponential backoff.
--
-- Design reference: §7.2
--
-- Scheduling:
--   This function is wired to a Supabase scheduled cron that fires
--   once per minute. That wiring lives outside the migration stream
--   (it is managed at the ops/CLI layer by the release owner, per the
--   project convention for pg_cron schedules — see tasks 10.3 and the
--   out-of-scope note in task 3.6) and is intentionally not created
--   here.
--
-- Security:
--   * SECURITY DEFINER so the cron role (service_role) can dequeue
--     rows without having to own the table directly. `set search_path
--     = public` neutralises the usual search_path hijack risk on
--     security-definer functions.
--   * EXECUTE is revoked from public and granted only to service_role.
--
-- GUCs expected to be set at the database / role level (same ones the
-- triggers in 0004 use):
--   app.revalidate_url     -- e.g. https://arasyarentcar.com/api/revalidate
--   app.revalidate_secret  -- matches REVALIDATE_SECRET env on the Website
-- =====================================================================

create or replace function public.retry_revalidate_outbox()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r           record;
  v_processed integer := 0;
  v_next_gap  integer;
  v_backoff   interval;
  -- Retry budget. After this many failed attempts the row is parked as
  -- 'failed' and will need manual intervention (inspect last_error,
  -- fix root cause, requeue or delete). 10 attempts spans roughly
  -- 2+4+8+16+32+60*5 = ~62 minutes of backoff before the final mark,
  -- which is long enough to weather a rolling Website deploy.
  c_max_attempts constant integer := 10;
  -- Maximum single-step backoff. 2^n grows fast; cap keeps the retry
  -- loop from stretching out indefinitely once a row is near the
  -- retry budget.
  c_max_minutes  constant integer := 60;
begin
  -- Claim a batch of due rows. `for update skip locked` ensures that
  -- overlapping cron ticks do not try to re-send the same row, even
  -- if a previous invocation is still running.
  for r in
    select id, entity_type, slug, attempt_count
      from public.revalidate_outbox
     where status = 'pending'
       and next_attempt_at <= now()
     order by next_attempt_at asc
     limit 50
     for update skip locked
  loop
    v_processed := v_processed + 1;

    begin
      perform net.http_post(
        url := current_setting('app.revalidate_url'),
        headers := jsonb_build_object(
          'x-revalidate-secret', current_setting('app.revalidate_secret'),
          'content-type',        'application/json'
        ),
        body := jsonb_build_object(
          'entityType', r.entity_type,
          'slug',       r.slug
        ),
        timeout_milliseconds := 5000
      );

      -- Synchronous call accepted (pg_net queued the request). We
      -- optimistically mark the row delivered; genuine downstream
      -- failures (e.g. the Website returning 5xx) surface via the
      -- row-change triggers on the next content write and will
      -- enqueue a fresh outbox row, so no state is lost.
      update public.revalidate_outbox
         set status     = 'delivered',
             last_error = null
       where id = r.id;

    exception
      when others then
        -- Compute exponential backoff: 2^(attempt_count after this
        -- failure) minutes, capped at c_max_minutes. `r.attempt_count`
        -- is the pre-increment value, so the post-increment exponent
        -- is attempt_count + 1.
        v_next_gap := least(
          c_max_minutes,
          power(2, r.attempt_count + 1)::integer
        );
        v_backoff  := (v_next_gap || ' minutes')::interval;

        if r.attempt_count + 1 >= c_max_attempts then
          -- Retry budget exhausted; park the row as failed. Ops can
          -- inspect last_error, resolve the underlying issue, and
          -- requeue by setting status back to 'pending'.
          update public.revalidate_outbox
             set attempt_count   = r.attempt_count + 1,
                 last_error      = sqlerrm,
                 status          = 'failed',
                 next_attempt_at = now()
           where id = r.id;
        else
          update public.revalidate_outbox
             set attempt_count   = r.attempt_count + 1,
                 last_error      = sqlerrm,
                 next_attempt_at = now() + v_backoff
           where id = r.id;
        end if;
    end;
  end loop;

  return v_processed;
end;
$$;

comment on function public.retry_revalidate_outbox() is
  'R24.3 retry/backoff drain for public.revalidate_outbox. '
  'Processes up to 50 due rows per call, retries net.http_post against '
  'app.revalidate_url, marks rows delivered on success, or reschedules '
  'them with exponential backoff (2^n minutes, capped at 60) until the '
  'retry budget is exhausted. Invoked by a Supabase scheduled cron '
  'every minute (schedule wiring owned by a later ops task; see design §7.2).';

revoke execute on function public.retry_revalidate_outbox() from public;
grant  execute on function public.retry_revalidate_outbox() to   service_role;
