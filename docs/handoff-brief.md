# Handoff: Arasya Rent Car — pSEO Marketing Site + CMS

## Overview
Multi-city programmatic-SEO marketing platform for **Arasya Rent Car** (premium car rental **with driver**, PT. Ayomi Raya, Bogor — never self-drive/"lepas kunci", never mention partners/vendors). One registry entry = one indexable landing page. Includes a hub directory, a supporting blog, and a content-management layer.

**Target stack (agreed): Next.js (App Router, SSG/ISR) + Supabase (Postgres + Storage + Auth).**

## About the Design Files
Everything in this project is a **design reference built in HTML** (`.dc.html` Design Components) — prototypes showing the exact intended look and behavior, **not production code to copy directly**. Your task is to recreate them in Next.js using the published `@arasya/design-system` React library (the same components the prototypes mount from `window.ArasyaDS`). Read the `.dc.html` files for exact layout, inline style values, copy, and logic; read `_ds/arasya-design-system-*/styles.css` for tokens.

## Fidelity
**High-fidelity.** Colors, type, spacing, copy, and interactions are final. Recreate pixel-perfectly with design-system components; do not restyle or "improve".

## Routes / Screens
| Route | Design reference | Notes |
|---|---|---|
| `/` (homepage) | `home/Home.dc.html` | brand home — hero, trust, fleet highlights, services, city teaser, testimonials, verification/rekening block; ALL content from the global registries (no page-specific CMS fields). Replaces the interim redirect to `/sewa-mobil`. |
| `/{slug}` (city) | `city-landing/CityLanding.dc.html` | variants `navy` / `terang` / `editorial` per entry |
| `/{slug}` (region) | `region-landing/RegionLanding.dc.html` | variants `peta` / `rute` / `wisata` |
| `/{slug}` (country) | `country-landing/CountryLanding.dc.html` | variants `concierge` / `direktori`; no fleet grid |
| `/travel` | `travel/Travel.dc.html` | charter drop-off antar kota (door to door) — bilingual ID/EN, interactive tariff checker (asal→tujuan→unit) from `city-landing/travel.js`; SEO head incl. hreflang emitted in-page (`applySeo()`) |
| `/sewa-mobil` | `city-hub/CityHub.dc.html` | directory of ALL entries, Indonesia/Luar Negeri filter — required crawl node. Indonesian cards show "Mulai {lowest dalamKota}" from the fleet registry; Luar Negeri cards omit price (quote-based) |
| `/blog` | `blog-index/BlogIndex.dc.html` | category filter, featured, city CTA |
| `/blog/{slug}` | `blog-post/BlogPost.dc.html` | BlogPosting + Breadcrumb JSON-LD, city cross-links |
| `/admin` (CMS) | `content-studio/ContentStudio.dc.html` | recreate on Supabase — full scope below |

Every page is statically rendered per registry entry (`generateStaticParams`). No client-rendered SPA — Ads Quality Score and indexing depend on server HTML.

## Data: the three registries (source of truth)
- `city-landing/cities.js` — one entry per landing page: slug, template, variant, SEO meta, hero, editorial, destinations[], routes[], faqExtra[], areaServed[].
- `blog-post/posts.js` — one entry per article: SEO meta, `sections[{heading, paragraphs[], list?[]}]`, `cityKey` relation, `related[]`.
- `city-landing/travel.js` — travel/charter registry: routes (asal→tujuan), per-unit tariffs, travel-page copy. Drives `/travel` tariff checker.
- `city-landing/site.js` — **global singleton**: `settings` (waPhone, officialPhones[], bankAccounts[], address fields, instagram, mapsEmbed, `siteUrl`), `fleet[]` + `fleetNotes` + `genericUnits`, `services[]`, `testimonials[]` (PLACEHOLDER — replace with real reviews before launch), `trustDefaults[]`.
- `city-landing/shared.js` — derivation logic all pages share: `OFFICIAL`, `fleet()`, `fullFaq()`, `trustItems()`, `applySeo()` (canonical, OG/Twitter, JSON-LD AutoRental + BreadcrumbList + FAQPage, `priceRange` from fleet), footer cross-links. Port this module ~1:1.

