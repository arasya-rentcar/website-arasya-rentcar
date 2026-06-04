/**
 * Inline WhatsApp CTA — contextual hero CTA shared by the City, Country,
 * Vehicle, Airport_Transfer, and Service page templates (R11.8).
 *
 * This is a pure Server Component (no `"use client"`): it renders a single
 * `<Button asChild>` wrapping an `<a href={waUrl}>` so the button's visual
 * styling and tap-target sizing match the rest of the design system while
 * the underlying anchor still navigates to `wa.me` on click. The component
 * does not own any layout — callers place it inside their hero CTA cluster
 * (e.g. next to a primary "Book now" button) and pick the visual variant
 * that fits the surrounding surface.
 *
 * Why factor it out?
 * Hero sections on subject-scoped pages (city, country, vehicle, airport
 * transfer, service) need a WhatsApp CTA whose prefilled message names the
 * page subject — for example, "I'd like to book a chauffeur car rental in
 * Bogor" on the Bogor city page versus "…in Bali" on the Bali city page.
 * Templates previously composed the `wa.me` URL inline with their own
 * `<a href={waUrl}>` block, which duplicated the env-read + validate +
 * placeholder-fallback dance and the analytics data-attributes across five
 * templates. This component centralizes that pattern so future tweaks
 * (e.g. an additional analytics attribute, a new variant) only need to
 * land in one file.
 *
 * Requirements:
 * - R11.8  Hero sections on city / country / vehicle / airport-transfer /
 *          service pages SHALL render a contextual WhatsApp CTA whose
 *          prefilled message includes the page subject. The component
 *          accepts a `prefilledMessage` prop the caller composes with the
 *          subject string and passes through to {@link buildGenericWaUrl};
 *          when omitted, the locale's default greeting is used so the
 *          component remains usable in surfaces where subject context is
 *          not available.
 * - R11.2  The Admin number is read from `process.env.ARASYA_WHATSAPP_NUMBER`
 *          at render time and validated through {@link isValidE164}; the
 *          fallback constant is used only when validation fails (which
 *          should not happen in production thanks to the build-time env
 *          validator from R11.3 / `scripts/validate-env.ts`).
 * - R11.9  The `<Button size="lg">` variant renders a 40-pixel-tall
 *          control whose horizontal padding plus inherited touch padding
 *          comfortably exceeds the 44×44 CSS-pixel minimum tap target.
 * - R11.11 The anchor carries `data-analytics-event="whatsapp_click"` and
 *          `data-analytics-source={analyticsSource}` so the
 *          Analytics_Layer (task 11.4) can attribute clicks to the surface
 *          that produced them (e.g. `"city_hero"`, `"vehicle_hero"`).
 *
 * Design reference: §9 (page templates), §15 (WhatsApp Handler).
 */

import { Button } from "@/components/ui/button";
import { isValidE164 } from "@/lib/booking/normalizePhone";
import type { Locale } from "@/lib/content";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { buildGenericWaUrl } from "@/lib/whatsapp/handler";

/**
 * Fallback E.164 admin number used only when
 * `process.env.ARASYA_WHATSAPP_NUMBER` is missing or malformed at
 * render time. In production the build-time env validator (R11.3)
 * blocks deployment with a malformed value, so this placeholder is
 * effectively dev-only. Mirrors the constant used in {@link CtaBand}
 * so visual regression tests stay deterministic across surfaces.
 */
const PLACEHOLDER_E164 = "+628123456789";

/**
 * Resolve the official Admin WhatsApp number to a validated E.164
 * string (R11.2, R11.3). Reads the env value, runs it through
 * {@link isValidE164}, and returns the placeholder when validation
 * fails so the rendered CTA stays usable in dev/preview environments
 * without a configured admin number.
 */
function resolveAdmin(): string {
  const raw = process.env.ARASYA_WHATSAPP_NUMBER ?? PLACEHOLDER_E164;
  return isValidE164(raw) ? raw : PLACEHOLDER_E164;
}

