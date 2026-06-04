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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Breadcrumb from "@/components/seo/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import type {
  CitySummary,
  Locale,
  VehicleSummary,
  VehicleWithNarrative,
} from "@/lib/content";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import {
  citySlugPath,
  staticPath,
  vehicleSlugPath,
} from "@/lib/i18n/slugMap";
import { absoluteUrl } from "@/lib/seo/canonical";
import { vehicleProductJsonLd } from "@/lib/seo/jsonld";

/**
 * Vehicle_Page template (R9.4, design §9).
 *
 * Server Component — rendered under `app/[locale]/armada/[vehicle]/page.tsx`
 * (and its English mirror `/en/fleet/[vehicle]`) by task 7.12 route
 * handlers that wrap a `VehicleWithNarrative` plus pre-computed join
 * collections (`serviceCities`, `relatedVehicles`).
 *
 * Section order (R9.4, verbatim — "the exact order listed"):
 *
 *   1. breadcrumb
 *   2. hero with vehicle image and capacity
 *   3. specification block — seats, luggage, transmission, typical trip types
 *   4. recommended trip types (3 to 6 items)
 *   5. price range hint
 *   6. service cities availability (3 to 12 items)
 *   7. related vehicles (2 to 6 items)
 *   8. vehicle-specific FAQs (3 to 6 items)
 *   9. final CTA band
 *
 * Sections whose Content_Layer feeders carry zero useful items are omitted
 * entirely per R9.10 ("omit rather than render a partial section"). FAQs
 * are optional at the `vehicleFm` schema level — when the narrative
 * omits them, the FAQ section disappears without leaving an empty `<section>`.
 *
 * JSON-LD (R8.6): `Product` via `vehicleProductJsonLd`, emitted at the end
 * of the tree via `<JsonLd>`. `BreadcrumbList` (R8.4) is already owned by
 * `<Breadcrumb>` — we do not emit it twice (R8.7).
 *
 * Accessibility (R9.10, R15.1):
 *   - Exactly one `<h1>` (the hero headline).
 *   - Every `<section>` carries `aria-labelledby` pointing at its own `<h2>`.
 *   - Capacity badges are rendered with `aria-label`s so screen readers
 *     announce "7 seats" / "4 bags" rather than the bare number.
 *
 * The template is pure of data access — it only reads the props supplied
 * by the route handler (R17.7) and never touches Supabase, the MDX loader,
 * or the dictionary loader.
 */

export interface VehicleTemplateProps {
  readonly locale: Locale;
  readonly vehicle: VehicleWithNarrative;
  /**
   * Launched cities whose `city_vehicles` join serves this vehicle. The
   * route handler is responsible for preparing + filtering this list
   * (caller-prepared) so the template stays purely presentational. R9.4
   * accepts 3 to 12 items; the template caps the upper bound and drops
   * the section entirely if the list is empty.
   */
  readonly serviceCities: readonly CitySummary[];
  /**
   * Other active vehicles to surface under the "related vehicles" section.
   * Caller-prepared: typically the result of `getVehicles(locale)` minus
   * the current vehicle, capped at the R9.4 upper bound.
   */
  readonly relatedVehicles: readonly VehicleSummary[];
  readonly dict: Pick<Dictionary, "cta" | "common" | "meta">;
}

/**
 * Placeholder WhatsApp target used by the hero and ctaBand secondary
 * buttons. The real `ARASYA_WHATSAPP_NUMBER` is wired in via the
 * WhatsApp_Handler helper in a later phase (design §20); the placeholder
 * keeps the template renderable today without masquerading as a live number.
 *
 * TODO(phase 13): replace with the shared WhatsApp_Handler invocation.
 */
const WHATSAPP_PLACEHOLDER_HREF = "https://wa.me/628123456789";

/**
 * Fallback transmission label used in the specification block until the
 * `transmission` field lands on `VehicleTranslation`. Arasya's MVP fleet is
 * fully automatic, so rendering "Automatic"/"Otomatis" is factually
 * correct; the TODO marker signals reviewers that the string is static
 * and should migrate to the structured row once the column is added.
 *
 * TODO(R6.3): surface `transmission` from `VehicleTranslation` once the
 * structured schema carries it.
 */