Migrate registries → Supabase tables with the SAME field names: `locations`, `posts`, `site_settings` (singleton row), plus `status` (`draft`/`published`) and `updated_at` per row. Public pages read published only.

## CMS scope (recreate Content Studio at `/admin`)
Feature parity with `content-studio/ContentStudio.dc.html`:
- Form editors for every field of all three registries (grouped sections exactly as in the prototype).
- List editors with **add / remove / ↑↓ reorder** (destinations, routes, FAQ, fleet, services, testimonials, trust cards, bank accounts, official phones).
- **Bank accounts**: multi-account list; index 0 = primary (used by payment FAQ).
- **Fleet photos**: upload → client-resize to ~800px **webp** → Supabase Storage buckets `fleet/` and `fleet-logo/` → store the **path** in `img`/`imgLogo` (media by reference, never blobs/data URLs in the DB).
- Char counters (metaTitle 60 / metaDescription 160), **Google SERP preview**, **pre-publish validation** (empty/duplicate/malformed slugs across locations+posts, empty meta/H1, WA number format `62…`, incomplete bank rows, placeholder testimonials still in place).
- Autosave drafts with timestamp; per-entry draft status dot; confirm before destroy; duplicate-entry to create new pages; draft backup/restore (JSON export/import).
- Exports become unnecessary in production (DB is the registry), but keep **sitemap.xml** generated at build from published rows: homepage, `/sewa-mobil`, `/blog`, every location + post slug (see `dlSitemapFile()` in the prototype).
- Auth: Supabase Auth, admin-only.
- Publish flow: draft rows → publish → on-demand revalidation (ISR) of affected paths + sitemap.

## SEO requirements
Read `PSEO-HANDOFF.md` (copied here) — it is the full spec: head emission per page, URL scheme, internal-linking rules, doorway-page defenses, Google Ads notes, blog editorial rules. `shared.js applySeo()` is the live reference for exact head output; production emits the same statically in `<head>`. Domain comes from `site_settings.siteUrl`.

## Design system
Use the published **`@arasya/design-system`** React package (v0.1.0) — components: ArasyaProvider (root wrapper, mandatory), Button (incl. `whatsapp` variant), Card family, Badge, Chip, Accordion, FleetTable, QuoteForm (THE conversion block — never hand-build), StickyCtaBar, TrustStrip, SectionHeading, TextField, Select, Divider, Avatar, IconButton, Spinner. Utilities: `formatIDR`, `generateRefCode`, `buildQuoteMessage`, `buildWaHref`.
Tokens (from `_ds/arasya-design-system-*/styles.css`): primary `--ar-color-primary #046bd2`, gold accent, WhatsApp green, blue/gold/gray scales, font **Plus Jakarta Sans** (self-host), spacing `--ar-space-1…16`, radii sm–full, shadows sm–xl. Never invent `ar-*` class names; own layout glue uses tokens.

