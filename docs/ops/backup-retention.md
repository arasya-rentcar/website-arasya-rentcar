# Supabase automated backups + retention

Owner: release owner. Scope: production Supabase project backing the Arasya Rentcar website. This document satisfies R19.4 (daily automated Supabase backups retained for at least 7 days) and complements R19.2 (180‑day lead row retention, handled separately by the `purge-leads` scheduled function).

## 1. Policy

- Daily automated full backups are taken by Supabase at the platform level.
- Backups are retained for at least 7 days (R19.4). The Supabase Pro plan's default daily backup window already meets this floor.
- Point‑in‑time recovery (PITR) is enabled on the Pro plan with a 7‑day recovery window, which lets us restore to any moment inside that window, not just the daily snapshot boundary.
- Retention SHOULD NOT be shortened below 7 days. If the plan is ever downgraded, this constraint must be revisited before downgrade and R19.4 re‑validated.

## 2. What is backed up

Automated Supabase backups capture the entire Postgres cluster for the project, including:

- Every table in the `public` schema: `leads`, `rate_limit`, `cities`, `countries`, `vehicles`, `services`, `airports`, all translation tables and their join tables.
- The `auth` schema (users, sessions, identities) so admin accounts can be restored alongside data.
- All RLS policies, functions, triggers, and scheduled `pg_cron` jobs defined under `supabase/migrations/` and `supabase/functions/`.
- Sequences and extensions required by the schema.

Storage bucket objects are NOT covered by Postgres backups. They live in Supabase Storage and are replicated by the platform; see the Supabase Storage redundancy docs if a separate storage restore is ever needed.

## 3. Where backups live

Automated backups are Supabase‑managed. They are stored in Supabase's own infrastructure and are only reachable through the Supabase dashboard and support channels. The project operator cannot download the raw dump without the paid export addon.

Trust boundary note: if stronger isolation from Supabase is required (for example after a supplier incident), the release owner MAY additionally ship a monthly manual `pg_dump` export to an encrypted S3 bucket under our own AWS account. That manual export is out of scope for R19.4 but is the recommended extra layer for long‑term disaster recovery.

## 4. Restore procedure

1. Open the Supabase dashboard and select the production project.
2. Navigate to Project Settings → Database → Backups.
3. Pick the desired snapshot (daily) or PITR timestamp.
4. Click Restore. Supabase will provision a new project from that backup; do not overwrite the live project.
5. Once the restored project is healthy, copy its new `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
6. In Vercel → Project → Settings → Environment Variables, swap those two values for the Production environment.
7. Trigger a redeploy of the latest production build in Vercel so the site picks up the new credentials.
8. Smoke test: load the homepage, submit a test lead, confirm it lands in the restored `leads` table.

## 5. RPO / RTO targets

- RPO (Recovery Point Objective): 24 hours, bounded by the daily backup cadence. With PITR the effective RPO drops to a few minutes inside the 7‑day window.
- RTO (Recovery Time Objective): 2 hours for a full project restore plus env swap and redeploy.

## 6. Verification cadence

The release owner performs a restore drill once per quarter: restore the latest snapshot to a throwaway Supabase project, confirm schema and row counts, then delete the drill project. Result is logged in the change history below. If a drill fails, open a follow‑up issue before closing the quarter.

## Change history

| Date | Actor | Action | Result |
| ---- | ----- | ------ | ------ |
| _tbd_ | _tbd_ | Initial policy documented | n/a |
