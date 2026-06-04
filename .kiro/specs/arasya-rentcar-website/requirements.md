# Requirements Document

## Introduction

Arasya Rentcar is a chauffeur-only car rental business operating across multiple Indonesian cities, with planned expansion into Singapore, Malaysia, and Thailand, and with a forecast scale of hundreds of city landing pages. This feature delivers a modern, conversion-focused, SEO-optimized, mobile-first marketing website whose primary conversion path is WhatsApp inquiry to a verified admin number. The MVP covers a homepage, programmatically generated city/country/vehicle/airport-transfer landing pages, a blog/guide section, a multi-field booking form that converts submissions into prefilled WhatsApp messages, persistent lead storage in Supabase, and a strict brand boundary that forbids any self-drive or "lepas kunci" wording.

The architecture is built on Next.js App Router with TypeScript, Tailwind CSS, shadcn/ui, and Framer Motion, deployed on Vercel using ISR. Supabase is the committed database platform for lead storage AND for structured content storage (cities, countries, vehicles, services, airports, relationships, coverage state). Long-form narrative copy for cities, countries, vehicles, services, and blog articles is authored as MDX files in the repository. The Content_Layer loader contract is the single abstraction that page components depend on, so page components are unaware whether a given field originates in Supabase or in MDX. This hybrid split is chosen so that ops can bulk-manage city coverage and structured metadata in Supabase Studio without a custom admin UI, while the brand-critical narrative copy remains diff-reviewable and auditable by the build-time forbidden-phrase and uniqueness checks. A distinct city coverage state model allows cities to be launched with full content, marked as coverable with a fallback page, or held inactive, so that expansion from tens to hundreds of cities does not 404 future customers or leak thin content into the search index.

## Glossary

- **Website**: The public-facing Arasya Rentcar marketing website that is the subject of this spec.
- **Visitor**: An anonymous public user browsing the Website.
- **Admin**: Arasya Rentcar staff who receive and respond to booking inquiries through WhatsApp and other channels.
- **Booking_Form**: The multi-field inquiry form that captures rental intent and converts it into a WhatsApp message.
- **WhatsApp_Handler**: The client-side module that builds wa.me URLs and opens WhatsApp chat with a prefilled message.
- **City_Page**: A programmatically generated landing page targeting chauffeur car rental intent for a specific Indonesian city.
- **Country_Page**: A programmatically generated landing page targeting international chauffeur service intent for a specific country.
- **Vehicle_Page**: A detail page describing a specific rental vehicle type with capacity, use cases, and CTA.
- **Airport_Transfer_Page**: A programmatically generated page targeting airport transfer intent for a specific city or airport.
- **Service_Page**: A page describing a non-location service category such as corporate rental or private trip.
- **Blog_Article**: A long-form SEO content page under the guide/blog section.
- **Content_Layer**: The abstraction through which page components retrieve cities, countries, vehicles, services, airports, FAQs, and narrative copy. It is implemented as a hybrid of Supabase tables for structured data and repository-managed MDX files for long-form narrative copy, exposed via typed loader functions.
- **Structured_Content_Store**: The Supabase schema containing structured content tables (`cities`, `countries`, `vehicles`, `services`, `airports`, `city_vehicles`, `city_airports`, `city_related`, `city_aliases`, and related join and lookup tables) that the Content_Layer queries for IDs, slugs, flags, ordering, relationships, and short metadata fields.
- **Narrative_Content_Store**: The set of MDX files under `content/cities/{locale}/{slug}.mdx`, `content/countries/{locale}/{slug}.mdx`, `content/vehicles/{locale}/{slug}.mdx`, `content/services/{locale}/{slug}.mdx`, and `content/articles/{locale}/{slug}.mdx` that hold long-form intro copy, tourism highlights, itinerary ideas, local tips, landmarks, and FAQs.
- **City_Coverage_State**: The declared operational state of a City entry; one of `launched` (full City_Page with MDX narrative), `coverable` (service is available but no dedicated narrative yet, renders a minimal fallback page noindexed by default), or `inactive` (not served, 404).
- **Coverage_Page**: The minimal shared template rendered for City entries whose `City_Coverage_State` is `coverable`, distinct from the full City_Page template defined in Requirement 9.
- **City_Alias**: A slug that redirects permanently to a canonical City slug, used to handle misspellings and common alternative names.
- **Metadata_Generator**: The utility that produces Next.js `generateMetadata` output including title, description, canonical, hreflang, and Open Graph tags.
- **JSONLD_Generator**: The utility that emits JSON-LD structured data scripts for LocalBusiness, Service, FAQPage, BreadcrumbList, and Article.
- **OGImage_Generator**: The dynamic Open Graph image route that renders per-page share images.
- **Sitemap_Generator**: The utility that produces `sitemap.xml` entries for all indexable URLs in both locales.
- **Lead_Store**: The Supabase Postgres database that stores submitted Booking_Form leads and related records.
- **Supabase_Project**: The managed Supabase project hosting the Website's Postgres database, authentication-admin service-role key, and row-level security (RLS) configuration.
- **Supabase_Anon_Key**: The publishable Supabase API key intended for client-side or browser-scoped requests; the Website SHALL NOT grant this key write access to lead-related tables.
- **Supabase_Service_Role_Key**: The privileged Supabase API key used only from server-side Route Handlers to write leads and bypass RLS where explicitly required.
- **Live_Chat_Widget**: The floating WhatsApp click-to-chat button and optional third-party chat widget.
- **Design_System**: The shared token set and component library based on Tailwind CSS and shadcn/ui used across the Website.
- **Analytics_Layer**: The client-side analytics integration that tracks page views, WhatsApp clicks, and form submissions.
- **Locale**: The language variant served by the Website; allowed values are `id` (Bahasa Indonesia, default) and `en` (English).
- **Chauffeur_Only_Policy**: The editorial rule that every user-facing string on the Website must describe car rental with a driver and must not imply self-drive, "lepas kunci", or key handover.
- **Forbidden_Phrases**: The case-insensitive, diacritic-insensitive phrase set `{"lepas kunci", "self drive", "self-drive", "tanpa supir", "rental tanpa supir", "sewa mobil tanpa supir", "key handover", "without driver"}` whose presence in any user-facing string violates the Chauffeur_Only_Policy.
- **Indexable_Page**: Any page of the Website that returns HTTP 200, is included in `generateStaticParams` output or is a static route, and whose rendered `<meta name="robots">` does not contain the value `noindex`.

## Requirements

### Requirement 1: Chauffeur-Only Brand Positioning

**User Story:** As a Visitor evaluating car rental options, I want to immediately understand that Arasya Rentcar provides a chauffeur-driven service, so that I know what I am buying before I contact the Admin.

#### Acceptance Criteria

1. THE Website SHALL render on the homepage, in the hero region above the fold at a viewport height of 640 CSS pixels or more, a value proposition headline of 4 to 12 words and a subheadline of 10 to 30 words that each explicitly state the chauffeur-only nature of the service, in the active Locale.
2. THE Website SHALL render at least four distinct trust-signal items on the homepage that collectively cover professional drivers, verified vehicles, transparent pricing, and direct WhatsApp support, where each item contains a heading of 2 to 6 words and a supporting description of 5 to 25 words.
3. WHEN a Visitor loads any page of the Website, THE Website SHALL render at least one user-facing phrase from the set `{"sewa mobil dengan supir", "chauffeur car rental"}` appropriate to the active Locale, and SHALL render zero occurrences of any Forbidden_Phrase.
4. THE Website SHALL render within the homepage hero region a Bahasa Indonesia primary tagline and an English secondary tagline, where both taglines explicitly reference chauffeur, driver, or "dengan supir", and neither tagline contains any Forbidden_Phrase.
5. WHEN the homepage hero section is rendered, THE Website SHALL display a primary CTA that navigates to or opens the Booking_Form and a secondary CTA that opens a WhatsApp chat with the Admin, where both CTAs are visible without scrolling on the same viewport as the headline.
6. WHEN a Visitor loads any City_Page, Country_Page, Vehicle_Page, Service_Page, Airport_Transfer_Page, or Blog_Article, THE Website SHALL render at least one section on that page whose copy explicitly references chauffeur, driver, or "dengan supir".

### Requirement 2: MVP Scope and Explicit Non-Goals

**User Story:** As a product owner, I want the MVP scope and non-goals captured explicitly, so that the team does not build out-of-scope features and ships quickly.

#### Acceptance Criteria

1. THE Website SHALL expose reachable URLs for each of the following MVP surfaces in both Locales: homepage, vehicle listing page, vehicle detail pages, city landing pages, country landing pages, airport transfer pages, service pages, blog index and blog article pages, booking page, contact page, FAQ page, terms page, and privacy policy page.
2. THE Website SHALL implement the Booking_Form, the WhatsApp_Handler, the Live_Chat_Widget, an Admin notification path for new leads, and lead persistence to the Supabase Lead_Store as the MVP conversion stack, and SHALL make the Booking_Form submission and the WhatsApp CTA reachable from every page except the booking confirmation screen.
3. THE Website SHALL NOT expose any UI control, route, API endpoint, or copy that initiates, describes, or collects data for a self-drive, "lepas kunci", or key-handover booking flow.
4. THE Website SHALL NOT expose any UI control, route, or API endpoint that initiates an online payment, collects payment card or bank-transfer data, or displays a checkout summary.
5. THE Website SHALL NOT expose any UI control, route, or API endpoint for end-user account registration, login, password recovery, or a customer self-service portal.
6. THE Website SHALL NOT expose any UI control, route, API endpoint, or form field that collects, uploads, or displays national ID, KTP, SIM, passport, driver license, or any government-issued identity document from Visitors.
7. THE Website SHALL NOT expose any UI control, route, or API endpoint that displays real-time vehicle or driver location, live ETA based on GPS, fleet management, or automated driver dispatch.
8. WHERE a capability is classified as a non-goal in acceptance criteria 3 through 7, THE Website SHALL omit any navigation entry, CTA button, link, search result, sitemap entry, footer link, menu item, and body copy that references, promises, or implies availability of that capability.
9. IF any source file or Content_Layer entry introduces copy, a route, or a component that violates acceptance criteria 3 through 8, THEN the build SHALL fail with a non-zero exit status and an error report identifying the offending file, locale, and violation.

