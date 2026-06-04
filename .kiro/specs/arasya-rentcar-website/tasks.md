# Implementation Plan: Arasya Rentcar Website

## Overview

Tasks are grouped into 18 phases ordered so each phase produces a verifiable working state. Every leaf task lists the files to touch, the requirement IDs (`R1..R24`) it satisfies, and the design sections (`§1..§30`) it implements. Versions referenced in setup tasks are the pins from design §29.

**Implementation language:** TypeScript (Next.js 16.2 App Router + React 19.2), as fixed in design §29.2. No language-selection prompt is required.

**Testing convention** (per workflow rules):

- Sub-tasks whose primary purpose is writing automated tests (unit, component, integration, E2E, audit) are postfixed with `*` and are optional for fastest MVP. Implementation sub-tasks are never marked optional.
- The design has no formal `Correctness Properties` section, so property-based tests are not added. Testing is organized as unit + component + E2E per §21.

**Status markers** used throughout:

- `[x]` — task complete
- `[ ]` — task in progress / partially done
- `[ ]` — task not started

**Coding-tasks-only rule:** Every task below is performable by a coding agent. Manual deployment, UAT, Google Search Console submissions, and production performance measurement are handled outside this task list by the release owner and are not tracked here.

---

## Tasks

## Phase 1 — Foundation and Tooling

- [x] 1.1 Initialize Next.js 16.2 + React 19.2 + TypeScript 5.9 app with pnpm
  - Files: `package.json`, `pnpm-lock.yaml`, `next.config.mjs`, `tsconfig.json`, `.gitignore`, `.nvmrc`, `README.md`
  - Requirements: R17.1
  - Design: §1, §2, §29.1, §29.2, §29.10

- [x] 1.2 Pin Node 24 LTS and pnpm 10.31 in `engines` and `packageManager`
  - Files: `package.json`, `.nvmrc`
  - Requirements: R17.10
  - Design: §29.1, §29.10

- [x] 1.3 Configure TypeScript strict mode with path aliases
  - Files: `tsconfig.json` (strict, noUncheckedIndexedAccess, paths `@/*`)
  - Requirements: R17.7
  - Design: §2

- [x] 1.4 Set up ESLint 9 flat config with `eslint-config-next` and custom rule `no-service-key-in-client`
  - Files: `eslint.config.mjs`, `lib/eslint-rules/no-service-key-in-client.mjs`
  - Requirements: R21.8 (no service-role leak), R19.8
  - Design: §22, §29.1

- [x] 1.5 Configure Prettier 3 + editorconfig
  - Files: `.prettierrc`, `.prettierignore`, `.editorconfig`
  - Requirements: —
  - Design: §29.1

- [x] 1.6 Create `.env.example` with every env var from design §20
  - Files: `.env.example`
  - Requirements: R17.9
  - Design: §20

- [x] 1.7 Implement env validation script that blocks build on missing required vars
  - Files: `scripts/validate-env.ts`, `package.json` (`prebuild` hook)
  - Requirements: R11.3, R13.7, R17.10
  - Design: §6, §20

- [x] 1.8 Set up GitHub Actions CI skeleton (lint, typecheck, test, build)
  - Files: `.github/workflows/ci.yml`, `.github/workflows/content-checks.yml`
  - Requirements: R20.1, R24.4
  - Design: §6

- [x] 1.9 Configure `middleware.ts` stub with locale-aware routing scaffolding
  - Files: `middleware.ts`
  - Requirements: R3.1, R3.7
  - Design: §27, §18

---

## Phase 2 — Design System and i18n Scaffolding

- [x] 2.1 Install and configure Tailwind CSS 4.2 with PostCSS integration
  - Files: `postcss.config.mjs`, `app/globals.css` (with `@import "tailwindcss";`)
  - Requirements: R14.1, R14.4
  - Design: §29.3

- [x] 2.2 Define Tailwind v4 design tokens (primary, accent, neutral scale ≥5 shades, dark text, success; spacing, radius, shadow, elevation; type scale ≥6 sizes with line-height and letter-spacing per size)
  - Files: `app/globals.css` (`@theme` block), `lib/design/tokens.ts`
  - Requirements: R14.1, R14.3, R14.4
  - Design: §29.3

- [x] 2.3 Configure `next/font` heading + body fonts with system fallbacks and `font-display: swap`
  - Files: `app/fonts.ts`, `app/[locale]/layout.tsx`
  - Requirements: R14.2, R14.9
  - Design: §19

- [x] 2.4 Install shadcn/ui with Tailwind v4 preset; add button, input, textarea, select, checkbox, card, dialog, accordion, badge, tabs, alert, sheet, dropdown-menu, sonner
  - Files: `components.json`, `components/ui/*.tsx`, `lib/utils.ts`
  - Requirements: R14.5
  - Design: §29.3

- [x] 2.5 Add `sonner` toast component (replaces deprecated shadcn `toast`)
  - Files: `components/ui/sonner.tsx`, `app/[locale]/layout.tsx` (mount Toaster)
  - Requirements: R14.5
  - Design: §29.3

- [x] 2.6 Install `motion` (renamed from `framer-motion`) and build `MotionWrapper` with `useReducedMotion`
  - Files: `components/motion/MotionWrapper.tsx`, `lib/motion/variants.ts`
  - Requirements: R14.6, R14.7
  - Design: §19, §29.4

- [x] 2.7 Create i18n dictionaries for `id` and `en`
  - Files: `lib/i18n/dictionaries/id.json`, `lib/i18n/dictionaries/en.json`, `lib/i18n/getDictionary.ts`
  - Requirements: R1.3, R1.4, R3.8, R3.9, R4.1
  - Design: §18

- [x] 2.8 Centralize static slug segments ID↔EN mapping
  - Files: `lib/i18n/slugMap.ts`
  - Requirements: R3.2, R3.3, R17.3
  - Design: §18

- [x] 2.9 Implement `getPageEquivalent(path, from, to)` for Locale switcher
  - Files: `lib/i18n/pageEquivalent.ts`
  - Requirements: R4.5, R4.6, R4.7
  - Design: §18

- [x] 2.10 Implement slug validator matching R3.4 regex
  - Files: `lib/validation/slug.ts`
  - Requirements: R3.4, R3.5
  - Design: §3

- [ ]\* 2.11 Unit test for slug validator (boundary and rejection cases)
  - Files: `tests/unit/slug.test.ts`
  - Requirements: R3.4, R3.5
  - Design: §21

---