## Interactions & behavior
- All CTAs → WhatsApp (`wa.me/{waPhone}`) with generated ref codes (`generateRefCode(cityCode)`) and structured quote messages. Campaign attribution is LIVE in the prototype: `shared.js campaignTag()` captures `utm_source/medium/campaign`, `gclid`, `fbclid` from the URL (persisted in sessionStorage `arasya-campaign`) and every `waHref()` appends `[Src: source/medium · campaign · gclid]` to the WA message — port this helper 1:1.
- Analytics: attach ONE delegated click listener for `[data-cta]` that fires `dataLayer.push({event: 'cta_click', cta: el.dataset.cta, city: el.dataset.city, unit: el.dataset.unit})`, plus QuoteForm `onFormStart`/`onSubmit` → GA4 events; import `cta_click`/`quote_submit` as Google Ads conversions. Ref naming: `HOME-*`, `HUB-*`, `TRV-*` (travel; incl. `TRV-{routeCode}-{unit}` per tariff row), `{CITYCODE}-*` per page; home fleet cards use `HOME-armada-{unit-slug}`.
- QuoteForm submit → builds WA message → opens wa.me (see DS `QuoteForm`).
- Footer "Kota Layanan Lain" cross-links: real `href="/{slug}"` navigation in production.
- Scroll-reveal animations: `city-landing/anims.js` (GSAP-style reveals) — respect `prefers-reduced-motion`.
- Responsive header (all pages): below 768px the text links collapse into a hamburger dropdown with an explicit close (X) control — opening shows the X, clicking X or any link closes it; logo + "Pesan Sekarang" CTA stay visible. Fleet card media: 3:2 box, `object-fit: cover` for with-logo photos, `contain` + padding for transparent cutouts.
- Sticky mobile CTA bar (`StickyCtaBar`) on all landing pages.
- Fleet rows with `null` price → "Hubungi untuk harga terbaik" + per-row WA CTA. Home fleet cards each carry a "Pesan Unit Ini" WhatsApp CTA with unit-specific message and ref `HOME-armada-{unit-slug}`.
- Copy is Indonesian, formal-premium ("Anda"); primary CTA "Pesan Sekarang".

## Performance
LCP < 2.5s: static HTML, self-hosted fonts, `next/image` for car/destination photos (assets in `city-landing/assets/` — cars, cars-with-logo, images/bogor, brand logo), no blocking JS.

## Files in this project
- `PSEO-HANDOFF.md` (copied into this folder) — full SEO/engineering spec
- `city-landing/` — CityLanding.dc.html, cities.js, site.js, shared.js, anims.js, assets/
- `region-landing/`, `country-landing/`, `city-hub/`, `blog-index/`, `blog-post/` (incl. posts.js)
- `travel/Travel.dc.html` — /travel charter page (+ `city-landing/travel.js` registry)
- `content-studio/ContentStudio.dc.html` — CMS reference
- `_ds/arasya-design-system-*/` — tokens, component docs (`components/general/<Name>/<Name>.prompt.md` + `.d.ts`)

## Bilingual (i18n) — architecture
Decisions (agreed with client):
- **Locales**: `id` (default) + `en`. **URL scheme**: ID at `/{slug}`, EN under `/en/{slug}` prefix — statically rendered per locale (Next.js App Router `[locale]` segment or i18n routing; NEVER client-side-only translation for indexable pages).
- **hreflang**: every page emits `id`, `en`, and `x-default` (→ ID) alternates + locale-correct canonical, `og:locale`, `<html lang>`, JSON-LD `inLanguage`. Live reference: `home/Home.dc.html applySeo()`.
- **Default language**: browser/Accept-Language based SUGGESTION only (client-side, persisted in localStorage `arasya-lang`) — never server-redirect crawlers by geo (Google guideline). In production the URL is the source of truth for locale; the prototype approximates with the localStorage toggle.
- **Switcher**: navbar ID|EN pill (mobile: inside burger menu), persists choice.
- **UI strings**: `city-landing/i18n.js` — `STR.id` / `STR.en` dictionaries → port to messages JSON (e.g. next-intl). WA messages are localized too (refs unchanged).
- **Registry content**: EN lives beside ID. Interim: `i18n.js` overlays (`SERVICES_EN` by slug, `TRUST_EN` by preset, `FLEET_NOTES_EN`). Production: `_en` columns (or a translations table) on `locations`/`posts`/`site_settings`; EN slugs via `slugEn` (e.g. `/en/car-rental-bogor`). CMS: **EN/ID tab per entry** — same form, language tab switch, EN fields optional (entry publishes ID-only until EN is filled → page then joins the /en/ sitemap + hreflang set).
- **Testimonials**: keep original language in both locales (real quotes are not machine-translated).
- **Sitemap**: EN URLs included only for entries with EN content.
- **Status**: home and `/travel` are fully bilingual (pattern proven end-to-end — travel guards i18n calls behind module-ready state; port as ordinary locale routing); hub/landings/blog follow the same pattern — pending translation pass per page.

