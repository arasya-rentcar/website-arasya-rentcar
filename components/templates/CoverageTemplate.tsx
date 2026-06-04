import Link from "next/link";

import Breadcrumb from "@/components/seo/Breadcrumb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CitySummary, CityWithNarrative, Locale } from "@/lib/content";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { citySlugPath, staticPath } from "@/lib/i18n/slugMap";

/**
 * Coverage_Page template (R22.4, design §9 / §9.1).
 *
 * Server Component — renders as static HTML under
 * `app/[locale]/sewa-mobil/[city]/page.tsx` (and its `/en/car-rental/[city]`
 * mirror) when the dispatching page determines that `city.coverageState`
 * is `"coverable"` (R3.6, R22.3).
 *
 * Section order (R22.4, verbatim):
 *
 *   1. breadcrumb
 *   2. hero with the city display name and primary WhatsApp CTA
 *   3. one paragraph of generic chauffeur-only service-availability copy,
 *      with the city name templated in
 *   4. Booking_Form prefilled with the city name as `pickup_city`
 *   5. list of 3 to 6 launched cities nearest to the coverable city
 *   6. anti-fraud notice
 *   7. final CTA band
 *
 * Metadata contract (R22.5, R22.6, R22.11):
 * ------------------------------------------
 * This template does NOT emit any `<meta>` tag or JSON-LD. Callers of this
 * template (the route handler at `app/[locale]/sewa-mobil/[city]/page.tsx`,
 * task 7.6) MUST:
 *   - compute metadata via `buildMetadata(...)` passing
 *     `allowIndex: city.allowIndex`, so that robots `index:false, follow:true`
 *     is emitted for coverage pages whose `allow_index` is false (R22.5);
 *   - exclude the coverage URL from `sitemap.xml` (R22.5 / R22.6);
 *   - NOT emit `LocalBusiness` or `FAQPage` JSON-LD for coverage pages — the
 *     coverage page is deliberately a thin landing that declares
 *     service availability, not a full city page (R22.6).
 *
 * The `<h1>` uniqueness rule (R15.1) is honored by rendering exactly one
 * `<h1>` inside the hero section. All other section headings are `<h2>`.
 */

/**
 * Cap for the "nearest launched cities" section per R22.4 ("3 to 6").
 * Enforced with `.slice(0, NEAREST_CITIES_MAX)` even when the page passes
 * a longer list by mistake.
 */
const NEAREST_CITIES_MAX = 6;

/**
 * Minimum number of nearest launched cities R22.4 expects. Fewer than 3
 * still renders, but a TODO comment flags the degraded state so operators
 * can seed more launched cities.
 */
const NEAREST_CITIES_MIN = 3;

/**
 * Placeholder WhatsApp target used by the hero, booking stub, and ctaBand.
 * The final implementation reads `ARASYA_WHATSAPP_NUMBER` via a shared
 * helper (design §20, task 8.4); until that lands, this literal keeps the
 * template renderable and makes the placeholder intent explicit to
 * reviewers.
 */
const WHATSAPP_PLACEHOLDER_NUMBER = "628123456789";

/**
 * Build the placeholder WhatsApp URL for a coverage page's prefilled
 * booking message. The real `buildWhatsAppUrl` helper (task 8.4) replaces
 * this once the admin number + label dictionary are wired.
 */
function buildCoverageWhatsAppHref(cityDisplayName: string): string {
  const message = `Booking ${cityDisplayName}`;
  return `https://wa.me/${WHATSAPP_PLACEHOLDER_NUMBER}?text=${encodeURIComponent(message)}`;
}

export interface CoverageTemplateProps {
  readonly locale: Locale;
  /**
   * The coverable city being rendered. The caller MUST guarantee that
   * `city.coverageState === "coverable"` before invoking this template —
   * the dispatch logic in task 7.6 is responsible for that check, and this
   * template does not re-assert it (keeping the template pure of control
   * flow that belongs to the route handler).
   */
  readonly city: CityWithNarrative;
  /**
   * 3 to 6 launched cities nearest to `city`, prepared by the page route
   * via `latitude`/`longitude` proximity with `parent_region` fallback
   * (R22.4). Ordering is the caller's responsibility; this template only
   * truncates to the R22.4 upper bound and renders the result.
   */
  readonly nearestLaunchedCities: readonly CitySummary[];
  readonly dict: Pick<Dictionary, "cta" | "common" | "meta" | "footer">;
}

