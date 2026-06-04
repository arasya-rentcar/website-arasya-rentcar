# Deployment Operations

This document is the operator's reference for deploying the Arasya Rentcar
website. It covers (1) every environment variable the runtime expects, (2)
where each variable lives in production, and (3) the Supabase vault + GUC
setup required for the on-demand revalidation pipeline.

Companion docs:

- `docs/ops/supabase-region.md` (task 16.4) — region colocation policy.
- `docs/ops/backup-retention.md` (task 16.5) — Supabase backup policy.

---

## 1. Environment variable reference (task 16.2)

`scripts/validate-env.ts` runs as part of `pnpm prebuild` and fails the build
when any variable marked **required** is missing or malformed. Treat that
script as the single source of truth for build-time enforcement; this table
is the human-readable mirror.

### Source of truth

| Source | Used for |
| --- | --- |
| `.env.local` (gitignored) | Local development — copy from `.env.example`. |
| Vercel project env (Production / Preview / Development) | Deployment runtime values. |
| Supabase database GUC (`alter database set …`) | Database-side runtime config read by trigger functions (e.g. `app.revalidate_url`, `app.revalidate_secret`). |
| Supabase Vault (`vault.create_secret`) | Reserved for future secrets that triggers reference. Not used today; current implementation reads from GUCs only (see section 2). |

### Site

| Variable | Local | Vercel | Required | Description |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | yes | yes (all envs) | required | Absolute origin used for canonical URLs and OG images. No trailing slash. Example: `https://arasyarentcar.com`. |

### WhatsApp

| Variable | Local | Vercel | Required | Description |
| --- | --- | --- | --- | --- |
| `ARASYA_WHATSAPP_NUMBER` | yes | yes (all envs) | required | Official admin WhatsApp number in E.164 format. Server-only. Read by `buildWhatsAppUrl`, `notify_revalidate` does NOT need this. |
| `NEXT_PUBLIC_ARASYA_WHATSAPP_NUMBER` | yes | yes (all envs) | required (display) | Public-safe display copy of the admin number for the booking confirmation screen. Should match the server value. |

### Supabase

| Variable | Local | Vercel | Required | Description |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | yes (all envs) | required | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | yes (all envs) | required | Supabase anon key (browser-safe). |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | yes (all envs) | required | Service-role key. **Server-only.** Never imported from a client component (R21.8). |
| `SUPABASE_PROJECT_ID` | optional | optional | optional | Used only by `pnpm db:types` against a remote project. |

### Security

| Variable | Local | Vercel | Required | Description |
| --- | --- | --- | --- | --- |
| `LEAD_IP_HASH_SALT` | yes | yes (all envs) | required | Pepper for SHA-256 hashing visitor IPs in `leads.ip_hash` and `rate_limit.ip_hash`. Long random string (≥ 32 chars). |
| `REVALIDATE_SECRET` | yes | yes (all envs) | required | Shared secret for `/api/revalidate`. Must match `app.revalidate_secret` GUC in Supabase (see section 2). |

### Admin notifications

| Variable | Local | Vercel | Required | Description |
| --- | --- | --- | --- | --- |
| `ADMIN_NOTIFICATION_WEBHOOK_URL` | optional | optional | optional | Outbound webhook called fire-and-forget after a booking is stored. Leave blank to disable. |
| `ADMIN_NOTIFICATION_WEBHOOK_SECRET` | optional | optional | optional | Shared secret. When set, requests carry `Authorization: Bearer <secret>` so the receiver can verify origin. |

### Chat widget

| Variable | Local | Vercel | Required | Description |
| --- | --- | --- | --- | --- |
| `CHAT_WIDGET_ID` | optional | optional | optional | Legacy identifier; not consumed today. |
| `NEXT_PUBLIC_CHAT_WIDGET_SCRIPT_URL` | optional | optional | optional | Third-party chat widget script URL. Loaded only when consent is granted. |

### Analytics

