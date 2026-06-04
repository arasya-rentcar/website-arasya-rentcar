# Admin Runbook + Incident Playbook

## Routine operations

### Adding a new city to launched coverage

1. Author MDX bodies in `content/cities/id/{slug}.mdx` and `content/cities/en/{slug}.mdx`.
2. Verify locally: `pnpm check:mdx`, `pnpm check:uniqueness`, `pnpm check:forbidden-phrases`.
3. Open a PR. Wait for the `Content Checks` workflow to pass.
4. After merge, in Supabase Studio insert a row in `cities` with `coverage_state: 'launched'` (and `chauffeur_only: true`).
5. Insert translations in `city_translations` (one row per locale).
6. Wait for the `notify_revalidate` trigger to fire — verify in Vercel function logs that `/api/revalidate` received the POST.
7. Confirm the city renders at `/sewa-mobil/{slug}` and `/en/car-rental/{slug}`.

### Demoting a city from launched to coverable

When the uniqueness analyzer (task 12.2) flags a launched city as
overlap-violating, demote until rewritten:

```sql
update cities set coverage_state = 'coverable' where slug = '<city-slug>';
```

The trigger fires and the page returns `noindex` per `CoverageTemplate`'s
robots policy.

### Rotating the revalidate secret

See `docs/ops/deployment.md` section 2.

### Booking lead retention

The `purge_expired_leads()` cron job runs daily and deletes leads with
`status IN ('spam', 'cancelled')` older than 180 days per R19.2. Healthy
leads remain until manual review. To force a purge for testing:

```sql
select purge_expired_leads();
```

## Incident playbook

### Scenario A: `/api/booking` returns 500 errors

1. Check Vercel function logs for `[booking]` entries. The most likely
   cause is a Supabase outage or service-role key rotation drift.
2. Verify `SUPABASE_SERVICE_ROLE_KEY` and `LEAD_IP_HASH_SALT` env vars are
   set in Vercel.
3. The rate-limit check fails OPEN — a transient Supabase outage does NOT
   block bookings, but the insert IS gated. If insert is the issue, the
   visitor sees `db_error` 500.
4. Mitigation: post a banner on the homepage asking visitors to contact
   admin directly via WhatsApp until the database is restored.

### Scenario B: Admin notification webhook fails consistently

1. Check `[adminNotify]` log entries in Vercel.
2. The webhook is fire-and-forget (R12.10) — booking flow is unaffected.
3. Verify `ADMIN_NOTIFICATION_WEBHOOK_URL` and `ADMIN_NOTIFICATION_WEBHOOK_SECRET`.
4. Manually replay leads from Supabase Studio if needed.

### Scenario C: Revalidate webhook stops receiving POSTs from Supabase

1. Check `revalidate_outbox` table — pending rows indicate trigger fires
   but POSTs fail.
2. Verify `app.revalidate_url` and `app.revalidate_secret` GUCs match the
   current Vercel deployment URL and secret (see `docs/ops/deployment.md`).
3. Verify the `retry_revalidate_outbox` cron is running (`select * from
   cron.job_run_details order by start_time desc limit 10;`).
4. If outbox grows unbounded, run `select retry_revalidate_outbox();`
   manually to drain.

### Scenario D: Spike of spam booking submissions

1. Check `leads` table sorted by `created_at desc` for the spam pattern.
2. Add the offending phone prefix or notes pattern to the spam blocklist
   in `lib/security/spamBlocklist.ts`. Deploy.
3. The rate limiter (10 per IP per 60 min) should already cap volume.
4. Manually mark suspicious leads as `status: 'spam'` so the daily purge
   picks them up.

### Scenario E: Admin WhatsApp number compromised

1. Update `ARASYA_WHATSAPP_NUMBER` and `NEXT_PUBLIC_ARASYA_WHATSAPP_NUMBER`
   in Vercel to the new number.
2. Trigger redeploy.
3. Update copy on social channels and any external listings.
4. Update the anti-fraud notice copy if needed (it does not name the
   number — the number is rendered from the env var).

## Contact

For escalation beyond what this runbook covers, the operator on-call should
review:
- Recent Vercel function logs for the affected route handler
- Supabase database logs for the affected table
- The `revalidate_outbox` and `rate_limit` tables for systemic anomalies