export default function CoverageTemplate({
  locale,
  city,
  nearestLaunchedCities,
  dict,
}: CoverageTemplateProps): React.JSX.Element {
  const cityName = city.displayName;
  const isId = locale === "id";

  // Shared strings kept inline for now; the copy is Coverage-template-specific
  // and would only dilute the dictionary if promoted there. The chauffeur-only
  // phrasing in the hero subheading and service-availability paragraph is
  // what the R1.3 forbidden-phrase lint checks for — do not rephrase without
  // re-running `scripts/lint-forbidden-phrases.ts`.
  const heroSubheading = isId
    ? `Layanan sewa mobil dengan supir hadir di ${cityName}`
    : `Chauffeur car rental now in ${cityName}`;
  const serviceAvailabilityCopy = isId
    ? `Kami melayani sewa mobil dengan supir di ${cityName} dan sekitarnya. Armada dikirim dari pool terdekat, sopir berseragam, dan tarif disesuaikan dengan rute perjalanan Anda.`
    : `We offer chauffeur car rental in ${cityName} and nearby areas. Vehicles dispatch from the closest pool, with uniformed drivers and transparent pricing for your route.`;
  const bookingHeading = isId ? "Pesan Perjalanan Anda" : "Book Your Trip";
  const bookingPlaceholder = isId
    ? "Formulir pemesanan akan tersedia segera. Untuk saat ini, silakan hubungi kami via WhatsApp."
    : "The booking form will be available soon. For now, please contact us via WhatsApp.";
  const nearestHeading = isId
    ? "Kota terdekat yang sudah dilayani"
    : "Nearest launched cities";
  const ctaHeading = isId
    ? `Siap berangkat dari ${cityName}?`
    : `Ready to travel from ${cityName}?`;
  const ctaSubheading = isId
    ? "Tim admin siap membantu reservasi Anda via WhatsApp."
    : "Our admin team is ready to help you book via WhatsApp.";
  const homeLabel = isId ? "Beranda" : "Home";

  const currentPath = citySlugPath(locale, city.slug);
  const homePath = isId ? "/" : "/en";
  const whatsappHref = buildCoverageWhatsAppHref(cityName);
  // R22.4 "final CTA band" secondary action routes to the generic booking
  // page with `?city={slug}` so the BookingForm (task 8.3) can pre-populate
  // `pickup_city` even when the visitor arrived from the coverage page.
  const bookingSecondaryHref = `${staticPath(locale, "booking")}?city=${encodeURIComponent(
    city.slug,
  )}`;

  // R22.4 "3 to 6" — truncate hard on the upper bound; leave a TODO breadcrumb
  // when the list is shorter than the lower bound so operators see the
  // degraded state in CI logs rather than silently shipping a sparse page.
  const renderedNearest = nearestLaunchedCities.slice(0, NEAREST_CITIES_MAX);

  return (
    <div className="flex flex-col">
      {/* 1. Breadcrumb (R22.4 section 1). */}
      <section
        aria-labelledby="coverage-breadcrumb-heading"
        className="container mx-auto px-4 pt-6"
      >
        <h2 id="coverage-breadcrumb-heading" className="sr-only">
          {isId ? "Navigasi remah roti" : "Breadcrumb navigation"}
        </h2>
        <Breadcrumb
          items={[{ name: homeLabel, path: homePath }]}
          currentLabel={cityName}
          currentPath={currentPath}
        />
      </section>

      {/*
       * 2. Hero with city display name + primary WhatsApp CTA (R22.4 section 2).
       *    TODO(task 8.4): replace the placeholder WhatsApp href with
       *    `buildWhatsAppUrl(...)` once the WhatsApp_Handler lands so the
       *    admin number and message labels flow through the dictionary.
       */}
      <section
        aria-labelledby="coverage-hero-heading"
        className="container mx-auto px-4 py-16 md:py-24"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h1
            id="coverage-hero-heading"
            className="text-4xl font-bold tracking-tight text-[var(--foreground)] md:text-5xl"
          >
            {cityName}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[var(--muted-foreground)] md:text-xl">
            {heroSubheading}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={dict.meta.whatsappAriaLabel}
              >
                {dict.cta.secondaryWhatsapp}
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#booking">{dict.cta.primaryBooking}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/*
       * 3. Generic chauffeur-only service-availability paragraph with the
       *    city name templated in (R22.4 section 3). This copy is what the
       *    R1.3 chauffeur-only phrase check looks for on coverage pages.
       */}
      <section
        aria-labelledby="coverage-availability-heading"
        className="container mx-auto px-4 py-8"
      >
        <h2 id="coverage-availability-heading" className="sr-only">
          {isId ? "Ketersediaan layanan" : "Service availability"}
        </h2>
        <p className="mx-auto max-w-3xl text-base leading-relaxed text-[var(--foreground)] md:text-lg">
          {serviceAvailabilityCopy}
        </p>
      </section>

      {/*
       * 4. Booking_Form prefilled with the city name as `pickup_city`
       *    (R22.4 section 4).
       *
       *    TODO(task 8.3): replace the placeholder below with
       *    `<BookingForm prefillCity={city.displayName} />`. Until the
       *    BookingForm client component lands, this stub keeps the section
       *    position stable and offers an explicit WhatsApp fallback so
       *    visitors to a newly-coverable city can still reach the admin.
       */}
      <section
        aria-labelledby="coverage-booking-heading"
        id="booking"
        className="container mx-auto px-4 py-16"
      >
        <h2
          id="coverage-booking-heading"
          className="mb-6 text-3xl font-bold tracking-tight"
        >
          {bookingHeading}
        </h2>
        {/* TODO(task 8.3): replace with <BookingForm prefillCity={city.displayName} /> */}
        <p className="text-[var(--muted-foreground)]">{bookingPlaceholder}</p>
        <Button asChild className="mt-4">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            {dict.cta.secondaryWhatsapp}
          </a>
        </Button>
      </section>

      {/*
       * 5. List of 3 to 6 launched cities nearest to the coverable city
       *    (R22.4 section 5). The ordering is prepared by the page route
       *    (latitude/longitude proximity with parent_region fallback);
       *    this template only renders and truncates.
       */}
      <section
        aria-labelledby="coverage-nearest-heading"
        className="container mx-auto px-4 py-16"
      >
        <h2
          id="coverage-nearest-heading"
          className="mb-8 text-3xl font-bold tracking-tight"
        >
          {nearestHeading}
        </h2>
        {renderedNearest.length < NEAREST_CITIES_MIN ? (
          /* TODO(R22.4): fewer than 3 nearest launched cities available —
             seed more launched cities or revisit the proximity algorithm. */
          null
        ) : null}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {renderedNearest.map((nearestCity) => {
            const href = citySlugPath(locale, nearestCity.slug);
            const regionLabel =
              typeof nearestCity.parentRegion === "string" &&
              nearestCity.parentRegion.length > 0
                ? nearestCity.parentRegion
                : null;
            return (
              <Link
                key={nearestCity.slug}
                href={href}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                <Card className="h-full transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]">
                  <CardHeader>
                    <CardTitle className="text-xl">
                      {nearestCity.displayName}
                    </CardTitle>
                  </CardHeader>
                  {regionLabel === null ? null : (
                    <CardContent>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {regionLabel}
                      </p>
                    </CardContent>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/*
       * 6. Anti-fraud notice (R22.4 section 6, R13.4–R13.6). `<Alert>`
       *    already sets `role="alert"` so assistive tech announces the
       *    block as a warning. The admin WhatsApp label line matches the
       *    footer treatment (R13.5) so the notice reads consistently
       *    regardless of which page surfaces it.
       */}
      <section
        aria-labelledby="coverage-antifraud-heading"
        className="container mx-auto px-4 py-16"
      >
        <h2 id="coverage-antifraud-heading" className="sr-only">
          {dict.footer.adminWhatsappLabel}
        </h2>
        <Alert variant="destructive" className="mx-auto max-w-3xl">
          <AlertTitle>{dict.footer.adminWhatsappLabel}</AlertTitle>
          <AlertDescription>
            <p>{dict.footer.antiFraudNotice}</p>
          </AlertDescription>
        </Alert>
      </section>

      {/*
       * 7. Final CTA band (R22.4 section 7). Mirrors the HomeTemplate's
       *    ctaBand shape — primary WhatsApp placeholder + secondary
       *    booking link — so analytics tagging in later tasks targets a
       *    single markup pattern across templates.
       */}
      <section
        aria-labelledby="coverage-cta-heading"
        className="bg-[var(--secondary)] py-16 text-[var(--secondary-foreground)]"
      >
        <div className="container mx-auto px-4 text-center">
          <h2
            id="coverage-cta-heading"
            className="text-3xl font-bold tracking-tight"
          >
            {ctaHeading}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[var(--muted-foreground)]">
            {ctaSubheading}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={dict.meta.whatsappAriaLabel}
              >
                {dict.cta.secondaryWhatsapp}
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={bookingSecondaryHref}>{dict.cta.primaryBooking}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