## Phase 3 — Supabase Project, Migrations, Generated Types

- [x] 3.1 Init Supabase CLI locally and link to remote project
  - Files: `supabase/config.toml`, `supabase/.gitignore`
  - Requirements: R21.1
  - Design: §3, §29.6

- [x] 3.2 Create migration `0001_init_leads.sql` with `leads`, `rate_limit`, `user_id` nullable FK, indexes
  - Files: `supabase/migrations/0001_init_leads.sql`
  - Requirements: R12.2, R12.8, R19.5 (rate_limit), R21.1, R21.2, R21.3 (lead_status check), R28-forward
  - Design: §3.1, §28.1

- [x] 3.3 Create migration `0002_init_structured_content.sql` with all 13 content tables (cities, city_translations, countries, country_translations, vehicles, vehicle_translations, services, service_translations, airports, city_vehicles, city_airports, city_related, city_aliases), check constraints, `updated_at` triggers
  - Files: `supabase/migrations/0002_init_structured_content.sql`
  - Requirements: R5.2, R5.4, R21.13, R21.14 (`coverage_state` check), R21.16 (unique + composite PKs), R22.1
  - Design: §3.1

- [x] 3.4 Create migration `0003_rls_policies.sql` with deny-all anon on leads, coverage-state-gated SELECT on cities, service_role full, authenticated admin role
  - Files: `supabase/migrations/0003_rls_policies.sql`
  - Requirements: R12.3, R21.15, R22.2, R24.1
  - Design: §3.2

- [x] 3.5 Create migration `0004_triggers_revalidate.sql` with `notify_revalidate()` via `pg_net` and per-table triggers
  - Files: `supabase/migrations/0004_triggers_revalidate.sql`
  - Requirements: R5.10, R5.11, R24.2, R24.3
  - Design: §7.2

- [x] 3.6 Create `revalidate_outbox` table + scheduled cron function for retry/backoff
  - Files: `supabase/migrations/0004_triggers_revalidate.sql` (append), `supabase/functions/retry-revalidate.sql`
  - Requirements: R24.3
  - Design: §7.2

- [x] 3.7 Create migration `0005_rate_limit.sql` with RLS and `rl_increment` RPC
  - Files: `supabase/migrations/0005_rate_limit.sql`
  - Requirements: R12.8
  - Design: §23

- [x] 3.8 Seed initial admin role and `app.revalidate_url` + `app.revalidate_secret` GUCs
  - Files: `supabase/seed.sql`
  - Requirements: R24.1
  - Design: §3.2, §7.2

- [x] 3.9 Script to generate TypeScript database types
  - Files: `scripts/gen-db-types.ts`, `package.json` (add `db:types` script), `types/database.ts`
  - Requirements: R17.7, R21.12
  - Design: §3.3

