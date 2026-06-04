import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Breadcrumb from "@/components/seo/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import type {
  CityWithNarrative,
  Locale,
  VehicleWithNarrative,
} from "@/lib/content";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { citySlugPath, staticPath } from "@/lib/i18n/slugMap";
import { absoluteUrl } from "@/lib/seo/canonical";
import {
  faqJsonLd,
  localBusinessJsonLd,
  vehicleProductJsonLd,
} from "@/lib/seo/jsonld";

/**
 * CityVehicle_Page template (R5.9, design §9 — hybrid variant).
 *
 * Server Component — rendered under
 * `app/[locale]/sewa-mobil/[city]/[vehicle]/page.tsx` (and the English
 * mirror `/en/car-rental/[city]/[vehicle]`) for the fan-out combinations
 * where a launched City's `city_vehicles` join lists the Vehicle and
 * the Vehicle itself is active. The R5.9 gate runs in the route handler
 * (see `lib/routing/cityVehicleRouteHelper.ts`), so this template can
 * assume both a launched city and an active vehicle.
 *
 * Design §9 treats the combined city-vehicle page as a hybrid variant
 * composed of the city-scoped and vehicle-scoped sections that best
 * serve a visitor who has already narrowed to "vehicle X in city Y".
 * The nine sections below are ordered so the visitor lands on the
 * headline → value prop → specs → local context → cross-sell → CTA in
 * the shortest meaningful flow.
 *
 * Section order:
 *
 *   1. breadcrumb      — Home › {city} › {vehicle}
 *   2. hero            — "Sewa {vehicle} dengan Supir di {city}" + CTAs
 *   3. chauffeurOnlyVp — short R1.6 value-prop paragraph
 *   4. vehicleSpecs    — compact specs + use cases (subset of VehicleTemplate §3)
 *   5. cityHighlights  — 3-6 `popularDestinations` from the city narrative
 *   6. airportCta      — city-level airport-transfer callout (when city has airports)
 *   7. relatedVehicles — 2-6 other vehicles served in the same city
 *   8. relatedCities   — 3-6 related cities, pointing at the same vehicle when available
 *   9. ctaBand         — standard final CTA (matches CityTemplate)
 *
 * JSON-LD (R8.1, R8.3, R8.6):
 *   - `LocalBusiness` scoped to the city.
 *   - `Product` scoped to the vehicle, with `sourcePath` pointing at the
 *     combined URL so the `@id` is unique across the vehicle's listing
 *     and combined pages.
 *   - `FAQPage` merging up to 3 city FAQs (only when city narrative has
 *     ≥3 FAQs — `faqJsonLd` returns `null` otherwise).
 *   - `BreadcrumbList` is already emitted by `<Breadcrumb>` (R8.7 forbids
 *     duplicating it here).
 *
 * Accessibility (R9.10, R15.1):
 *   - Exactly one `<h1>` (the hero headline).
 *   - Every `<section>` carries `aria-labelledby` pointing at its own `<h2>`.
 *   - Capacity badges and links expose accessible names via their visible
 *     text — no extra `aria-label` is added where the text is already
 *     descriptive.
 *
 * Pure of data access (R17.7): the template only reads props prepared by
 * the route handler. It never touches Supabase, the MDX loader, or the
 * dictionary loader directly.
 */

export interface CityVehicleTemplateProps {
  readonly locale: Locale;
  /** Launched city (route handler has already asserted `coverageState === "launched"`). */
  readonly city: CityWithNarrative;
  /** Active vehicle (route handler has already asserted `active === true`). */
  readonly vehicle: VehicleWithNarrative;
  readonly dict: Pick<Dictionary, "cta" | "common" | "meta">;
}

/**
 * Placeholder WhatsApp target used by the hero and ctaBand secondary
 * buttons. The real `ARASYA_WHATSAPP_NUMBER` wires in via the
 * WhatsApp_Handler helper in a later phase (design §20); the placeholder
 * keeps the template renderable today without masquerading as a live
 * number. Matches the placeholder used by `CityTemplate` and
 * `VehicleTemplate` so the three templates migrate in lockstep.
 *
 * TODO(phase 13): replace with the shared WhatsApp_Handler invocation.
 */
const WHATSAPP_PLACEHOLDER_HREF = "https://wa.me/628123456789";