### Requirement 3: Information Architecture and URL Structure

**User Story:** As an SEO lead, I want a clear sitemap and URL structure covering all page types and both locales, so that the Website can scale to many city and country pages without collision or ambiguity.

#### Acceptance Criteria

1. THE Website SHALL serve the Bahasa Indonesia locale under the root path prefix `/` and the English locale under the path prefix `/en`, such that every non-asset route resolves to exactly one Locale based on its path prefix.
2. THE Website SHALL use the following URL patterns for the Bahasa Indonesia Locale, and no other path patterns SHALL resolve to these page types:
   - Homepage: `/`
   - City landing: `/sewa-mobil/{city-slug}`
   - City airport transfer: `/sewa-mobil/{city-slug}/airport-transfer`
   - City and vehicle: `/sewa-mobil/{city-slug}/{vehicle-slug}`
   - Country landing: `/internasional/{country-slug}`
   - Vehicle listing: `/armada`
   - Vehicle detail: `/armada/{vehicle-slug}`
   - Service page: `/layanan/{service-slug}`
   - Blog index: `/blog`
   - Blog article: `/blog/{article-slug}`
   - Booking: `/booking`
   - Contact: `/kontak`
   - FAQ: `/faq`
   - Terms: `/syarat-ketentuan`
   - Privacy: `/kebijakan-privasi`
3. THE Website SHALL mirror every Bahasa Indonesia URL under `/en` using the corresponding English static segment, including `/en/car-rental/{city-slug}`, `/en/car-rental/{city-slug}/airport-transfer`, `/en/international/{country-slug}`, `/en/fleet`, `/en/fleet/{vehicle-slug}`, `/en/services/{service-slug}`, `/en/blog`, `/en/blog/{article-slug}`, `/en/booking`, `/en/contact`, `/en/faq`, `/en/terms`, and `/en/privacy`, such that each Bahasa Indonesia page has exactly one equivalent English URL when an English Content_Layer entry exists.
4. THE Website SHALL accept dynamic route segments that consist only of lowercase ASCII letters (a-z), digits (0-9), and hyphens (-), with a minimum length of 1 and a maximum length of 80, and with no leading, trailing, or consecutive hyphens.
5. IF a Visitor requests a URL whose dynamic segment does not conform to the slug format defined in criterion 4, THEN THE Website SHALL respond with an HTTP 404 status and render the localized not-found page for the Locale indicated by the URL path prefix.
6. WHEN a Visitor requests a URL whose dynamic segment conforms to the slug format but is not present as an active entry in the Content_Layer for the active Locale, THE Website SHALL respond according to the following order of precedence: (a) if the slug matches a City_Alias whose canonical target is an active City entry, respond with HTTP 301 to the canonical slug URL; (b) if the slug matches a City entry with `City_Coverage_State` of `coverable`, respond with HTTP 200 and render the Coverage_Page defined in Requirement 22; (c) if the slug matches a City entry with `City_Coverage_State` of `inactive` or is not present in any Content_Layer store, respond with HTTP 404 and render the localized not-found page containing a link back to the homepage, the primary navigation for the current Locale, and a list of 3 to 6 active launched cities nearest to the requested slug.
7. IF a Visitor requests a URL that differs from the canonical form only by a trailing slash or by containing uppercase ASCII letters in a dynamic segment, THEN THE Website SHALL respond with an HTTP 301 redirect to the canonical lowercase, no-trailing-slash form of that URL.
8. THE Website SHALL render a global primary navigation on every page that links to Beranda/Home, Armada/Fleet, Layanan/Services, Kota/Cities, Internasional/International, Blog, and Kontak/Contact using the slugs and labels of the current Locale.
9. THE Website SHALL render a global footer on every page that links to FAQ, Terms, and Privacy using the slugs and labels of the current Locale, and displays the official Admin WhatsApp contact number and an anti-fraud notice whose text is sourced from the Content_Layer for the current Locale.

### Requirement 4: Multilingual Support with hreflang

**User Story:** As an international Visitor, I want to see the Website in my preferred language with correct hreflang signals, so that search engines index the right version and I can switch locale without losing context.

#### Acceptance Criteria

1. THE Website SHALL support exactly two Locale values, `id` and `en`, with `id` as the default Locale applied whenever no explicit Locale is resolved from the URL.
2. WHEN a Visitor requests the root path `/` without a locale segment, THE Website SHALL serve the Bahasa Indonesia version in a single HTTP 200 response without issuing any HTTP 3xx redirect.
3. THE Website SHALL emit `<link rel="alternate">` tags inside the `<head>` of every Indexable_Page with `hreflang` values `id-ID`, `en`, and `x-default`, each pointing to the absolute URL of the equivalent page in the corresponding Locale.
4. WHERE a page exists in only one Locale, THE Website SHALL omit the `<link rel="alternate">` tag for the missing Locale and SHALL emit the `x-default` tag pointing to the existing Locale version rather than any fallback URL.
5. THE Website SHALL render a Locale switcher control in the header on every page that exposes one selectable option per supported Locale, with the option for the active Locale marked as selected and non-actionable.
6. WHEN a Visitor activates the Locale switcher on a page that has an equivalent page in the target Locale, THE Website SHALL navigate the Visitor to the equivalent URL while preserving the same content identity defined in the locale routing table.
7. WHEN a Visitor activates the Locale switcher on a page that has no equivalent in the target Locale, THE Website SHALL redirect the Visitor to the homepage of the target Locale (`/` for `id`, `/en` for `en`) within a single navigation.
8. THE Website SHALL set the HTML `lang` attribute on the root `<html>` element to `id-ID` when the active Locale is `id` and to `en` when the active Locale is `en`, matching the hreflang values emitted for the same Locale.
9. IF a Visitor requests a URL with a locale segment that is not one of the supported Locale values, THEN THE Website SHALL respond with an HTTP 404 rendered in the default Locale and SHALL NOT redirect to any other Locale.

### Requirement 5: Programmatic SEO Page Generation

**User Story:** As a growth marketer, I want city, country, vehicle, airport-transfer, and service pages generated from structured data combined with narrative MDX content, so that the Website can scale to hundreds of city pages without manual page authoring and without thin content leaking into the index.

#### Acceptance Criteria

