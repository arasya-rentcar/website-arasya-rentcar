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
  CityWithNarrative,
  Locale,
  VehicleSummary,
} from "@/lib/content";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { citySlugPath, staticPath } from "@/lib/i18n/slugMap";
import { absoluteUrl } from "@/lib/seo/canonical";
import { faqJsonLd, serviceJsonLd } from "@/lib/seo/jsonld";

/**
 * Airport_Transfer_Page template (R9.5, design §9).
 *
 * Server Component — rendered under
 * `app/[locale]/sewa-mobil/[city]/airport-transfer/page.tsx` (and its
 * English mirror `/en/car-rental/[city]/airport-transfer`) by task 7.9
 * route handlers that wrap a `CityWithNarrative` plus pre-computed
 * feeder lists (`recommendedVehicles`, `serviceCities`).
 *
 * Section order (R9.5, verbatim — "the exact order listed"):
 *
 *   1. breadcrumb
 *   2. hero with airport-specific headline
 *   3. how airport transfer works (3 to 5 steps)
 *   4. flat-rate or indicative pricing hint
 *   5. recommended vehicles (2 to 6 items)
 *   6. service cities availability
 *   7. FAQs (3 to 6 items)
 *   8. final CTA band
 *
 * JSON-LD (R8.2, R8.3): `Service` via `serviceJsonLd` and `FAQPage` via
 * `faqJsonLd`, emitted at the end of the tree via `<JsonLd>`.
 * `BreadcrumbList` (R8.4) is already owned by `<Breadcrumb>` — we do not
 * emit it twice (R8.7).
 *
 * Accessibility (R9.10, R15.1):
 *   - Exactly one `<h1>` (the hero headline).
 *   - Every `<section>` carries `aria-labelledby` pointing at its own
 *     `<h2>` so assistive tech can enumerate the regions.
 *
 * The template is pure of data access — it only reads the props supplied
 * by the route handler (R17.7) and never touches Supabase, the MDX
 * loader, or the dictionary loader.
 */

export interface AirportTransferTemplateProps {
  readonly locale: Locale;
  /**
   * Caller-prepared: must have `coverageState === "launched"` and
   * `airports.length > 0` (R5.8). The route handler enforces these
   * preconditions and 404s otherwise — the template itself does not
   * re-check them.
   */
  readonly city: CityWithNarrative;
  /**
   * 2 to 6 vehicles to surface under "recommended vehicles" (R9.5
   * section 5). Caller-prepared and pre-capped by the route helper.
   */
  readonly recommendedVehicles: readonly VehicleSummary[];
  /**
   * Up to 12 other launched cities that also serve at least one
   * airport, used to feed the "service cities availability" section
   * (R9.5 section 6). Caller-prepared.
   */
  readonly serviceCities: readonly CitySummary[];
  readonly dict: Pick<Dictionary, "cta" | "common" | "meta">;
}

/**
 * Placeholder WhatsApp target used by the hero and ctaBand secondary
 * buttons. The real `ARASYA_WHATSAPP_NUMBER` is wired in via the
 * WhatsApp_Handler helper in a later phase (design §20); the placeholder
 * keeps the template renderable today without masquerading as a live
 * number.
 *
 * TODO(phase 13): replace with the shared WhatsApp_Handler invocation.
 */
const WHATSAPP_PLACEHOLDER_HREF = "https://wa.me/628123456789";

/**
 * Placeholder E.164 telephone passed to `serviceJsonLd` (R8.2). Matches
 * the placeholder used by {@link CityTemplate} so the two blocks agree
 * on the provider's contact number until the WhatsApp_Handler lands.
 *
 * TODO(phase 13): read from `ARASYA_WHATSAPP_NUMBER` at request time.
 */
const SERVICE_PROVIDER_TELEPHONE_PLACEHOLDER = "+628123456789";

