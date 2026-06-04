# Supabase region + Vercel colocation

Operational reference for the Arasya RentCar website. Covers why the Supabase project and Vercel deployment must sit in the same geographic zone, which region is currently pinned, and how to verify or change it.

## 1. Policy

The primary audience is Indonesia, with the largest concentration of traffic in Jakarta and the rest of Java. To keep latency predictable for that audience the platform follows a hard colocation rule:

- The Supabase project SHALL be deployed in either `ap-southeast-1` (Singapore) or `ap-southeast-3` (Jakarta).
- The Vercel deployment SHALL target the same geographic zone (Singapore region for Vercel functions and ISR revalidation workers).
- p95 for the API round-trip (Edge / Node function to Postgres and back) plus ISR revalidate from a Vercel worker to Supabase must stay under 150 ms. That budget is what the colocation rule protects.

Using a US or EU Supabase region against an Asian Vercel deployment (or vice versa) breaks this budget by 200 ms or more on a cold round-trip and is not allowed outside of short-lived experiments.

## 2. Chosen region

- Primary: `ap-southeast-1` (Singapore).
- Reason: at project kickoff `ap-southeast-1` offered the higher published SLA and broader Supabase feature coverage (read replicas, point-in-time recovery, newer Postgres builds) compared with `ap-southeast-3`. Singapore is also the closest Vercel functions region (`sin1`), so colocation is clean.
- Alternative: `ap-southeast-3` (Jakarta) is a future migration target. Once Supabase reaches feature parity there, migrating shaves roughly 10 to 30 ms off the Jakarta p50 path. Track the move as a follow-up, do not flip it silently.

## 3. Verifying the region

Two checks — one in the dashboard, one over HTTP — should both agree.

Dashboard:

1. Open the Supabase dashboard.
2. Navigate to Project Settings > General.
3. Confirm the `Region` field reads `Southeast Asia (Singapore)` (`ap-southeast-1`).

HTTP header (works against the production project without credentials):

```bash
curl -s https://<project-ref>.supabase.co -D - -o /dev/null | grep -i sb-region
```

Expected response header:

```
sb-region: ap-southeast-1
```

If the header is missing or reports a different region, stop and escalate before pushing any release.

## 4. Vercel pair

- Functions Region: `sin1` (Singapore). This is set on the production project and applies to Route Handlers, Server Actions, and ISR revalidate workers.
- Preview deployments: inherit the project default (`sin1`). Do not override per-branch.
- Edge Middleware runs globally and is not bound by this setting, but any Edge handler that talks to Supabase should short-circuit to the nearest region Vercel can reach, which for Asia is already `sin1`.

If a future Vercel plan exposes `cgk1` (Jakarta) and Supabase has also moved to `ap-southeast-3`, both values flip together.

## 5. Changing regions

Supabase does not support an in-place region change. A region migration is effectively a project restore:

1. Take a backup of the live Supabase project.
2. Create a new Supabase project in the target region (for example `ap-southeast-3`).
3. Restore the backup into the new project. See the Supabase migration guide: <https://supabase.com/docs> (replace with the current region migration article at time of change).
4. Cut over environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and any server-only refs) in Vercel.
5. Update the Vercel Functions Region in the same deployment window.
6. Re-run the verification steps in section 3 against production.

Process requirements:

- Announce the migration at least 48 hours ahead on the internal ops channel.
- Coordinate with the current release owner so no content publishes or schema migrations are mid-flight during cutover.
- Treat the cutover as a release: feature freeze, smoke tests, and a documented rollback plan (keep the old project read-only for at least 7 days).