1. THE Content_Layer SHALL source its typed City, Country, Vehicle, Service, Airport, and City-Vehicle-availability entities from the Structured_Content_Store in Supabase, and SHALL source their Locale-specific narrative copy (intro, tourism highlights, landmarks, itinerary ideas, local tips, and FAQs) from the Narrative_Content_Store as MDX files under `content/{entity-type}/{locale}/{slug}.mdx`.
2. THE Structured_Content_Store `cities` table SHALL provide the following fields per City entry: `slug` (matching the format in Requirement 3 criterion 4 and unique within the table), `display_name` (1 to 120 characters) per configured Locale via a `city_translations` join, `parent_region`, `country_code`, `latitude`, `longitude`, `coverage_state` (one of `launched`, `coverable`, `inactive`), `allow_index` (boolean, default `false` for `coverable`, default `true` for `launched`, ignored for `inactive`), `featured_order` (nullable integer), `launch_priority` (integer, default `0`), `pricing_hint_from` and `pricing_hint_to` (nullable integer representing indicative daily rate lower and upper bounds in IDR), `chauffeur_only` (boolean, must be `true`), `created_at` and `updated_at` timestamps.
3. THE Narrative_Content_Store MDX file for a launched City entry SHALL provide frontmatter fields `slug`, `locale`, `seoTitle` (30 to 65 characters), `seoDescription` (70 to 160 characters), `heroHeadline`, `heroSubheadline`, `chauffeurOnly: true`, and body sections for intro copy (150 to 600 words), landmarks (3 to 20 items each naming a venue or landmark in the city), tourism highlights (0 to 10 items), itinerary ideas (0 to 5 items), local tips (0 to 10 items), popular destinations (3 to 50 items), FAQs (3 to 20 items each referencing the city name or a city-specific attribute), and at least one testimonial or trust block naming the city.
4. THE Structured_Content_Store SHALL provide equivalent typed tables and join tables for Countries (`countries`, `country_translations`), Vehicles (`vehicles`, `vehicle_translations`), Services (`services`, `service_translations`), Airports (`airports`), City-Vehicle availability (`city_vehicles`), City-Airport relationships (`city_airports`), City-Related internal links (`city_related`), and City aliases (`city_aliases`), each with `chauffeur_only` markers where applicable and `created_at`/`updated_at` timestamps.
5. WHEN the Website build runs, THE Website SHALL generate a full City_Page using the template in Requirement 9 criterion 2 for every City entry whose `coverage_state` is `launched` AND whose Narrative_Content_Store MDX exists and passes schema validation.
6. WHEN the Website build runs, THE Website SHALL generate a Coverage_Page (defined in Requirement 22) for every City entry whose `coverage_state` is `coverable`, regardless of whether a Narrative_Content_Store MDX file exists.
7. THE Website SHALL exclude City entries whose `coverage_state` is `inactive` from all page generation, sitemap output, internal linking, and navigation surfaces.
8. WHEN the Website build runs, THE Website SHALL generate a Country_Page for every active Country entry, a Vehicle_Page for every active Vehicle entry, a Service_Page for every active Service entry, and an Airport_Transfer_Page for every City entry whose `coverage_state` is `launched` AND that has a non-empty `city_airports` reference.
9. WHEN the Website build runs, THE Website SHALL generate a combined city-and-vehicle page at `/sewa-mobil/{city-slug}/{vehicle-slug}` (and the English equivalent under `/en/car-rental/…`) for every combination where the City entry's `coverage_state` is `launched`, the `city_vehicles` join lists the Vehicle slug, and the referenced Vehicle entry exists and is active.
10. THE Website SHALL regenerate programmatically generated pages using Incremental Static Regeneration with a revalidation window between 3600 seconds and 86400 seconds inclusive, AND SHALL additionally expose an on-demand revalidation endpoint (per Requirement 17) so that ops changes to a City, Country, Vehicle, Service, or Airport row propagate within 5 minutes of the revalidation call.
11. WHEN a new City, Country, Vehicle, Service, or Airport row is added to the Structured_Content_Store and the associated MDX files are committed where required, AND the Website is redeployed or the revalidation endpoint is called for the affected slug, THE Website SHALL generate and expose the corresponding pages without any manual page-file creation.
12. IF a Structured_Content_Store row fails schema validation (missing required field, slug collision, broken foreign-key reference, or any field exceeding its defined bounds) OR a required MDX file for a `launched` City is missing or fails frontmatter validation, THEN THE Website SHALL skip only the failing entry, emit a build-log error identifying the entry type, slug, and failure reason, and continue generating pages for all remaining valid entries.
13. THE Website SHALL cache the full Structured_Content_Store snapshot read at build time to a local file under `.next/cache/content-snapshot.json`, and IF the Supabase read fails during a subsequent build, THEN the build SHALL fall back to the most recent cached snapshot, emit a warning identifying the fallback, and continue.

### Requirement 6: Content Uniqueness and Thin Content Prevention

**User Story:** As an SEO lead, I want programmatically generated pages that are indexable to avoid duplicate or thin content, so that Google indexes and ranks each page on its own merit, and I want pages that are not yet fleshed out to be held out of the index until they earn their place.

#### Acceptance Criteria

1. THE Narrative_Content_Store SHALL require each `launched` City entry's MDX to provide intro copy of between 150 and 600 words, at least three landmarks each naming a venue or landmark in that city, at least three FAQ entries each referencing the city name or a city-specific attribute, and at least one testimonial or trust block naming the city, where the intro copy shares no more than 40 percent of its word tokens with the intro copy of any other `launched` City entry in the same Locale measured by case-insensitive word-level overlap after removing stop words.
2. THE Narrative_Content_Store SHALL require each active Country entry's MDX to provide intro copy of between 200 and 800 words, at least three country-specific use cases each referencing a country-level attribute, at least three country-specific FAQ entries each referencing the country name or a country-specific attribute, and at least one country-specific trust block naming the country, where the intro copy shares no more than 40 percent of its word tokens with the intro copy of any other active Country entry in the same Locale under the same overlap measurement.
3. THE Narrative_Content_Store SHALL require each active Vehicle entry's MDX to provide a description of between 120 and 500 words that explicitly states passenger capacity as an integer, luggage capacity as an integer count of standard bags, at least two use cases, and at least two recommended trip types, where the description shares no more than 40 percent of its word tokens with the description of any other active Vehicle entry in the same Locale under the same overlap measurement.
4. THE Narrative_Content_Store SHALL require each active Service entry's MDX to provide a description of between 150 and 600 words, at least three service-specific benefits, and at least three service-specific FAQ entries each referencing the service name or a service-specific attribute, where the description shares no more than 40 percent of its word tokens with the description of any other active Service entry in the same Locale under the same overlap measurement.
5. THE Website SHALL compose rendered `launched` City_Page, Country_Page, and Vehicle_Page bodies from entity-specific Narrative_Content_Store fields interleaved with shared templated blocks so that no two rendered pages of the same type share more than 60 percent of their word tokens, measured by case-insensitive word-level overlap on the final rendered HTML text content after stripping HTML tags and shared templated blocks.
6. IF a `launched` City, active Country, active Vehicle, or active Service entry fails any threshold defined in criteria 1 through 5, THEN THE Website SHALL (a) for a `launched` City entry, automatically demote the entry to `coverage_state = coverable` for the affected Locale and render the Coverage_Page defined in Requirement 22 instead of the full City_Page, OR (b) for Country, Vehicle, or Service entries, exclude the entry from `generateStaticParams` output, emit a build-time warning identifying the offending slug, the field that failed, and the threshold value that was violated, and SHALL complete the build without aborting when at least one entry per entity type still passes validation.
7. THE Coverage_Page rendered for a `coverable` City entry SHALL NOT be subject to the 40 percent token-overlap or 60 percent body-overlap uniqueness thresholds in criteria 1 through 5, AND SHALL be emitted with `<meta name="robots" content="noindex, follow">` whenever the City entry's `allow_index` flag is `false`.
8. THE Website SHALL generate a `<title>` of between 30 and 65 characters, a `<meta name="description">` of between 70 and 160 characters, exactly one `<h1>`, and an Open Graph image URL for every programmatically generated page, where these four values are each unique across all Indexable_Pages of the same page type within the same Locale. The uniqueness check SHALL exclude noindexed Coverage_Pages.
9. THE Website SHALL emit exactly one `<link rel="canonical">` tag on every Indexable_Page pointing to the absolute URL of that page in its own Locale. Noindexed Coverage_Pages SHALL still emit a `<link rel="canonical">` pointing to their own URL so they consolidate any inbound link signal without being indexed.

### Requirement 7: Dynamic Metadata, Open Graph, and Sitemap

**User Story:** As a Visitor sharing a page or a crawler indexing the site, I want accurate per-page metadata, Open Graph images, and a complete sitemap, so that previews and search results are rich and complete.

#### Acceptance Criteria

1. THE Metadata_Generator SHALL produce Next.js `generateMetadata` output for every route including `title` (30 to 65 characters), `description` (70 to 160 characters), `alternates.canonical` as an absolute URL in the page's own Locale, `alternates.languages` covering every Locale in which the page exists, `openGraph`, `twitter`, and `robots` fields.
2. THE Website SHALL render a dynamic Open Graph image at `/api/og` accepting required parameters `title` (1 to 90 characters), `subtitle` (0 to 120 characters), `locale` (one of the supported Locale values), and `pageType` (one of `homepage`, `city`, `country`, `vehicle`, `airport`, `service`, `article`, `static`), with dimensions 1200 by 630 pixels, and SHALL set a `Cache-Control` header with `public, max-age=604800, s-maxage=604800` or longer.
3. THE Website SHALL reference the dynamic Open Graph image from every programmatically generated page with parameters derived from that page's Content_Layer entry (`title` from the page's SEO title, `subtitle` from the city or country name or vehicle capacity summary, `locale` from the active Locale, `pageType` matching the page type).
4. THE Sitemap_Generator SHALL emit a `sitemap.xml` served at `/sitemap.xml` that includes every Indexable_Page in both Locales with `lastmod` in ISO 8601 UTC format, `changefreq`, and per-URL `<xhtml:link rel="alternate" hreflang="…">` entries for every Locale in which the page exists including `x-default`. The sitemap SHALL exclude Coverage_Pages whose `allow_index` is `false` and SHALL include them automatically once `allow_index` becomes `true`.
5. WHEN the total URL count exceeds 40000, THE Sitemap_Generator SHALL split the sitemap into a sitemap index file with per-type sub-sitemaps, where each sub-sitemap contains at most 40000 URLs.
6. THE Website SHALL serve a `robots.txt` at `/robots.txt` that allows all crawlers and references the absolute `sitemap.xml` URL.
7. WHERE a page is explicitly marked non-indexable in the Content_Layer, THE Metadata_Generator SHALL emit `robots: { index: false, follow: true }`, THE Sitemap_Generator SHALL exclude the URL, and THE Website SHALL NOT emit Locale alternates pointing to that URL.
8. IF the `/api/og` endpoint receives missing or invalid required parameters, THEN the endpoint SHALL return a fallback 1200-by-630 Open Graph image that uses the brand default title, SHALL set a response header or status indicator that allows detection of the fallback condition, and SHALL NOT return a 5xx response.
9. WHEN a City, Country, Vehicle, Service, or Blog_Article entry in the Content_Layer is created, updated, deleted, or has its indexability flag changed, THE Website SHALL reflect the corresponding sitemap, metadata, and alternates within 24 hours through the ISR revalidation defined in Requirement 5.

### Requirement 8: JSON-LD Structured Data

