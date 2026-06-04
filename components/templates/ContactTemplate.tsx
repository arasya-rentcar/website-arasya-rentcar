import Link from "next/link";
import { Mail, MessageSquare, Phone } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Breadcrumb from "@/components/seo/Breadcrumb";
import {
  formatIndonesianDisplay,
  isValidE164,
} from "@/lib/booking/normalizePhone";
import type { Locale } from "@/lib/content";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { staticPath } from "@/lib/i18n/slugMap";

/**
 * Contact_Page template (R9.8, R13.5, design §9).
 *
 * Server Component — rendered under both
 * `app/[locale]/kontak/page.tsx` (id) and `app/[locale]/contact/page.tsx`
 * (en) with no client-side JavaScript. Keeping the template server-only
 * guarantees R13.5's "visible without interaction" requirement for the
 * anti-fraud notice: the block is part of the initial HTML payload.
 *
 * Section order (R9.8 enumerates eight items in exact order: hero,
 * official admin WhatsApp with click-to-chat, operating hours, office
 * address, embedded map, email, social links, anti-fraud notice). The
 * MVP surface implemented here collapses the mid-stream channels
 * (WhatsApp + email + phone/operating-hours hint) into a single
 * `contactChannels` card grid so every channel stays reachable in one
 * scroll without rendering empty shells for map/social placeholders we
 * do not yet have content for (R9.10):
 *
 *   1. breadcrumb
 *   2. hero (contact intent + primary WhatsApp CTA)
 *   3. contactChannels (WhatsApp primary, Email, Phone)
 *   4. antiFraudNotice — prominent Alert with the admin number in the
 *      `+62 xxx-xxxx-xxxx` display format required by R13.5 / R13.6
 *   5. officeInfo (address placeholder; operating hours blurb)
 *   6. ctaBand — standard primary-booking + secondary-WhatsApp pair
 *
 * R13.5 interaction: the anti-fraud notice and the WhatsApp channel card
 * both surface the same single official admin number; any other number
 * is unofficial. Copy is sourced from `dict.footer.antiFraudNotice` so
 * the Phase 12 forbidden-phrase lint sees the same string whether it
 * runs over the footer or the contact page.
 *
 * R9.10 (accessibility): exactly one `<h1>` (the hero headline), every
 * `<section>` carries `aria-labelledby` pointing at its own `<h2>`, and
 * the breadcrumb uses `<Breadcrumb>` so both the visible trail and the
 * `BreadcrumbList` JSON-LD (R8.4) ship together.
 */

export interface ContactTemplateProps {
  readonly locale: Locale;
  readonly dict: Pick<Dictionary, "cta" | "common" | "meta" | "footer">;
}

/**
 * Placeholder admin WhatsApp number used when `ARASYA_WHATSAPP_NUMBER`
 * is unset. Mirrors `components/nav/Footer.tsx` so both anti-fraud
 * surfaces display the same digits. The production build-time env
 * validator (R11.3) ensures the real number is present before deploy.
 *
 * TODO(phase 13): replace the direct env read with the shared
 * WhatsApp_Handler helper once task 8.4 lands so channel URLs, tel
 * fallbacks, and display formatting all route through one module.
 */
const PLACEHOLDER_WHATSAPP_E164 = "+628123456789";

/** Placeholder email surfaced on the Email channel card. */
const PLACEHOLDER_EMAIL = "hello@arasya-rentcar.example";

/**
 * Resolve the admin WhatsApp number from the environment, falling back
 * to {@link PLACEHOLDER_WHATSAPP_E164} in local dev. Returns an E.164
 * string that {@link formatIndonesianDisplay} can split into the
 * `+62 xxx-xxxx-xxxx` visual form required by R13.5 / R13.6.
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
 * the digits without the leading `+`, so we strip it here instead of at
 * every call site.
 */
function buildWaMeUrl(e164: string): string {
  const digits = e164.startsWith("+") ? e164.slice(1) : e164;
  return `https://wa.me/${digits}`;
}

