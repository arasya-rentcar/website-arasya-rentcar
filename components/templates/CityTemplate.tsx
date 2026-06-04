import Link from "next/link";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Breadcrumb from "@/components/seo/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import type { CityWithNarrative, Locale } from "@/lib/content";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { citySlugPath, staticPath } from "@/lib/i18n/slugMap";
import { faqJsonLd, localBusinessJsonLd } from "@/lib/seo/jsonld";

/**
 * City_Page template (R9.2, design §9).
 *
 * Server Component — renders under `app/[locale]/sewa-mobil/[city]/page.tsx`
 * (and its English mirror) for cities whose effective coverage state is
 * `launched`. The same 10-section order is asserted here so any route that
 * wraps a launched `CityWithNarrative` inherits a single canonical layout.
 *
 * Section order (R9.2 verbatim — "the exact order listed"):
 *
 *   1. breadcrumb
 *   2. hero (city-specific headline + primary CTA)
 *   3. chauffeur-only value proposition (R1.6)
 *   4. available vehicles grid (3–12, linked to combined city+vehicle pages)
 *   5. popular destinations (3–12)
 *   6. pricing hint / package highlights
 *   7. airport transfer callout
 *   8. city-specific FAQs (3–8)
 *   9. related cities (3–6)
 *  10. final CTA band
 *
 * Sections 6 and 7 are omitted entirely when the Content_Layer entry has
 * nothing to render (`pricingHint === null`, `airports.length === 0`) —
 * that matches R9.10's "omit rather than render a partial section" rule
 * and avoids an empty `<section>` wrapper in the accessibility tree.
 *
 * JSON-LD (R8.1, R8.3, R8.4): `LocalBusiness` and `FAQPage` are emitted at
 * the end of the tree via `<JsonLd>`. `BreadcrumbList` is NOT emitted here
 * because `<Breadcrumb>` already owns that block — rendering it twice
 * would violate R8.7 (one `<script>` per block).
 *
 * Accessibility (R9.10):
 *   - Exactly one `<h1>` (the hero headline).
 *   - Every `<section>` is labelled by its own `<h2>` via `aria-labelledby`.
 *   - The breadcrumb is a `<nav aria-label="Breadcrumb">` provided by the
 *     `<Breadcrumb>` component.
 */

export interface CityTemplateProps {
  readonly locale: Locale;
  readonly city: CityWithNarrative;
  readonly dict: Pick<Dictionary, "cta" | "common" | "meta">;
}

/**
 * Placeholder WhatsApp target used by the hero and CTA-band secondary
 * buttons. The real `ARASYA_WHATSAPP_NUMBER` gets wired in a later phase
 * via the WhatsApp_Handler helper (design §20); the placeholder keeps the
 * template renderable today without masquerading as a live number.
 *
 * TODO(phase 13): replace with the shared WhatsApp_Handler invocation.
 */
const WHATSAPP_PLACEHOLDER_HREF = "https://wa.me/628123456789";

/**
 * Placeholder E.164 telephone passed to `localBusinessJsonLd` (R8.1). The
 * JSON-LD builder is deterministic and does not read environment variables,
 * so the caller is responsible for supplying the real number. Until the
 * WhatsApp_Handler lands, we emit the placeholder so the structured-data
 * block stays valid JSON with a well-formed `telephone` field.
 *
 * TODO(phase 13): read from `ARASYA_WHATSAPP_NUMBER` at request time.
 */
const LOCAL_BUSINESS_TELEPHONE_PLACEHOLDER = "+628123456789";

// R9.2 caps — each section has an upper bound in the acceptance criteria
// ("3 to 12 items", "3 to 8 items", etc.). Content_Layer sources already
// enforce the lower bound at MDX-parse time (cityFm.popularDestinations
// min(3), cityFm.faqs min(3)); the caps here defend against future content
// exceeding the UI budget.
const VEHICLES_MAX = 12;
const POPULAR_DESTINATIONS_MAX = 12;
const FAQS_MAX = 8;
const RELATED_CITIES_MAX = 6;