**User Story:** As a search engine, I want structured data describing the business, services, FAQs, and breadcrumbs, so that I can render rich results for Arasya Rentcar.

#### Acceptance Criteria

1. THE JSONLD_Generator SHALL emit a `LocalBusiness` schema with `"@context": "https://schema.org"` on the homepage and on every City_Page, with fields for `name`, `image`, `url`, `telephone`, `address`, `areaServed`, `priceRange`, `openingHoursSpecification`, and `sameAs`, where URL and image fields are absolute URLs.
2. THE JSONLD_Generator SHALL emit a `Service` schema with `"@context": "https://schema.org"` on every Service_Page, City_Page, Country_Page, and Airport_Transfer_Page, with `serviceType` set to "Chauffeur car rental" and `provider` referencing the LocalBusiness entity of the Website.
3. WHEN a page's Content_Layer entry supplies two or more FAQ items each with a non-empty question and non-empty answer, THE JSONLD_Generator SHALL emit a `FAQPage` schema on that page including those items in the order they appear in the Content_Layer entry.
4. WHEN a page is at navigation depth of 2 or more below the homepage, THE JSONLD_Generator SHALL emit a `BreadcrumbList` schema listing each breadcrumb from the homepage to the current page, with each item's `name` and `item` URL in the active Locale.
5. THE JSONLD_Generator SHALL emit an `Article` schema on every Blog_Article page including `headline`, `datePublished` in ISO 8601 format, `dateModified` in ISO 8601 format, `author`, and `image` as an absolute URL.
6. IF required structured data fields are missing from the Content_Layer entry for a page, THEN THE JSONLD_Generator SHALL omit that specific schema block, emit a build-time warning identifying the page path, schema type, and missing field names, and SHALL continue emitting any other schema blocks for the page.
7. THE JSONLD_Generator SHALL output each schema block as a separate `<script type="application/ld+json">` element in the page head, where each block is valid JSON.
8. IF any emitted JSON-LD block fails JSON validity checks at build time, THEN the build SHALL fail with a non-zero exit status and an error identifying the page path, schema type, and the JSON parse error.

### Requirement 9: Page Templates

**User Story:** As a Visitor, I want every page type to present a consistent, high-converting structure, so that I can find the information I need and book quickly regardless of which page I land on.

#### Acceptance Criteria

1. THE homepage template SHALL render, in the exact order listed: hero with chauffeur-only value proposition, primary trust signals (4 to 6 items), featured services (3 to 6 items), featured vehicles (3 to 8 items), featured cities (6 to 12 items), how-it-works steps (3 to 5 steps), corporate and airport transfer callouts, testimonials (3 to 6 items), FAQ highlights (4 to 8 items), and a final CTA band.
2. THE City_Page template SHALL render, in the exact order listed: breadcrumb, hero with city-specific headline and primary CTA, chauffeur-only value proposition, available vehicles grid (3 to 12 items) linked to combined city-and-vehicle pages, popular destinations in the city (3 to 12 items), pricing hint or package highlights, airport transfer callout, city-specific FAQs (3 to 8 items), related cities (3 to 6 items), and a final CTA band.
3. THE Country_Page template SHALL render, in the exact order listed: breadcrumb, hero with country-specific English headline and primary CTA, chauffeur-only value proposition, supported cities within the country (2 to 10 items), typical use cases for business and tourism (3 to 6 items), available vehicles (3 to 10 items), country-specific FAQs (3 to 8 items), and a final CTA band.
4. THE Vehicle_Page template SHALL render, in the exact order listed: breadcrumb, hero with vehicle image and capacity, specification block covering seats, luggage, transmission, and typical trip types, recommended trip types (3 to 6 items), price range hint, service cities availability (3 to 12 items), related vehicles (2 to 6 items), vehicle-specific FAQs (3 to 6 items), and a final CTA band.
5. THE Airport_Transfer_Page template SHALL render, in the exact order listed: breadcrumb, hero with airport-specific headline, how airport transfer works (3 to 5 steps), flat-rate or indicative pricing hint, recommended vehicles (2 to 6 items), service cities availability, FAQs (3 to 6 items), and a final CTA band.
6. THE Blog_Article template SHALL render, in the exact order listed: breadcrumb, article header with title and published date, cover image, article body supporting headings and callouts, author block, related articles (2 to 4 items), contextual chauffeur-only CTA band, and a final CTA band.
7. THE booking page template SHALL render, in the exact order listed: hero summarizing the chauffeur-only service, the Booking_Form, alternative WhatsApp CTA, anti-fraud notice with the official Admin number, and FAQs about booking (3 to 6 items).
8. THE contact page template SHALL render, in the exact order listed: hero with contact intent, the official Admin WhatsApp number with click-to-chat action, operating hours, office address, embedded map, email, social links, and anti-fraud notice.
9. WHERE a page template includes a CTA band, THE Website SHALL render within that CTA band both a primary WhatsApp CTA and a secondary link to the Booking_Form, where both are visible and operable on viewports from 320 to 1920 pixels wide.
10. IF a page's Content_Layer entry lacks enough items to satisfy the minimum count of a section defined in criteria 1 through 6, THEN the Website SHALL omit that section entirely rather than render a partial section, and SHALL emit a build-time warning identifying the page path, section name, and missing count.

### Requirement 10: Booking Form Fields, Validation, and UX

**User Story:** As a Visitor ready to book, I want a clear, mobile-friendly booking form with helpful validation, so that I can submit my trip details quickly and accurately.

#### Acceptance Criteria

1. THE Booking_Form SHALL collect the following fields, marked required unless noted optional: full name (required), WhatsApp number (required), pickup city (required), pickup location (required), destination (optional), pickup date (required), pickup time (required), rental duration (required), number of passengers (required), preferred vehicle (optional), trip type (required), notes (optional), and an agreement checkbox (required).
2. THE Booking_Form SHALL validate that full name contains between 2 and 80 characters after trimming whitespace, and SHALL reject input containing only digits.
3. THE Booking_Form SHALL validate that WhatsApp number, after normalizing leading `0`, `+62`, or `62` for Indonesian inputs to the `+62`-prefixed form, contains between 8 and 15 digits and is valid under E.164.
4. THE Booking_Form SHALL populate the pickup city options from active City entries in the Content_Layer of the current Locale, sorted alphabetically by display name.
5. THE Booking_Form SHALL validate that pickup date is between the current day in the `Asia/Jakarta` time zone and 365 days after the current day inclusive.
6. WHEN pickup date equals the current day in the `Asia/Jakarta` time zone, THE Booking_Form SHALL validate that pickup time is at least 60 minutes in the future.
7. THE Booking_Form SHALL validate rental duration against trip type: at least 1 hour and at most 24 hours for hourly trip types, at least 1 day and at most 30 days for daily and out-of-town trip types.
8. THE Booking_Form SHALL validate that number of passengers is an integer between 1 and 30 inclusive.
9. THE Booking_Form SHALL populate the preferred vehicle options from active Vehicle entries in the Content_Layer, including an "Any / Let Admin recommend" option as the default.
10. THE Booking_Form SHALL offer trip type options of hourly within city, full day within city, out-of-town, airport transfer, corporate, and private tour.
11. THE Booking_Form SHALL keep the submission control disabled until all required fields pass validation AND the agreement checkbox is checked confirming the chauffeur-only service and WhatsApp response handling.
12. IF any field fails validation, THEN THE Booking_Form SHALL display a field-specific inline error message adjacent to the offending field, SHALL prevent submission, and SHALL NOT submit the form to the server.
13. THE Booking_Form SHALL preserve all entered values across validation errors and SHALL move keyboard focus to the first invalid field on failed submission.
14. THE Booking_Form SHALL display a visible character counter for the notes field with a maximum length of 500 characters, and SHALL reject input exceeding 500 characters.
15. WHERE the Booking_Form is rendered on viewports narrower than 640 CSS pixels, THE Booking_Form SHALL render fields in a single column and SHALL set `inputmode` attributes appropriate to each field type (`tel` for WhatsApp number, numeric for passengers, date for pickup date, time for pickup time).

### Requirement 11: WhatsApp Booking Conversion Path

**User Story:** As a Visitor submitting the booking form, I want my details turned into a clear WhatsApp message to the official Admin number, so that the Admin can confirm my booking without friction.

#### Acceptance Criteria