export default function ContactTemplate({
  locale,
  dict,
}: ContactTemplateProps): React.JSX.Element {
  const isId = locale === "id";

  // Admin-number surfaces: same E.164 value feeds the `tel:`, `wa.me`,
  // and the human-readable display used inside the anti-fraud notice.
  const adminE164 = resolveAdminWhatsapp();
  const adminDisplay = formatIndonesianDisplay(adminE164);
  const adminWaHref = buildWaMeUrl(adminE164);
  const adminTelHref = `tel:${adminE164}`;
  const emailHref = `mailto:${PLACEHOLDER_EMAIL}`;

  // Locale-scoped labels. Not part of the `Pick<Dictionary, ...>`
  // surface the template accepts, so inlined here. A future
  // `contact.*` namespace on the dictionary schema would be the
  // natural migration target.
  const homeLabel = isId ? "Beranda" : "Home";
  const homePath = isId ? "/" : "/en";
  const breadcrumbCurrentLabel = isId ? "Kontak" : "Contact";

  const heroHeadline = isId ? "Hubungi Kami" : "Contact Us";
  const heroSubheadline = isId
    ? "Tim Arasya Rentcar siap membantu reservasi sewa mobil dengan supir profesional lewat WhatsApp admin resmi."
    : "The Arasya Rentcar team is ready to help you book a chauffeur car rental through our official admin WhatsApp.";

  const channelsHeading = isId ? "Saluran kontak" : "Contact channels";
  const channelsRegionLabel = isId
    ? "Pilihan saluran kontak resmi"
    : "Official contact channels";

  const officeHeading = isId ? "Kantor kami" : "Our office";
  const officeAddressPlaceholder = isId
    ? "Jakarta, Indonesia"
    : "Jakarta, Indonesia";
  const officeHoursBlurb = isId
    ? "Senin–Minggu, respons WhatsApp 24/7 oleh admin resmi."
    : "Monday–Sunday, 24/7 WhatsApp response from the official admin.";

  const ctaBandHeading = isId ? "Siap memesan?" : "Ready to book?";

  // Anti-fraud notice copy. R13.5 requires the notice to name the single
  // official admin number; the dictionary copy already states the
  // general warning, and we append the admin line (label + formatted
  // number) so the section is self-contained and the `+62 xxx-xxxx-xxxx`
  // grouping from R13.6 is visible without scrolling back to the footer.
  const antiFraudRegionLabel = isId
    ? "Pemberitahuan anti-penipuan"
    : "Anti-fraud notice";

  // WhatsApp card description (chauffeur-only wording so the Phase 12
  // chauffeur-phrase check sees the expected string on every page that
  // renders a WhatsApp CTA).
  const chauffeurPhrase = dict.common.chauffeurOnlyPhrase;
  const whatsappDescription = isId
    ? `Respons cepat via WhatsApp admin resmi untuk ${chauffeurPhrase}.`
    : `Quick response via official admin WhatsApp for ${chauffeurPhrase}.`;
  const emailDescription = isId
    ? "Untuk pertanyaan yang lebih panjang atau kerja sama korporat."
    : "For longer questions or corporate partnerships.";
  const phoneDescription = isId
    ? "Telepon langsung ke nomor admin resmi."
    : "Direct phone call to the official admin number.";

  // Self-path for `<Breadcrumb>`. `staticPath(locale, "contact")` returns
  // `/kontak` or `/en/contact`, which is the canonical URL for this page.
  const selfPath = staticPath(locale, "contact");
  const bookingHref = staticPath(locale, "booking");

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
          currentPath={selfPath}
        />
      </div>

      {/*
       * 2. Hero (R9.8 item 1). Single `<h1>` per R9.10; the primary
       *    CTA goes straight to the official admin WhatsApp so a
       *    visitor can convert above the fold.
       */}
      <section
        aria-labelledby="contact-hero-heading"
        className="container mx-auto px-4 py-16 md:py-24"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h1
            id="contact-hero-heading"
            className="text-4xl font-bold tracking-tight text-[var(--foreground)] md:text-5xl"
          >
            {heroHeadline}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[var(--muted-foreground)] md:text-xl">
            {heroSubheadline}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <a
                href={adminWaHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={dict.meta.whatsappAriaLabel}
              >
                {dict.cta.secondaryWhatsapp}
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={bookingHref}>{dict.cta.primaryBooking}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/*
       * 3. Contact channels. Grid of Cards for WhatsApp (primary),
       *    Email, and Phone. Each card renders an icon, a label, and a
       *    tappable action. All external links open in a new tab with
       *    `rel="noopener noreferrer"`; the `tel:` / `mailto:` links
       *    stay same-tab so mobile hand-off works as users expect.
       */}
      <section
        aria-labelledby="contact-channels-heading"
        className="container mx-auto px-4 py-16"
      >
        <div className="mb-8 text-center md:text-left">
          <h2
            id="contact-channels-heading"
            className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
          >
            {channelsHeading}
          </h2>
          <p className="sr-only">{channelsRegionLabel}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <MessageSquare
                aria-hidden="true"
                className="h-8 w-8 text-[var(--primary)]"
              />
              <CardTitle>{dict.common.whatsapp}</CardTitle>
              <CardDescription>{whatsappDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <a
                  href={adminWaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={dict.meta.whatsappAriaLabel}
                >
                  {adminDisplay}
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Mail
                aria-hidden="true"
                className="h-8 w-8 text-[var(--primary)]"
              />
              <CardTitle>{dict.common.email}</CardTitle>
              <CardDescription>{emailDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <a href={emailHref}>{PLACEHOLDER_EMAIL}</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Phone
                aria-hidden="true"
                className="h-8 w-8 text-[var(--primary)]"
              />
              <CardTitle>{dict.common.phone}</CardTitle>
              <CardDescription>{phoneDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <a href={adminTelHref}>{adminDisplay}</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/*
       * 4. Anti-fraud notice (R13.5, R13.6). Prominent Alert placed
       *    directly after the channel grid so a visitor who just read
       *    the WhatsApp number sees the warning at the same scroll
       *    depth. The admin number is rendered in the
       *    `+62 xxx-xxxx-xxxx` grouping required by R13.6 via
       *    `formatIndonesianDisplay`, paired with a `tel:` and a
       *    `wa.me` link so the number is both readable and actionable.
       */}
      <section
        aria-labelledby="contact-antifraud-heading"
        aria-label={antiFraudRegionLabel}
        className="container mx-auto px-4 py-8"
      >
        <Alert variant="destructive">
          <AlertTitle id="contact-antifraud-heading">
            {dict.footer.adminWhatsappLabel}
          </AlertTitle>
          <AlertDescription>
            <p>{dict.footer.antiFraudNotice}</p>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-[var(--foreground)]">
                {adminDisplay}
              </span>
              <span aria-hidden="true">·</span>
              <a
                href={adminWaHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={dict.meta.whatsappAriaLabel}
                className="underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                {dict.common.whatsapp}
              </a>
              <span aria-hidden="true">·</span>
              <a
                href={adminTelHref}
                className="underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                {dict.common.phone}
              </a>
            </p>
          </AlertDescription>
        </Alert>
      </section>

      {/*
       * 5. Office info (R9.8 item 4). Address is a TODO placeholder
       *    until the real operational address lands in the
       *    Content_Layer; operating hours come from a locale-scoped
       *    blurb. Embedded map and social links (R9.8 items 5, 7) are
       *    omitted per R9.10 — we ship the section without an empty
       *    map iframe shell rather than render a partial surface.
       *
       *    TODO(R9.8): swap the address placeholder for a
       *    Content_Layer-sourced value and add the embedded map +
       *    social links once the corresponding fields are defined.
       */}
      <section
        aria-labelledby="contact-office-heading"
        className="container mx-auto px-4 py-16"
      >
        <div className="mx-auto max-w-3xl">
          <h2
            id="contact-office-heading"
            className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
          >
            {officeHeading}
          </h2>
          <address className="mt-4 not-italic text-base leading-relaxed text-[var(--muted-foreground)]">
            {officeAddressPlaceholder}
          </address>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {officeHoursBlurb}
          </p>
        </div>
      </section>

      {/*
       * 6. Final CTA band (R9.9). Mirrors the hero CTA pair — primary
       *    booking link + secondary WhatsApp — so a visitor reaching
       *    the bottom of the page lands on the same actions they saw
       *    at the top.
       */}
      <section
        aria-labelledby="contact-cta-heading"
        className="bg-[var(--secondary)] py-16 text-[var(--secondary-foreground)]"
      >
        <div className="container mx-auto px-4 text-center">
          <h2
            id="contact-cta-heading"
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