const TRANSMISSION_PLACEHOLDER_ID = "Otomatis";
const TRANSMISSION_PLACEHOLDER_EN = "Automatic";

// R9.4 caps — each section has an upper bound in the acceptance criteria.
// The lower bounds are enforced partly by the MDX schema (recommendedTripTypes
// ≥ 2 per R6.3) and partly by the caller (service/related lists); the caps
// here defend against future content exceeding the UI budget.
const RECOMMENDED_TRIP_TYPES_MAX = 6;
const SERVICE_CITIES_MAX = 12;
const RELATED_VEHICLES_MAX = 6;
const FAQS_MAX = 6;

/**
 * Build the placeholder hero-image URL served by `/api/og` (task 6.11).
 * Per-vehicle hero images aren't structured yet — the OG endpoint returns
 * a branded fallback so the rendered page, the JSON-LD `image`, and the
 * Open Graph metadata all point at the same URL.
 *
 * TODO(R16.4): swap for a per-vehicle photo once the structured schema
 * carries a `hero_image_url` field.
 */
function buildVehicleHeroImageUrl(
  slug: string,
  displayName: string,
  locale: Locale,
): string {
  const ogBase = new URL(absoluteUrl("/api/og"));
  ogBase.searchParams.set("title", displayName);
  ogBase.searchParams.set("subtitle", "");
  ogBase.searchParams.set("locale", locale);
  ogBase.searchParams.set("pageType", "vehicle");
  // `slug` is not currently consumed by the OG endpoint, but including it
  // as a query key keeps the URL stable per-vehicle so CDN cache keys do
  // not collide across the fleet.
  ogBase.searchParams.set("slug", slug);
  return ogBase.toString();
}

/**
 * Render the Vehicle_Page template.
 */