1. THE WhatsApp_Handler SHALL expose a pure function that accepts a validated Booking_Form payload and a Locale and returns a `wa.me` URL containing a URL-encoded prefilled message of at most 4096 characters.
2. THE WhatsApp_Handler SHALL read the official Admin WhatsApp number exclusively from the configured environment variable, and SHALL NOT contain any hardcoded phone number literal in component, page, or utility source files.
3. IF the official Admin WhatsApp number environment variable is missing, empty, or not a valid E.164 number at build time, THEN the build SHALL fail with a non-zero exit status and an error identifying the missing or invalid variable.
4. THE prefilled WhatsApp message SHALL include, each on its own line in the current Locale with a translated label followed by `: `, the following items: a greeting, full name, WhatsApp number, pickup city, pickup location, destination (only when non-empty), pickup date in `YYYY-MM-DD` format, pickup time in `HH:mm` 24-hour format in the `Asia/Jakarta` time zone, rental duration, number of passengers, preferred vehicle (only when non-empty), trip type, and notes (only when non-empty).
5. WHEN the Booking_Form is submitted successfully AND the Lead_Store write (where configured) completes or fails gracefully, THE Website SHALL attempt to open the generated `wa.me` URL within 1 second, and SHALL render a confirmation screen containing the submitted summary and a "copy message" control.
6. IF the browser blocks the WhatsApp window open, THEN THE Website SHALL render on the confirmation screen a primary button linking to the same `wa.me` URL and a visible message instructing the Visitor to tap the button to open WhatsApp.
7. THE Website SHALL render a floating WhatsApp CTA on every page except the booking confirmation screen.
8. THE Website SHALL render at least one inline WhatsApp CTA within the hero section of every City_Page, Country_Page, Vehicle_Page, Airport_Transfer_Page, and Service_Page.
9. THE floating WhatsApp CTA and every inline WhatsApp CTA SHALL provide a minimum tap target of 44 by 44 CSS pixels on viewports from 320 to 1920 pixels wide.
10. WHEN a Visitor clicks a WhatsApp CTA that is not preceded by a Booking_Form submission, THE WhatsApp_Handler SHALL build a generic prefilled message containing the page type and primary subject name (city, country, vehicle, service, or article title) in the current Locale.
11. WHEN a Visitor interacts with any WhatsApp CTA, THE Website SHALL fire an Analytics_Layer `whatsapp_click` event within 500 milliseconds with properties `page_path`, `page_type`, `subject_slug` (or null), and `locale`, and the event SHALL be fired regardless of whether the WhatsApp window successfully opens.

### Requirement 12: Lead Storage and Admin Notification

**User Story:** As an Admin, I want every booking form submission stored in Supabase and routed to my notification channel, so that no lead is lost even if the Visitor does not complete the WhatsApp handoff.

#### Acceptance Criteria

1. WHEN a Booking_Form submission passes server-side schema validation, THE Website SHALL persist the submission to the Supabase Lead_Store before initiating the WhatsApp redirect.
2. THE Supabase Lead_Store SHALL define a `leads` table with the following columns: `id` uuid primary key default `gen_random_uuid()`, `created_at` timestamptz not null default `now()`, `full_name` text not null, `whatsapp_number` text not null, `pickup_city` text not null, `pickup_location` text not null, `destination` text, `pickup_date` date not null, `pickup_time` time not null, `rental_duration` text not null, `passengers` integer not null, `preferred_vehicle` text, `trip_type` text not null, `notes` text, `locale` text not null, `source_page` text, `utm_source` text, `utm_medium` text, `utm_campaign` text, `status` text not null default `'new'`, `ip_hash` text, and `user_agent` text.
3. THE Supabase Lead_Store SHALL enable Row Level Security on the `leads` table and SHALL define policies that (a) deny all operations to the anon role, (b) grant insert and select and update to the service_role only, and (c) deny delete to all roles except explicit Admin-managed roles configured in Supabase.
4. THE Website SHALL submit leads to the Supabase Lead_Store through a server-side Next.js Route Handler using the Supabase_Service_Role_Key loaded from environment variables, and SHALL NOT expose the Supabase_Service_Role_Key to the browser under any circumstance.
5. THE Website SHALL NOT use the Supabase_Anon_Key to write to the `leads` table from the client, and the client-side Supabase bundle (if any) SHALL only be used for read paths that do not expose personally identifiable information.
6. WHERE an Admin notification webhook is configured, WHEN a lead is successfully persisted to the Supabase Lead_Store, THE Website SHALL send a notification payload containing the lead's full name, WhatsApp number, pickup city, pickup date, pickup time, trip type, and source page to the webhook within 5 seconds.
7. IF the Supabase Lead_Store write fails due to a network, authentication, or database error, THEN THE Website SHALL still open the WhatsApp handoff, SHALL log the failure server-side including the submission payload and the Supabase error code and message, SHALL fire a server-side `lead_persist_error` metric, and SHALL NOT display the failure to the Visitor.
8. IF a client IP address exceeds 10 Booking_Form submissions within a rolling 60-minute window, THEN the Route Handler SHALL reject subsequent submissions with a rate-limit error response and SHALL NOT write to the Supabase Lead_Store.
9. IF the Booking_Form payload fails server-side schema validation using the same schema as the client, THEN the Route Handler SHALL reject the submission with a validation error response, SHALL NOT write to the Supabase Lead_Store, and SHALL NOT initiate the WhatsApp redirect.
10. IF the Admin notification webhook request fails or does not respond within 5 seconds, THEN THE Website SHALL log the failure server-side and SHALL NOT block or delay the WhatsApp handoff for the Visitor.
11. THE Website SHALL store the Visitor's IP address in the `ip_hash` column as a SHA-256 digest of the IP concatenated with a server-side salt loaded from environment variables, and SHALL NOT store the raw IP address anywhere in the Supabase Lead_Store.

### Requirement 13: Live Chat, Floating CTA, and Anti-Fraud Notice

**User Story:** As a Visitor considering booking, I want an obvious way to chat with the Admin and a clear anti-fraud notice, so that I feel safe contacting Arasya Rentcar.

#### Acceptance Criteria

1. THE Live_Chat_Widget SHALL render a floating WhatsApp button fixed to the bottom-right of the viewport on every page except the booking confirmation screen, with a minimum tap target of 56 by 56 CSS pixels and a minimum offset of 16 CSS pixels from the nearest viewport edge.
2. THE Live_Chat_Widget floating button SHALL expose a visible label or tooltip in the current Locale, an accessible name that announces the WhatsApp action, and SHALL link through the WhatsApp_Handler to the official Admin number.
3. IF the device or browser does not support the `whatsapp://` or `wa.me` protocol, THEN the floating button SHALL provide a fallback visible `tel:` link to the official Admin number.
4. WHERE an optional third-party chat widget is configured via environment variable, THE Website SHALL render the third-party widget in addition to the floating WhatsApp button AND SHALL position it so that it does not overlap or obscure the WhatsApp button by more than 20 percent of the WhatsApp button's area on viewports from 320 to 1920 pixels wide.
5. THE Website SHALL render an anti-fraud notice on the booking page, the contact page, and in the footer of every page, where the notice names the single official Admin WhatsApp number and states that any other number claiming to be Arasya Rentcar is unofficial, and is visible without interaction on the booking and contact pages.
6. THE Website SHALL display the official Admin WhatsApp number in the anti-fraud notice using the format `+62 xxx-xxxx-xxxx` rendered with both a `tel:` link and a WhatsApp `wa.me` link.
7. IF the environment variable for the official Admin WhatsApp number is missing or invalid at build time, THEN the build SHALL fail with an explicit error identifying the missing or invalid variable.

### Requirement 14: UI/UX Design System and Visual Direction

**User Story:** As a Visitor, I want a premium-yet-approachable visual experience that is consistent across pages, so that I trust the brand and can scan information quickly.

#### Acceptance Criteria

1. THE Design_System SHALL define a primary brand color, a secondary accent color, a neutral surface palette of at least 5 shades from lightest to darkest, a dark text color, and a success color, each documented as Tailwind CSS tokens in a single configuration source.
2. THE Design_System SHALL define a heading font and a body font loaded through `next/font` with `font-display: swap`, and SHALL declare at least one fallback system font per family so that fallback rendering applies when the primary font fails to load.
3. THE Design_System SHALL define a type scale of at least 6 sizes spanning from caption to display, and for each size SHALL define a line-height and a letter-spacing value.
4. THE Design_System SHALL define spacing, radius, shadow, and elevation token scales in the same configuration source as the color tokens, and every user-facing component SHALL reference these tokens rather than hardcoded CSS values.
5. THE Design_System SHALL define variants for button, input, card, badge, section, accordion, dialog, and toast components with at least 2 variants per component (default and one emphasis variant), and every user-facing component SHALL use these variants rather than ad-hoc styles.
6. THE Website SHALL apply Framer Motion animations only to hero entrances, section reveals, and CTA emphasis, with each transition duration not exceeding 400 milliseconds.
7. WHEN a Visitor has the `prefers-reduced-motion: reduce` setting enabled, THE Website SHALL suppress Framer Motion entrance, reveal, and emphasis animations and SHALL render the target end state without transition.
8. THE Website SHALL maintain color contrast of at least 4.5 to 1 for text smaller than 18pt or smaller than 14pt bold, and at least 3 to 1 for text equal to or larger than 18pt or equal to or larger than 14pt bold, against their backgrounds.
9. IF a web font fails to load within 3 seconds, THEN THE Website SHALL continue rendering using the declared system fallbacks without layout shift exceeding CLS 0.1 on the affected page.

### Requirement 15: Accessibility Compliance

**User Story:** As a Visitor using assistive technology, I want the Website to meet WCAG 2.1 AA, so that I can navigate and book without barriers.

#### Acceptance Criteria

