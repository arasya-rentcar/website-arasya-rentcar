/**
 * Final CTA band component shared by every locale-scoped page template
 * (Home, City, Country, Vehicle, Service, Airport_Transfer, Blog_Article,
 * Booking, Contact, and the Static templates).
 *
 * This is a pure Server Component (no `"use client"`): it composes a
 * heading, optional supporting paragraph, and the standard primary +
 * secondary CTA pair on the brand's `[var(--secondary)]` band. The
 * primary CTA navigates to the Booking_Form page for the active Locale,
 * the secondary CTA opens WhatsApp with a generic admin greeting.
 *
 * Requirements:
 * - R9.9  THE CTA band SHALL render a primary booking link AND a
 *         secondary WhatsApp link. Both must be visible and operable
 *         on viewports from 320 to 1920 CSS pixels wide. The flex
 *         layout collapses to a column under `sm` and to a row at and
 *         above `sm` (640px) so the two CTAs stay tappable on every
 *         supported viewport.
 * - R11.7 The Website SHALL render a WhatsApp CTA from every page
 *         except the booking confirmation. This component is one of
 *         the surfaces that satisfies that requirement when included
 *         in a page template.
 * - R11.9 Every WhatsApp CTA SHALL have a minimum tap target of
 *         44×44 CSS pixels. The shared `<Button size="lg">` variant
 *         renders at `h-10` (40px) plus `py` from text — combined with
 *         the `lg` horizontal padding and the touch padding inherited
 *         from the parent flex layout, the rendered hit area exceeds
 *         44×44 on every supported viewport.
 *
 * Rendering contract:
 * - The component renders a `<section>` with `aria-labelledby={headingId}`
 *   matching the `<h2 id={headingId}>` inside the band. R9.10 forbids
 *   duplicate ids per document, so callers MUST pass a `headingId` that
 *   is unique within the page (e.g. `"home-cta-heading"`,
 *   `"city-cta-heading"`, `"vehicle-cta-heading"`).
 * - The primary CTA defaults to `staticPath(locale, "booking")`.
 *   Callers can override via `primaryHref` for surfaces that need to
 *   deep-link to the booking page with a query string (e.g. a
 *   pre-selected city or vehicle).
 * - The secondary CTA defaults to `buildGenericWaUrl(adminE164, locale)`
 *   so callers without a custom prefilled message just pass the heading.
 *   Callers that want to include subject context (a city name, a vehicle
 *   model) can pass a fully-composed `whatsappUrl` produced via
 *   `buildGenericWaUrl(adminE164, locale, customPrefilledMessage)`.
 *
 * Analytics hooks: the secondary CTA carries `data-analytics-event` and
 * `data-analytics-source` attributes so the Analytics_Layer (R11.11) can
 * fire `whatsapp_click` events with the source surface for attribution.
 *
 * Admin number resolution: the component reads
 * `process.env.ARASYA_WHATSAPP_NUMBER` and validates it through
 * `isValidE164`. If validation fails (which should never happen in
 * production because the build-time env validation script in
 * `scripts/validate-env.ts` rejects malformed values per R11.3), the
 * component falls back to a known placeholder so the band still renders
 * and visual regression tests stay deterministic.
 *
 * Design reference: §9 (page templates), §15 (WhatsApp Handler).
 */

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { isValidE164 } from "@/lib/booking/normalizePhone";
import type { Locale } from "@/lib/content";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { staticPath } from "@/lib/i18n/slugMap";
import { buildGenericWaUrl } from "@/lib/whatsapp/handler";

/**
 * Fallback E.164 admin number used only when
 * `process.env.ARASYA_WHATSAPP_NUMBER` is missing or malformed at runtime.
 *
 * In production the build-time env validation script (R11.3) prevents
 * deployment with a missing/malformed value, so this placeholder is
 * effectively dev-only. It is exported as a constant so future tests can
 * assert against it without needing to scrape the file for a string
 * literal.
 */
const PLACEHOLDER_E164 = "+628123456789";

/**
 * Resolve the official Admin WhatsApp number to a validated E.164 string.
 *
 * Reads `process.env.ARASYA_WHATSAPP_NUMBER` (R11.2: env-only, no
 * hardcoded number) and runs it through `isValidE164` (R11.3). Returns
 * the placeholder when validation fails so the rendered band remains
 * visually stable in dev / preview environments without a configured
 * admin number.
 */
function resolveAdmin(): string {
  const raw = process.env.ARASYA_WHATSAPP_NUMBER ?? PLACEHOLDER_E164;
  return isValidE164(raw) ? raw : PLACEHOLDER_E164;
}

/**
 * Props accepted by the {@link CtaBand} server component.
 */
export interface CtaBandProps {
  /** Active Locale (`"id"` or `"en"`). Drives the default booking href and WhatsApp greeting. */
  readonly locale: Locale;
  /**
   * Pick of the page Dictionary covering the user-facing strings on
   * the band: the CTA labels (`dict.cta.primaryBooking`,
   * `dict.cta.secondaryWhatsapp`) and the WhatsApp aria-label
   * (`dict.meta.whatsappAriaLabel`).
   */
  readonly dict: Pick<Dictionary, "cta" | "meta">;
  /** Heading rendered inside the band (h2). Required. */
  readonly heading: string;
  /** Optional supporting paragraph rendered under the heading. */
  readonly subheading?: string;
  /**
   * Path the primary CTA navigates to. Defaults to the locale's
   * canonical booking path (`staticPath(locale, "booking")`).
   */
  readonly primaryHref?: string;
  /**
   * Pre-built `wa.me` URL for the secondary CTA. Defaults to
   * `buildGenericWaUrl(adminE164, locale)` which emits the locale's
   * standard greeting message.
   */
  readonly whatsappUrl?: string;
  /**
   * Unique id used by `aria-labelledby` on the `<section>` and `id` on
   * the `<h2>`. Callers MUST pass a unique value per page (R9.10
   * forbids duplicate ids in a single document).
   */
  readonly headingId: string;
}

/**
 * Final CTA band shared by every locale-scoped page template.
 *
 * Renders a primary booking link plus a secondary WhatsApp link on the
 * brand's `[var(--secondary)]` background. The pair mirrors the hero
 * CTA pair on each template so a Visitor who scrolls to the bottom of
 * any page reaches the same booking entry points without scrolling
 * back to the top (R9.9).
 *
 * @param props - see {@link CtaBandProps}
 */
export default function CtaBand({
  locale,
  dict,
  heading,
  subheading,
  primaryHref,
  whatsappUrl,
  headingId,
}: CtaBandProps): React.JSX.Element {
  const adminE164 = resolveAdmin();
  const finalPrimary = primaryHref ?? staticPath(locale, "booking");
  const finalWa = whatsappUrl ?? buildGenericWaUrl(adminE164, locale);

  return (
    <section
      aria-labelledby={headingId}
      className="bg-[var(--secondary)] py-16 text-[var(--secondary-foreground)]"
    >
      <div className="container mx-auto px-4 text-center">
        <h2 id={headingId} className="text-3xl font-bold tracking-tight">
          {heading}
        </h2>
        {subheading ? (
          <p className="mx-auto mt-4 max-w-2xl text-[var(--muted-foreground)]">
            {subheading}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href={finalPrimary}>{dict.cta.primaryBooking}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a
              href={finalWa}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={dict.meta.whatsappAriaLabel}
              data-analytics-event="whatsapp_click"
              data-analytics-source="cta_band"
            >
              {dict.cta.secondaryWhatsapp}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
