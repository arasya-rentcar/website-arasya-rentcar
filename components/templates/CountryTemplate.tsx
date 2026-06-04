import Link from "next/link";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  CountryWithNarrative,
  Locale,
  VehicleSummary,
} from "@/lib/content";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import {
  citySlugPath,
  countrySlugPath,
  staticPath,
  vehicleSlugPath,
} from "@/lib/i18n/slugMap";
import { faqJsonLd } from "@/lib/seo/jsonld";

/**
 * Country_Page template (R9.3, design §9).
 *
 * Server Component — renders under both
 * `app/[locale]/internasional/[country]/page.tsx` (id) and
 * `app/[locale]/international/[country]/page.tsx` (en). Both routes
 * resolve identical data via `resolveCountryPageData`
 * (`lib/routing/countryRouteHelper.ts`) and pass it to this template so
 * the 8-section layout is the single source of truth.
 *
 * Section order (R9.3 verbatim — "the exact order listed"):
 *
 *   1. breadcrumb
 *   2. hero (country-specific headline + primary CTA)
 *   3. chauffeur-only value proposition
 *   4. supported cities within the country (2–10)
 *   5. typical use cases for business and tourism (3–6)
 *   6. available vehicles (3–10)
 *   7. country-specific FAQs (3–8)
 *   8. final CTA band
 *
 * R9.10 is honoured at two layers: exactly one `<h1>` (the hero headline),
 * every `<section>` is labelled by its own `<h2>` via `aria-labelledby`,
 * and sections whose Content_Layer inputs are empty are OMITTED entirely
 * rather than rendered as an empty shell — a country page with no
 * supported cities, no narrative, or no FAQ entries simply skips those
 * sections so the accessibility tree stays tight.
 *
 * JSON-LD (R8.3, R8.7): only `FAQPage` is emitted here via `<JsonLd>`.
 * R8.1 scopes `LocalBusiness` to City_Page (the chauffeur operations are
 * based in Indonesian cities; a country page spans multiple areas served
 * and is not a single business address). `BreadcrumbList` (R8.4) is
 * emitted by the `<Breadcrumb>` component itself so we do not double it up
 * here — rendering the same block twice would violate R8.7.
 *
 * Hero CTAs (R9.9):
 *   - Primary  → booking page with `?country={slug}` so the Booking_Form
 *     (Phase 8) can pre-fill the country field once that route lands.
 *   - Secondary → WhatsApp placeholder; the real admin number is wired
 *     later via the shared `WhatsAppHandler` helper.
 */

export interface CountryTemplateProps {
  readonly locale: Locale;
  readonly country: CountryWithNarrative;
  /**
   * Active vehicles available across the country, already filtered to
   * active + translated by `getVehicles` upstream. The template caps the
   * list at {@link VEHICLES_MAX} to satisfy R9.3's "3 to 10 items" upper
   * bound; the caller is not expected to slice.
   */
  readonly availableVehicles: readonly VehicleSummary[];
  /**
   * Launched cities within the country (either matched by `countryCode`
   * or explicitly listed in the narrative frontmatter's
   * `supportedCities`). Already filtered to launched coverage state by
   * the caller so every entry has a renderable City_Page destination.
   */
  readonly supportedCities: readonly CitySummary[];
  /**
   * Narrow dictionary subset the template consumes. Accepts the full
   * `Dictionary` shape (routes pass the whole thing through) but the
   * explicit `Pick` documents the surface the template actually needs.
   */
  readonly dict: Pick<Dictionary, "cta" | "common" | "meta">;
}

/**
 * Placeholder WhatsApp target used by the hero and CTA-band secondary
 * buttons. The shared `WhatsAppHandler` helper (design §20) will replace
 * this once it lands in Phase 13; the literal keeps the template
 * renderable today without masquerading as a live number.
 *
 * TODO(phase 13): swap for the `WhatsAppHandler` invocation so the
 * secondary CTA reads the live admin number from `ARASYA_WHATSAPP_NUMBER`.
 */