1. THE Website SHALL render exactly one `<h1>` per page, reflecting the page's primary topic.
2. THE Website SHALL make every interactive element operable via keyboard using standard Tab, Shift+Tab, Enter, Space, Arrow, and Escape interactions as appropriate to the control, with a visible focus indicator meeting WCAG 2.4.7 contrast requirements.
3. THE Website SHALL provide an `alt` attribute on every `<img>` element, where images conveying meaning have descriptive `alt` text and decorative images have `alt=""`.
4. THE Website SHALL associate every Booking_Form field with a visible `<label>` element, and WHEN a field fails validation, THE Website SHALL set `aria-invalid="true"` and SHALL reference the inline error message via `aria-describedby`.
5. THE Website SHALL render a skip-to-content link as the first focusable element on every page that, when activated, moves focus to the main content region.
6. THE Website SHALL expose an accessible name on every non-text control, including the floating WhatsApp button, the Locale switcher, and icon-only buttons, either via `aria-label`, visible text, or `aria-labelledby`.
7. THE Website SHALL NOT convey information by color alone, and SHALL pair any color-coded signal with text, an icon, or a pattern.
8. THE Website SHALL set the `lang` attribute on elements whose content is in a language different from the active page Locale.
9. THE Website SHALL NOT contain any keyboard traps, and WHEN a dialog or modal is opened, THE Website SHALL move focus into the dialog on open and return focus to the invoking control on close.
10. THE Website SHALL support browser text resize up to 200 percent without loss of content or functionality and without horizontal scrolling at a viewport width of 320 CSS pixels.

### Requirement 16: Performance and Core Web Vitals

**User Story:** As a Visitor on a mobile network, I want the Website to load and respond quickly, so that I do not abandon the page before booking.

#### Acceptance Criteria

1. THE Website SHALL achieve a Largest Contentful Paint of at most 2.5 seconds at the 75th percentile of page loads, measured on a simulated Slow 4G connection (1.6 Mbps downlink, 150 ms round-trip time) for the homepage and all programmatically generated pages.
2. THE Website SHALL achieve a Cumulative Layout Shift of at most 0.1 at the 75th percentile of page loads on all pages.
3. THE Website SHALL achieve an Interaction to Next Paint of at most 200 milliseconds at the 75th percentile of user interactions on all pages.
4. THE Website SHALL serve all raster images through `next/image` with explicit width and height attributes, a responsive `sizes` attribute, and AVIF or WebP encoded variants.
5. WHERE the Largest Contentful Paint element of a page template is a hero image, THE Website SHALL preload that image during the initial document load.
6. THE Website SHALL render programmatically generated pages using Static Generation with Incremental Static Regeneration.
7. IF server-side data fetching for a programmatically generated page exceeds 200 milliseconds at request time, THEN THE Website SHALL serve the most recently generated static version and revalidate in the background without blocking the response.
8. THE Website SHALL ship no more than 170 kilobytes of first-party JavaScript in the initial bundle for the homepage route, measured after gzip compression.
9. THE Website SHALL lazy-load components rendered outside the initial viewport (evaluated against a 390 by 844 pixel mobile viewport and a 1280 by 720 pixel desktop viewport), including testimonials, related content sections, and the optional third-party chat widget.

### Requirement 17: Next.js Technical Architecture and Data Layer

**User Story:** As a developer, I want a clean Next.js App Router architecture with a typed data layer, so that I can add cities, countries, vehicles, and services without structural refactoring.

#### Acceptance Criteria