export default function VehicleTemplate({
  locale,
  vehicle,
  serviceCities,
  relatedVehicles,
  dict,
}: VehicleTemplateProps): React.JSX.Element {
  const isId = locale === "id";

  // Locale-scoped labels. Not part of the `Pick<Dictionary, "cta" | "common"
  // | "meta">` surface the template accepts, so inlined here. If a later
  // task adds a `vehicle.*` namespace to the dictionary schema, these
  // strings become the natural migration target.
  const homeLabel = isId ? "Beranda" : "Home";
  const homePath = isId ? "/" : "/en";
  const listingLabel = isId ? "Armada" : "Fleet";
  const seatsLabel = isId ? "kursi" : "seats";
  const luggageLabel = isId ? "bagasi" : "bags";
  const specsHeading = isId ? "Spesifikasi" : "Specifications";
  const tripTypesHeading = isId ? "Tipe perjalanan" : "Recommended trip types";
  const priceHintHeading = isId ? "Kisaran harga" : "Price range hint";
  const priceHintBody = isId
    ? "Hubungi kami untuk penawaran sesuai rute dan durasi perjalanan Anda."
    : "Contact us for a quote tailored to your route and trip duration.";
  const serviceCitiesHeading = isId ? "Kota layanan" : "Service cities";
  const relatedHeading = isId ? "Armada lainnya" : "Related vehicles";
  const faqHeading = isId ? "Pertanyaan umum" : "Frequently asked questions";
  const ctaBandHeading = isId ? "Siap memesan?" : "Ready to book?";
  const transmissionLabel = isId ? "Transmisi" : "Transmission";
  const transmissionValue = isId
    ? TRANSMISSION_PLACEHOLDER_ID
    : TRANSMISSION_PLACEHOLDER_EN;
  const typicalTripTypesLabel = isId ? "Tipe perjalanan" : "Typical trip types";

  // Self-path is used for both JSON-LD `@id` (via vehicleProductJsonLd) and
  // for the `<Breadcrumb>` `currentPath`. Centralized so the two cannot drift.
  const vehicleSelfPath = vehicleSlugPath(locale, vehicle.slug);
  const listingPath = staticPath(locale, "vehicleListing");

  // Booking link is pre-filled with the vehicle slug so the Booking_Form
  // (task 8.3) can populate the vehicle field from the URL. Slug is
  // encoded defensively even though R3.4 guarantees kebab-case ASCII.
  const bookingHref = `${staticPath(locale, "booking")}?vehicle=${encodeURIComponent(
    vehicle.slug,
  )}`;

  // --- Narrative-derived fields (null-safe) ----------------------------------
  // The `narrative` field is `null` when the MDX file is missing (R23.7
  // treats this as "render with reduced fields" for Vehicle — only Cities
  // auto-demote). All `narrative.frontmatter.*` fields below come through
  // `vehicleFm` validation when the MDX is present.
  const heroHeadline =
    vehicle.narrative?.frontmatter.heroHeadline ?? vehicle.displayName;
  const heroSubheadline =
    vehicle.narrative?.frontmatter.heroSubheadline ?? "";

  const recommendedTripTypes =
    vehicle.narrative?.frontmatter.recommendedTripTypes.slice(
      0,
      RECOMMENDED_TRIP_TYPES_MAX,
    ) ?? [];
  // `faqs` is optional on `vehicleFm` — when absent the section is omitted
  // entirely per R9.10.
  const faqs =
    vehicle.narrative?.frontmatter.faqs?.slice(0, FAQS_MAX) ?? [];

  const serviceCitiesRendered = serviceCities.slice(0, SERVICE_CITIES_MAX);
  const relatedRendered = relatedVehicles.slice(0, RELATED_VEHICLES_MAX);

  // JSON-LD hero image. Same URL used by the visible `<img>` so the
  // structured-data `image` field matches the rendered asset byte-for-byte.
  const heroImageUrl = buildVehicleHeroImageUrl(
    vehicle.slug,
    vehicle.displayName,
    locale,
  );

  // R8.6 Product description: prefer the narrative's seoDescription (which
  // passes `vehicleFm` length bounds) and fall back to a short generated
  // sentence when narrative is missing.
  const productDescription =
    vehicle.narrative?.frontmatter.seoDescription ??
    (isId
      ? `${vehicle.displayName} dengan sopir profesional — ${vehicle.seats} kursi, ${vehicle.luggage} bagasi.`
      : `${vehicle.displayName} with professional chauffeur — ${vehicle.seats} seats, ${vehicle.luggage} bags.`);

  // R8.6 Product JSON-LD. `priceRangeIdr` is intentionally omitted — the
  // Vehicle schema does not carry a price range yet, and emitting an
  // AggregateOffer with placeholder numbers would misrepresent the
  // commercial model (rates are negotiated via WhatsApp).
  //
  // TODO(R8.6): pass `priceRangeIdr` once the vehicle schema carries
  // `pricing_hint_from` / `pricing_hint_to` columns analogous to cities.
  const productBlock = vehicleProductJsonLd({
    vehicleSlug: vehicle.slug,
    vehicleName: vehicle.displayName,
    description: productDescription,
    imageUrl: heroImageUrl,
    seats: vehicle.seats,
    luggage: vehicle.luggage,
    sourcePath: vehicleSelfPath,
    locale,
  });

  return (
    <div className="flex flex-col">
      {/*
       * 1. Breadcrumb (R8.4 + R9.4). The `<Breadcrumb>` component renders
       *    both the visible trail and the matching `BreadcrumbList`
       *    JSON-LD so the two cannot drift.
       */}
      <div className="container mx-auto px-4 pt-6">
        <Breadcrumb
          items={[
            { name: homeLabel, path: homePath },
            { name: listingLabel, path: listingPath },
          ]}
          currentLabel={vehicle.displayName}
          currentPath={vehicleSelfPath}
        />
      </div>

      {/*
       * 2. Hero with vehicle image and capacity (R9.4 section 2).
       *
       *    TODO(R16.4): swap the placeholder `/api/og` image for a real
       *    per-vehicle photo once the structured schema carries a
       *    `hero_image_url` field. The `<img>` tag is used deliberately
       *    rather than `next/image` because the source is an absolute OG
       *    URL today; a later task migrates to `<ResponsiveImage>` with
       *    explicit width/height to preserve R16.5 CLS budget.
       */}
      <section
        aria-labelledby="vehicle-hero-heading"
        className="container mx-auto px-4 py-16 md:py-24"
      >
        <div className="mx-auto max-w-4xl">
          <h1
            id="vehicle-hero-heading"
            className="text-4xl font-bold tracking-tight text-[var(--foreground)] md:text-5xl"
          >
            {heroHeadline}
          </h1>
          {heroSubheadline.length === 0 ? null : (
            <p className="mt-6 text-lg leading-relaxed text-[var(--muted-foreground)] md:text-xl">
              {heroSubheadline}
            </p>
          )}
          <div
            className="mt-6 flex flex-wrap gap-2"
            aria-label={isId ? "Kapasitas kendaraan" : "Vehicle capacity"}
          >
            <Badge
              variant="secondary"
              className="text-sm"
              aria-label={`${vehicle.seats} ${seatsLabel}`}
            >
              {vehicle.seats} {seatsLabel}
            </Badge>
            <Badge
              variant="secondary"
              className="text-sm"
              aria-label={`${vehicle.luggage} ${luggageLabel}`}
            >
              {vehicle.luggage} {luggageLabel}
            </Badge>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImageUrl}
            alt={vehicle.displayName}
            width={1200}
            height={630}
            className="mt-8 w-full rounded-xl border bg-[var(--muted)]"
          />
          <div className="mt-8 flex flex-col items-center justify-start gap-3 sm:flex-row">
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
       * 3. Specification block (R9.4 section 3) — seats, luggage,
       *    transmission, and typical trip types. Transmission is a static
       *    placeholder until the structured schema carries the column;
       *    "typical trip types" reuses the recommended list from the
       *    narrative frontmatter so we do not duplicate the data source
       *    between §3 and §4.
       */}
      <section
        aria-labelledby="vehicle-specs-heading"
        className="container mx-auto px-4 py-12"
      >
        <div className="mx-auto max-w-4xl">
          <h2
            id="vehicle-specs-heading"
            className="text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-3xl"
          >
            {specsHeading}
          </h2>
          <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="rounded-xl border p-4">
              <dt className="text-sm text-[var(--muted-foreground)]">
                {typicalTripTypesLabel}
              </dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {recommendedTripTypes.length === 0 ? (
                  <span className="text-[var(--muted-foreground)]">
                    {isId ? "—" : "—"}
                  </span>
                ) : (
                  recommendedTripTypes.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))
                )}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/*
       * 4. Recommended trip types (R9.4 section 4: 3 to 6 items). Rendered
       *    as a pill/badge list. Omitted entirely when the narrative
       *    supplies none — R9.10.
       */}
      {recommendedTripTypes.length === 0 ? null : (
        <section
          aria-labelledby="vehicle-trip-types-heading"
          className="container mx-auto px-4 py-12"
        >
          <div className="mx-auto max-w-4xl">
            <h2
              id="vehicle-trip-types-heading"
              className="text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-3xl"
            >
              {tripTypesHeading}
            </h2>
            <ul
              className="mt-6 flex flex-wrap gap-2"
              aria-labelledby="vehicle-trip-types-heading"
            >
              {recommendedTripTypes.map((type) => (
                <li key={type}>
                  <Badge variant="secondary" className="text-sm">
                    {type}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/*
       * 5. Price range hint (R9.4 section 5). The Vehicle schema does not
       *    carry a pricing range yet, so we render a friendly copy block
       *    that directs the visitor to WhatsApp for a quote. The section
       *    is not omitted even when the Vehicle has no explicit price
       *    range — R9.4 places it in the verbatim order and the copy
       *    itself conveys the "contact us" intent.
       *
       *    TODO(R9.4): when `pricing_hint_from` / `pricing_hint_to` are
       *    added to the Vehicle schema, format them here using the same
       *    `formatIdrPriceRange`-style rendering used by the City template.
       */}
      <section
        aria-labelledby="vehicle-price-heading"
        className="container mx-auto px-4 py-12"
      >
        <div className="mx-auto max-w-3xl rounded-xl border bg-[var(--muted)] p-6 text-center">
          <h2
            id="vehicle-price-heading"
            className="text-xl font-semibold tracking-tight text-[var(--foreground)]"
          >
            {priceHintHeading}
          </h2>
          <p className="mt-2 text-[var(--muted-foreground)]">{priceHintBody}</p>
          <Button asChild className="mt-4">
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
      </section>

      {/*
       * 6. Service cities availability (R9.4 section 6: 3 to 12 items).
       *    Each card links to the combined city-and-vehicle page via
       *    `citySlugPath(..., { subpath: vehicle.slug })` so the slug map
       *    stays the single source of truth for that URL shape. Omitted
       *    entirely when the caller supplies an empty list — R9.10.
       */}
      {serviceCitiesRendered.length === 0 ? null : (
        <section
          aria-labelledby="vehicle-cities-heading"
          className="container mx-auto px-4 py-16"
        >
          <div className="mb-8">
            <h2
              id="vehicle-cities-heading"
              className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
            >
              {serviceCitiesHeading}
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {serviceCitiesRendered.map((city) => (
              <Link
                key={city.slug}
                href={citySlugPath(locale, city.slug, {
                  subpath: vehicle.slug,
                })}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                <Card className="h-full transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]">
                  <CardHeader>
                    <CardTitle className="text-xl">{city.displayName}</CardTitle>
                  </CardHeader>
                  {typeof city.parentRegion === "string" &&
                  city.parentRegion.length > 0 ? (
                    <CardContent>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {city.parentRegion}
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
       * 7. Related vehicles (R9.4 section 7: 2 to 6 items). Each card
       *    links to the sibling vehicle via `vehicleSlugPath`. Omitted
       *    entirely when the caller supplies an empty list.
       */}
      {relatedRendered.length === 0 ? null : (
        <section
          aria-labelledby="vehicle-related-heading"
          className="container mx-auto px-4 py-16"
        >
          <div className="mb-8">
            <h2
              id="vehicle-related-heading"
              className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
            >
              {relatedHeading}
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedRendered.map((other) => (
              <Link
                key={other.slug}
                href={vehicleSlugPath(locale, other.slug)}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                <Card className="h-full transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]">
                  <CardHeader>
                    <CardTitle className="text-xl">{other.displayName}</CardTitle>
                    <CardDescription>
                      {other.seats} {seatsLabel} · {other.luggage} {luggageLabel}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/*
       * 8. Vehicle-specific FAQs (R9.4 section 8: 3 to 6 items). Uses the
       *    shadcn `<Accordion>` — internally a Client Component, which is
       *    fine to import from a Server Component (Next.js adds the
       *    client boundary automatically). `vehicleFm` treats `faqs` as
       *    optional (R6.3 doesn't mandate them), so when absent we omit
       *    the section entirely per R9.10.
       */}
      {faqs.length === 0 ? null : (
        <section
          aria-labelledby="vehicle-faqs-heading"
          className="container mx-auto px-4 py-16"
        >
          <div className="mb-8">
            <h2
              id="vehicle-faqs-heading"
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
       * 9. Final CTA band (R9.4 section 9). Mirrors HomeTemplate's ctaBand
       *    so the page's entry and exit points share a single markup
       *    shape for analytics tagging (R9.9, R11.7, R11.9).
       */}
      <section
        aria-labelledby="vehicle-cta-heading"
        className="bg-[var(--secondary)] py-16 text-[var(--secondary-foreground)]"
      >
        <div className="container mx-auto px-4 text-center">
          <h2
            id="vehicle-cta-heading"
            className="text-3xl font-bold tracking-tight"
          >
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
       * JSON-LD (R8.6). Emitted at the end of the outer div so the
       * structured-data `<script>` tags sit after the visible sections
       * without affecting the order. `BreadcrumbList` (R8.4) is NOT
       * included here — `<Breadcrumb>` already owns that block and
       * rendering it twice would violate R8.7.
       */}
      <JsonLd blocks={[productBlock]} />
    </div>
  );
}
