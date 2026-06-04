import Link from "next/link";
import { Check } from "lucide-react";

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
  Locale,
  ServiceWithNarrative,
} from "@/lib/content";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { citySlugPath, servicePath, staticPath } from "@/lib/i18n/slugMap";
import { absoluteUrl } from "@/lib/seo/canonical";
import { faqJsonLd, serviceJsonLd } from "@/lib/seo/jsonld";

/**
 * Service_Page template (R5.8, design §9).
 *
 * Server Component — rendered under `app/[locale]/layanan/[service]/page.tsx`
 * and its English mirror `/en/services/[service]/page.tsx` (task 7.13) by
 * route handlers that wrap a `ServiceWithNarrative` plus a caller-prepared
 * list of launched cities offering the service.
 *
 * Section order (design §9 reasonable default — R9.x does not list a
 * verbatim Service_Page order the way R9.2 / R9.3 / R9.4 do):
 *
 *   1. breadcrumb
 *   2. hero (service-specific headline + primary CTA)
 *   3. chauffeur-only value proposition + narrative body
 *   4. benefits (3 to 10 items from the narrative frontmatter)
 *   5. service cities — cities offering this service (2 to 12 items)
 *   6. service-specific FAQs (3 to 8 items)
 *   7. final CTA band
 *
 * Sections whose Content_Layer feeders carry zero useful items are
 * omitted entirely per R9.10 ("omit rather than render a partial
 * section"). The benefits list always has ≥3 entries when narrative is
 * present (validated by `serviceFm.benefits.min(3)`), and FAQs likewise
 * — when narrative is `null` we skip both sections.
 *
 * JSON-LD (R8.2, R8.3): `Service` + `FAQPage` emitted at the end of the
 * tree via `<JsonLd>`. `BreadcrumbList` (R8.4) is already owned by the
 * `<Breadcrumb>` component so we do not emit it twice (R8.7).
 *
 * Accessibility (R9.10, R15.1):
 *   - Exactly one `<h1>` (the hero headline).
 *   - Every `<section>` carries `aria-labelledby` pointing at its own
 *     `<h2>`.
 *
 * The template is pure of data access — it only reads the props supplied
 * by the route handler (R17.7) and never touches Supabase, the MDX
 * loader, or the dictionary loader.
 */