/**
 * Render the City_Page for a launched city.
 *
 * All props are already resolved by the caller (`app/[locale]/sewa-mobil/
 * [city]/page.tsx` — task 7.6). This template never reaches into the
 * Content_Layer directly (R17.7); it is a pure projection of
 * `CityWithNarrative` + the minimum dictionary subset into HTML.
 */
export default function CityTemplate({
  locale,
  city,
  dict,
}: CityTemplateProps): React.JSX.Element {
  const isId = locale === "id";

  // Locale-scoped labels. Not part of the `Pick<Dictionary, "cta" | "common"
  // | "meta">` surface the template accepts, so inlined here. If a later
  // task adds a `city.*` namespace to the dictionary schema, these strings
  // become the natural migration target.
  const homeLabel = isId ? "Beranda" : "Home";
  const homePath = isId ? "/" : "/en";
  const vehiclesHeading = isId ? "Armada tersedia" : "Available vehicles";
  const destinationsHeading = isId ? "Destinasi populer" : "Popular destinations";
  const pricingHeading = isId ? "Kisaran harga" : "Pricing hint";
  const airportHeading = isId ? "Antar-jemput bandara" : "Airport transfer";
  const faqHeading = isId ? "Pertanyaan umum" : "Frequently asked questions";
  const relatedCitiesHeading = isId ? "Kota terkait" : "Related cities";
  const ctaBandHeading = isId ? "Siap memesan?" : "Ready to book?";
  const seatsLabel = isId ? "kursi" : "seats";
  const luggageLabel = isId ? "bagasi" : "bags";
  const valuePropHeading = isId
    ? "Hanya layanan dengan supir"
    : "Chauffeur-only service";

  // Self-path is used for JSON-LD `@id` (via localBusinessJsonLd) and for
  // the `<Breadcrumb>` `currentPath`. Centralized so the two can't drift.
  const citySelfPath = citySlugPath(locale, city.slug);

  // Booking link is pre-filled with the city slug so the Booking_Form
  // (task 10.x) can populate the pickup-city field from the URL. Slug is
  // encoded defensively even though R3.4 guarantees kebab-case ASCII.
  const bookingHref = `${staticPath(locale, "booking")}?city=${encodeURIComponent(city.slug)}`;

  // --- Narrative-derived fields (null-safe) ----------------------------------
  // `narrative` is null for launched cities auto-demoted by R23.7; we also
  // reach this template for launched cities whose MDX is present, in which
  // case all `narrative.*` fields come through `cityFm` validation and are
  // guaranteed to satisfy their min/max bounds.
  const heroHeadline = city.narrative?.frontmatter.heroHeadline ?? city.displayName;
  const heroSubheadline =
    city.narrative?.frontmatter.heroSubheadline ?? city.shortBlurb ?? "";

  const vehicles = city.availableVehicles.slice(0, VEHICLES_MAX);
  const destinations = city.narrative
    ? city.narrative.frontmatter.popularDestinations.slice(0, POPULAR_DESTINATIONS_MAX)
    : [];
  const faqs = city.narrative
    ? city.narrative.frontmatter.faqs.slice(0, FAQS_MAX)
    : [];
  const relatedCities = city.relatedCities.slice(0, RELATED_CITIES_MAX);

  // IDR price-range pretty-printer: ID locale uses dot thousands separators
  // ("300.000"), EN locale uses commas ("300,000"). En-dash separator in
  // both locales matches the jsonld builder's `formatIdrPriceRange`.
  const formatIdr = (value: number): string =>
    value.toLocaleString(isId ? "id-ID" : "en-US");
  const pricingHintText = city.pricingHint
    ? `IDR ${formatIdr(city.pricingHint.fromIdr)}\u2013${formatIdr(city.pricingHint.toIdr)}`
    : null;

  const primaryAirport = city.airports[0] ?? null;

  // Chauffeur-only value proposition paragraph (R1.6). Interpolates the
  // locale-specific phrase from `dict.common.chauffeurOnlyPhrase`
  // ("sewa mobil dengan supir" / "chauffeur car rental") which is the same
  // string the Phase 12 forbidden-phrase lint checks for.
  const chauffeurPhrase = dict.common.chauffeurOnlyPhrase;
  const valuePropParagraph = isId
    ? `Kami hanya melayani ${chauffeurPhrase} di ${city.displayName}. Setiap perjalanan dikawal sopir berseragam yang memahami rute serta etika pelayanan, sehingga Anda bisa fokus pada tujuan tanpa repot menyetir sendiri.`
    : `We only offer ${chauffeurPhrase} in ${city.displayName}. Every trip is operated by a uniformed driver who knows the routes and upholds professional etiquette, so you can focus on your destination without driving yourself.`;

  // JSON-LD blocks (emitted at end of tree). `faqJsonLd` returns null when
  // fewer than 3 FAQs are present per R8.3; `<JsonLd>` filters nulls, so we
  // hand the builder output through without a branch.
  const localBusinessBlock = localBusinessJsonLd({
    citySlug: city.slug,
    cityName: city.displayName,
    telephone: LOCAL_BUSINESS_TELEPHONE_PLACEHOLDER,
    priceRangeIdr:
      city.pricingHint === null
        ? undefined
        : { from: city.pricingHint.fromIdr, to: city.pricingHint.toIdr },
    areaServed: [city.displayName, city.parentRegion ?? ""].filter(
      (value): value is string => value.length > 0,
    ),
    locale,
  });
  const faqBlock = faqJsonLd({ faqs, sourcePath: citySelfPath });

  return (
    <div className="flex flex-col">
      {/*
       * 1. Breadcrumb (R8.4 + R9.2). The `<Breadcrumb>` component renders
       *    both the visible trail and the matching `BreadcrumbList`
       *    JSON-LD so the two cannot drift. A cities-index page does not
       *    exist yet (no listing route under Phase 7), so the trail has
       *    only the home ancestor — the current page appears as plain
       *    text with `aria-current="page"`.
       */}
      <div className="container mx-auto px-4 pt-6">
        <Breadcrumb
          items={[{ name: homeLabel, path: homePath }]}
          currentLabel={city.displayName}
          currentPath={citySelfPath}
        />
      </div>

      {/*
       * 2. Hero. Headline prefers the narrative's `heroHeadline` (R23.2)
       *    and falls back to the city display name. CTAs mirror
       *    HomeTemplate's pair so analytics tagging added in Phase 13 has
       *    a single shape to target; the primary button pre-fills the
       *    booking form's pickup city via `?city=` (task 10.x).
       */}
      <section
        aria-labelledby="city-hero-heading"
        className="container mx-auto px-4 py-16 md:py-24"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h1
            id="city-hero-heading"
            className="text-4xl font-bold tracking-tight text-[var(--foreground)] md:text-5xl"
          >
            {heroHeadline}
          </h1>
          {heroSubheadline.length === 0 ? null : (
            <p className="mt-6 text-lg leading-relaxed text-[var(--muted-foreground)] md:text-xl">
              {heroSubheadline}
            </p>
          )}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={bookingHref}>{dict.cta.primaryBooking}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={WHATSAPP_PLACEHOLDER_HREF} target="_blank" rel="noopener noreferrer">
                {dict.cta.secondaryWhatsapp}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/*
       * 3. Chauffeur-only value proposition (R1.6). The dictionary phrase
       *    is interpolated once so the Phase 12 forbidden-phrase lint sees
       *    the exact string it checks for. The narrative `body` (if any)
       *    is rendered below the value-prop paragraph in a `prose`
       *    container so editorial copy reads naturally — this is where
       *    landmarks, itineraries, and local tips from the MDX body land
       *    without creating a separate section that would perturb the
       *    R9.2 order.
       */}
      <section
        aria-labelledby="city-valueprop-heading"
        className="container mx-auto px-4 py-12"
      >
        <div className="mx-auto max-w-3xl">
          <h2
            id="city-valueprop-heading"
            className="text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-3xl"
          >
            {valuePropHeading}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--muted-foreground)] md:text-lg">
            {valuePropParagraph}
          </p>
          {city.narrative === null ? null : (
            <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none">
              {city.narrative.body}
            </div>
          )}
        </div>
      </section>

      {/*
       * 4. Available vehicles grid (R9.2: 3–12 items). Each card links to
       *    the combined city-and-vehicle page via `citySlugPath(..., {
       *    subpath: vehicle.slug })` so the slug map stays the single
       *    source of truth for that URL shape.
       */}
      {/* TODO(R9.2): rendered count must be 3–12 — `city.availableVehicles`
          is already filtered to active + translated vehicles by the
          Content_Layer, but a city with fewer than 3 vehicles today would
          still render this section (as directed by the task spec); once
          content coverage stabilizes, switch to the R9.10 "omit if <3"
          rule applied to the other sections here. */}
      <section
        aria-labelledby="city-vehicles-heading"
        className="container mx-auto px-4 py-16"
      >
        <div className="mb-8 text-center md:text-left">
          <h2
            id="city-vehicles-heading"
            className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
          >
            {vehiclesHeading}
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <Link
              key={vehicle.slug}
              href={citySlugPath(locale, city.slug, { subpath: vehicle.slug })}
              className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
            >
              <Card className="h-full transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]">
                <CardHeader>
                  <CardTitle className="text-xl">{vehicle.displayName}</CardTitle>
                  <CardDescription>
                    {vehicle.seats} {seatsLabel} · {vehicle.luggage} {luggageLabel}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/*
       * 5. Popular destinations (R9.2: 3–12 items). Rendered as a
       *    pill/badge list — no links yet, since destinations are
       *    free-text POIs authored in the MDX frontmatter rather than
       *    Content_Layer entities with their own pages. R9.10 says omit
       *    the section when the Content_Layer supplies fewer than 3; the
       *    `cityFm` schema's `popularDestinations.min(3)` already
       *    guarantees that for cities with a narrative, and when
       *    narrative is null we skip the section entirely.
       */}
      {destinations.length === 0 ? null : (
        <section
          aria-labelledby="city-destinations-heading"
          className="container mx-auto px-4 py-16"
        >
          <div className="mb-8 text-center md:text-left">
            <h2
              id="city-destinations-heading"
              className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
            >
              {destinationsHeading}
            </h2>
          </div>
          <ul className="flex flex-wrap gap-2" aria-labelledby="city-destinations-heading">
            {destinations.map((destination) => (
              <li key={destination}>
                <Badge variant="secondary" className="text-sm">
                  {destination}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
       * 6. Pricing hint (R9.2). Rendered only when the Structured row
       *    supplies a range; otherwise omitted entirely to satisfy R9.10.
       *    Formatting mirrors the `formatIdrPriceRange` helper used by
       *    `localBusinessJsonLd` so the on-page text and structured data
       *    show the same value.
       */}
      {/* TODO(R9.2): package-highlight rendering is out of scope for this
          task; the pricing-hint callout is the only variant rendered now.
          When packages land (phase 8+), add an alternative rendering path
          here that keeps this slot as section #6. */}
      {pricingHintText === null ? null : (
        <section
          aria-labelledby="city-pricing-heading"
          className="container mx-auto px-4 py-12"
        >
          <div className="mx-auto max-w-3xl rounded-xl border bg-[var(--muted)] p-6 text-center">
            <h2
              id="city-pricing-heading"
              className="text-xl font-semibold tracking-tight text-[var(--foreground)]"
            >
              {pricingHeading}
            </h2>
            <p className="mt-2 text-lg font-medium text-[var(--foreground)]">
              {pricingHintText}
            </p>
          </div>
        </section>
      )}

      {/*
       * 7. Airport transfer callout (R9.2). Shown only when the city
       *    serves at least one airport; links to the combined
       *    city-and-airport-transfer page via `citySlugPath(..., {
       *    subpath: "airport-transfer" })`. Omitted when `airports` is
       *    empty per R9.10.
       */}
      {primaryAirport === null ? null : (
        <section
          aria-labelledby="city-airport-heading"
          className="container mx-auto px-4 py-12"
        >
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-xl border p-6 text-center sm:flex-row sm:text-left">
            <div className="flex-1">
              <h2
                id="city-airport-heading"
                className="text-xl font-semibold tracking-tight text-[var(--foreground)]"
              >
                {airportHeading}
              </h2>
              <p className="mt-2 text-[var(--muted-foreground)]">
                {isId
                  ? `Butuh jemput dari ${primaryAirport.name}? Kami siap dengan armada bersih dan supir berpengalaman.`
                  : `Need a pickup from ${primaryAirport.name}? We are ready with clean vehicles and experienced drivers.`}
              </p>
            </div>
            <Button asChild>
              <Link
                href={citySlugPath(locale, city.slug, { subpath: "airport-transfer" })}
              >
                {airportHeading}
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/*
       * 8. City-specific FAQs (R9.2: 3–8 items). Uses the shadcn
       *    `<Accordion>` — which is a Client Component internally, but
       *    importing a client component from a Server Component is
       *    well-defined (Next.js auto-adds the client boundary). R9.10
       *    omits the section when fewer than 3 FAQs exist; `cityFm`'s
       *    `faqs.min(3)` guarantees 3 when narrative is present, and we
       *    skip when narrative is null.
       */}
      {faqs.length === 0 ? null : (
        <section
          aria-labelledby="city-faqs-heading"
          className="container mx-auto px-4 py-16"
        >
          <div className="mb-8 text-center md:text-left">
            <h2
              id="city-faqs-heading"
              className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
            >
              {faqHeading}
            </h2>
          </div>
          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible>
              {faqs.map((faq, index) => (
                <AccordionItem key={`${faq.q}:${index}`} value={`faq-${index}`}>
                  <AccordionTrigger>{faq.q}</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-[var(--muted-foreground)]">{faq.a}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      {/*
       * 9. Related cities (R9.2: 3–6 items). The compound loader already
       *    filters `relatedCities` to active + translated entries, so
       *    every entry has a valid display name and slug. Mirrors the
       *    HomeTemplate featured-cities card pattern for visual
       *    consistency across the site.
       */}
      {relatedCities.length === 0 ? null : (
        <section
          aria-labelledby="city-related-heading"
          className="container mx-auto px-4 py-16"
        >
          <div className="mb-8 text-center md:text-left">
            <h2
              id="city-related-heading"
              className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
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
                    <CardTitle className="text-xl">{relatedCity.displayName}</CardTitle>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/*
       * 10. Final CTA band. Mirrors HomeTemplate's ctaBand so a visitor
       *     reaching the end of the page lands on the same action pair
       *     they saw in the hero — primary booking link, secondary
       *     WhatsApp placeholder (R9.9).
       */}
      <section
        aria-labelledby="city-cta-heading"
        className="bg-[var(--secondary)] py-16 text-[var(--secondary-foreground)]"
      >
        <div className="container mx-auto px-4 text-center">
          <h2 id="city-cta-heading" className="text-3xl font-bold tracking-tight">
            {ctaBandHeading}
          </h2>
          {heroSubheadline.length === 0 ? null : (
            <p className="mx-auto mt-4 max-w-2xl text-[var(--muted-foreground)]">
              {heroSubheadline}
            </p>
          )}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={bookingHref}>{dict.cta.primaryBooking}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={WHATSAPP_PLACEHOLDER_HREF} target="_blank" rel="noopener noreferrer">
                {dict.cta.secondaryWhatsapp}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/*
       * JSON-LD (R8.1, R8.3). Emitted at the end of the outer div so the
       * structured-data `<script>` tags are present in the rendered HTML
       * without affecting the visible section order. `BreadcrumbList`
       * (R8.4) is NOT included here — `<Breadcrumb>` already emits it.
       */}
      <JsonLd blocks={[localBusinessBlock, faqBlock]} />
    </div>
  );
}
