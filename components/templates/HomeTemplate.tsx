import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CityWithNarrative } from "@/lib/content";
import type { Locale } from "@/lib/i18n/getDictionary";
import { citySlugPath, staticPath } from "@/lib/i18n/slugMap";

/**
 * Homepage template (R9.1, design §9).
 *
 * Server Component — renders as static HTML under `app/[locale]/page.tsx`
 * and contributes no client bundle. The template is the single place where
 * R9.1's section order is asserted; later tasks (7.x, 13.9, 13.10) swap
 * placeholder TODOs for the remaining sections without re-ordering the
 * existing ones.
 *
 * Section order (R9.1, design §9 — `HomeTemplate` row):
 *
 *   1. hero                — delivered now (R1.1, R1.4, R1.5)
 *   2. trustSignals        — delivered now (R1.2)
 *   3. featuredServices    — TODO (later task)
 *   4. featuredVehicles    — TODO (later task)
 *   5. featuredCities      — delivered now
 *   6. howItWorks          — TODO (later task)
 *   7. corporateCta        — TODO (later task)
 *   8. airportCta          — TODO (later task)
 *   9. testimonials        — TODO (later task)
 *  10. faqHighlights       — TODO (later task)
 *  11. ctaBand             — delivered now (R1.5)
 *
 * The four sections that render in this task are the ones callable from
 * the dictionary + Content_Layer data already available (R1.1, R1.2, R1.4,
 * R1.5). The remaining R9.1 rows are marked with `TODO(R9.1)` comments at
 * their exact position so when subsequent tasks fill them in, the section
 * order stays byte-stable.
 *
 * Hero CTAs (R1.5):
 *   - Primary  → `staticPath(locale, "booking")` (/booking or /en/booking)
 *   - Secondary → placeholder `https://wa.me/628123456789`. The real admin
 *     number is wired in later tasks once the WhatsApp_Handler helper
 *     lands; the placeholder is explicit so it does not masquerade as a
 *     live number.
 *
 * Chauffeur-only copy (R1.3): both the headline and subheadline come
 * straight from the dictionary (`home.hero.headline` /
 * `home.hero.subheadline`), which already encodes the chauffeur-only
 * phrasing validated by the Phase 12 forbidden-phrase lint.
 */

/**
 * Structural subset of the Dictionary consumed by this template. Kept
 * narrow so callers may pass a wider dictionary (e.g. the full `Dictionary`
 * shape from `getDictionary`) without friction, and so swapping data
 * sources requires no signature change beyond matching these field names.
 */
export interface HomeDict {
  readonly cta: {
    readonly primaryBooking: string;
    readonly secondaryWhatsapp: string;
  };
  readonly home: {
    readonly hero: {
      readonly headline: string;
      readonly subheadline: string;
    };
    readonly trustSignals: ReadonlyArray<{
      readonly heading: string;
      readonly description: string;
    }>;
  };
}

export interface HomeTemplateProps {
  readonly locale: Locale;
  readonly dict: HomeDict;
  readonly cities: readonly CityWithNarrative[];
}

/**
 * Placeholder WhatsApp target used by the secondary hero CTA (R1.5).
 *
 * The final implementation reads `ARASYA_WHATSAPP_NUMBER` via a shared
 * helper (design §20); until that lands, this literal keeps the template
 * renderable and makes the placeholder intent explicit to reviewers.
 */
const WHATSAPP_PLACEHOLDER_HREF = "https://wa.me/628123456789";

/** Cap for the Featured Cities section (R9.1 criterion 1: 6 to 12 items). */
const FEATURED_CITIES_MAX = 6;