/**
 * Placeholder E.164 telephone passed to `localBusinessJsonLd` (R8.1).
 * Same rationale as `CityTemplate.LOCAL_BUSINESS_TELEPHONE_PLACEHOLDER`.
 *
 * TODO(phase 13): read from `ARASYA_WHATSAPP_NUMBER` at request time.
 */
const LOCAL_BUSINESS_TELEPHONE_PLACEHOLDER = "+628123456789";

// Caps for each cross-sell section. R9.2 (city) / R9.4 (vehicle) bounds
// apply to the full per-entity pages; the combined page uses tighter
// caps so a visitor already narrowed to "vehicle X in city Y" is not
// flooded with every available cross-link.
const CITY_HIGHLIGHTS_MAX = 6;
const RELATED_VEHICLES_MAX = 6;
const RELATED_CITIES_MAX = 6;
const USE_CASES_MAX = 6;
const FAQ_MAX_IN_JSONLD = 3;

/**
 * Build the placeholder hero-image URL served by `/api/og` (task 6.11).
 * Mirrors `VehicleTemplate.buildVehicleHeroImageUrl` but with a combined
 * title so the social-preview image reflects the "vehicle in city"
 * framing. Also used as the `vehicleProductJsonLd.imageUrl` so the
 * structured data references the same asset the visitor would see when
 * the page is shared.
 *
 * TODO(R16.4): swap for a per-vehicle photo once the structured schema
 * carries a `hero_image_url` field.
 */
function buildCityVehicleHeroImageUrl(
  citySlug: string,
  vehicleSlug: string,
  title: string,
  locale: Locale,
): string {
  const ogBase = new URL(absoluteUrl("/api/og"));
  ogBase.searchParams.set("title", title);
  ogBase.searchParams.set("subtitle", "");
  ogBase.searchParams.set("locale", locale);
  ogBase.searchParams.set("pageType", "city");
  // Include both slugs so CDN cache keys do not collide across the fan-out.
  ogBase.searchParams.set("slug", `${citySlug}-${vehicleSlug}`);
  return ogBase.toString();
}

/**
 * Render the combined City+Vehicle page.
 */