/**
 * Props accepted by the {@link InlineWhatsAppCta} server component.
 */
export interface InlineWhatsAppCtaProps {
  /** Active Locale (`"id"` or `"en"`). Drives the WhatsApp greeting fallback. */
  readonly locale: Locale;
  /**
   * Pick of the page Dictionary covering the user-facing strings on
   * the CTA: the WhatsApp button label (`dict.cta.secondaryWhatsapp`)
   * and the WhatsApp aria-label (`dict.meta.whatsappAriaLabel`).
   */
  readonly dict: Pick<Dictionary, "cta" | "meta">;
  /**
   * Custom prefilled WhatsApp message. Overrides the locale default
   * greeting from {@link buildGenericWaUrl}. Callers compose this with
   * the page subject (e.g. `"…di Bogor"`) so the resulting chat opens
   * with the right context for the Admin.
   */
  readonly prefilledMessage?: string;
  /**
   * Source surface tag emitted as `data-analytics-source` for the
   * Analytics_Layer (R11.11). Use a stable, snake-case identifier so
   * downstream attribution stays consistent across deploys —
   * suggested values: `"city_hero"`, `"country_hero"`,
   * `"vehicle_hero"`, `"airport_transfer_hero"`, `"service_hero"`.
   */
  readonly analyticsSource: string;
  /**
   * Visual variant.
   * - `"primary"` (default): filled green button (the `default`
   *   button variant in the design system, which paints with
   *   `--primary` — the brand green).
   * - `"outline"`: bordered button used when the surrounding surface
   *   already carries the primary CTA, so the WhatsApp action stays
   *   secondary.
   */
  readonly variant?: "primary" | "outline";
  /**
   * Button size. `"lg"` (default) matches the hero CTA cluster size;
   * `"default"` is available for tighter surfaces where the larger
   * button would crowd surrounding content.
   */
  readonly size?: "default" | "lg";
}

/**
 * Inline WhatsApp CTA for hero sections (R11.8).
 *
 * Renders a single `<Button asChild>` wrapping an `<a href={waUrl}>`.
 * The WhatsApp URL carries a page-specific prefilled message when the
 * caller provides one (e.g. "…in Bogor"), otherwise falls back to the
 * locale's standard greeting from {@link buildGenericWaUrl}.
 *
 * Analytics: emits `whatsapp_click` with the supplied source tag via
 * data-attributes the Analytics_Layer reads on click (task 11.4).
 *
 * @example City hero CTA in Indonesian
 * ```tsx
 * <InlineWhatsAppCta
 *   locale="id"
 *   dict={dict}
 *   prefilledMessage={`${dict.meta.whatsappGreeting} saya ingin sewa mobil dengan supir di ${city.name}.`}
 *   analyticsSource="city_hero"
 * />
 * ```
 *
 * @example Vehicle hero — outline variant when sitting next to the
 * primary "Book now" button in the hero
 * ```tsx
 * <InlineWhatsAppCta
 *   locale={locale}
 *   dict={dict}
 *   prefilledMessage={message}
 *   analyticsSource="vehicle_hero"
 *   variant="outline"
 * />
 * ```
 */
export default function InlineWhatsAppCta({
  locale,
  dict,
  prefilledMessage,
  analyticsSource,
  variant = "primary",
  size = "lg",
}: InlineWhatsAppCtaProps): React.JSX.Element {
  const adminE164 = resolveAdmin();
  const waUrl = buildGenericWaUrl(adminE164, locale, prefilledMessage);

  return (
    <Button
      asChild
      size={size}
      variant={variant === "primary" ? "default" : "outline"}
    >
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={dict.meta.whatsappAriaLabel}
        data-analytics-event="whatsapp_click"
        data-analytics-source={analyticsSource}
      >
        {dict.cta.secondaryWhatsapp}
      </a>
    </Button>
  );
}