const WHATSAPP_PLACEHOLDER_HREF = "https://wa.me/628123456789";

// R9.3 caps — the acceptance criterion gives each section an explicit
// upper bound. Lower bounds are enforced upstream: `countryFm` requires
// at least 3 `useCases` and 3 `faqs`; the helper filters supported cities
// to launched-only entries (but does NOT enforce a minimum of 2, so the
// template must omit the section if the caller supplies fewer — see R9.10).
const SUPPORTED_CITIES_MIN = 2;
const SUPPORTED_CITIES_MAX = 10;
const USE_CASES_MAX = 6;
const VEHICLES_MIN = 3;
const VEHICLES_MAX = 10;
const FAQS_MAX = 8;

/**
 * Render the Country_Page for an active Country.
 *
 * All data is resolved upstream by `resolveCountryPageData`
 * (`lib/routing/countryRouteHelper.ts`) and handed in via props. The
 * template never reaches into the Content_Layer directly (R17.7); it is a
 * pure projection of the props triple into HTML.
 */
export default function CountryTemplate({
  locale,
  country,
  availableVehicles,
  supportedCities,
  dict,
}: CountryTemplateProps): React.JSX.Element {
  const isId = locale === "id";

  // Locale-scoped labels. Not part of the `Pick<Dictionary, ...>` surface
  // this template accepts, so inlined here. A future `country.*` namespace
  // on the dictionary schema would be the natural migration target.
  const homeLabel = isId ? "Beranda" : "Home";
  const homePath = isId ? "/" : "/en";
  const supportedCitiesHeading = isId ? "Kota yang Dilayani" : "Supported cities";
  const useCasesHeading = isId ? "Penggunaan Umum" : "Typical use cases";
  const vehiclesHeading = isId ? "Armada Tersedia" : "Available vehicles";
  const faqHeading = isId ? "FAQ" : "Frequently asked questions";
  const ctaBandHeading = isId ? "Siap memesan?" : "Ready to book?";
  const valuePropHeading = isId
    ? "Hanya layanan dengan supir"
    : "Chauffeur-only service";
  const seatsLabel = isId ? "kursi" : "seats";
  const luggageLabel = isId ? "bagasi" : "bags";

  // Self-path: used as the `currentPath` for the breadcrumb and as the
  // `sourcePath` for the FAQPage JSON-LD `@id`. Centralising it here keeps
  // the two in lock-step.
  const selfPath = countrySlugPath(locale, country.slug);

  // Booking link is pre-filled with the country slug so the Booking_Form
  // (task 10.x) can populate the destination field from the URL. Slug is
  // encoded defensively even though R3.4 guarantees kebab-case ASCII.
  const bookingHref = `${staticPath(locale, "booking")}?country=${encodeURIComponent(country.slug)}`;

  // --- Narrative-derived fields (null-safe) --------------------------------
  // For Countries, `narrative` is null when the MDX file is missing; R23.7
  // treats this as "exclude from generation" at the loader level, but the
  // template still guards defensively so a transient load failure renders
  // a reduced page rather than a stack trace.
  const heroHeadline =
    country.narrative?.frontmatter.heroHeadline ?? country.displayName;
  const heroSubheadline =
    country.narrative?.frontmatter.heroSubheadline ?? "";

  const useCases = country.narrative
    ? country.narrative.frontmatter.useCases.slice(0, USE_CASES_MAX)
    : [];
  const faqs = country.narrative
    ? country.narrative.frontmatter.faqs.slice(0, FAQS_MAX)
    : [];

  const cities = supportedCities.slice(0, SUPPORTED_CITIES_MAX);
  const vehicles = availableVehicles.slice(0, VEHICLES_MAX);

  // Chauffeur-only value proposition paragraph (R1.6). Interpolates the
  // locale-specific phrase from `dict.common.chauffeurOnlyPhrase`
  // ("sewa mobil dengan supir" / "chauffeur car rental") which is the
  // same string the Phase 12 forbidden-phrase lint checks for.
  const chauffeurPhrase = dict.common.chauffeurOnlyPhrase;
  const valuePropParagraph = isId
    ? `Kami hanya melayani ${chauffeurPhrase} untuk perjalanan ke ${country.displayName}. Setiap trip lintas negara dikawal sopir berseragam yang paham rute perbatasan dan etika pelayanan, sehingga Anda bisa fokus pada agenda tanpa menyetir sendiri.`
    : `We only offer ${chauffeurPhrase} for trips to ${country.displayName}. Every cross-border journey is operated by a uniformed chauffeur who knows the border routes and upholds professional etiquette, so you can focus on your agenda without driving yourself.`;

  // JSON-LD blocks emitted at the end of the tree. `faqJsonLd` returns
  // null when fewer than 3 FAQs are present per R8.3; `<JsonLd>` filters
  // nulls so we hand the builder output through without a branch.
  const faqBlock = faqJsonLd({ faqs, sourcePath: selfPath });

  // Section-visibility flags (R9.10 — omit rather than render empty).
  // `SUPPORTED_CITIES_MIN` guards the lower bound called out in R9.3 so
  // a country with only one matching launched city skips the section
  // rather than rendering a visually lonely single card.
  const showSupportedCities = cities.length >= SUPPORTED_CITIES_MIN;
  const showUseCases = useCases.length > 0;
  const showVehicles = vehicles.length >= VEHICLES_MIN;
  const showFaqs = faqs.length >= 3;

  return (
    <div className="flex flex-col">
      {/*
       * 1. Breadcrumb (R8.4 + R9.3). `<Breadcrumb>` renders both the
       *    visible trail and the matching `BreadcrumbList` JSON-LD so the
       *    two cannot drift. A country-index page does not exist in the
       *    MVP routing (design §18), so the trail has only the home
       *    ancestor — the current page appears as plain text with
       *    `aria-current="page"`.
       */}
      <div className="container mx-auto px-4 pt-6">
        <Breadcrumb
          items={[{ name: homeLabel, path: homePath }]}
          currentLabel={country.displayName}
          currentPath={selfPath}
        />
      </div>

      {/*
       * 2. Hero (R9.3). Headline prefers the narrative's `heroHeadline`
       *    (R23.2) and falls back to the country display name when the
       *    narrative is missing (defensive — R23.7 excludes missing
       *    narratives at the loader level). CTAs mirror CityTemplate's
       *    pair so analytics tagging in Phase 11 has a single shape to
       *    target; the primary button pre-fills `?country={slug}` for the
       *    Booking_Form.
       */}
      <section
        aria-labelledby="country-hero-heading"
        className="container mx-auto px-4 py-16 md:py-24"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h1
            id="country-hero-heading"
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
              <a
                href={WHATSAPP_PLACEHOLDER_HREF}
                target="_blank"
                rel="noopener noreferrer"
              >
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
       *    is rendered below the paragraph in a `prose` container so
       *    editorial copy from the MDX body reads naturally without
       *    perturbing the R9.3 section order.
       */}
      <section
        aria-labelledby="country-valueprop-heading"
        className="container mx-auto px-4 py-12"
      >
        <div className="mx-auto max-w-3xl">
          <h2
            id="country-valueprop-heading"
            className="text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-3xl"
          >
            {valuePropHeading}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--muted-foreground)] md:text-lg">
            {valuePropParagraph}
          </p>
          {country.narrative === null ? null : (
            <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none">
              {country.narrative.body}
            </div>
          )}
        </div>
      </section>

      {/*
       * 4. Supported cities (R9.3: 2–10 items). Omitted entirely when
       *    fewer than 2 launched cities match the country (R9.10). Each
       *    card links to `citySlugPath(locale, city.slug)` — the canonical
       *    City_Page URL — so the slug map stays the single source of
       *    truth for locale-specific URL segments (R17.3).
       */}
      {showSupportedCities ? (
        <section
          aria-labelledby="country-cities-heading"
          className="container mx-auto px-4 py-16"
        >
          <div className="mb-8 text-center md:text-left">
            <h2
              id="country-cities-heading"
              className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
            >
              {supportedCitiesHeading}
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((city) => (
              <Link
                key={city.slug}
                href={citySlugPath(locale, city.slug)}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                <Card className="h-full transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]">
                  <CardHeader>
                    <CardTitle className="text-xl">{city.displayName}</CardTitle>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/*
       * 5. Typical use cases (R9.3: 3–6 items). Rendered from the
       *    narrative's `useCases` frontmatter (validated by `countryFm`
       *    to have ≥3 entries). Omitted when the narrative is missing so
       *    we never emit a section with zero content.
       */}
      {showUseCases ? (
        <section
          aria-labelledby="country-usecases-heading"
          className="container mx-auto px-4 py-16"
        >
          <div className="mb-8 text-center md:text-left">
            <h2
              id="country-usecases-heading"
              className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
            >
              {useCasesHeading}
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {useCases.map((useCase, index) => (
              <Card key={`${useCase.title}:${index}`} className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg">{useCase.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {useCase.body}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/*
       * 6. Available vehicles (R9.3: 3–10 items). Links go to the
       *    vehicle-detail page (`/armada/{slug}` / `/en/fleet/{slug}`)
       *    rather than the combined city-and-vehicle page — country
       *    context is unresolved at click time, so the detail page is the
       *    natural landing target. Omitted when fewer than 3 active
       *    vehicles exist in the current locale (R9.10).
       */}
      {showVehicles ? (
        <section
          aria-labelledby="country-vehicles-heading"
          className="container mx-auto px-4 py-16"
        >
          <div className="mb-8 text-center md:text-left">
            <h2
              id="country-vehicles-heading"
              className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
            >
              {vehiclesHeading}
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => (
              <Link
                key={vehicle.slug}
                href={vehicleSlugPath(locale, vehicle.slug)}
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
      ) : null}

      {/*
       * 7. Country-specific FAQs (R9.3: 3–8 items). Uses the shadcn
       *    `<Accordion>` — a Client Component internally, but importing a
       *    client component from a Server Component is well-defined in
       *    the App Router. `countryFm` validates a minimum of 3 entries
       *    so when `narrative !== null` this section always renders; we
       *    still guard on `faqs.length >= 3` to keep the template
       *    defensive against a reduced-narrative fallback.
       */}
      {showFaqs ? (
        <section
          aria-labelledby="country-faqs-heading"
          className="container mx-auto px-4 py-16"
        >
          <div className="mb-8 text-center md:text-left">
            <h2
              id="country-faqs-heading"
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
      ) : null}

      {/*
       * 8. Final CTA band (R9.9). Mirrors the hero CTA pair so a visitor
       *    reaching the end of the page lands on the same action pair
       *    they saw at the top — primary booking link with the country
       *    slug pre-filled, secondary WhatsApp placeholder.
       */}
      <section
        aria-labelledby="country-cta-heading"
        className="bg-[var(--secondary)] py-16 text-[var(--secondary-foreground)]"
      >
        <div className="container mx-auto px-4 text-center">
          <h2 id="country-cta-heading" className="text-3xl font-bold tracking-tight">
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
              >
                {dict.cta.secondaryWhatsapp}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/*
       * JSON-LD (R8.3). `FAQPage` is the only structured-data block this
       * template contributes — `BreadcrumbList` is emitted by
       * `<Breadcrumb>` above, and `LocalBusiness` is city-scoped per R8.1
       * (a country page spans multiple service areas and is not a single
       * business address). `<JsonLd>` filters the `null` result
       * `faqJsonLd` returns when fewer than 3 FAQs are present (R8.3), so
       * we hand the builder output through unconditionally.
       */}
      <JsonLd blocks={[faqBlock]} />
    </div>
  );
}
