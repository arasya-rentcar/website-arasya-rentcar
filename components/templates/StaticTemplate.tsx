import Link from "next/link";

import { Button } from "@/components/ui/button";
import Breadcrumb from "@/components/seo/Breadcrumb";
import { isValidE164 } from "@/lib/booking/normalizePhone";
import type { Locale } from "@/lib/content";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { staticPath } from "@/lib/i18n/slugMap";

/**
 * Static_Page template (R9.10, design §9 StaticTemplate).
 *
 * Server Component — renders the shared surface for the FAQ, Terms, and
 * Privacy pages. Each route file (`app/[locale]/{faq,syarat-ketentuan,
 * kebijakan-privasi,terms,privacy}/page.tsx`) supplies the page-specific
 * `title`, `description`, and pre-compiled `bodyMdx` so the surrounding
 * chrome (breadcrumb, hero, prose container, final CTA band) stays
 * byte-stable across pages and locales.
 *
 * Section order (R9.10, design §9):
 *
 *   1. breadcrumb — `<Breadcrumb>` so the visible trail and the
 *      `BreadcrumbList` JSON-LD (R8.4) ship together
 *   2. hero — single `<h1 id="static-hero-heading">` with the page
 *      title, followed by the page description as a paragraph
 *   3. body — `<section aria-labelledby="static-body-heading">` with a
 *      visually-hidden `<h2 className="sr-only">` and a `prose
 *      prose-neutral dark:prose-invert max-w-none` container that
 *      hosts the pre-compiled MDX node
 *   4. ctaBand — standard primary-booking + secondary-WhatsApp pair
 *      (R9.9), mirroring `BookingTemplate`
 *
 * R9.10 (accessibility): exactly one `<h1>` (the hero headline), every
 * `<section>` carries `aria-labelledby` pointing at its own heading,
 * and the breadcrumb uses `<Breadcrumb>` so both the visible trail and
 * the `BreadcrumbList` JSON-LD ship together.
 *
 * The anti-fraud notice block from `BookingTemplate` and
 * `ContactTemplate` is intentionally NOT rendered here — per design §9
 * the anti-fraud surface is scoped to the booking and contact pages
 * (R13.5) and the static-page surface stays narrowly focused on the
 * MDX-authored body.
 */

export interface StaticTemplateProps {
  readonly locale: Locale;
  readonly title: string;
  readonly description: string;
  /**
   * Pre-compiled MDX body. The route is responsible for compiling /
   * importing the MDX module (Phase 15 will populate the real content
   * under `content/static/{locale}/{slug}.mdx`); this template treats
   * the input as an opaque React node and slots it directly into the
   * prose container.
   */
  readonly bodyMdx: React.ReactNode;
  readonly breadcrumbCurrentLabel: string;
  readonly breadcrumbCurrentPath: string;
  readonly dict: Pick<Dictionary, "cta" | "common" | "meta">;
}

/**
 * Placeholder admin WhatsApp number used when `ARASYA_WHATSAPP_NUMBER`
 * is unset. Mirrors `components/templates/BookingTemplate.tsx` and
 * `components/templates/ContactTemplate.tsx` so every WhatsApp surface
 * displays the same digits during local dev. The production build-time
 * env validator (R11.3) ensures the real number is present before
 * deploy.
 *
 * TODO(phase 13): replace the direct env read with the shared
 * WhatsApp_Handler helper once task 8.4 lands.
 */
const PLACEHOLDER_WHATSAPP_E164 = "+628123456789";

/**
 * Resolve the admin WhatsApp number from the environment, falling back
 * to {@link PLACEHOLDER_WHATSAPP_E164} in local dev.
 */
function resolveAdminWhatsapp(): string {
  const raw = process.env.ARASYA_WHATSAPP_NUMBER;
  if (typeof raw === "string" && isValidE164(raw)) {
    return raw;
  }
  return PLACEHOLDER_WHATSAPP_E164;
}

/**
 * Build the `wa.me` URL for the resolved admin number. `wa.me` requires
 * the digits without the leading `+`.
 */
function buildWaMeUrl(e164: string): string {
  const digits = e164.startsWith("+") ? e164.slice(1) : e164;
  return `https://wa.me/${digits}`;
}