| Variable | Local | Vercel | Required | Description |
| --- | --- | --- | --- | --- |
| `ANALYTICS_ID` | optional | optional | optional | Legacy analytics id; not consumed today. |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | optional | optional | optional | Plausible domain. When set + consent granted + DNT off, the Plausible script loads and `trackEvent` calls fire. Leave blank to disable. |

---

## 2. Supabase Vault + GUC setup (task 16.3)

The `notify_revalidate()` trigger function (defined in
`supabase/migrations/0004_triggers_revalidate.sql`) reads two values from
PostgreSQL's runtime configuration system at trigger fire time:

- `app.revalidate_url` — absolute URL of the Next.js `/api/revalidate`
  endpoint. The trigger POSTs to this URL whenever a content row changes.
- `app.revalidate_secret` — shared secret sent in the
  `x-revalidate-secret` request header. **Must match the `REVALIDATE_SECRET`
  env var on the Next.js side.**

### Prerequisites

- Supabase project access with the `service_role` or owner role.
- The Vercel deployment URL of the Next.js app (for example,
  `https://arasyarentcar.com`).
- The `REVALIDATE_SECRET` value already configured on Vercel.

### Setup steps

#### 1. Set `app.revalidate_url`

In the Supabase SQL editor, run:

```sql
alter database postgres set "app.revalidate_url" = 'https://arasyarentcar.com/api/revalidate';
```

Replace the URL with your actual deployment origin. Preview deployments
that use a different URL should still point this GUC at the production URL —
preview deployments are not expected to receive revalidate webhooks.

#### 2. Set `app.revalidate_secret`

The secret is server-side only and must NEVER be exposed to client builds.
In the Supabase SQL editor:

```sql
alter database postgres set "app.revalidate_secret" = '<paste your REVALIDATE_SECRET here>';
```

The value must match the `REVALIDATE_SECRET` env var on Vercel exactly.

#### 3. Verify

After both GUCs are set, restart open database connections (Supabase
auto-recycles on settings change). Verify the values:

```sql
select current_setting('app.revalidate_url');
select current_setting('app.revalidate_secret');
```

#### 4. Test the revalidate path

Manually update a row in the `cities` table (for example flip
`coverage_state` from `launched` to `coverable` and back), and check the
Vercel function logs for an incoming POST to `/api/revalidate` with the
matching `x-revalidate-secret` header. If the POST fails for any reason,
the trigger writes to `revalidate_outbox` and the
`retry_revalidate_outbox` cron job (`supabase/cron-schedule.sql`) will
retry with exponential backoff.

### Rotating the secret

When rotating `REVALIDATE_SECRET`:

1. Generate a new long random string (≥ 32 characters).
2. Update the Vercel env var first across Production / Preview / Development.
3. Trigger a Vercel redeploy so the new secret takes effect.
4. Run the `alter database set "app.revalidate_secret" = '<new>';` query in
   Supabase.
5. Confirm the new secret works by triggering a test revalidation.

There is a brief window during rotation where requests with the old secret
may arrive at the new Next.js deployment. Those will return 401, the
trigger will enqueue them in `revalidate_outbox`, and the cron will retry
once the database GUC catches up. No content writes are lost.

### Why GUC, not Vault

The current implementation stores the secret in a database GUC because:

- The GUC value never crosses a network boundary except as a header on the
  POST to `/api/revalidate` over HTTPS.
- The threat model treats the database itself as the trust boundary; a
  party with `service_role` access already has full read of `leads`, so
  isolating the secret from them adds no defense.
- A future Vault migration would replace `current_setting('app.…')` with
  a `vault.decrypted_secrets` lookup in the trigger function. Documented
  here for visibility but out of scope for the MVP.

---

## 3. Other operational sections

- **Region colocation** — see `docs/ops/supabase-region.md` (task 16.4).
- **Backups + retention** — see `docs/ops/backup-retention.md` (task 16.5).
- **CI / preview deploy workflow** — see `.github/workflows/preview-deploy.yml`
  (task 16.6) and `.github/workflows/ci.yml` for the gates that block deploys.