1. THE Website SHALL use the Next.js App Router folder structure under `app/` with a top-level Locale segment `[locale]` that accepts only the values `id` and `en`.
2. IF a Visitor requests a URL whose `[locale]` segment is not one of the supported Locale values, THEN THE Website SHALL respond with an HTTP 404 rendered in the default Locale.
3. THE Website SHALL organize dynamic routes so that slug translation between Locales is centralized in a single mapping module in the Content_Layer, and page components resolve routes via that mapping rather than via hardcoded paths.
4. THE Content_Layer SHALL expose typed loader functions `getCities(locale, filter?)`, `getCity(slug, locale)`, `getCoverageCity(slug, locale)`, `getCountries(locale)`, `getCountry(slug, locale)`, `getVehicles(locale)`, `getVehicle(slug, locale)`, `getServices(locale)`, `getService(slug, locale)`, `getAirports()`, `getCityAirports(citySlug)`, `getCityVehicles(citySlug, locale)`, `getRelatedCities(citySlug, locale)`, `getCityAlias(slug)`, `getArticles(locale)`, and `getArticle(slug, locale)` that return validated typed objects. Single-entry loaders SHALL return `null` or `undefined` when the slug is not found rather than throwing.
5. THE Content_Layer SHALL combine structured fields read from the Structured_Content_Store with narrative fields read from the Narrative_Content_Store MDX files into a single typed object per entity, where the structured fields take precedence for shared keys such as `slug` and `display_name`, and narrative MDX is required only for entities whose rendering path requires long-form copy (launched Cities, Countries, Vehicles, Services, and Blog_Articles).
6. THE Content_Layer SHALL validate every Structured_Content_Store row and every MDX frontmatter block against its schema at build time and SHALL fail the build on any schema violation that affects a required field of a `launched` City, active Country, active Vehicle, active Service, or published Blog_Article.
7. THE Content_Layer SHALL be structured such that page components under `app/` and shared components under `components/` depend only on the loader function types, and the loader implementations SHALL be the only modules that import from the Supabase client or read MDX files.
8. THE Website SHALL isolate WhatsApp message construction, JSON-LD construction, and metadata construction each in a pure utility module with at least 90 percent line coverage from unit tests.
9. THE Website SHALL define the following environment variables and document each in a `.env.example` file: required `ARASYA_WHATSAPP_NUMBER`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LEAD_IP_HASH_SALT`, and `REVALIDATE_SECRET`; optional `ADMIN_NOTIFICATION_WEBHOOK_URL`, `CHAT_WIDGET_ID`, and `ANALYTICS_ID`.
10. IF any required environment variable is missing or empty at build time, THEN the build SHALL fail with a non-zero exit status and an error identifying each missing variable.
11. THE Website SHALL deploy to Vercel and SHALL expose on-demand revalidation endpoints that require a shared-secret header matching `REVALIDATE_SECRET`, SHALL accept a `slug` and `entity-type` parameter to revalidate a single entity's pages (for example, revalidating a single city in all Locales when a Supabase row changes), and SHALL respond with an unauthorized error when the secret is missing or invalid.
12. THE Content_Layer abstraction SHALL be structured such that swapping the Narrative_Content_Store from repository MDX files to a managed headless CMS (Sanity, Payload, Strapi, or Supabase-stored MDX) requires changing only the MDX loader implementation under `lib/content/narrative/*.ts`, and SHALL NOT require changes to any file under `app/` or any shared component under `components/`.

### Requirement 18: Analytics, Conversion Tracking, and Launch Readiness

**User Story:** As a growth marketer, I want analytics and conversion tracking in place from day one, so that I can measure the effectiveness of SEO and WhatsApp conversion immediately after launch.

#### Acceptance Criteria

1. WHEN a client-side navigation completes, THE Analytics_Layer SHALL record a `page_view` event with properties for `page_path`, `locale`, and `page_type` (one of `homepage`, `city_page`, `country_page`, `vehicle_page`, `airport_transfer_page`, `service_page`, `blog_index`, `blog_article`, `booking_page`, `static_page`), excluding any personally identifiable information from event properties.
2. WHEN a Visitor interacts with a WhatsApp CTA, THE Analytics_Layer SHALL record a `whatsapp_click` event within 500 milliseconds with properties for `page_path`, `page_type`, `subject_slug` (or null), and `locale`.
3. WHEN a Booking_Form submission is accepted and successfully written to the Lead_Store (or accepted by the server when no Lead_Store is configured), THE Analytics_Layer SHALL record a `booking_form_submit` event with properties for `pickup_city`, `preferred_vehicle`, `trip_type`, and `locale`, and SHALL NOT include the Visitor's name, WhatsApp number, notes, pickup location, or destination.
4. IF Booking_Form validation rejects one or more fields, THEN THE Analytics_Layer SHALL record one `booking_form_error` event per offending field with properties `field_name` and `locale`, and SHALL NOT include the rejected input value.
5. WHILE user consent for non-essential analytics has not been explicitly granted, THE Website SHALL NOT load or execute analytics scripts beyond those strictly required for core functionality, and SHALL treat an inbound request carrying a `DoNotTrack: 1` header as an explicit denial of consent for the current session.
6. WHEN a Visitor makes a consent decision via the Locale-aware cookie consent banner, THE Website SHALL persist that decision for at least 180 days, SHALL provide a user-accessible control to revoke or change the decision, and SHALL load non-essential analytics scripts only after an explicit acceptance is recorded.
7. THE Website SHALL satisfy an MVP launch checklist verified by the release owner with timestamped evidence covering: Core Web Vitals targets (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1) measured on the homepage and at least one City_Page, one Country_Page, and one Vehicle_Page; JSON-LD validated with zero errors via Google Rich Results Test; confirmed `sitemap.xml` submission with successful processing status in Google Search Console; reachable and syntactically valid `robots.txt`; hreflang validated on at least one City_Page and one Country_Page; functional WhatsApp CTA on mobile and desktop; end-to-end Booking_Form submission confirmed by a Lead_Store write; each of the analytics events defined in criteria 1 through 4 observed firing with all required properties; anti-fraud notice displayed on the booking page; and zero occurrences of any Forbidden_Phrase across all Website pages.
8. BEFORE launch, THE Website SHALL pass an automated accessibility audit configured to WCAG 2.1 Level AA with zero `critical` or `serious` severity violations on the homepage, one City_Page, one Country_Page, one Vehicle_Page, and the booking page.

### Requirement 19: Privacy, PII Handling, and Security

**User Story:** As a Visitor sharing my name and WhatsApp number, I want minimal data collection, secure handling, and clear policies, so that I trust Arasya Rentcar with my information.

#### Acceptance Criteria

1. THE Booking_Form SHALL collect only the fields enumerated in Requirement 10 criterion 1, and the Website SHALL NOT expose any input field, file upload, or optional flow that collects national ID, KTP, SIM, driver license, passport, or payment card or bank-transfer data at any point in the MVP.
2. THE Website SHALL publish a privacy policy page that states what data is collected via the Booking_Form, how it is used to respond to booking inquiries, a retention period of at most 180 days, the channel by which a Visitor may request deletion, and the named third parties (Supabase, notification webhook recipient, analytics provider) that receive the data.
3. THE Website SHALL serve all traffic over HTTPS, SHALL redirect HTTP requests to the HTTPS equivalent with HTTP 301, and SHALL set a `Strict-Transport-Security` header with `max-age` of at least 15552000 seconds and `includeSubDomains`.
4. THE Website SHALL set `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy` response headers with values that deny unused browser features by default.
5. THE Route Handler accepting Booking_Form submissions SHALL validate the request `Origin` or `Referer` against the configured site origin, SHALL reject submissions from mismatched origins with an HTTP 403 response, and SHALL NOT persist rejected submissions to the Lead_Store.
6. THE Website SHALL store the official Admin WhatsApp number, Supabase URL, Supabase_Anon_Key, Supabase_Service_Role_Key, `LEAD_IP_HASH_SALT`, webhook URLs, and analytics IDs only in environment variables, SHALL NOT commit any of these values to source control, and SHALL NOT commit any file containing these values unencrypted.
7. IF the submitted WhatsApp number matches a configurable blocklist of prefixes or regex patterns indicating non-mobile or spam usage, THEN the Route Handler SHALL reject the submission with a generic validation error response, SHALL NOT persist the submission, and SHALL log the event server-side with the number redacted to show only the first 4 and last 2 digits.
8. THE Website SHALL NOT log full Booking_Form payloads in the browser console and SHALL NOT transmit them to client-side error trackers; client-side error reporting SHALL be limited to error type, stack trace, and a stable error identifier.

### Requirement 20: Brand Boundary Enforcement

**User Story:** As a brand owner, I want automated enforcement that no page of the Website implies self-drive or "lepas kunci", so that the chauffeur-only positioning is preserved as the site scales.

#### Acceptance Criteria

1. THE Website SHALL include a build-time lint check that performs case-insensitive, diacritic-insensitive whole-phrase matching across all rendered page HTML output, all Content_Layer entry copy fields, and all user-facing localized string tables in every supported Locale for every phrase in the Forbidden_Phrases set.
2. IF one or more Forbidden_Phrases are detected in any scanned source during the build-time lint check, THEN the build SHALL terminate with a non-zero exit status and SHALL emit an error report listing, for each match, the source file path, the Locale, the matched phrase, and the line number, without producing a deployable build artifact.
3. THE Content_Layer schema SHALL require each City, Country, Vehicle, Service, and Blog_Article entry to declare a `chauffeurOnly` marker with the boolean value `true`, and IF an entry omits the marker, sets it to `false`, or sets it to any non-boolean value, THEN Content_Layer schema validation SHALL reject the entry with a validation error identifying the entry slug and the marker violation.
4. THE Website repository SHALL include a Chauffeur_Only_Policy document in both the repository README and a dedicated contributor guide, where each document states the chauffeur-only positioning, enumerates the Forbidden_Phrases set, and describes the enforcement checks defined in criteria 1, 2, 3, and 5.
5. WHEN a new or modified Content_Layer entry is submitted for acceptance, THE Content_Layer validation SHALL execute the forbidden-phrase scan defined in criterion 1 against every copy field of the entry in every declared Locale, AND IF any Forbidden_Phrase is detected or the `chauffeurOnly` marker is not `true`, THEN Content_Layer validation SHALL reject the entry with an error identifying the field, Locale, and violation.

### Requirement 21: Supabase Platform, Schema Migrations, and Operations

**User Story:** As a developer and Admin, I want the Supabase project, its schema, and its operational policies to be managed as code and monitored, so that the database is reproducible, secure, and recoverable.

#### Acceptance Criteria

1. THE Website repository SHALL include a `supabase/migrations/` directory containing versioned SQL migration files managed by the Supabase CLI, and the `leads` table defined in Requirement 12 criterion 2 SHALL be created and evolved exclusively through these migration files.
2. THE Supabase migrations SHALL define indexes on `leads (created_at desc)`, `leads (pickup_city)`, `leads (trip_type)`, and `leads (status)` to support the Admin query patterns for the latest leads, leads by city, leads by trip type, and leads by status.
3. THE Supabase migrations SHALL define a `lead_status` check constraint restricting the `leads.status` column to the value set `{'new', 'contacted', 'confirmed', 'completed', 'cancelled', 'spam'}`.
4. THE Supabase migrations SHALL enable Row Level Security on every table that is queryable via the Supabase_Anon_Key, and SHALL define an explicit deny-all default policy on the `leads` table for the anon role as described in Requirement 12 criterion 3.
5. THE Website build pipeline SHALL execute a Supabase migration verification step that fails the deployment if the migration files in the repository diverge from the schema of the target Supabase_Project, and SHALL produce a diff report identifying the divergence.
6. THE Supabase_Project SHALL have automated daily backups enabled with a retention period of at least 7 days, and the retention setting SHALL be documented in the repository operations guide.
7. THE Website SHALL expose a single server-side Supabase client factory that reads `NEXT_PUBLIC_SUPABASE_URL` and selects between the Supabase_Anon_Key (for client-scoped and read-only server uses) and the Supabase_Service_Role_Key (for lead writes and Admin reads), and no other module SHALL instantiate a Supabase client directly.
8. IF the Supabase_Service_Role_Key is ever referenced from a file under `app/`, `components/`, or any module that is transitively imported by a Client Component, THEN the build SHALL fail with a non-zero exit status and an error identifying the offending import path.
9. THE Website SHALL target Supabase database read latency of at most 200 milliseconds at the 95th percentile for the server-side `leads` insert and for any `leads` admin read query, measured from the Vercel deployment region.
10. THE Supabase_Project SHALL be provisioned in a region whose latency to the primary Vercel deployment region is at most 100 milliseconds round-trip, and the chosen region SHALL be documented in the repository operations guide.
11. WHEN a `leads` row's `status` transitions to `spam` or `cancelled`, THE Supabase_Project SHALL retain the row for at most 180 days from `created_at` as required by Requirement 19 criterion 2, and a scheduled Supabase function or external scheduled job SHALL purge rows exceeding the retention window.
12. THE Website repository SHALL include a typed Supabase Database type definition generated from the Supabase schema, and the Lead_Store Route Handler SHALL use this type to validate inserts and selects at compile time.

13. THE Supabase migrations SHALL create the Structured_Content_Store tables required by Requirement 5, including `cities`, `city_translations`, `countries`, `country_translations`, `vehicles`, `vehicle_translations`, `services`, `service_translations`, `airports`, `city_vehicles`, `city_airports`, `city_related`, and `city_aliases`, with primary keys, foreign-key constraints, `chauffeur_only` boolean columns where Requirement 20 applies, and `created_at`/`updated_at` timestamps.
14. THE Supabase migrations SHALL define a `cities.coverage_state` check constraint restricting the column to the value set `{'launched', 'coverable', 'inactive'}`, and SHALL define an index on `cities (coverage_state)` and `cities (coverage_state, launch_priority desc)` to support ops queries for coverage planning.
15. THE Supabase migrations SHALL enable Row Level Security on every Structured_Content_Store table, SHALL grant `SELECT` to the `anon` role only for rows where `coverage_state IN ('launched', 'coverable')` on the `cities` table and for rows where a corresponding `active` flag (or equivalent) is `true` on other tables, and SHALL grant `INSERT`, `UPDATE`, and `DELETE` only to the `service_role` and to authenticated Admin users explicitly assigned via a Supabase custom role.
16. THE Supabase_Project SHALL enforce a unique index on `cities.slug`, on `countries.slug`, on `vehicles.slug`, on `services.slug`, on `airports.code`, on `city_aliases.alias_slug`, and on the composite `(city_id, vehicle_id)` in `city_vehicles`, `(city_id, airport_id)` in `city_airports`, and `(city_id, related_city_id)` in `city_related` to prevent duplicate relationships.
17. IF a Supabase migration introduces a schema change that would break an existing Content_Layer loader contract or remove a column that pages depend on, THEN the Website build SHALL fail the migration verification step identified in criterion 5 with an error identifying the breaking change and the affected loader.

### Requirement 22: City Coverage States and Fallback Page

**User Story:** As a growth and ops lead scaling coverage from tens to hundreds of cities, I want cities to exist in three distinct states (launched, coverable, inactive) with appropriate page behavior for each, so that we do not 404 future customers, do not leak thin pages into the index, and can prioritize which cities to promote to full content next.

#### Acceptance Criteria

1. THE Structured_Content_Store `cities.coverage_state` column SHALL accept exactly one of the values `'launched'`, `'coverable'`, or `'inactive'`, with the default value `'coverable'` for new rows inserted without an explicit value.
2. THE `cities.allow_index` boolean column SHALL default to `false` for rows with `coverage_state = 'coverable'`, SHALL default to `true` for rows with `coverage_state = 'launched'`, and SHALL be ignored for rows with `coverage_state = 'inactive'`.
3. WHEN the Website receives a request for `/sewa-mobil/{city-slug}` (or its English equivalent) whose City entry has `coverage_state = 'launched'`, THE Website SHALL render the full City_Page template defined in Requirement 9 criterion 2 using the Narrative_Content_Store MDX for that city.
4. WHEN the Website receives a request for `/sewa-mobil/{city-slug}` (or its English equivalent) whose City entry has `coverage_state = 'coverable'`, THE Website SHALL render a Coverage_Page that renders, in the exact order listed: breadcrumb, hero with the city display name and primary WhatsApp CTA, one paragraph of generic chauffeur-only service-availability copy with the city name templated in, a Booking_Form prefilled with the city name as `pickup_city`, a list of 3 to 6 launched cities nearest to the coverable city (by `latitude`/`longitude` proximity or by `parent_region` fallback), the anti-fraud notice, and a final CTA band.
5. WHEN a Coverage_Page is rendered AND the corresponding City entry's `allow_index` is `false`, THE Website SHALL emit `<meta name="robots" content="noindex, follow">` on that page, SHALL NOT include the URL in `sitemap.xml`, and SHALL NOT emit Locale alternates pointing to that URL.
6. WHEN a Coverage_Page is rendered AND the corresponding City entry's `allow_index` is `true`, THE Website SHALL treat the page as an Indexable_Page (per Requirement 7 and Requirement 4), emit standard metadata, include it in `sitemap.xml`, and emit Locale alternates; AND the Website SHALL require that at minimum the Narrative_Content_Store MDX for the city contains at least 150 words of city-specific intro copy before `allow_index` may be set to `true`, enforced at build time (build fails if `allow_index = true` AND the word count threshold is not met).
7. WHEN the Website receives a request for `/sewa-mobil/{city-slug}` (or its English equivalent) whose City entry has `coverage_state = 'inactive'` OR has no corresponding row in the `cities` table, THE Website SHALL respond with HTTP 404, render the localized not-found page, and SHALL suggest 3 to 6 launched cities nearest to the requested slug (by string similarity and optionally by `city_aliases`).
8. WHEN a Visitor requests a URL whose slug matches an entry in the `city_aliases` table AND the alias's target City entry's `coverage_state` is not `'inactive'`, THE Website SHALL respond with HTTP 301 to the canonical city URL for the active Locale.
9. THE Website SHALL render a "Promote to launched" visibility signal exclusively for ops (not visible to Visitors), exposed as an Admin-only Supabase view that ranks `coverable` cities by accumulated `whatsapp_click` count from Analytics_Layer data (per Requirement 11 criterion 11) joined to the `launch_priority` column, so ops can decide which cities to promote next.
10. WHEN an ops user changes a City entry's `coverage_state` from `coverable` to `launched` AND the required MDX file has been committed to the repository, AND the revalidation endpoint (Requirement 17 criterion 11) is called, THE Website SHALL replace the Coverage_Page with the full City_Page within 5 minutes of the revalidation call, and the sitemap SHALL reflect the newly launched URL within the same window.
11. THE Booking_Form, the floating WhatsApp CTA, and the primary WhatsApp CTA on a Coverage_Page SHALL remain fully functional and SHALL prefill the city name in WhatsApp messages, so that `coverable` cities still convert WhatsApp inquiries even while the page is noindexed.
12. IF a `launched` City entry is automatically demoted to `coverable` by the Requirement 6 criterion 6 uniqueness-failure rule, THEN THE Website SHALL set `allow_index = false` for that demotion, exclude the city from `sitemap.xml`, and emit a build warning identifying the demoted slug and the failing uniqueness threshold; AND THE Website SHALL NOT automatically delete the MDX file, so ops can repair and re-promote the city.

### Requirement 23: MDX Narrative Content Layer

**User Story:** As a content writer, I want to author long-form per-page narrative content in MDX files that are diff-reviewable, linted, and statically rendered, so that every city and country page has unique, brand-safe copy that is easy to iterate on.

#### Acceptance Criteria

1. THE Narrative_Content_Store SHALL locate MDX files under `content/cities/{locale}/{slug}.mdx`, `content/countries/{locale}/{slug}.mdx`, `content/vehicles/{locale}/{slug}.mdx`, `content/services/{locale}/{slug}.mdx`, and `content/articles/{locale}/{slug}.mdx`, where `{locale}` is one of the supported Locale values and `{slug}` matches the slug format defined in Requirement 3 criterion 4.
2. EVERY MDX file SHALL include a frontmatter block with required keys `slug`, `locale`, `seoTitle`, `seoDescription`, `heroHeadline`, `heroSubheadline`, `chauffeurOnly` (must equal `true`), and `updatedAt` (ISO 8601 date), plus entity-specific required keys as defined in Requirement 5 criterion 3 for cities and equivalent specifications for countries, vehicles, services, and articles.
3. THE Narrative_Content_Store SHALL restrict the set of MDX components available for authoring to a published allowlist (including at minimum `<Callout>`, `<FAQ>`, `<Landmark>`, `<TripIdea>`, `<Tip>`, `<Testimonial>`, `<InternalLink>`, `<VehicleCard>`), and the build SHALL fail if an MDX file references a component outside the allowlist.
4. WHEN the Website build runs, THE Website SHALL compile every MDX file to a validated typed output, extract word counts per named body section, and expose the compiled output to the Content_Layer loader functions; AND IF any MDX file fails frontmatter validation or body-section word-count thresholds defined in Requirement 5 criterion 3, THEN the build SHALL emit an error identifying the file path and the failing field, AND the entity SHALL be treated per Requirement 6 criterion 6 (for `launched` Cities: demoted to `coverable`; for Countries/Vehicles/Services: excluded from generation with a warning).
5. THE Narrative_Content_Store MDX files SHALL be scanned by the Requirement 20 brand-boundary lint check in addition to all other user-facing strings, and SHALL be subject to the uniqueness thresholds defined in Requirement 6.
6. THE Narrative_Content_Store SHALL NOT execute arbitrary JavaScript or remote imports inside MDX bodies; authoring is limited to the allowlisted components in criterion 3 and to standard Markdown constructs.
7. IF a City's `coverage_state` is `launched` AND the corresponding MDX file is missing for any configured Locale, THEN the Website build SHALL (a) automatically demote the City entry to `coverable` for that Locale only (per Requirement 6 criterion 6) and (b) emit a build warning identifying the City slug and the missing Locale MDX file.
8. IF a Coverage_Page City has an optional MDX file present (city is `coverable` with partial MDX), THEN the Coverage_Page SHALL append the provided MDX sections (intro, landmarks, tourism highlights, tips) between the hero and the Booking_Form, and the `allow_index = true` gate from Requirement 22 criterion 6 applies against the actual rendered word count.
9. THE Website build pipeline SHALL cache compiled MDX output between builds keyed by content hash, and SHALL recompile only files whose hash has changed to keep build times manageable at hundreds of city MDX files.

### Requirement 24: Content Editing Workflow and Admin Access

**User Story:** As an ops user and content writer, I want clear workflows for editing structured content (Supabase) and narrative content (MDX), including who can edit what and how changes propagate to live pages, so that we can scale coverage without a custom admin UI.

#### Acceptance Criteria

1. WHERE Supabase Studio is used as the structured-content admin UI in the MVP, THE Supabase_Project SHALL configure an `admin` role (or equivalent Supabase authenticated role) that is permitted to `INSERT`, `UPDATE`, and `DELETE` rows on the Structured_Content_Store tables listed in Requirement 21 criterion 13, and SHALL NOT grant these permissions to the `anon` role or to public API keys.
2. WHEN an ops user creates or updates a row in the Structured_Content_Store that maps to a page (for example, a `cities` row), THE Supabase_Project SHALL invoke a database trigger or scheduled job that calls the Website's on-demand revalidation endpoint (Requirement 17 criterion 11) with the affected `entity-type` and `slug`, using the `REVALIDATE_SECRET` stored in Supabase secrets.
3. IF the revalidation call fails (non-2xx response, timeout, or missing secret), THEN the Supabase_Project SHALL log the failure and SHALL enqueue a retry with exponential backoff up to 3 attempts within a 15-minute window, and the row update SHALL NOT be rolled back.
4. WHEN a content writer submits a pull request that adds, modifies, or deletes any MDX file under `content/`, THE continuous integration pipeline SHALL run the Requirement 20 forbidden-phrase lint, the Requirement 6 uniqueness threshold checks, the Requirement 23 frontmatter validation, and the Requirement 1 criterion 3 chauffeur-only phrase presence check, and SHALL block the merge if any check fails.
5. THE Website SHALL NOT expose a public-facing admin panel, admin login page, or admin route in the MVP; structured-content edits SHALL be performed exclusively through Supabase Studio (gated by Supabase auth), and narrative-content edits SHALL be performed exclusively through repository pull requests.
6. THE repository SHALL include an operations guide under `docs/ops/content-editing.md` that documents, in both English and Bahasa Indonesia: how to create a new coverable city in Supabase Studio, how to promote a coverable city to launched, how to author a new city MDX file, how to trigger on-demand revalidation, and the content-editing responsibility matrix (who can edit what).
7. IF an ops user attempts to set a `cities` row's `coverage_state` to `launched` via Supabase Studio AND the corresponding MDX file is not present in the repository for at least one Locale, THEN the subsequent build OR revalidation attempt SHALL NOT render a full City_Page for that row (per Requirement 23 criterion 7) AND SHALL emit a warning to the ops guide's documented log channel.