## Status / changelog (design side — all DONE in the prototypes)
1. Three landing templates (city 3 variants / region 3 / country 2), hub, blog index + post, homepage — all registry-driven, zero hardcoded content.
2. Global registry `site.js` (settings incl. `siteUrl`, fleet+photos, services, testimonials, trust, multi bank accounts, official phones) + `cities.js` + `posts.js`; `shared.js` derivation layer.
3. Content Studio CMS: form editors for everything, add/remove/↑↓ reorder, fleet photo upload (client-resize → webp, by reference), autosave drafts + timestamps, per-entry draft dots, duplicate-to-create, confirm-before-destroy, char counters, SERP preview, pre-publish validation, draft backup/restore (.json), exports: cities.js / posts.js / site.js / sitemap.xml.
4. SEO heads everywhere: canonical, OG/Twitter, JSON-LD (AutoRental + priceRange, BreadcrumbList, FAQPage, ItemList on hub, Blog/BlogPosting) — emitted by `shared.js applySeo()`; domain from `site_settings.siteUrl`.
5. Conversion tracking: ref codes per page (`HOME-*`, `HUB-*`, `{CITYCODE}-*`, `HOME-armada-{unit}`), UTM/gclid/fbclid capture → `[Src: …]` suffix on WA messages (`campaignTag()`), `data-cta`/`data-city`/`data-unit` attrs ready for GA4 dataLayer wiring.
6. Responsive: hamburger nav <768px on all marketing pages (explicit open/close X control), 3:2 fleet media (cover/contain), sticky mobile CTA, `prefers-reduced-motion` respected.
7. `/travel` charter drop-off page: bilingual, interactive tariff checker over `travel.js`, hreflang/canonical/OG head, WA CTAs with `TRV-*` refs.
8. QA pass (Jul 2026): burger menus close correctly on all pages, i18n toggles guarded against init race, footer cross-links resolve on every landing type, CMS sidebar open/close fixed — no console errors on load.

Remaining for production (Claude Code scope): Next.js + Supabase build per this README; replace placeholder testimonials (see below); GA4/GTM wiring; real domain in `siteUrl`.

## Testimonials — source from Google Business Profile
Replace `site.js testimonials[]` placeholders with real GBP reviews. **Launch path (implemented in prototypes): copy-paste.** Testimonial schema is `{quote, name, context, link?}` — `link` is the optional Google review/share URL; when present, all 4 landing templates render a "Lihat ulasan di Google ↗" link in the card (opens new tab, `rel="noopener"`). Content Studio's Testimoni form has the link column. Keep review text verbatim; reviewer first name + initial.
Later upgrade — API sync:
- **Source**: Google Business Profile API `reviews.list` (owner-verified location, OAuth). NOTE: API access requires a manual Google approval request (new Cloud projects have zero quota; needs verified GBP 60+ days old + business website) — request early; until approved, paste reviews into the CMS by hand.
- **Sync**: scheduled job (e.g. daily cron / Supabase Edge Function) → upsert into a `reviews` table (`author`, `rating`, `text`, `date`, `reviewId`, `approved boolean default false`).
- **Curation**: CMS gets a "Reviews" list — admin toggles `approved`; only approved 4–5★ reviews render in the testimonials section. Keep original language (no machine translation), show reviewer first name + rating, never edit review text.
- **Fallback**: Places API returns only ~5 unselectable reviews — acceptable as interim widget, not for the curated section.
- JSON-LD: do NOT emit `aggregateRating` from self-collected values on AutoRental pages unless the rating is displayed on-page and sourced verbatim from GBP.