// R9.5 caps — each section has an upper bound in the acceptance
// criteria. Lower bounds for `recommendedVehicles` and `serviceCities`
// are the caller's responsibility (see `resolveAirportTransferPageData`);
// the caps here defend against a future content drop exceeding the UI
// budget.
const RECOMMENDED_VEHICLES_MAX = 6;
const SERVICE_CITIES_MAX = 12;
const FAQS_MAX = 6;

/**
 * Hard-coded "how airport transfer works" copy. R9.5 requires 3 to 5
 * steps, and there is no dedicated airport-transfer narrative source
 * yet, so the steps are inlined here.
 *
 * TODO(R9.5): move `howItWorks` steps to a dedicated dictionary
 * namespace (for example `dict.airportTransfer.steps`) once that
 * surface exists, so the strings become reviewable alongside the rest
 * of the i18n dictionary. Keeping the two locales side-by-side here
 * reduces the risk of translation drift during the interim.
 */
const HOW_IT_WORKS_STEPS: Readonly<Record<Locale, readonly string[]>> = {
  id: [
    "Kirim detail penerbangan Anda",
    "Sopir memantau status mendarat secara real-time",
    "Sopir menjemput di titik bertemu resmi",
    "Nikmati perjalanan menuju tujuan",
  ],
  en: [
    "Share your flight details",
    "Driver tracks your landing in real-time",
    "Driver meets you at the official meeting point",
    "Enjoy the ride to your destination",
  ],
};

/**
 * Hard-coded airport-transfer FAQs. R9.5 requires 3 to 6 FAQs, and the
 * per-city `cityFm` narrative FAQs are general-purpose rather than
 * airport-specific. Inlining three baseline questions keeps the page
 * renderable and useful today; a later task may migrate these to a
 * dedicated `airport_transfer_faqs` narrative or a dictionary entry.
 *
 * TODO(R9.5): surface per-city airport-transfer FAQs from a dedicated
 * narrative namespace once the Content_Layer supports it.
 */
const AIRPORT_FAQS: Readonly<
  Record<Locale, ReadonlyArray<{ q: string; a: string }>>
> = {
  id: [
    {
      q: "Apakah sopir memantau status penerbangan?",
      a: "Ya, kami melacak status penerbangan Anda secara real-time sehingga sopir tiba tepat saat Anda mendarat.",
    },
    {
      q: "Berapa lama waktu tunggu yang diberikan?",
      a: "Kami memberikan grace window 30 menit setelah pendaratan sesuai kontrak, dengan kebijakan tambahan yang dibicarakan saat reservasi.",
    },
    {
      q: "Di mana titik jemput di bandara?",
      a: "Sopir menunggu di titik jemput resmi bandara dengan papan nama opsional sesuai permintaan Anda.",
    },
  ],
  en: [
    {
      q: "Does the driver monitor my flight status?",
      a: "Yes, we track your flight in real-time so the driver arrives at the terminal the moment you land.",
    },
    {
      q: "How long is the waiting grace period?",
      a: "We provide a 30-minute grace window after landing as part of every contract; additional wait time can be arranged at reservation.",
    },
    {
      q: "Where will the driver meet me at the airport?",
      a: "The driver waits at the airport's official pickup point and can hold a name board on request.",
    },
  ],
};

/**
 * Render the Airport_Transfer_Page template.
 */