export default function CityVehicleTemplate({
  locale,
  city,
  vehicle,
  dict,
}: CityVehicleTemplateProps): React.JSX.Element {
  const isId = locale === "id";

  // Locale-scoped labels. Not part of the dictionary surface the template
  // accepts. Consistent with `CityTemplate` and `VehicleTemplate` so the
  // three templates can later migrate to a shared `city.*` / `vehicle.*`
  // dictionary namespace without visual drift.
  const homeLabel = isId ? "Beranda" : "Home";
  const homePath = isId ? "/" : "/en";
  const seatsLabel = isId ? "kursi" : "seats";
  const luggageLabel = isId ? "bagasi" : "bags";
  const valuePropHeading = isId
    ? "Hanya layanan dengan supir"
    : "Chauffeur-only service";
  const specsHeading = isId ? "Spesifikasi kendaraan" : "Vehicle specifications";
  const transmissionLabel = isId ? "Transmisi" : "Transmission";
  const transmissionValue = isId ? "Otomatis" : "Automatic";
  const useCasesLabel = isId ? "Cocok untuk" : "Good for";
  const highlightsHeading = isId
    ? `Jelajahi dari ${city.displayName}`
    : `Explore from ${city.displayName}`;
  const airportHeading = isId ? "Antar-jemput bandara" : "Airport transfer";
  const relatedVehiclesHeading = isId
    ? `Armada lain di ${city.displayName}`
    : `Other vehicles in ${city.displayName}`;
  const relatedCitiesHeading = isId
    ? `Kota terkait untuk ${vehicle.displayName}`
    : `Related cities for ${vehicle.displayName}`;
  const ctaBandHeading = isId ? "Siap memesan?" : "Ready to book?";

  // Centralized paths. The self-path is used for JSON-LD `@id` (via
  // `vehicleProductJsonLd.sourcePath`) and for the `<Breadcrumb>`
  // `currentPath`, so it MUST match exactly — cheaper to compute once
  // than to risk drift.
  const citySelfPath = citySlugPath(locale, city.slug);
  const combinedSelfPath = citySlugPath(locale, city.slug, {
    subpath: vehicle.slug,
  });

  // Booking link is pre-filled with both slugs so the Booking_Form
  // (task 8.3) can populate pickup-city and vehicle fields from the URL.
  // Slugs are encoded defensively even though R3.4 guarantees kebab-case
  // ASCII — the booking form would reject malformed values anyway.
  const bookingHref =
    `${staticPath(locale, "booking")}` +
    `?city=${encodeURIComponent(city.slug)}` +
    `&vehicle=${encodeURIComponent(vehicle.slug)}`;

  // --- Hero headline / subheadline ------------------------------------------
  // Composed from templates; not read from dictionary/narrative because
  // the combined "vehicle X in city Y" phrase only exists on this page
  // shape and is short enough that moving it to a dictionary entry
  // would add indirection without reducing copy.
  const heroHeadline = isId
    ? `Sewa ${vehicle.displayName} dengan Supir di ${city.displayName}`
    : `${vehicle.displayName} Chauffeur Rental in ${city.displayName}`;

  // Subheadline combines the vehicle narrative's hero-sub with the city
  // narrative's hero-sub when both are present. When only one is present
  // it's used verbatim; when neither is present we fall back to a short
  // one-liner so the hero still reads as a complete block.
  const vehicleSub = vehicle.narrative?.frontmatter.heroSubheadline ?? "";
  const citySub = city.narrative?.frontmatter.heroSubheadline ?? "";
  let heroSubheadline: string;
  if (vehicleSub.length > 0 && citySub.length > 0) {
    heroSubheadline = `${vehicleSub} ${citySub}`;
  } else if (vehicleSub.length > 0) {
    heroSubheadline = vehicleSub;
  } else if (citySub.length > 0) {
    heroSubheadline = citySub;
  } else {
    heroSubheadline = isId
      ? `Perjalanan nyaman di ${city.displayName} bersama ${vehicle.displayName} dan supir profesional Arasya.`
      : `Comfortable travel in ${city.displayName} with a ${vehicle.displayName} and a professional chauffeur from Arasya.`;
  }

  // --- Chauffeur-only value proposition (R1.6) ------------------------------
  // Interpolates the dictionary phrase so the Phase 12 forbidden-phrase
  // lint sees the exact string it checks for, and names both the vehicle
  // and the city so the paragraph is page-unique for R6 uniqueness.
  const chauffeurPhrase = dict.common.chauffeurOnlyPhrase;
  const valuePropParagraph = isId
    ? `Kami hanya melayani ${chauffeurPhrase} di ${city.displayName}. Paket ${vehicle.displayName} dilengkapi sopir berseragam yang memahami rute kota dan etika pelayanan, sehingga Anda cukup menikmati perjalanan.`
    : `We only offer ${chauffeurPhrase} in ${city.displayName}. Every ${vehicle.displayName} booking is operated by a uniformed driver who knows the local routes and upholds professional etiquette so you can focus on the trip.`;

  // --- Vehicle specs / use cases --------------------------------------------
  const useCases =
    vehicle.narrative?.frontmatter.useCases.slice(0, USE_CASES_MAX) ?? [];

  // --- City highlights ------------------------------------------------------
  const destinations = city.narrative
    ? city.narrative.frontmatter.popularDestinations.slice(
        0,
        CITY_HIGHLIGHTS_MAX,
      )
    : [];

  // --- Airport callout ------------------------------------------------------
  // Link target is the city-level airport-transfer page, not a
  // city+vehicle+airport combo (that sub-route does not exist). The
  // section only renders when the city actually serves an airport.
  const primaryAirport = city.airports[0] ?? null;
  const airportPath = citySlugPath(locale, city.slug, {
    subpath: "airport-transfer",
  });

  // --- Related vehicles -----------------------------------------------------
  // Filter the city's `availableVehicles` to exclude the current vehicle,
  // cap at RELATED_VEHICLES_MAX. Each link points at the combined page
  // for the same city with a different vehicle so the visitor stays
  // inside the "pick a vehicle for this city" loop.
  const relatedVehicles = city.availableVehicles
    .filter((v) => v.slug !== vehicle.slug)
    .slice(0, RELATED_VEHICLES_MAX);

  // --- Related cities -------------------------------------------------------
  // For each related city, prefer a link to the same-vehicle combined
  // page when that city also serves the current vehicle. Otherwise
  // fall back to the plain city landing — we don't have per-city
  // `availableVehicles` on the `CitySummary` shape used for
  // `relatedCities`, so the "also serves" check degrades safely to the
  // city URL for any related city whose vehicle catalog isn't exposed
  // here.
  //
  // TODO(R5.9): the `CityWithNarrative.relatedCities` projection is a
  // `CitySummary[]` (no `availableVehicles`), so today every related
  // link falls back to the city landing. When the Content_Layer is
  // extended to surface per-related-city vehicle joins, flip this to
  // the vehicle-scoped URL for cities that actually serve the vehicle.
  const relatedCities = city.relatedCities.slice(0, RELATED_CITIES_MAX);

  // --- Shared hero image + product description ------------------------------
  const heroImageUrl = buildCityVehicleHeroImageUrl(
    city.slug,
    vehicle.slug,
    heroHeadline,
    locale,
  );
  const productDescription =
    vehicle.narrative?.frontmatter.seoDescription ??
    (isId
      ? `${vehicle.displayName} dengan sopir profesional di ${city.displayName}. ${vehicle.seats} kursi, ${vehicle.luggage} bagasi.`
      : `${vehicle.displayName} with a professional chauffeur in ${city.displayName}. ${vehicle.seats} seats, ${vehicle.luggage} bags.`);

  // --- JSON-LD blocks -------------------------------------------------------
  // `LocalBusiness` scoped to the city (R8.1). City narrative supplies
  // the price range when present; otherwise the key is omitted per the
  // builder's omission convention.
  const localBusinessBlock = localBusinessJsonLd({
    citySlug: city.slug,
    cityName: city.displayName,
    telephone: LOCAL_BUSINESS_TELEPHONE_PLACEHOLDER,
    priceRangeIdr:
      city.pricingHint === null
        ? undefined
        : { from: city.pricingHint.fromIdr, to: city.pricingHint.toIdr },
    areaServed: [city.displayName, city.parentRegion ?? ""].filter(
      (v): v is string => v.length > 0,
    ),
    locale,
  });

  // `Product` scoped to the vehicle but sourced from the combined URL
  // so its `@id` (built as `<absoluteUrl(sourcePath)>#product`) is
  // distinct from the Vehicle_Page's Product block (R8.7 — distinct
  // subjects on distinct URLs).
  const productBlock = vehicleProductJsonLd({
    vehicleSlug: vehicle.slug,
    vehicleName: vehicle.displayName,
    description: productDescription,
    imageUrl: heroImageUrl,
    seats: vehicle.seats,
    luggage: vehicle.luggage,
    sourcePath: combinedSelfPath,
    locale,
  });

  // Merged FAQ block: take up to 3 city FAQs (vehicle narrative FAQs
  // are optional per `vehicleFm` and we keep the page scoped to city
  // context for the FAQ block to avoid mixing question sources). The
  // builder returns `null` when fewer than 3 entries are supplied, so
  // a city without narrative FAQs simply won't emit the block.
  const cityFaqs = city.narrative?.frontmatter.faqs ?? [];
  const faqBlock = faqJsonLd({
    faqs: cityFaqs.slice(0, FAQ_MAX_IN_JSONLD),
    sourcePath: combinedSelfPath,
  });

  return (
    <div className="flex flex-col">
      {/*
       * 1. Breadcrumb (R8.4 + R9.10). Trail: Home › City › {current
       *    vehicle}. The `<Breadcrumb>` component emits both the visible
       *    `<nav>` and the matching `BreadcrumbList` JSON-LD so the two
       *    can't drift.
       */}
      <div className="container mx-auto px-4 pt-6">
        <Breadcrumb
          items={[
            { name: homeLabel, path: homePath },
            { name: city.displayName, path: citySelfPath },
          ]}
          currentLabel={vehicle.displayName}
          currentPath={combinedSelfPath}
        />
      </div>

      {/*
       * 2. Hero. Composed headline ("Sewa {vehicle} dengan Supir di
       *    {city}" / "{vehicle} Chauffeur Rental in {city}"), subheadline
       *    merged from vehicle + city narratives, primary booking CTA
       *    pre-filled with both slugs, secondary WhatsApp. Capacity
       *    badges mirror the VehicleTemplate hero so a visitor arriving
       *    via a city link still sees the seats/luggage signal.
       */}
      <section
        aria-labelledby="city-vehicle-hero-heading"
        className="container mx-auto px-4 py-16 md:py-24"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h1
            id="city-vehicle-hero-heading"
            className="text-4xl font-bold tracking-tight text-[var(--foreground)] md:text-5xl"
          >
            {heroHeadline}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[var(--muted-foreground)] md:text-xl">
            {heroSubheadline}
          </p>
          <div
            className="mt-6 flex flex-wrap justify-center gap-2"
            aria-label={isId ? "Kapasitas kendaraan" : "Vehicle capacity"}
          >
            <Badge variant="secondary" className="text-sm">
              {vehicle.seats} {seatsLabel}
            </Badge>
            <Badge variant="secondary" className="text-sm">
              {vehicle.luggage} {luggageLabel}
            </Badge>
          </div>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={bookingHref}>{dict.cta.primaryBooking}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a
                href={WHATSAPP_PLACEHOLDER_HREF}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={dict.meta.whatsappAriaLabel}
              >
                {dict.cta.secondaryWhatsapp}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/*
       * 3. Chauffeur-only value proposition (R1.6). Interpolates the
       *    dictionary phrase and names both the vehicle and the city so
       *    the paragraph is page-unique for R6 uniqueness checks. Copy
       *    is deliberately short — the full value prop lives on the
       *    per-entity city and vehicle pages.
       */}
      <section
        aria-labelledby="city-vehicle-valueprop-heading"
        className="container mx-auto px-4 py-12"
      >
        <div className="mx-auto max-w-3xl">
          <h2
            id="city-vehicle-valueprop-heading"
            className="text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-3xl"
          >
            {valuePropHeading}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--muted-foreground)] md:text-lg">
            {valuePropParagraph}
          </p>
        </div>
      </section>

      {/*
       * 4. Vehicle specs — compact version of VehicleTemplate §3. Drops
       *    the full DL grid in favour of a single card so the combined
       *    page doesn't duplicate the primary Vehicle_Page spec block.
       *    Use-cases are rendered as badges when the vehicle narrative
       *    supplies them.
       */}
      <section
        aria-labelledby="city-vehicle-specs-heading"
        className="container mx-auto px-4 py-12"
      >
        <div className="mx-auto max-w-3xl">
          <h2
            id="city-vehicle-specs-heading"
            className="text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-3xl"
          >
            {specsHeading}
          </h2>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border p-4">
              <dt className="text-sm text-[var(--muted-foreground)]">
                {seatsLabel}
              </dt>
              <dd className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                {vehicle.seats}
              </dd>
            </div>
            <div className="rounded-xl border p-4">
              <dt className="text-sm text-[var(--muted-foreground)]">
                {luggageLabel}
              </dt>
              <dd className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                {vehicle.luggage}
              </dd>
            </div>
            <div className="rounded-xl border p-4">
              <dt className="text-sm text-[var(--muted-foreground)]">
                {transmissionLabel}
              </dt>
              <dd className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                {transmissionValue}
              </dd>
            </div>
          </dl>
          {useCases.length === 0 ? null : (
            <div className="mt-6">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {useCasesLabel}
              </p>
              <ul
                className="mt-2 flex flex-wrap gap-2"
                aria-label={useCasesLabel}
              >
                {useCases.map((useCase) => (
                  <li key={useCase}>
                    <Badge variant="outline" className="text-xs">
                      {useCase}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/*
       * 5. City highlights. `popularDestinations` is the city narrative's
       *    3-50 string list; we cap at 6 for the combined page so the
       *    section stays scannable. Omitted entirely when the city has
       *    no narrative (auto-demoted launched cities per R23.7 are
       *    filtered out upstream, but a safety check here keeps the
       *    template defensive).
       */}
      {destinations.length === 0 ? null : (
        <section
          aria-labelledby="city-vehicle-highlights-heading"
          className="container mx-auto px-4 py-12"
        >
          <div className="mx-auto max-w-3xl">
            <h2
              id="city-vehicle-highlights-heading"
              className="text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-3xl"
            >
              {highlightsHeading}
            </h2>
            <ul
              className="mt-4 flex flex-wrap gap-2"
              aria-labelledby="city-vehicle-highlights-heading"
            >
              {destinations.map((destination) => (
                <li key={destination}>
                  <Badge variant="secondary" className="text-sm">
                    {destination}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/*
       * 6. Airport-transfer callout. Links to the city-level
       *    airport-transfer page (task 7.9) — a city+vehicle+airport
       *    combined route does not exist, and adding one would multiply
       *    the fan-out without a clear SEO payoff.
       */}
      {primaryAirport === null ? null : (
        <section
          aria-labelledby="city-vehicle-airport-heading"
          className="container mx-auto px-4 py-12"
        >
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-xl border p-6 text-center sm:flex-row sm:text-left">
            <div className="flex-1">
              <h2
                id="city-vehicle-airport-heading"
                className="text-xl font-semibold tracking-tight text-[var(--foreground)]"
              >
                {airportHeading}
              </h2>
              <p className="mt-2 text-[var(--muted-foreground)]">
                {isId
                  ? `Butuh jemput dari ${primaryAirport.name} dengan ${vehicle.displayName}? Lihat layanan antar-jemput bandara ${city.displayName}.`
                  : `Need a pickup from ${primaryAirport.name} with a ${vehicle.displayName}? See the ${city.displayName} airport transfer service.`}
              </p>
            </div>
            <Button asChild>
              <Link href={airportPath}>{airportHeading}</Link>
            </Button>
          </div>
        </section>
      )}

      {/*
       * 7. Related vehicles — other armada served in the same city.
       *    Each card links to the combined page for the same city with
       *    a different vehicle so the visitor stays inside the "pick a
       *    vehicle for this city" loop. Omitted when the filter result
       *    is empty (city only has one vehicle on offer).
       */}
      {relatedVehicles.length === 0 ? null : (
        <section
          aria-labelledby="city-vehicle-related-vehicles-heading"
          className="container mx-auto px-4 py-16"
        >
          <div className="mb-8">
            <h2
              id="city-vehicle-related-vehicles-heading"
              className="text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-3xl"
            >
              {relatedVehiclesHeading}
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedVehicles.map((other) => (
              <Link
                key={other.slug}
                href={citySlugPath(locale, city.slug, { subpath: other.slug })}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                <Card className="h-full transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]">
                  <CardHeader>
                    <CardTitle className="text-xl">
                      {other.displayName}
                    </CardTitle>
                    <CardDescription>
                      {other.seats} {seatsLabel} · {other.luggage}{" "}
                      {luggageLabel}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/*
       * 8. Related cities — 3-6 entries from the city's `relatedCities`
       *    projection. Each link falls back to the related-city landing
       *    because the `CitySummary` shape used for `relatedCities`
       *    doesn't carry `availableVehicles`; once the Content_Layer
       *    exposes that join, flip the href to the vehicle-scoped URL
       *    when the related city also serves the current vehicle.
       */}
      {relatedCities.length === 0 ? null : (
        <section
          aria-labelledby="city-vehicle-related-cities-heading"
          className="container mx-auto px-4 py-16"
        >
          <div className="mb-8">
            <h2
              id="city-vehicle-related-cities-heading"
              className="text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-3xl"
            >
              {relatedCitiesHeading}
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedCities.map((relatedCity) => (
              <Link
                key={relatedCity.slug}
                href={citySlugPath(locale, relatedCity.slug)}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                <Card className="h-full transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]">
                  <CardHeader>
                    <CardTitle className="text-xl">
                      {relatedCity.displayName}
                    </CardTitle>
                  </CardHeader>
                  {typeof relatedCity.parentRegion === "string" &&
                  relatedCity.parentRegion.length > 0 ? (
                    <CardContent>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {relatedCity.parentRegion}
                      </p>
                    </CardContent>
                  ) : null}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/*
       * 9. Final CTA band. Mirrors CityTemplate's ctaBand so every
       *    programmatic page terminates on the same action pair —
       *    primary booking link, secondary WhatsApp placeholder (R9.9,
       *    R11.7, R11.9).
       */}
      <section
        aria-labelledby="city-vehicle-cta-heading"
        className="bg-[var(--secondary)] py-16 text-[var(--secondary-foreground)]"
      >
        <div className="container mx-auto px-4 text-center">
          <h2
            id="city-vehicle-cta-heading"
            className="text-3xl font-bold tracking-tight"
          >
            {ctaBandHeading}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[var(--muted-foreground)]">
            {heroSubheadline}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={bookingHref}>{dict.cta.primaryBooking}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a
                href={WHATSAPP_PLACEHOLDER_HREF}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={dict.meta.whatsappAriaLabel}
              >
                {dict.cta.secondaryWhatsapp}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/*
       * JSON-LD (R8.1, R8.3, R8.6). Emitted at the end of the outer div
       * so the structured-data `<script>` tags sit after the visible
       * sections without affecting order. `BreadcrumbList` (R8.4) is
       * already owned by `<Breadcrumb>` and must not be duplicated here
       * per R8.7.
       */}
      <JsonLd blocks={[localBusinessBlock, productBlock, faqBlock]} />
    </div>
  );
}