export interface ServiceTemplateProps {
  readonly locale: Locale;
  readonly service: ServiceWithNarrative;
  /**
   * Launched cities that offer this service. Caller-prepared — the route
   * handler is responsible for filtering / ordering / capping the list
   * before handing it in. R9.x accepts 2 to 12 items; the template caps
   * the upper bound and omits the section entirely when the list is
   * empty (R9.10).
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
 * Placeholder E.164 telephone surfaced via `serviceJsonLd.provider`
 * (R8.2). Kept here rather than read at build-time so the JSON-LD
 * builder stays deterministic. Mirrors the placeholder used by
 * CityTemplate's `localBusinessJsonLd` call.
 *
 * TODO(phase 13): read from `ARASYA_WHATSAPP_NUMBER` at request time.
 */
const PROVIDER_TELEPHONE_PLACEHOLDER = "+628123456789";

// Upper bounds for each caller-prepared feeder. Matches the caps the
// route helper applies so the template never renders an oversized list
// even if a future caller forgets to slice.
const BENEFITS_MAX = 10;
const SERVICE_CITIES_MAX = 12;
const FAQS_MAX = 8;

/** Lower bound on service-cities: omit the section when fewer launched cities exist. */
const SERVICE_CITIES_MIN = 2;

/**
 * Render the Service_Page template.
 */
export default function ServiceTemplate({
  locale,
  service,
  serviceCities,
  dict,
}: ServiceTemplateProps): React.JSX.Element {
  const isId = locale === "id";

  // Locale-scoped labels. Not part of the `Pick<Dictionary, ...>` surface
  // the template accepts, so inlined here. A future `service.*` namespace
  // on the dictionary schema would be the natural migration target.
  const homeLabel = isId ? "Beranda" : "Home";
  const homePath = isId ? "/" : "/en";
  const benefitsHeading = isId ? "Keunggulan layanan" : "Key benefits";
  const serviceCitiesHeading = isId ? "Tersedia di" : "Available in";
  const faqHeading = isId ? "Pertanyaan umum" : "Frequently asked questions";
  const ctaBandHeading = isId ? "Siap memesan?" : "Ready to book?";
  const valuePropHeading = isId
    ? "Hanya layanan dengan supir"
    : "Chauffeur-only service";

  // Self-path is used for both JSON-LD `@id` (via serviceJsonLd) and for
  // the `<Breadcrumb>` `currentPath`. Centralized so the two cannot drift.
  const serviceSelfPath = servicePath(locale, service.slug);

  // Booking link pre-filled with the service slug so the Booking_Form
  // (task 8.3) can populate the service field from the URL. Slug is
  // encoded defensively even though R3.4 guarantees kebab-case ASCII.
  const bookingHref = `${staticPath(locale, "booking")}?service=${encodeURIComponent(
    service.slug,
  )}`;

  // --- Narrative-derived fields (null-safe) ----------------------------------
  // R23.7 excludes a Service with a missing narrative at the loader layer,
  // but we still guard defensively so a transient load failure renders a
  // reduced page rather than a stack trace.
  const heroHeadline =
    service.narrative?.frontmatter.heroHeadline ?? service.displayName;
  const heroSubheadline =
    service.narrative?.frontmatter.heroSubheadline ?? "";

  const benefits =
    service.narrative?.frontmatter.benefits.slice(0, BENEFITS_MAX) ?? [];
  const faqs =
    service.narrative?.frontmatter.faqs.slice(0, FAQS_MAX) ?? [];

  const serviceCitiesRendered = serviceCities.slice(0, SERVICE_CITIES_MAX);

  // Chauffeur-only value proposition (R1.6). Interpolates the
  // locale-specific phrase from `dict.common.chauffeurOnlyPhrase`
  // ("sewa mobil dengan supir" / "chauffeur car rental") — the same
  // string the Phase 12 forbidden-phrase lint checks for.
  const chauffeurPhrase = dict.common.chauffeurOnlyPhrase;
  const valuePropParagraph = isId
    ? `Layanan ${service.displayName} kami adalah ${chauffeurPhrase} dengan sopir profesional. Fokus pada agenda Anda, biarkan kami yang mengatur perjalanan.`
    : `Our ${service.displayName} offering is a ${chauffeurPhrase} operated by a professional driver. Focus on your agenda while we handle the drive.`;

  // R8.2 `Service` JSON-LD input. `description` prefers the narrative's
  // seoDescription (which passes `serviceFm` length bounds) and falls
  // back to the service display name when narrative is missing.
  const serviceDescription =
    service.narrative?.frontmatter.seoDescription ?? service.displayName;

  const serviceBlock = serviceJsonLd({
    serviceSlug: service.slug,
    serviceName: service.displayName,
    description: serviceDescription,
    serviceType: service.displayName,
    provider: {
      name: "Arasya Rentcar",
      url: absoluteUrl("/"),
      telephone: PROVIDER_TELEPHONE_PLACEHOLDER,
    },
    areaServed: serviceCitiesRendered.map((c) => c.displayName),
    locale,
  });
  const faqBlock = faqJsonLd({ faqs, sourcePath: serviceSelfPath });

  // Section-visibility flags (R9.10).
  const showBenefits = benefits.length > 0;
  const showServiceCities = serviceCitiesRendered.length >= SERVICE_CITIES_MIN;
  const showFaqs = faqs.length >= 3;

  return (
    <div className="flex flex-col">
      {/*
       * 1. Breadcrumb (R8.4 + design §9). `<Breadcrumb>` renders both
       *    the visible trail and the matching `BreadcrumbList` JSON-LD
       *    so the two cannot drift. A service-index page does not exist
       *    in the MVP (design §18), so the trail has only the home
       *    ancestor — the current page appears as plain text with
       *    `aria-current="page"`.
       */}
      <div className="container mx-auto px-4 pt-6">
        <Breadcrumb
          items={[{ name: homeLabel, path: homePath }]}
          currentLabel={service.displayName}
          currentPath={serviceSelfPath}
        />
      </div>

      {/*
       * 2. Hero (design §9). Headline prefers the narrative's
       *    `heroHeadline` (R23.2) and falls back to the service display
       *    name. CTAs mirror CityTemplate / CountryTemplate's pair so
       *    analytics tagging in Phase 11 has a single shape to target;
       *    the primary button pre-fills `?service={slug}` for the
       *    Booking_Form.
       */}
      <section
        aria-labelledby="service-hero-heading"
        className="container mx-auto px-4 py-16 md:py-24"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h1
            id="service-hero-heading"
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
       *    dictionary phrase once so the Phase 12 forbidden-phrase lint
       *    sees the exact string it checks for. The narrative `body`
       *    (if any) is rendered below the value-prop paragraph in a
       *    `prose` container so editorial copy reads naturally without
       *    creating a separate section that would perturb the section
       *    order.
       */}
      <section
        aria-labelledby="service-valueprop-heading"
        className="container mx-auto px-4 py-12"
      >
        <div className="mx-auto max-w-3xl">
          <h2
            id="service-valueprop-heading"
            className="text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-3xl"
          >
            {valuePropHeading}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--muted-foreground)] md:text-lg">
            {valuePropParagraph}
          </p>
          {service.narrative === null ? null : (
            <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none">
              {service.narrative.body}
            </div>
          )}
        </div>
      </section>

      {/*
       * 4. Benefits (3 to 10 items). Rendered as a Card grid with a
       *    check-icon marker per entry — `serviceFm.benefits.min(3)`
       *    guarantees the lower bound when narrative is present; when
       *    narrative is null we omit the section entirely per R9.10.
       */}
      {showBenefits ? (
        <section
          aria-labelledby="service-benefits-heading"
          className="container mx-auto px-4 py-16"
        >
          <div className="mb-8 text-center md:text-left">
            <h2
              id="service-benefits-heading"
              className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
            >
              {benefitsHeading}
            </h2>
          </div>
          <ul
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-labelledby="service-benefits-heading"
          >
            {benefits.map((benefit, index) => (
              <li key={`${benefit}:${index}`}>
                <Card className="h-full">
                  <CardContent className="flex items-start gap-3 p-6">
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]"
                    />
                    <span className="text-base leading-relaxed text-[var(--foreground)]">
                      {benefit}
                    </span>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/*
       * 5. Service cities (2 to 12 items). Each card links to
       *    `citySlugPath(locale, city.slug)` — the canonical City_Page
       *    URL — so the slug map stays the single source of truth for
       *    locale-specific URL segments (R17.3). Omitted when the
       *    caller supplies fewer than 2 launched cities per R9.10.
       */}
      {showServiceCities ? (
        <section
          aria-labelledby="service-cities-heading"
          className="container mx-auto px-4 py-16"
        >
          <div className="mb-8 text-center md:text-left">
            <h2
              id="service-cities-heading"
              className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
            >
              {serviceCitiesHeading}
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {serviceCitiesRendered.map((city) => (
              <Link
                key={city.slug}
                href={citySlugPath(locale, city.slug)}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                <Card className="h-full transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]">
                  <CardHeader>
                    <CardTitle className="text-xl">{city.displayName}</CardTitle>
                  </CardHeader>
                  {typeof city.parentRegion === "string" &&
                  city.parentRegion.length > 0 ? (
                    <CardContent>
                      <CardDescription>{city.parentRegion}</CardDescription>
                    </CardContent>
                  ) : null}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/*
       * 6. Service-specific FAQs (3 to 8 items). Uses the shadcn
       *    `<Accordion>` — internally a Client Component, which is fine
       *    to import from a Server Component (Next.js adds the client
       *    boundary automatically). `serviceFm.faqs.min(3)` guarantees
       *    the lower bound when narrative is present; we still guard
       *    defensively at render time.
       */}
      {showFaqs ? (
        <section
          aria-labelledby="service-faqs-heading"
          className="container mx-auto px-4 py-16"
        >
          <div className="mb-8 text-center md:text-left">
            <h2
              id="service-faqs-heading"
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
       * 7. Final CTA band. Mirrors the hero CTA pair so a visitor
       *    reaching the end of the page lands on the same action pair
       *    they saw at the top — primary booking link with the service
       *    slug pre-filled, secondary WhatsApp placeholder (R9.9).
       */}
      <section
        aria-labelledby="service-cta-heading"
        className="bg-[var(--secondary)] py-16 text-[var(--secondary-foreground)]"
      >
        <div className="container mx-auto px-4 text-center">
          <h2
            id="service-cta-heading"
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
       * JSON-LD (R8.2, R8.3). Emitted at the end of the outer div so
       * the structured-data `<script>` tags sit after the visible
       * sections without affecting their order. `BreadcrumbList` (R8.4)
       * is NOT included here — `<Breadcrumb>` already owns that block
       * and rendering it twice would violate R8.7. `<JsonLd>` filters
       * the `null` return `faqJsonLd` produces when fewer than 3 FAQs
       * are present (R8.3), so we hand the builder output through
       * without a branch.
       */}
      <JsonLd blocks={[serviceBlock, faqBlock]} />
    </div>
  );
}