export default function AirportTransferTemplate({
  locale,
  city,
  recommendedVehicles,
  serviceCities,
  dict,
}: AirportTransferTemplateProps): React.JSX.Element {
  const isId = locale === "id";

  // Locale-scoped labels. Not part of the `Pick<Dictionary, "cta" |
  // "common" | "meta">` surface the template accepts, so inlined here.
  // If a later task adds an `airportTransfer.*` namespace to the
  // dictionary schema, these strings become the natural migration
  // target.
  const homeLabel = isId ? "Beranda" : "Home";
  const homePath = isId ? "/" : "/en";
  const currentLabel = isId ? "Antar Jemput Bandara" : "Airport Transfer";
  const seatsLabel = isId ? "kursi" : "seats";
  const luggageLabel = isId ? "bagasi" : "bags";
  const howItWorksHeading = isId
    ? "Cara kerja antar jemput bandara"
    : "How airport transfer works";
  const pricingHeading = isId ? "Kisaran tarif" : "Indicative pricing";
  const recommendedHeading = isId ? "Armada rekomendasi" : "Recommended vehicles";
  const serviceCitiesHeading = isId
    ? "Kota layanan lainnya"
    : "Service cities availability";
  const faqHeading = isId ? "Pertanyaan umum" : "Frequently asked questions";
  const ctaBandHeading = isId ? "Siap memesan?" : "Ready to book?";

  // Self-path is used for both JSON-LD `@id` (via `faqJsonLd` +
  // `serviceJsonLd`) and for the `<Breadcrumb>` `currentPath`.
  // Centralized so the two cannot drift.
  const citySelfPath = citySlugPath(locale, city.slug);
  const airportTransferSelfPath = citySlugPath(locale, city.slug, {
    subpath: "airport-transfer",
  });

  // Booking link is pre-filled with the city slug and an `intent` flag so
  // the Booking_Form (task 8.3) can pre-select "airport transfer" from
  // the URL. Slug is encoded defensively even though R3.4 guarantees
  // kebab-case ASCII.
  const bookingHref = `${staticPath(locale, "booking")}?city=${encodeURIComponent(
    city.slug,
  )}&intent=airport-transfer`;

  // --- Headline + subheadline --------------------------------------------
  // Hero headline is airport-specific (R9.5 section 2). Subheadline lists
  // the airports served by the city — the three-dot fallback keeps the
  // line readable when the city has many airports.
  const airportNames = city.airports.map((a) => a.name);
  const airportListSpoken =
    airportNames.length === 0
      ? ""
      : airportNames.length === 1
        ? airportNames[0]!
        : isId
          ? `${airportNames.slice(0, -1).join(", ")}, dan ${airportNames.at(-1)!}`
          : `${airportNames.slice(0, -1).join(", ")}, and ${airportNames.at(-1)!}`;

  const heroHeadline = isId
    ? `Antar Jemput Bandara ${city.displayName}`
    : `Airport Transfer in ${city.displayName}`;
  const heroSubheadline = isId
    ? `Melayani penjemputan dari ${airportListSpoken} dengan sopir profesional yang memantau status penerbangan secara real-time.`
    : `Pickup service from ${airportListSpoken} with professional chauffeurs tracking your flight status in real-time.`;

  // --- Pricing hint ------------------------------------------------------
  // Mirror `CityTemplate`'s IDR pretty-printer (ID = dot thousands, EN =
  // comma thousands, en-dash range separator) so the airport page and
  // the city page show identical numbers.
  const formatIdr = (value: number): string =>
    value.toLocaleString(isId ? "id-ID" : "en-US");
  const pricingHintText = city.pricingHint
    ? `IDR ${formatIdr(city.pricingHint.fromIdr)}\u2013${formatIdr(city.pricingHint.toIdr)}`
    : null;
  const pricingFallbackCopy = isId
    ? "Hubungi kami untuk tarif sesuai rute dan kebutuhan penerbangan Anda."
    : "Contact us for route-based rates tailored to your flight.";

  // --- Steps + FAQs (hard-coded) -----------------------------------------
  const steps = HOW_IT_WORKS_STEPS[locale];
  const faqs = AIRPORT_FAQS[locale].slice(0, FAQS_MAX);

  // --- Feeders capped ---------------------------------------------------
  const recommended = recommendedVehicles.slice(0, RECOMMENDED_VEHICLES_MAX);
  const otherCities = serviceCities.slice(0, SERVICE_CITIES_MAX);

  // --- JSON-LD blocks ----------------------------------------------------
  // R8.2: `Service` block identifies this page as a chauffeur-driven
  // airport transfer service with the city + each airport as the
  // `areaServed` set. Using `serviceType: "Airport Transfer"` matches
  // the template's subject precisely.
  const serviceBlock = serviceJsonLd({
    serviceSlug: "airport-transfer",
    serviceName: isId
      ? `Antar Jemput Bandara ${city.displayName}`
      : `Airport Transfer in ${city.displayName}`,
    description: isId
      ? `Layanan antar jemput bandara di ${city.displayName} dengan sopir profesional dan pelacakan penerbangan real-time.`
      : `Chauffeur-driven airport transfer service in ${city.displayName} with professional drivers and real-time flight tracking.`,
    serviceType: "Airport Transfer",
    provider: {
      name: "Arasya Rentcar",
      url: absoluteUrl("/"),
      telephone: SERVICE_PROVIDER_TELEPHONE_PLACEHOLDER,
    },
    areaServed: [city.displayName, ...airportNames],
    locale,
  });

  // R8.3: FAQPage JSON-LD. `faqJsonLd` returns null when fewer than 3
  // FAQs are supplied, but `AIRPORT_FAQS` always carries 3 entries, so
  // in practice the block is always emitted here.
  const faqBlock = faqJsonLd({ faqs, sourcePath: airportTransferSelfPath });

  return (
    <div className="flex flex-col">
      {/*
       * 1. Breadcrumb (R8.4 + R9.5). Ancestor trail runs Home → city →
       *    (current: airport transfer). The `<Breadcrumb>` component
       *    renders the visible trail AND the matching `BreadcrumbList`
       *    JSON-LD so the two cannot drift (R8.7).
       */}
      <div className="container mx-auto px-4 pt-6">
        <Breadcrumb
          items={[
            { name: homeLabel, path: homePath },
            { name: city.displayName, path: citySelfPath },
          ]}
          currentLabel={currentLabel}
          currentPath={airportTransferSelfPath}
        />
      </div>

      {/*
       * 2. Hero with airport-specific headline (R9.5 section 2). Single
       *    `<h1>` on the page per R9.10. The subheadline lists the
       *    airports served so visitors can confirm coverage before
       *    scrolling further. CTA pair mirrors the rest of the site so
       *    analytics tagging has one shape to target (R1.5 / R9.9).
       */}
      <section
        aria-labelledby="airport-hero-heading"
        className="container mx-auto px-4 py-16 md:py-24"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h1
            id="airport-hero-heading"
            className="text-4xl font-bold tracking-tight text-[var(--foreground)] md:text-5xl"
          >
            {heroHeadline}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[var(--muted-foreground)] md:text-xl">
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
       * 3. How airport transfer works (R9.5 section 3: 3 to 5 steps).
       *    Rendered as an ordered list of cards so both sighted and
       *    assistive-tech visitors perceive the sequence.
       *
       *    TODO(R9.5): move `HOW_IT_WORKS_STEPS` copy to a dedicated
       *    `airportTransfer.steps` dictionary namespace once the
       *    dictionary schema is extended.
       */}
      <section
        aria-labelledby="airport-howitworks-heading"
        className="container mx-auto px-4 py-16"
      >
        <div className="mb-8 text-center md:text-left">
          <h2
            id="airport-howitworks-heading"
            className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
          >
            {howItWorksHeading}
          </h2>
        </div>
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step}>
              <Card className="h-full">
                <CardHeader>
                  <CardDescription className="text-sm font-semibold text-[var(--muted-foreground)]">
                    {isId ? `Langkah ${index + 1}` : `Step ${index + 1}`}
                  </CardDescription>
                  <CardTitle className="text-lg">{step}</CardTitle>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/*
       * 4. Flat-rate or indicative pricing hint (R9.5 section 4).
       *    Reuses the city's `pricingHint` range when present — this is
       *    the same number shown on the City_Page's pricing section, so
       *    visitors see consistent figures across the two surfaces.
       *    Falls back to a "contact us for route-based rates" copy
       *    block when the city carries no range.
       */}
      <section
        aria-labelledby="airport-pricing-heading"
        className="container mx-auto px-4 py-12"
      >
        <div className="mx-auto max-w-3xl rounded-xl border bg-[var(--muted)] p-6 text-center">
          <h2
            id="airport-pricing-heading"
            className="text-xl font-semibold tracking-tight text-[var(--foreground)]"
          >
            {pricingHeading}
          </h2>
          {pricingHintText === null ? (
            <p className="mt-2 text-[var(--muted-foreground)]">
              {pricingFallbackCopy}
            </p>
          ) : (
            <p className="mt-2 text-lg font-medium text-[var(--foreground)]">
              {pricingHintText}
            </p>
          )}
        </div>
      </section>

      {/*
       * 5. Recommended vehicles (R9.5 section 5: 2 to 6 items). Each
       *    card links to the combined city-and-vehicle page via
       *    `citySlugPath(..., { subpath: vehicle.slug })` so the slug
       *    map stays the single source of truth for that URL shape.
       */}
      {recommended.length === 0 ? null : (
        <section
          aria-labelledby="airport-vehicles-heading"
          className="container mx-auto px-4 py-16"
        >
          <div className="mb-8 text-center md:text-left">
            <h2
              id="airport-vehicles-heading"
              className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
            >
              {recommendedHeading}
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((vehicle) => (
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
      )}

      {/*
       * 6. Service cities availability (R9.5 section 6). Up to 12
       *    launched cities that also serve at least one airport. Each
       *    card links to its own airport-transfer page so visitors can
       *    pivot between markets without backtracking to the homepage.
       *    Omitted entirely when no other cities qualify — matches
       *    R9.10's "omit rather than render a partial section" rule.
       */}
      {otherCities.length === 0 ? null : (
        <section
          aria-labelledby="airport-cities-heading"
          className="container mx-auto px-4 py-16"
        >
          <div className="mb-8 text-center md:text-left">
            <h2
              id="airport-cities-heading"
              className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
            >
              {serviceCitiesHeading}
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {otherCities.map((otherCity) => (
              <Link
                key={otherCity.slug}
                href={citySlugPath(locale, otherCity.slug, {
                  subpath: "airport-transfer",
                })}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                <Card className="h-full transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]">
                  <CardHeader>
                    <CardTitle className="text-xl">{otherCity.displayName}</CardTitle>
                  </CardHeader>
                  {typeof otherCity.parentRegion === "string" &&
                  otherCity.parentRegion.length > 0 ? (
                    <CardContent>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {otherCity.parentRegion}
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
       * 7. FAQs (R9.5 section 7: 3 to 6 items). Uses the shadcn
       *    `<Accordion>` — internally a Client Component, which is fine
       *    to import from a Server Component (Next.js inserts the
       *    client boundary automatically).
       */}
      {faqs.length === 0 ? null : (
        <section
          aria-labelledby="airport-faqs-heading"
          className="container mx-auto px-4 py-16"
        >
          <div className="mb-8 text-center md:text-left">
            <h2
              id="airport-faqs-heading"
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
       * 8. Final CTA band (R9.5 section 8). Mirrors HomeTemplate's
       *    ctaBand so the page's entry and exit points share a single
       *    markup shape for analytics tagging (R9.9, R11.7, R11.9).
       */}
      <section
        aria-labelledby="airport-cta-heading"
        className="bg-[var(--secondary)] py-16 text-[var(--secondary-foreground)]"
      >
        <div className="container mx-auto px-4 text-center">
          <h2
            id="airport-cta-heading"
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
       * JSON-LD (R8.2, R8.3). Emitted at the end of the outer div so
       * the structured-data `<script>` tags sit after the visible
       * sections without affecting the order. `BreadcrumbList` (R8.4)
       * is NOT included here — `<Breadcrumb>` already owns that block
       * and rendering it twice would violate R8.7.
       */}
      <JsonLd blocks={[serviceBlock, faqBlock]} />
    </div>
  );
}