- [x] 3.10 Build Supabase client factories (anon browser, anon server, service-role server) with singleton
  - Files: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/types.ts`
  - Requirements: R21.7, R21.8
  - Design: §22

- [x] 3.11 Add build-time guard: fail build if service-role key imported from client-reachable module
  - Files: `scripts/check-service-role-leak.ts`, `.github/workflows/ci.yml`
  - Requirements: R21.8, R19.6
  - Design: §22

- [x] 3.12 Supabase migration verification CI step (diffs repo migrations against target project schema)
  - Files: `scripts/check-migrations.ts`, `.github/workflows/ci.yml`
  - Requirements: R21.5, R21.17
  - Design: §3, §6

- [x] 3.13 Scheduled purge function for `status IN ('spam','cancelled')` rows older than 180 days
  - Files: `supabase/migrations/0006_lead_retention.sql`, `supabase/functions/purge-leads.sql`, `supabase/cron-schedule.sql`
  - Requirements: R19.2, R21.11
  - Design: §3, §27

---

## Phase 4 — Content_Layer

- [x] 4.1 Pre-build Supabase snapshot script with on-disk cache fallback
  - Files: `scripts/content-snapshot.ts`, `package.json` (`prebuild` hook extended)
  - Requirements: R5.13
  - Design: §5.3, §6

- [x] 4.2 Structured snapshot loader (reads `.next/cache/content-snapshot.json`)
  - Files: `lib/content/structured/snapshot.ts`
  - Requirements: R5.1, R17.4
  - Design: §5.2, §5.3

- [x] 4.3 Structured loaders for each entity type
  - Files: `lib/content/structured/cities.ts`, `countries.ts`, `vehicles.ts`, `services.ts`, `airports.ts`, `aliases.ts`, `relations.ts`
  - Requirements: R17.4, R17.5
  - Design: §5.1, §5.2

- [x] 4.4 MDX frontmatter zod schemas per entity
  - Files: `lib/content/narrative/schema.ts`
  - Requirements: R5.3, R23.2
  - Design: §4.2

- [x] 4.5 MDX loader using `@next/mdx` + `gray-matter` with content-hash cache
  - Files: `lib/content/narrative/mdx.ts`, `lib/content/narrative/cache.ts`
  - Requirements: R23.1, R23.4, R23.6, R23.9
  - Design: §4.3, §4.5

- [x] 4.6 MDX allowlisted components registry
  - Files: `components/mdx/index.ts`, `components/mdx/Callout.tsx`, `Faq.tsx`, `Landmark.tsx`, `TripIdea.tsx`, `Tip.tsx`, `Testimonial.tsx`, `InternalLink.tsx`, `VehicleCard.tsx`
  - Requirements: R23.3
  - Design: §4.4

- [x] 4.7 Narrative loaders per entity that compose with allowlisted components
  - Files: `lib/content/narrative/cities.ts`, `countries.ts`, `vehicles.ts`, `services.ts`, `articles.ts`
  - Requirements: R23.1, R23.4
  - Design: §4.1

- [x] 4.8 Compound loader contract exporting all 17 functions from R17.4
  - Files: `lib/content/index.ts`
  - Requirements: R17.4, R17.5, R17.7
  - Design: §5.2

- [x] 4.9 Word-count and section-count extractor for uniqueness checks
  - Files: `lib/content/narrative/wordCount.ts`
  - Requirements: R6.1, R6.2, R6.3, R6.4, R23.4
  - Design: §4.5

- [ ]\* 4.10 Unit test for word-count extractor
  - Files: `tests/unit/wordCount.test.ts`
  - Requirements: R6.1–R6.4
  - Design: §21

- [x] 4.11 Phone normalizer utility (shared between booking + content)
  - Files: `lib/booking/normalizePhone.ts`
  - Requirements: R10.3
  - Design: §14, §24

- [ ]\* 4.12 Unit test for phone normalizer
  - Files: `tests/unit/normalizePhone.test.ts`
  - Requirements: R10.3
  - Design: §21

- [x] 4.13 Checkpoint — Content_Layer contract verified
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 5 — Sample Content

- [x] 5.1 Insert seed rows for 3 launched cities (Bogor, Jakarta, Bandung) + 1 coverable (Purwakarta)
  - Files: `supabase/seed.sql` (extend)
  - Requirements: R5.2, R5.5, R5.6, R22.1
  - Design: §3.1

- [x] 5.2 Insert seed rows for 1 country (Singapore), 2 vehicles (Innova, Hiace), 2 services (corporate, airport_transfer)
  - Files: `supabase/seed.sql` (extend)
  - Requirements: R5.4, R5.8
  - Design: §3.1

- [x] 5.3 Insert `city_vehicles`, `city_airports`, `city_related`, `city_aliases` relationships
  - Files: `supabase/seed.sql` (extend)
  - Requirements: R5.9, R21.16
  - Design: §3.1

- [x] 5.4 Author Bogor + Jakarta + Bandung MDX in both locales with intro 150–600 words, ≥3 landmarks, ≥3 FAQs, testimonial
  - Files: `content/cities/id/{bogor,jakarta,bandung}.mdx`, `content/cities/en/{bogor,jakarta,bandung}.mdx`
  - Requirements: R5.3, R6.1, R23.2
  - Design: §4.1, §4.2

- [x] 5.5 Author Singapore country MDX in both locales
  - Files: `content/countries/id/singapore.mdx`, `content/countries/en/singapore.mdx`
  - Requirements: R6.2
  - Design: §4.1

- [x] 5.6 Author Innova + Hiace vehicle MDX in both locales with capacity/luggage/use cases
  - Files: `content/vehicles/{id,en}/{innova,hiace}.mdx`
  - Requirements: R6.3
  - Design: §4.1

- [x] 5.7 Author 2 service MDX files and 2 article MDX files in both locales
  - Files: `content/services/{id,en}/*.mdx`, `content/articles/{id,en}/*.mdx`
  - Requirements: R6.4
  - Design: §4.1

- [ ]\* 5.8 Verify all seeded MDX passes frontmatter zod + uniqueness thresholds
  - Files: `tests/unit/content-seed.test.ts`
  - Requirements: R6.1–R6.6, R23.4
  - Design: §6

---

## Phase 6 — SEO Utilities

- [x] 6.1 Absolute URL + canonical helpers
  - Files: `lib/seo/canonical.ts`
  - Requirements: R6.9, R7.1
  - Design: §10

- [ ]\* 6.2 Unit test for canonical helpers
  - Files: `tests/unit/canonical.test.ts`
  - Requirements: R6.9, R7.1
  - Design: §21

- [x] 6.3 `buildMetadata` function with canonical, languages, robots derived from coverage_state + allow_index
  - Files: `lib/seo/metadata.ts`
  - Requirements: R4.3, R4.4, R4.8, R6.7, R6.8, R7.1, R7.7, R22.5, R22.6
  - Design: §10

- [ ]\* 6.4 Unit test for `buildMetadata` (canonical, hreflang, robots derivation)
  - Files: `tests/unit/metadata.test.ts`
  - Requirements: R4.3, R4.4, R6.8, R7.1
  - Design: §21

- [x] 6.5 JSON-LD builders (LocalBusiness, Service, FAQPage, BreadcrumbList, Article)
  - Files: `lib/seo/jsonld.ts`
  - Requirements: R8.1, R8.2, R8.3, R8.4, R8.5, R8.6
  - Design: §11

- [ ]\* 6.6 Unit test for JSON-LD builders (shape + required fields per schema type)
  - Files: `tests/unit/jsonld.test.ts`
  - Requirements: R8.1–R8.6
  - Design: §21

- [x] 6.7 `<JsonLd>` React component emitting one `<script type="application/ld+json">` per block
  - Files: `components/seo/JsonLd.tsx`
  - Requirements: R8.7
  - Design: §11

- [x] 6.8 Breadcrumb component consuming `breadcrumbListJsonLd`
  - Files: `components/seo/Breadcrumb.tsx`
  - Requirements: R8.4
  - Design: §9

- [x] 6.9 Dynamic sitemap with hreflang alternates + 40k pagination
  - Files: `app/sitemap.ts`, `app/sitemap/[type]/route.ts`
  - Requirements: R7.4, R7.5, R7.7, R22.5
  - Design: §12

- [x] 6.10 `robots.txt` referencing absolute sitemap URL
  - Files: `app/robots.ts`
  - Requirements: R7.6
  - Design: §12

- [x] 6.11 Dynamic OG endpoint with fallback on invalid params
  - Files: `app/api/og/route.tsx`
  - Requirements: R6.8, R7.2, R7.3, R7.8
  - Design: §13

- [x] 6.12 Post-build JSON-LD validity checker
  - Files: `scripts/check-jsonld.ts`, `.github/workflows/ci.yml`
  - Requirements: R8.7, R8.8
  - Design: §6, §11

---

## Phase 7 — Core Templates and Routing

- [x] 7.1 Root `app/layout.tsx` and `[locale]/layout.tsx` setting `<html lang>`, fonts, consent mount point, skip link
  - Files: `app/layout.tsx`, `app/[locale]/layout.tsx`
  - Requirements: R4.8, R15.5
  - Design: §2, §19

- [x] 7.2 Locale-aware 404 page
  - Files: `app/[locale]/not-found.tsx`, `app/not-found.tsx`
  - Requirements: R3.5, R3.6, R4.9, R22.7
  - Design: §8

- [x] 7.3 PrimaryNav and Footer with locale-correct slugs + anti-fraud line
  - Files: `components/nav/PrimaryNav.tsx`, `components/nav/Footer.tsx`
  - Requirements: R3.8, R3.9, R13.5
  - Design: §2

- [x] 7.4 LocaleSwitcher (client) honoring `pageEquivalent` with fallback to locale homepage
  - Files: `components/nav/LocaleSwitcher.tsx`
  - Requirements: R4.5, R4.6, R4.7
  - Design: §19 (Client Components list), §18

- [x] 7.5 Homepage template
  - Files: `components/templates/HomeTemplate.tsx`, `app/[locale]/page.tsx`
  - Requirements: R1.1, R1.2, R1.4, R1.5, R9.1
  - Design: §9

- [x] 7.6 City page with alias→coverable→inactive dispatch via `getCityAlias` + `getCity`
  - Files: `app/[locale]/sewa-mobil/[city]/page.tsx`, `app/[locale]/car-rental/[city]/page.tsx`
  - Requirements: R3.6, R22.3, R22.4, R22.7, R22.8
  - Design: §8

- [x] 7.7 CityTemplate implementing R9.2 section order + city-specific vehicle grid
  - Files: `components/templates/CityTemplate.tsx`
  - Requirements: R1.6, R9.2, R9.10
  - Design: §9

- [x] 7.8 CoverageTemplate with noindex logic and prefilled booking form
  - Files: `components/templates/CoverageTemplate.tsx`
  - Requirements: R22.4, R22.5, R22.6, R22.11
  - Design: §9, §9.1

- [x] 7.9 Airport transfer page + template
  - Files: `app/[locale]/sewa-mobil/[city]/airport-transfer/page.tsx`, `app/[locale]/car-rental/[city]/airport-transfer/page.tsx`, `components/templates/AirportTransferTemplate.tsx`
  - Requirements: R9.5
  - Design: §9

- [x] 7.10 Combined city-vehicle page + template
  - Files: `app/[locale]/sewa-mobil/[city]/[vehicle]/page.tsx`, `app/[locale]/car-rental/[city]/[vehicle]/page.tsx`, `components/templates/CityVehicleTemplate.tsx`
  - Requirements: R5.9
  - Design: §9

- [x] 7.11 Country landing + template
  - Files: `app/[locale]/internasional/[country]/page.tsx`, `app/[locale]/international/[country]/page.tsx`, `components/templates/CountryTemplate.tsx`
  - Requirements: R5.8, R9.3
  - Design: §9

- [x] 7.12 Vehicle listing + detail + template
  - Files: `app/[locale]/armada/page.tsx`, `app/[locale]/armada/[vehicle]/page.tsx`, `app/[locale]/fleet/page.tsx`, `app/[locale]/fleet/[vehicle]/page.tsx`, `components/templates/VehicleTemplate.tsx`
  - Requirements: R9.4
  - Design: §9

- [x] 7.13 Service page + template
  - Files: `app/[locale]/layanan/[service]/page.tsx`, `app/[locale]/services/[service]/page.tsx`, `components/templates/ServiceTemplate.tsx`
  - Requirements: R5.8
  - Design: §9

- [x] 7.14 Blog index + article + template
  - Files: `app/[locale]/blog/page.tsx`, `app/[locale]/blog/[article]/page.tsx`, `components/templates/BlogArticleTemplate.tsx`
  - Requirements: R8.5, R9.6
  - Design: §9

- [x] 7.15 Booking page + template (form wiring added in Phase 8)
  - Files: `app/[locale]/booking/page.tsx`, `components/templates/BookingTemplate.tsx`
  - Requirements: R9.7
  - Design: §9

- [x] 7.16 Contact page + template
  - Files: `app/[locale]/kontak/page.tsx`, `app/[locale]/contact/page.tsx`, `components/templates/ContactTemplate.tsx`
  - Requirements: R9.8, R13.5
  - Design: §9

- [x] 7.17 Static pages (FAQ, terms, privacy) with StaticTemplate
  - Files: `app/[locale]/{faq,syarat-ketentuan,kebijakan-privasi,terms,privacy}/page.tsx`, `components/templates/StaticTemplate.tsx`
  - Requirements: R2.1, R19.2
  - Design: §9, §27

- [x] 7.18 `generateStaticParams` + `generateMetadata` for every programmatic route
  - Files: each dynamic page file above
  - Requirements: R5.2, R5.3, R5.4, R5.5, R5.6, R5.7, R5.8, R5.9, R7.1
  - Design: §8, §10

- [x] 7.19 ISR config (`revalidate = 3600`, `dynamicParams = true`) on every programmatic page
  - Files: each dynamic page file above
  - Requirements: R5.10
  - Design: §7

- [ ]\* 7.20 Assert R9 section order via snapshot/array tests per template
  - Files: `tests/component/templates.test.tsx`
  - Requirements: R9.1–R9.10
  - Design: §9, §21

- [x] 7.21 Checkpoint — Routing and templates render for all page types
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 8 — Booking Flow

- [x] 8.1 Shared booking zod schema with all validation rules from R10
  - Files: `lib/booking/schema.ts`
  - Requirements: R10.1–R10.15
  - Design: §24

- [ ]\* 8.2 Unit test for booking schema (all R10 boundary conditions + timezone logic)
  - Files: `tests/unit/bookingSchema.test.ts`
  - Requirements: R10.1–R10.15
  - Design: §21

- [x] 8.3 `BookingForm` client component with RHF + `@hookform/resolvers` + Zod 4
  - Files: `components/booking/BookingForm.tsx`
  - Requirements: R10.1–R10.15, R15.4
  - Design: §14, §29.5

- [x] 8.4 WhatsApp handler `buildWhatsAppUrl` + locale label dictionary + `buildGenericWaUrl`
  - Files: `lib/whatsapp/handler.ts`, `lib/whatsapp/labels.ts`
  - Requirements: R11.1, R11.2, R11.3, R11.4, R11.10
  - Design: §15

- [ ]\* 8.5 Unit test for WhatsApp handler (URL shape, message ordering, length cap)
  - Files: `tests/unit/whatsapp.test.ts`
  - Requirements: R11.1, R11.4, R11.10
  - Design: §21

- [x] 8.6 Origin check helper
  - Files: `lib/security/originCheck.ts`
  - Requirements: R19.5
  - Design: §16

- [ ]\* 8.7 Unit test for origin check helper
  - Files: `tests/unit/originCheck.test.ts`
  - Requirements: R19.5
  - Design: §21

- [x] 8.8 IP hashing utility with `LEAD_IP_HASH_SALT`
  - Files: `lib/security/hashIp.ts`
  - Requirements: R12.11, R19.6
  - Design: §16

- [ ]\* 8.9 Unit test for IP hashing (stability + salt isolation)
  - Files: `tests/unit/hashIp.test.ts`
  - Requirements: R12.11
  - Design: §21

- [x] 8.10 Rate limit middleware using Supabase `rate_limit` table + `rl_increment` RPC
  - Files: `lib/security/rateLimit.ts`
  - Requirements: R12.8
  - Design: §23

- [ ]\* 8.11 Unit test for rate limiter (below/at/above 10 per 60 min)
  - Files: `tests/unit/rateLimit.test.ts`
  - Requirements: R12.8
  - Design: §21

- [x] 8.12 Spam blocklist with redaction helper
  - Files: `lib/security/spamBlocklist.ts`
  - Requirements: R19.7
  - Design: §16

- [ ]\* 8.13 Unit test for spam blocklist (prefix/regex + redaction format)
  - Files: `tests/unit/spamBlocklist.test.ts`
  - Requirements: R19.7
  - Design: §21

- [x] 8.14 `/api/booking` route handler implementing full response contract
  - Files: `app/api/booking/route.ts`
  - Requirements: R12.1, R12.3, R12.4, R12.5, R12.6, R12.7, R12.8, R12.9, R12.10, R12.11, R19.5, R19.7
  - Design: §16

- [x] 8.15 Admin notification webhook fire-and-forget with 5s timeout
  - Files: `app/api/booking/route.ts` (extend), `lib/security/notify.ts`
  - Requirements: R12.6, R12.10
  - Design: §16

- [x] 8.16 Booking confirmation screen + popup-blocked fallback
  - Files: `components/booking/BookingConfirmation.tsx`
  - Requirements: R11.5, R11.6
  - Design: §9, §14

- [x] 8.17 Wire `BookingForm` → open `wa.me` → navigate to confirmation
  - Files: `components/booking/BookingForm.tsx` (extend)
  - Requirements: R11.5, R11.6, R11.9
  - Design: §14

- [x] 8.18 Checkpoint — Booking path produces WhatsApp handoff + Supabase row
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 9 — Live Chat, Floating CTA, Anti-Fraud

- [x] 9.1 Floating `WhatsAppButton` (client) with tap-target ≥56×56, tooltip, tel fallback
  - Files: `components/chat/WhatsAppButton.tsx`
  - Requirements: R11.7, R13.1, R13.2, R13.3, R15.6
  - Design: §19

- [x] 9.2 `InlineWhatsAppCta` for hero sections on city/country/vehicle/airport/service pages
  - Files: `components/chat/InlineWhatsAppCta.tsx`, integrate into templates
  - Requirements: R11.8
  - Design: §9

- [x] 9.3 Anti-fraud notice component (footer + booking + contact) with `+62 xxx-xxxx-xxxx` formatter
  - Files: `components/chat/AntiFraudNotice.tsx`
  - Requirements: R13.4, R13.5, R13.6
  - Design: §27

- [x] 9.4 Optional third-party chat widget integration behind env var
  - Files: `components/chat/ThirdPartyChatWidget.tsx`
  - Requirements: R13.4
  - Design: §9

- [x] 9.5 CTA band component shared by templates (primary WhatsApp + secondary Booking link)
  - Files: `components/chat/CtaBand.tsx`
  - Requirements: R9.9, R11.7, R11.9
  - Design: §9

---

## Phase 10 — ISR and On-Demand Revalidation

- [x] 10.1 `/api/revalidate` route handler with secret check and per-entity fan-out
  - Files: `app/api/revalidate/route.ts`
  - Requirements: R17.11, R22.10, R24.2
  - Design: §7.1, §26

- [x] 10.2 Wire Supabase pg_net trigger to call `/api/revalidate`
  - Files: `supabase/migrations/0004_triggers_revalidate.sql` (verify), Supabase vault secret entry
  - Requirements: R24.2, R24.3
  - Design: §7.2

- [x] 10.3 Revalidate-outbox cron retry/backoff
  - Files: `supabase/functions/retry-revalidate.sql`, `supabase/cron-schedule.sql`
  - Requirements: R24.3
  - Design: §7.2

- [ ]\* 10.4 E2E test: update a city row → trigger fires → page updates < 5 min
  - Files: `tests/e2e/revalidate.spec.ts`
  - Requirements: R5.10, R5.11, R22.10
  - Design: §7, §21

---

## Phase 11 — Analytics and Consent

- [x] 11.1 Analytics client (Plausible as default) gated on consent
  - Files: `lib/analytics/client.ts`, `lib/analytics/events.ts`
  - Requirements: R18.1, R18.2, R18.3, R18.4, R18.5
  - Design: §19

- [x] 11.2 Cookie consent banner (locale-aware), honors `DoNotTrack`
  - Files: `components/consent/CookieConsentBanner.tsx`, `lib/analytics/consentStore.ts`
  - Requirements: R18.5, R18.6
  - Design: §19, §27

- [x] 11.3 Emit `page_view` events on client-side navigations
  - Files: `components/analytics/PageViewTracker.tsx`, mounted in `app/[locale]/layout.tsx`
  - Requirements: R18.1
  - Design: §19

- [x] 11.4 Emit `whatsapp_click` event from every WhatsApp CTA
  - Files: `components/chat/WhatsAppButton.tsx` (wire), `components/chat/InlineWhatsAppCta.tsx` (wire)
  - Requirements: R11.11, R18.2
  - Design: §19

- [x] 11.5 Emit `booking_form_submit` and `booking_form_error` events from BookingForm
  - Files: `components/booking/BookingForm.tsx` (wire)
  - Requirements: R18.3, R18.4
  - Design: §14

- [x] 11.6 Checkpoint — Analytics, consent, and full conversion stack wired
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 12 — Lints and Quality Gates

- [x] 12.1 Forbidden-phrase lint (MDX + i18n + rendered HTML) with NFKD + case-insensitive
  - Files: `scripts/lint-forbidden-phrases.ts`, CI step
  - Requirements: R20.1, R20.2, R20.5
  - Design: §17

- [x] 12.2 Content uniqueness analyzer with auto-demote for launched cities
  - Files: `scripts/check-uniqueness.ts`
  - Requirements: R6.1–R6.6, R22.12, R23.7
  - Design: §6

- [x] 12.3 Chauffeur-only phrase presence check per page
  - Files: `scripts/check-chauffeur-phrase.ts`
  - Requirements: R1.3, R1.6
  - Design: §17

- [x] 12.4 JS bundle budget checker (≤170KB gzipped on homepage)
  - Files: `scripts/check-bundle-budget.ts`
  - Requirements: R16.8
  - Design: §19

- [x] 12.5 MDX frontmatter + allowlist validator (standalone CI check)
  - Files: `scripts/check-mdx.ts`
  - Requirements: R23.2, R23.3, R23.4
  - Design: §4

- [x] 12.6 `chauffeurOnly` marker validator on all Structured_Content_Store rows + MDX frontmatter
  - Files: `scripts/check-chauffeur-marker.ts`
  - Requirements: R20.3, R20.5
  - Design: §17

- [x] 12.7 Non-goal leak detector (routes/components referencing forbidden capabilities)
  - Files: `scripts/check-non-goal-leak.ts`
  - Requirements: R2.3, R2.4, R2.5, R2.6, R2.7, R2.8, R2.9
  - Design: §17

---

## Phase 13 — Accessibility and Performance Polish

- [x] 13.1 Skip-to-content link as first focusable element
  - Files: `components/a11y/SkipLink.tsx`, `app/[locale]/layout.tsx`
  - Requirements: R15.5
  - Design: §19

- [ ]\* 13.2 Component test: focus trap + return focus for shadcn dialogs
  - Files: `components/ui/dialog.tsx` (verify), `tests/component/a11y-dialog.test.tsx`
  - Requirements: R15.9
  - Design: §19, §21

- [x] 13.3 `prefers-reduced-motion` integration in all motion components
  - Files: `components/motion/MotionWrapper.tsx` (verify), `lib/motion/variants.ts`
  - Requirements: R14.7
  - Design: §19

- [x] 13.4 Font-load fallback keeping CLS ≤ 0.1
  - Files: `app/fonts.ts`, `app/[locale]/layout.tsx`
  - Requirements: R14.9
  - Design: §19

- [x] 13.5 `aria-describedby` + `aria-invalid` on all BookingForm fields
  - Files: `components/booking/BookingForm.tsx` (verify)
  - Requirements: R15.4
  - Design: §14

- [ ]\* 13.6 E2E test: unique `<h1>` per page + alt-text audit across templates
  - Files: `tests/e2e/a11y.spec.ts`
  - Requirements: R15.1, R15.3
  - Design: §19, §21

- [ ]\* 13.7 E2E test: keyboard operability + visible focus ring audit
  - Files: `tests/e2e/keyboard-nav.spec.ts`
  - Requirements: R15.2, R15.6, R15.7, R15.10
  - Design: §19, §21

- [x] 13.8 `lang` attribute on foreign-language inline elements
  - Files: `lib/i18n/langInline.ts`, template audit
  - Requirements: R15.8
  - Design: §19

- [x] 13.9 `next/image` wrapper enforcing width/height + responsive `sizes` + AVIF/WebP, plus LCP hero-image preload in templates
  - Files: `components/ui/ResponsiveImage.tsx`, `components/templates/HomeTemplate.tsx` (hero preload), `components/templates/CityTemplate.tsx`, `components/templates/CountryTemplate.tsx`, `components/templates/VehicleTemplate.tsx`, `components/templates/AirportTransferTemplate.tsx`, `components/templates/BlogArticleTemplate.tsx`
  - Requirements: R16.4, R16.5
  - Design: §19

- [x] 13.10 Lazy-load below-fold sections (testimonials, related content, third-party chat widget) via `next/dynamic`
  - Files: `components/templates/HomeTemplate.tsx`, `components/templates/CityTemplate.tsx`, `components/templates/VehicleTemplate.tsx`, `components/chat/ThirdPartyChatWidget.tsx`
  - Requirements: R16.9
  - Design: §19

- [ ]\* 13.11 Component test: text resize to 200% at 320px viewport without horizontal scroll or content loss
  - Files: `tests/component/text-resize.test.tsx`
  - Requirements: R15.10
  - Design: §19, §21

- [ ]\* 13.12 Automated contrast + color-only-signal audit (axe rules `color-contrast`, `color-only-information`) on key templates
  - Files: `tests/e2e/contrast-audit.spec.ts`
  - Requirements: R14.8, R15.7
  - Design: §19, §21

---

## Phase 14 — Test Harness and Suite

- [ ]\* 14.1 Configure Vitest 4.1 with jsdom + React Testing Library
  - Files: `vitest.config.ts`, `tests/setup.ts`, `package.json` (test scripts)
  - Requirements: —
  - Design: §21, §29.7

- [ ]\* 14.2 Unit tests: WhatsApp handler, metadata, JSON-LD, phone normalizer, hashIp, slug validator, uniqueness analyzer, forbidden-phrase matcher — target ≥90% line coverage
  - Files: `tests/unit/*.test.ts`
  - Requirements: R17.8
  - Design: §21

- [ ]\* 14.3 Component tests: BookingForm (validation, submit, popup fallback), CoverageTemplate, section-order assertions
  - Files: `tests/component/*.test.tsx`
  - Requirements: R9, R10, R11.6, R22.4
  - Design: §21

- [ ]\* 14.4 Configure Playwright 1.58
  - Files: `playwright.config.ts`, `tests/e2e/fixtures.ts`
  - Requirements: —
  - Design: §21, §29.7

- [ ]\* 14.5 E2E: homepage smoke, launched city page, coverage page noindex, booking full path with mock Supabase, locale switcher with/without equivalent
  - Files: `tests/e2e/*.spec.ts`
  - Requirements: R1, R4.5–R4.7, R9, R11, R22.4, R22.5
  - Design: §21

- [ ]\* 14.6 Build-pipeline tests running all Phase 12 lints in CI
  - Files: `.github/workflows/ci.yml` (extend)
  - Requirements: R20.1, R20.2, R6.6, R22.12
  - Design: §6

---

## Phase 15 — Security Middleware and Policy Pages

- [x] 15.1 `middleware.ts` setting HSTS, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
  - Files: `middleware.ts`
  - Requirements: R19.3, R19.4
  - Design: §27

- [x] 15.2 `middleware.ts` 301 canonicalization for trailing-slash and uppercase slugs
  - Files: `middleware.ts`
  - Requirements: R3.7
  - Design: §27

- [x] 15.3 Privacy policy page content with data retention, deletion channel, third-party recipients
  - Files: `content/static/id/kebijakan-privasi.mdx`, `content/static/en/privacy.mdx`
  - Requirements: R19.2
  - Design: §27

- [x] 15.4 Terms page content
  - Files: `content/static/id/syarat-ketentuan.mdx`, `content/static/en/terms.mdx`
  - Requirements: R2.1
  - Design: §27

- [x] 15.5 FAQ page content with top booking + chauffeur questions
  - Files: `content/static/id/faq.mdx`, `content/static/en/faq.mdx`
  - Requirements: R2.1, R8.3
  - Design: §9

- [x] 15.6 Anti-fraud notice copy in footer + contact + booking
  - Files: `components/chat/AntiFraudNotice.tsx` (verify placement)
  - Requirements: R13.4, R13.5
  - Design: §27

- [x] 15.7 Checkpoint — Security headers, canonicalization, and policy pages verified
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 16 — Deployment Configuration (code only)

This phase writes deployment configuration files and documentation. The actual creation of Vercel projects, pushing env vars into the Vercel dashboard, and configuring Supabase hosting are release-owner actions performed outside this task list.

- [x] 16.1 Vercel project configuration file
  - Files: `vercel.json` (build command, framework preset, regions, headers), `package.json` (`build`, `start` scripts aligned)
  - Requirements: R17.11, R16.6
  - Design: §1, §6

- [x] 16.2 Document all required environment variables and their deployment source of truth
  - Files: `.env.example` (extend with inline comments), `docs/ops/deployment.md` (env matrix: name, required/optional, where to set, sample)
  - Requirements: R17.9, R17.10, R19.6
  - Design: §20

- [x] 16.3 Document Supabase vault + GUC setup for `app.revalidate_url` and `app.revalidate_secret`
  - Files: `docs/ops/deployment.md` (revalidate-secret section), `supabase/seed.sql` (vault placeholder SQL with inline instructions)
  - Requirements: R17.11, R24.2
  - Design: §7.2

- [x] 16.4 Document Supabase region colocation policy and chosen region
  - Files: `docs/ops/deployment.md` (region policy section)
  - Requirements: R21.10
  - Design: §1

- [x] 16.5 Document automated daily Supabase backups ≥7 days retention policy
  - Files: `docs/ops/deployment.md` (backups section)
  - Requirements: R21.6
  - Design: §1

- [x] 16.6 GitHub Actions preview-deploy workflow that blocks on CI gates
  - Files: `.github/workflows/preview-deploy.yml` (depends on `ci.yml` success; uses Vercel CLI in non-interactive mode)
  - Requirements: R20.1, R20.2, R24.4
  - Design: §6

- [x] 16.7 Checkpoint — Deployment configuration committed and CI green
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 17 — MVP Launch Verification (automated checks only)

This phase writes automated launch-verification tests and scripts. Manual SEO submissions, device-matrix testing, and human sign-off are release-owner actions outside this task list. Existing Phase 12 and Phase 14 tests cover forbidden-phrase, uniqueness, analytics wiring, a11y, and booking E2E — this phase adds only the launch-specific automation not already present.

- [ ]\* 17.1 Lighthouse CI config running on homepage + one launched City_Page + one Country_Page + one Vehicle_Page with thresholds LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1
  - Files: `lighthouserc.json`, `.github/workflows/lighthouse.yml`
  - Requirements: R16.1, R16.2, R16.3, R18.7
  - Design: §21

- [ ]\* 17.2 Playwright: every rendered `<script type="application/ld+json">` on homepage + one City + one Country + one Vehicle parses as valid JSON
  - Files: `tests/e2e/jsonld-valid.spec.ts`
  - Requirements: R8.7, R8.8, R18.7
  - Design: §11, §21

- [ ]\* 17.3 Playwright: `GET /sitemap.xml` returns 200, valid XML, contains both locale URLs, and respects `allow_index`
  - Files: `tests/e2e/sitemap.spec.ts`
  - Requirements: R7.4, R7.7, R18.7
  - Design: §12, §21

- [ ]\* 17.4 Playwright: `GET /robots.txt` returns 200 and references absolute sitemap URL
  - Files: `tests/e2e/robots.spec.ts`
  - Requirements: R7.6, R18.7
  - Design: §12, §21

- [ ]\* 17.5 Playwright: hreflang alternates on one City_Page + one Country_Page resolve to 200 in the target locale
  - Files: `tests/e2e/hreflang.spec.ts`
  - Requirements: R4.3, R4.4, R18.7
  - Design: §10, §21

- [ ]\* 17.6 Playwright: floating + inline WhatsApp CTAs build correct `wa.me` URL and fire analytics event on click (mobile + desktop viewports)
  - Files: `tests/e2e/whatsapp-cta.spec.ts`
  - Requirements: R11, R18.2, R18.7
  - Design: §15, §19, §21

- [ ]\* 17.7 Playwright: end-to-end booking path asserts Supabase insert via mocked Supabase client and webhook fired
  - Files: `tests/e2e/booking-e2e.spec.ts`
  - Requirements: R10, R12, R18.7
  - Design: §14, §16, §21

- [ ]\* 17.8 Playwright: all required analytics events (`page_view`, `whatsapp_click`, `booking_form_submit`, `booking_form_error`) fire with required properties; non-essential scripts blocked until consent
  - Files: `tests/e2e/analytics-events.spec.ts`
  - Requirements: R18.1–R18.6
  - Design: §19, §21

- [ ]\* 17.9 Playwright: anti-fraud notice rendered on booking, contact, and footer with official admin number
  - Files: `tests/e2e/anti-fraud.spec.ts`
  - Requirements: R13.4, R13.5, R18.7
  - Design: §27, §21

- [ ]\* 17.10 Axe automated a11y audit on homepage + one City + one Country + one Vehicle + booking page asserting zero critical/serious violations
  - Files: `tests/e2e/a11y-axe.spec.ts`
  - Requirements: R15, R18.8
  - Design: §21

- [ ]\* 17.11 Aggregated launch-readiness script that runs all Phase 12 lints + Phase 14 tests + Phase 17 Playwright specs and emits a signed JSON report
  - Files: `scripts/launch-readiness.ts`, `.github/workflows/launch-readiness.yml`
  - Requirements: R18.7
  - Design: §6, §21

---

## Phase 18 — Phase 2 Readiness Guardrails and Operational Docs

- [ ]\* 18.1 DB assertion test: `leads.user_id` column exists, is `uuid`, nullable, FK to `auth.users(id)` with `ON DELETE SET NULL`, indexed
  - Files: `tests/db/phase2-readiness.test.ts`
  - Requirements: R2.5 (MVP guard)
  - Design: §28.1, §28.8

- [ ]\* 18.2 E2E assertion: no `/akun` / `/en/account` routes exist and no auth UI is present in MVP
  - Files: `tests/e2e/no-auth-mvp.spec.ts`
  - Requirements: R2.5
  - Design: §28.9

- [ ]\* 18.3 DB assertion test: no `user_profiles`, `bookings`, `booking_events`, `user_documents` tables present in MVP migrations
  - Files: `tests/db/phase2-readiness.test.ts`
  - Requirements: R2.5, R2.6
  - Design: §28.9

- [x] 18.4 Chauffeur_Only_Policy document in README + contributor guide
  - Files: `README.md`, `docs/contributor-guide.md`, `docs/chauffeur-only-policy.md`
  - Requirements: R20.4
  - Design: §17

- [x] 18.5 Content editing workflow operations guide (Supabase Studio for structured, PR for MDX) in ID + EN
  - Files: `docs/ops/content-editing.md`
  - Requirements: R24.5, R24.6
  - Design: §6, §4

- [x] 18.6 Admin runbook + incident playbook
  - Files: `docs/ops/admin-runbook.md`, `docs/ops/incident-playbook.md`
  - Requirements: R24.1, R24.6, R21.6
  - Design: §1

- [x] 18.7 Final checkpoint — Ensure all tests pass, documentation committed, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP. They cover unit, component, and E2E tests plus audit/verification scripts. Core implementation tasks are never optional.
- Each task references specific requirements (`R{n}.{m}`) and design sections (`§{n}`) for traceability.
- Checkpoints at 4.13, 7.21, 8.18, 11.6, 15.7, 16.7, and 18.7 are synchronization points. Run the full test suite and verify the phase-level acceptance criteria before moving on.
- The design has no formal `Correctness Properties` section, so no property-based tests are defined. Testing follows the unit + component + E2E plan in design §21.
- Phases 16 and 17 are scoped to **code artifacts only** (config files, CI workflows, automated tests, operational docs). Manual deployment steps (Vercel project creation, env var entry in dashboard, Google Search Console submission, manual device matrix testing, release sign-off) are owned by the release owner and are not tracked as coding tasks.
- Phase dependencies (blocking summary):
  - Phase 3 must precede Phase 4 (generated types + Supabase factories).
  - Phase 4 must precede Phases 5, 6, 7, 8, 10 — everything reads via the Content_Layer.
  - Phase 8 requires Phase 3 migrations for `leads` + `rate_limit` and Phase 4 loaders for city/vehicle dropdowns.
  - Phase 10 requires Phase 3 triggers and Phase 7 routes to exist before fan-out is meaningful.
  - Phase 11 requires Phase 7 templates so events can be attached to rendered pages.
  - Phase 12 quality gates and Phase 14 tests can begin as soon as the targets they verify exist, and must be green before Phase 16 deployment config is authored.
  - Phase 15 (security middleware + policy pages) must be complete before Phase 16.
  - Phase 17 automated tests run against a build output and local preview; they do not require production deployment.
  - Phase 18 documentation and readiness tests run in parallel with Phase 17.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "1.6", "1.8", "1.9"] },
    { "id": 2, "tasks": ["1.7"] },
    {
      "id": 3,
      "tasks": [
        "2.1",
        "2.2",
        "2.4",
        "2.6",
        "2.7",
        "2.8",
        "2.10",
        "3.1",
        "3.2",
        "3.3",
        "3.4",
        "3.5",
        "3.7"
      ]
    },
    { "id": 4, "tasks": ["2.3", "2.5", "2.9", "2.11", "3.6", "3.8", "3.9"] },
    { "id": 5, "tasks": ["3.10", "3.11", "3.12", "3.13"] },
    { "id": 6, "tasks": ["4.1", "4.2", "4.4", "4.5", "4.6", "4.7", "4.9", "4.11"] },
    { "id": 7, "tasks": ["4.3", "4.8", "4.10", "4.12"] },
    {
      "id": 8,
      "tasks": [
        "5.1",
        "5.4",
        "5.5",
        "5.6",
        "5.7",
        "6.1",
        "6.3",
        "6.5",
        "6.7",
        "6.8",
        "6.9",
        "6.10",
        "6.11"
      ]
    },
    { "id": 9, "tasks": ["5.2", "6.2", "6.4", "6.6", "6.12"] },
    { "id": 10, "tasks": ["5.3", "5.8"] },
    {
      "id": 11,
      "tasks": [
        "7.1",
        "7.2",
        "7.3",
        "7.4",
        "7.5",
        "7.6",
        "7.7",
        "7.8",
        "7.9",
        "7.10",
        "7.11",
        "7.12",
        "7.13",
        "7.14",
        "7.15",
        "7.16",
        "7.17"
      ]
    },
    { "id": 12, "tasks": ["7.18", "7.19"] },
    { "id": 13, "tasks": ["7.20"] },
    { "id": 14, "tasks": ["8.1", "8.4", "8.6", "8.8", "8.10", "8.12"] },
    { "id": 15, "tasks": ["8.2", "8.3", "8.5", "8.7", "8.9", "8.11", "8.13"] },
    { "id": 16, "tasks": ["8.14"] },
    { "id": 17, "tasks": ["8.15", "8.16"] },
    { "id": 18, "tasks": ["8.17"] },
    { "id": 19, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5"] },
    { "id": 20, "tasks": ["10.1", "10.2", "10.3"] },
    { "id": 21, "tasks": ["10.4"] },
    { "id": 22, "tasks": ["11.1", "11.2", "11.3", "11.5"] },
    { "id": 23, "tasks": ["11.4"] },
    { "id": 24, "tasks": ["12.1", "12.2", "12.3", "12.4", "12.5", "12.6", "12.7"] },
    { "id": 25, "tasks": ["13.1", "13.3", "13.4", "13.5", "13.8", "13.9", "13.10"] },
    { "id": 26, "tasks": ["13.2", "13.6", "13.7", "13.11", "13.12"] },
    { "id": 27, "tasks": ["14.1", "14.4"] },
    { "id": 28, "tasks": ["14.2", "14.3", "14.5"] },
    { "id": 29, "tasks": ["14.6"] },
    { "id": 30, "tasks": ["15.1", "15.2"] },
    { "id": 31, "tasks": ["15.3", "15.4", "15.5", "15.6"] },
    { "id": 32, "tasks": ["16.1", "16.2", "16.3", "16.4", "16.5"] },
    { "id": 33, "tasks": ["16.6"] },
    {
      "id": 34,
      "tasks": ["17.1", "17.2", "17.3", "17.4", "17.5", "17.6", "17.7", "17.8", "17.9", "17.10"]
    },
    { "id": 35, "tasks": ["17.11"] },
    { "id": 36, "tasks": ["18.1", "18.2", "18.3", "18.4", "18.5", "18.6"] }
  ]
}
```
