# Arasya Rent Car — pSEO marketing site

Multi-city programmatic-SEO site for **Arasya Rent Car** (PT. Ayomi Raya, Bogor) —
premium car rental **with driver**. One registry entry = one indexable landing page,
plus a hub directory, a supporting blog, and a content-management layer.

**Stack:** Next.js 15 (App Router, SSG/ISR) · Supabase (Postgres + Storage + Auth) · Vercel.

## Build phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Scaffold, vendored design system, registries → Supabase | ✅ done |
| 2 | Templates (home / city / region / country / travel / hub / blog), statically generated per locale | ✅ done |
| 3 | Content Studio at `/admin` — Supabase Auth + Storage | ⏳ next |

Routes: `/` · `/{slug}` (city/region/country) · `/travel` · `/sewa-mobil` · `/blog` ·
`/blog/{slug}` · `/admin`, each mirrored under `/en/` where English content exists.

## Setup

```bash
npm install
cp .env.example .env.local     # fill in from Supabase → Project Settings → API
```

Create a project at [supabase.com/dashboard](https://supabase.com/dashboard) — the free tier
is enough, this site reads far more than it writes. Then from **Project Settings → API Keys**
copy the project URL, the **publishable** key (`sb_publishable_…`) and the **secret** key
(`sb_secret_…`) into `.env.local`. These replace the legacy `anon` / `service_role` JWTs,
which can be disabled outright — the code reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` (kept under its old name, since it is still the secret one).

Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` to the first Content Studio login — **quote the password
if it contains `#`**, or dotenv reads it as a comment and the value silently becomes empty.
Generate `REVALIDATE_SECRET` with
`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.

> **Give this site its own project.** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is served to every
> visitor's browser by definition, so the project it unlocks must contain nothing but
> marketing content. Pointing it at a database that also holds orders, invoices or customer
> records makes the whole business's data dependent on RLS being flawless across every
> unrelated table.

Then disable public sign-up — **Authentication → Providers → Email → "Allow new users to
sign up"** off. Access is granted by an `admins` row, not by registration.

Apply the schema and load content:

```bash
npx supabase db push --db-url "$SUPABASE_DB_URL"   # applies 0001 then 0002
npm run db:seed                                    # registries → Supabase, + admin bootstrap
npm run db:verify                                  # reads every row back, deep-equals it
npm run verify:rls                                 # proves the public key is fenced in
npm run dev
```

`SUPABASE_DB_URL` **must be the pooler host**, not `db.<ref>.supabase.co`. Supabase serves
direct connections over IPv6 only; on an IPv4 network the direct host has an `AAAA` record
and no `A` record, so it simply never connects. Use the session-mode pooler URI
(`aws-0-<region>.pooler.supabase.com:5432`) from **Project Settings → Database**.

If `db push` fails on `0002_storage.sql` with `42501: must be owner of table objects`, the
content schema in `0001` still applied — paste `0002_storage.sql` into the dashboard SQL
editor, which runs with the rights to policy `storage.objects`. Nothing else changes.

Until `NEXT_PUBLIC_SUPABASE_URL` is set, `dev` and `build` fall back to the registry
snapshot, so the site renders fully without a database.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm run verify:mapping` | Offline: registry → row → domain round-trip, asset coverage, image credits. Needs no database. |
| `npm run verify:seo` | Offline: canonicals, hreflang, FAQPage ↔ visible FAQ, internal-link integrity. |
| `npm run verify:routes` | Live (needs `next start -p 3100`): every sitemap URL, hreflang target, and canonical returns 200. |
| `npm run verify:rls` | Against Supabase: proves the publishable key reaches published content and nothing else. Re-run after any policy change. |
| `npm run verify:content` | Offline: editorial rules — never self-drive, never names a partner, formal address, unique editorial/destination copy. Prints non-blocking findings for the copy review. |
| `npm run qa:devices` | Live: layout across Fold cover (344px), iPhone, Fold open, iPad and desktop — overflow, image ratios, clipped text, touch targets. |
| `npm run qa:interactions` | Live: every interactive path — WhatsApp CTAs and ref codes, FAQ, burger, filters, tariff checker, campaign attribution. |
| `npm run snapshot` | Regenerates the registry snapshot used when Supabase is unconfigured. |
| `npm run db:seed` | Seeds Supabase from the handoff registries. Idempotent. |
| `npm run db:verify` | End-to-end: reads every row back and deep-equals it against the registries. |

## Architecture notes

### The design system is vendored, not installed

`@arasya/design-system` is **not published to npm** (the registry 404s). The 20 components
in `src/design-system/` were ported from the design-sync bundle in `arasya-handoff/_ds/`,
which ships the real upstream source unminified. `arasya-ds.css` is that bundle's
stylesheet copied byte-for-byte, so every `ar-*` class resolves exactly as it did in the
prototypes.

Never invent new `ar-*` class names. Layout glue uses the `--ar-*` tokens.

### Content model

Four tables mirror the four handoff registries one-for-one:

| Registry | Table | Shape |
|---|---|---|
| `cities.js` | `locations` | one row = one landing page |
| `posts.js` | `posts` | one row = one `/blog/{slug}` |
| `site.js` | `site_settings` | singleton (`id = true`) |
| `travel.js` | `travel_settings` | singleton — `/travel` tariff checker |

Plus `admins` (auth allowlist) and `content_drafts` (staged edits), neither of which is
readable with the anon key.

Columns are snake_case; `src/lib/hydrate.ts` maps them back into the **camelCase registry
shapes** in `src/types.ts`, so `src/lib/shared.ts` and every template read the same objects
the `.dc.html` prototypes did. `npm run verify:mapping` proves that round-trip is lossless.

Each content table carries `status` (`draft`/`published`) and `updated_at`. Staged edits
live in a fifth table, `content_drafts`. The handoff spec lists only `status`, which models
*"this page isn't live yet"* but cannot model *"this live page has unpublished edits"* —
which is exactly what Content Studio's localStorage draft overlay did. Publishing merges
the draft into the live row and deletes it.

Drafts are a separate table rather than a `draft_data` column because **RLS is row-level and
cannot hide a column**. The anon key ships in the browser bundle by design, so a draft column
on a published row would be readable by anyone issuing `?select=draft_data` — leaking
unpublished pricing and copy. A table with no anon policy makes that impossible by
construction, and it turns the CMS's "which entries have pending edits?" query into a narrow
key lookup instead of dragging a large jsonb blob back per row.

### Bilingual

Indonesian at `/{slug}`, English at `/en/{slug}`, both statically rendered — never
client-side translation, since these pages have to be indexable. Every page emits `id`,
`en`, and `x-default` alternates plus a locale-correct canonical, `og:locale`, `<html lang>`,
and JSON-LD `inLanguage`.

Translations live in a single `en` jsonb overlay per row plus a `slug_en` column, rather
than ~16 parallel `*_en` columns. The handoff permits either; the overlay is used because
translation is **partial by design** — an entry stays Indonesian-only until enough EN is
filled in, then joins the `/en/` sitemap and hreflang set — and nothing ever queries *by*
translated content. `src/lib/localize.ts` merges field by field, so a half-translated entry
falls back to Indonesian per field instead of rendering blanks.

Today EN copy exists only for the homepage and `/travel`; `i18n.js` ships no English strings
for the landing, hub, or blog templates. Those routes render Indonesian-only and light up at
`/en/` automatically once their EN fields are filled through the CMS language tab.

Interface strings live in `src/lib/i18n.ts` (`STR`, `TRAVEL_STR`) because they are code, not
CMS content. Registry-content translations — services by slug, trust cards by preset, fleet
notes — go through `site_settings.en`, mirroring `i18n.js`'s `SERVICES_EN` / `TRUST_EN` /
`FLEET_NOTES_EN`. Testimonials are never machine-translated: real quotes keep their original
language in both locales.

### Domains and indexing

The canonical host is a **deployment** concern, not content. `NEXT_PUBLIC_SITE_URL`
overrides `settings.siteUrl` from the database, so the same rows render correct
canonicals, hreflang, OG URLs, JSON-LD and sitemap entries on a staging domain, a Vercel
preview, or production — without editing the CMS.

Indexing is a separate switch, `NEXT_PUBLIC_ALLOW_INDEXING`, and it **defaults to off**:

| | robots.txt | every page |
|---|---|---|
| unset (default) | `Disallow: /`, no sitemap advertised | `<meta name="robots" content="noindex, follow">` |
| `=true` | `Allow: /`, `Disallow: /admin`, sitemap advertised | no robots meta |

They are two variables rather than one because the risks are asymmetric. Getting a staging
domain indexed costs a full domain migration to undo — 301s, a Search Console change of
address, and a ranking dip on URLs you never wanted ranked. Forgetting the flag on
production only delays indexing, and is fixed by a redeploy. So the default is the closed
one, and the build log states which mode it is in every time.

`robots.txt` alone would not be enough: it blocks *crawling*, not *indexing*, so a page
linked from anywhere else can still appear in results with no snippet. The `noindex` meta
is what actually keeps a staging deployment out, and both come from the same flag.

**To launch on the real domain:** set `NEXT_PUBLIC_ALLOW_INDEXING=true`, point
`NEXT_PUBLIC_SITE_URL` at it (or clear it to fall back to the CMS value), redeploy, then
submit the sitemap in Search Console. Nothing in the database changes.

### Campaign attribution

`src/lib/campaign.ts` ports `shared.js campaignTag()`: `utm_*`, `gclid`, and `fbclid` are
captured from the URL, persisted in `sessionStorage`, and appended to outbound WhatsApp
messages as `[Src: source/medium · campaign · gclid]`. Ops matches inbound chats against
that suffix, so its format is contractual.

It runs client-side by necessity — it reads `location.search`. WhatsApp hrefs are therefore
baked into the static HTML *without* the tag and upgraded after hydration by `useWaHref()`,
which keeps the generated pages identical for every visitor and fully cacheable.

### Auth

Sign-up is disabled. An `admins` allowlist row is what grants access, enforced both in
middleware and in every RLS policy — so an authenticated non-admin, or a leaked anon key,
still cannot write. `npm run db:seed` bootstraps the first account from `ADMIN_EMAIL` /
`ADMIN_PASSWORD`.

### Two places the handoff README and the prototypes disagree

The `.dc.html` files are the stated pixel reference, so they win. Noted here because the
prose spec says otherwise:

- The handoff README says "StickyCtaBar on all landing pages". Every landing prototype
  actually ships a floating WhatsApp FAB. `StickyCtaBar` is ported and available, but unused.
- The handoff README says `FleetTable` is the tariff table. The city and region prototypes
  render an image card grid with a Dalam Kota / All-in toggle. `FleetTable` is likewise
  ported but unused on landings.

### Third-party media

Almost every photo is Arasya's own. One is not, and it carries obligations:

| Asset | Work | Author | Licence |
|---|---|---|---|
| `public/assets/images/bogor/situ-gede.webp` | [Langit Biru Situ Gede](https://www.flickr.com/photos/77566046@N04/14986182212) | Pebi Yudha Krisnapati | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) |

`cities.js` ships no photo for Situ Gede. Wikimedia Commons has none either, and four
of the six Flickr results are NonCommercial, which rules them out for a commercial site.
This one is CC BY-SA 2.0 and its description confirms the Bogor lake at CIFOR — not the
Situ Gede in Tasikmalaya that stock libraries return.

Two consequences:

- **The on-card credit is a licence condition, not styling.** `DestinationsSection`
  renders it whenever `imageCredit` is set. Removing it breaches the licence.
- **The file is copyleft.** It was centre-cropped 4:3 → 16:9, which makes it an
  adaptation, so the derived WebP stays CC BY-SA 2.0. This does not affect the rest of
  the site — a page embedding a photo is a collection, not an adaptation.

`scripts/media-situ-gede.mts` reproduces the exact adaptation. `npm run verify:mapping`
fails the build if any credit is incomplete.

Replacing it with an Arasya-owned photograph — Situ Gede is minutes from the Bogor Barat
office — removes both obligations: swap the file and drop `imageCredit` from the entry in
`DESTINATION_MEDIA` (or in Content Studio once Supabase is live).

### A redeploy does not guarantee fresh content

Content lives in the database but the HTML is prerendered, and **Next reuses prerendered
output from `.next/cache` when the source has not changed** — a cache Vercel restores between
deployments. So editing content and redeploying can keep serving the previous build's copy
indefinitely, with nothing to indicate it.

This was observed, not theorised: every `locations.wa_phone` was set to NULL, `db:verify`
confirmed the database, and a rebuild still rendered the old number on two pages. Deleting
`.next/cache` fixed it instantly.

Two defences:

- Every content route sets `export const revalidate = 3600`, so staleness self-heals within
  an hour instead of persisting. The routes stay prerendered — `next build` still reports
  them as `○ Static` / `● SSG`, now with `Revalidate 1h`.
- Phase 3's publish hook will revalidate on demand for instant updates. ISR is the safety
  net for when that webhook fails or someone edits the database directly.

When verifying a content change locally, `rm -rf .next/cache` before `npm run build` —
otherwise you may be testing the previous build.

### Per-page WhatsApp routing

`locations.wa_phone` decides which number every CTA on that page dials. NULL means the
global `settings.waPhone`, so an entry only diverges when it is routed deliberately. Blog
articles inherit their city's number via `cityKey` — a Puncak itinerary is a Bogor lead.

Resolved once, in `officialFor(site, location)`. Overriding at that boundary rather than
threading a phone argument through every component means the CTA hrefs, the anti-fraud
panel, the quote form's displayed number, the footer and `AutoRental.telephone` all move
together and cannot drift apart.

**The value must be one of `settings.officialPhones`.** `TrustSection` renders a
*"Waspada Penipuan"* panel that lists the official numbers and tells visitors to ignore any
other number claiming to be Arasya. A CTA dialling an unlisted number would make the page
contradict its own fraud warning — so `officialFor` fails closed to the global number, and
`verify:content` fails the run. The page's own number is moved to the front of the list
rather than replacing it, because the panel's job is to enumerate every legitimate number.

Two notations are in play and conflating them silently breaks routing: `officialPhones` are
authored for humans in local form (`0821-2402-4281`) while `wa_phone` is the dial string
(`6282124024281`). `waDigits()` normalises before comparing. Without it the match fails, the
page falls back to the global inbox, and **nothing reports an error** — which is how this
first shipped. `OfficialPhoneEntry` therefore carries both: `value` (local, what
`CopyButton` puts on the clipboard, because that is what an Indonesian user dials) and `wa`
(international, for matching).

Seed-time assignment lives in `WA_ROUTING` in `scripts/registry.ts`; it becomes an ordinary
CMS field per entry once Content Studio ships.

### Touch targets

Dense text-link clusters — the internal-link mesh in both footers, the blog's city list,
and the hub link above the fleet grid — carry `.tap-pad`, which adds vertical padding under
`@media (pointer: coarse)`. At the designed density those links are 22px tall with a 6–8px
gap, a ~30px effective target that genuinely causes mis-taps on a phone.

Two things to know before touching this:

- It is scoped to the **pointer**, not a width breakpoint, so mouse layouts are untouched
  and a touch tablet still benefits.
- `qa:devices` must emulate `pointer: coarse` explicitly. `Emulation.setDeviceMetricsOverride`
  resizes the viewport but does **not** set the pointer media feature, so without
  `setEmulatedMedia` these rules never activate and the fix appears not to have worked.

The sweep measures the **effective** target (element height plus the gap to its nearest
interactive neighbour), not raw height — an isolated 40px button has whitespace around it
and is easy to hit, whereas a 38px link 6px from its neighbour is not.

### Overseas entries publish no prices

`site.fleet` is the **Jabodetabek rate card, in IDR**. Everything outside Indonesia is
fulfilled differently, and availability and pricing are settled over WhatsApp — so any entry
with `country !== 'ID'` shows unit *classes* and a consultation CTA instead of the fleet
grid, and emits no price anywhere.

"Anywhere" is the load-bearing word, and it covers four surfaces that are easy to fix
individually and easy to miss together:

| Surface | Overseas behaviour |
|---|---|
| Fleet section | `UnitClassesSection` — generic classes, no tariffs |
| Hub card | `priceLine` empty |
| `AutoRental` JSON-LD | no `priceRange` |
| FAQ + trust cards | quote-based wording, no "Dalam Kota 12 jam / All-in" |

The handoff keyed all of this off `template === 'country'`, which held only while every
overseas entry happened to be a country page. Bangkok is a *city* page abroad, so it
inherited the domestic fleet grid, the domestic tariff FAQ, and the "Dua pilihan tarif jelas"
trust card — a page simultaneously claiming rates are confirmed on WhatsApp and naming two
specific tiers. It is now keyed off `country`, and `npm run verify:seo` fails the build if an
overseas page emits a rupiah figure or names a domestic tier.

A price quoted in structured data is worse than one in copy: it can appear in the search
result itself, reaching the customer before they ever open the page.

### Content rules

Copy is Indonesian, formal-premium ("Anda"); primary CTA "Pesan Sekarang". Never position
as self-drive ("lepas kunci"); never mention partners or third-party fulfilment. Every
entry needs unique `editorial` + `destinations` copy — cloned paragraphs across cities are
what triggers doorway-page filters.

`npm run verify:content` enforces these across every authored string. It splits hard rules
from judgement calls on purpose: positioning, formal address and duplicated body copy fail
the run, while SERP lengths and incidental repetition are printed as findings. A check that
fails on editorial taste gets muted, and a muted check stops guarding the rules that
actually matter.

Trust cards are excluded from the duplication rule. They are a fixed brand promise, and
identical wording across pages is the intent — the domestic pages already share
`site.trustDefaults`.

`site_settings.testimonials` holds **real Google reviews**, supplied by the owner and stored
verbatim with a link back to each source. They are overridden at the seed layer
(`REAL_TESTIMONIALS` in `scripts/registry.ts`) rather than in the database, because the
handoff's `site.js` still contains its invented placeholders — seeding from it directly would
silently restore fabricated reviews over real ones. `verify:mapping` asserts none survives.

Three rules apply to anything added there: quote verbatim, derive `context` only from what
the reviewer actually wrote, and give every entry a `link`. And they must **not** be marked
up as `Review`/`AggregateRating` JSON-LD — Google prohibits self-serving review markup for
reviews collected on a third-party site, and it can draw a manual action.

## Reference

- `arasya-handoff/design_handoff_arasya_pseo/README.md` — handoff brief
- `arasya-handoff/design_handoff_arasya_pseo/PSEO-HANDOFF.md` — full SEO/engineering spec

### The design handoff is not in this repository

`arasya-handoff/` and the earlier `design/preview/` are untracked. Supabase is the source
of truth for content now, and nothing in the build ever read either: `tsconfig` excludes
them, ESLint ignores them, and `app/` and `src/` never import from them.

Only `scripts/registry.ts` did, for seeding. Those loaders now fall back to
`src/data/registry-snapshot.json` — committed, and exported from the database — when the
handoff is absent. The fallback is verified rather than assumed: with the folder removed,
`npm run db:seed` rebuilds the database and `npm run db:verify` still deep-equals it
against the original registries.

Two consequences worth knowing:

- **Keep a copy of the handoff outside the repo.** The `.dc.html` prototypes are the stated
  pixel reference, cited below to settle two disagreements with the prose spec.
- **`verify:mapping` weakens.** With the handoff it proves fidelity to the signed-off
  design; from the snapshot it can only prove the row mapping round-trips. That check has
  served its purpose — the migration is done and verified.

Because a snapshot re-seed writes content the CMS may have edited, `cityToRow` and
`postToRow` read `slugEn`, `en` and `waPhone` from their input instead of hardcoding null.
Hardcoding would silently wipe every translation and per-page WhatsApp routing on the next
seed.