export default function HomeTemplate({
  locale,
  dict,
  cities,
}: HomeTemplateProps): React.JSX.Element {
  // R9.1 featuredCities feeder: launched cities only, capped to the lower
  // bound from R9.1 criterion 1. Ordering is inherited from `getCities`,
  // which returns `launchPriority desc, slug asc` (see `lib/content/index.ts`).
  const featuredCities = cities
    .filter((city) => city.coverageState === "launched")
    .slice(0, FEATURED_CITIES_MAX);

  const bookingHref = staticPath(locale, "booking");
  const ctaBandHeading = locale === "id" ? "Siap memesan?" : "Ready to book?";
  const featuredCitiesHeading = locale === "id" ? "Kota pilihan" : "Featured cities";
  const trustRegionLabel = locale === "id" ? "Mengapa Arasya Rentcar" : "Why Arasya Rentcar";

  return (
    <div className="flex flex-col">
      {/*
       * 1. Hero (R1.1, R1.4, R1.5). Two CTAs are rendered above the fold
       *    alongside the headline and subheadline; they share the same
       *    markup used in the final ctaBand so analytics tagging in later
       *    tasks only has one shape to target.
       */}
      <section
        aria-labelledby="home-hero-heading"
        className="container mx-auto px-4 py-16 md:py-24"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h1
            id="home-hero-heading"
            className="text-4xl font-bold tracking-tight text-[var(--foreground)] md:text-5xl"
          >
            {dict.home.hero.headline}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[var(--muted-foreground)] md:text-xl">
            {dict.home.hero.subheadline}
          </p>
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
       * 2. TrustSignals (R1.2). Renders every item the dictionary supplies
       *    (minimum of 4 enforced by the dictionary schema) in a 2×2 grid
       *    that collapses to a single column on narrow viewports.
       */}
      <section aria-labelledby="home-trust-heading" className="container mx-auto px-4 py-16">
        <h2 id="home-trust-heading" className="sr-only">
          {trustRegionLabel}
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {dict.home.trustSignals.map((signal) => (
            <Card key={signal.heading}>
              <CardHeader>
                <CardTitle className="text-lg">{signal.heading}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{signal.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* TODO(R9.1): 3. featuredServices (3–6 items) — see task list Phase 7. */}
      {/* TODO(R9.1): 4. featuredVehicles (3–8 items) — see task list Phase 7. */}

      {/*
       * 5. FeaturedCities. Links go through `citySlugPath` so the slug map
       *    stays the single source of truth for locale-specific segments
       *    (R17.3). Cards only emit a description when the dictionary /
       *    content entry supplies a non-empty `shortBlurb` — we never
       *    render an empty paragraph placeholder.
       */}
      <section aria-labelledby="home-cities-heading" className="container mx-auto px-4 py-16">
        <div className="mb-8 text-center md:text-left">
          <h2
            id="home-cities-heading"
            className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
          >
            {featuredCitiesHeading}
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredCities.map((city) => {
            const blurb =
              typeof city.shortBlurb === "string" && city.shortBlurb.length > 0
                ? city.shortBlurb
                : null;
            return (
              <Link
                key={city.slug}
                href={citySlugPath(locale, city.slug)}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                <Card className="h-full transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]">
                  <CardHeader>
                    <CardTitle className="text-xl">{city.displayName}</CardTitle>
                  </CardHeader>
                  {blurb === null ? null : (
                    <CardContent>
                      <CardDescription>{blurb}</CardDescription>
                    </CardContent>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* TODO(R9.1): 6. howItWorks (3–5 steps) — see task list Phase 7. */}
      {/* TODO(R9.1): 7. corporateCta — see task list Phase 7. */}
      {/* TODO(R9.1): 8. airportCta — see task list Phase 7. */}
      {/* TODO(R9.1): 9. testimonials (3–6 items) — see task list Phase 7/13. */}
      {/* TODO(R9.1): 10. faqHighlights (4–8 items) — see task list Phase 7. */}

      {/*
       * 11. Final ctaBand (R1.5). Mirrors the hero CTA pair so a visitor
       *     who has scrolled through the page reaches the booking flow
       *     without returning to the top.
       */}
      <section
        aria-labelledby="home-cta-heading"
        className="bg-[var(--secondary)] py-16 text-[var(--secondary-foreground)]"
      >
        <div className="container mx-auto px-4 text-center">
          <h2 id="home-cta-heading" className="text-3xl font-bold tracking-tight">
            {ctaBandHeading}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[var(--muted-foreground)]">
            {dict.home.hero.subheadline}
          </p>
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
    </div>
  );
}