export default function StaticTemplate({
  locale,
  title,
  description,
  bodyMdx,
  breadcrumbCurrentLabel,
  breadcrumbCurrentPath,
  dict,
}: StaticTemplateProps): React.JSX.Element {
  const isId = locale === "id";

  // Locale-scoped breadcrumb root labels. Inlined here because the
  // template's `Pick<Dictionary, ...>` surface intentionally excludes
  // `nav` to keep the prop contract minimal — these two values come
  // from a stable bilingual pair and never change between static pages.
  const homeLabel = isId ? "Beranda" : "Home";
  const homePath = isId ? "/" : "/en";

  // CTA band targets: primary cycles to the booking page, secondary
  // opens the official admin WhatsApp. Same pattern as `BookingTemplate`
  // and `ContactTemplate` so the visual language stays consistent.
  const adminE164 = resolveAdminWhatsapp();
  const adminWaHref = buildWaMeUrl(adminE164);
  const bookingHref = staticPath(locale, "booking");

  // Locale-scoped CTA-band copy. Not in the dictionary because it is
  // shared across three distinct pages with the same intent and adding
  // a `static.*` namespace would only duplicate this single pair.
  const ctaBandHeading = isId ? "Siap memesan?" : "Ready to book?";
  const ctaBandSubheading = isId
    ? "Hubungi admin resmi via WhatsApp untuk reservasi cepat dan harga transparan."
    : "Reach the official admin on WhatsApp for fast, transparent bookings.";

  // Visually-hidden body heading. Provides the `aria-labelledby` target
  // required by R9.10 without introducing a second visible <h-> in the
  // page's heading hierarchy — the page's main heading is the hero
  // <h1>, and the MDX body itself contributes its own <h2>/<h3> headings.
  const bodyHeadingLabel = isId ? "Isi halaman" : "Page content";

  return (
    <div className="flex flex-col">
      {/*
       * 1. Breadcrumb (R8.4). `<Breadcrumb>` ships both the visible
       *    trail and the matching `BreadcrumbList` JSON-LD so the two
       *    cannot drift.
       */}
      <div className="container mx-auto px-4 pt-6">
        <Breadcrumb
          items={[{ name: homeLabel, path: homePath }]}
          currentLabel={breadcrumbCurrentLabel}
          currentPath={breadcrumbCurrentPath}
        />
      </div>

      {/*
       * 2. Hero — exactly one `<h1>` per R9.10. The description is
       *    rendered as a sibling paragraph rather than an `<h2>` so the
       *    heading hierarchy stays clean for the MDX body that follows.
       */}
      <section
        aria-labelledby="static-hero-heading"
        className="container mx-auto px-4 py-16 md:py-24"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h1
            id="static-hero-heading"
            className="text-4xl font-bold tracking-tight text-[var(--foreground)] md:text-5xl"
          >
            {title}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[var(--muted-foreground)] md:text-xl">
            {description}
          </p>
        </div>
      </section>

      {/*
       * 3. Body — the pre-compiled MDX node lands inside a prose
       *    container that constrains line-length and applies the
       *    typography ramp. The visually-hidden `<h2>` exists solely
       *    to satisfy R9.10's "every <section> carries `aria-labelledby`
       *    pointing at its own heading" rule; the MDX content owns the
       *    visible heading hierarchy from `<h2>` down.
       */}
      <section
        aria-labelledby="static-body-heading"
        className="container mx-auto px-4 py-8"
      >
        <h2 id="static-body-heading" className="sr-only">
          {bodyHeadingLabel}
        </h2>
        <div className="prose prose-neutral dark:prose-invert mx-auto max-w-none">
          {bodyMdx}
        </div>
      </section>

      {/*
       * 4. Final CTA band (R9.9). Mirrors the standard primary-booking +
       *    secondary-WhatsApp pair used by every other template so a
       *    visitor reaching the bottom of a static page lands on the
       *    same conversion actions surfaced everywhere else.
       */}
      <section
        aria-labelledby="static-cta-heading"
        className="bg-[var(--secondary)] py-16 text-[var(--secondary-foreground)]"
      >
        <div className="container mx-auto px-4 text-center">
          <h2
            id="static-cta-heading"
            className="text-3xl font-bold tracking-tight"
          >
            {ctaBandHeading}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[var(--muted-foreground)]">
            {ctaBandSubheading}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={bookingHref}>{dict.cta.primaryBooking}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a
                href={adminWaHref}
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
    </div>
  );
}
