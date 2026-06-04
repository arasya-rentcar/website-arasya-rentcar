import Link from "next/link";
import { BadgeCheck, ShieldCheck, UserCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import BookingFormClientWrapper from "@/components/booking/BookingFormClientWrapper";
import Breadcrumb from "@/components/seo/Breadcrumb";
import {
  formatIndonesianDisplay,
  isValidE164,
} from "@/lib/booking/normalizePhone";
import type { Locale } from "@/lib/content";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { staticPath } from "@/lib/i18n/slugMap";

/**
 * Booking_Page template (R9.7, R13.5, design §9).
 *
 * Server Component — rendered under
 * `app/[locale]/booking/page.tsx` with no client-side JavaScript at this
 * stage. Phase 8 (tasks 8.3 / 8.17) introduces the client `<BookingForm>`
 * (RHF + Zod + WhatsApp_Handler) and slots it into the placeholder card
 * marked below; the section order, breadcrumb, anti-fraud notice, and
 * CTA band stay byte-stable across that change so the surrounding page
 * surface does not shift when the form lands.
 *
 * Section order (R9.7 enumerates five items in exact order: hero,
 * Booking_Form, alternative WhatsApp CTA, anti-fraud notice with the
 * official Admin number, and FAQs about booking). This template ships
 * the structural surface for items 1–4 and 6 plus a breadcrumb header
 * (R8.4) and a trust-signals strip that consolidates the "transparent
 * rates / professional chauffeurs / official WhatsApp admin" trio
 * called out throughout R9.7's narrative; the booking-FAQ block is
 * intentionally omitted until the FAQ feeder lands and is tracked by an
 * R9.10-compliant TODO at its position rather than rendered as an empty
 * shell:
 *
 *   1. breadcrumb
 *   2. hero (booking intent + chauffeur-only reassurance, R1.6)
 *   3. bookingForm — placeholder Card; Phase 8 task 8.17 mounts the
 *      real `<BookingForm>` here
 *   4. trustSignals — 3-card grid (transparent rates / professional
 *      chauffeurs / official WhatsApp admin)
 *   5. antiFraudNotice — Alert variant="destructive" carrying the same
 *      single official admin number used in `ContactTemplate`
 *   6. ctaBand — primary booking-CTA + secondary WhatsApp pair
 *
 * R13.5 interaction: the anti-fraud notice surfaces the single official
 * admin number paired with both `wa.me` and `tel:` handles, so the
 * booking page satisfies R13.5's "visible without interaction"
 * requirement on first paint. Copy is sourced from
 * `dict.footer.antiFraudNotice` so the Phase 12 forbidden-phrase lint
 * sees the same string whether it runs over the footer, contact, or
 * booking page.
 *
 * R9.10 (accessibility): exactly one `<h1>` (the hero headline), every
 * `<section>` carries `aria-labelledby` pointing at its own `<h2>`, and
 * the breadcrumb uses `<Breadcrumb>` so both the visible trail and the
 * `BreadcrumbList` JSON-LD (R8.4) ship together.
 */

export interface BookingTemplateProps {
  readonly locale: Locale;
  readonly dict: Pick<Dictionary, "cta" | "common" | "meta" | "footer">;
}

/**
 * Placeholder admin WhatsApp number used when `ARASYA_WHATSAPP_NUMBER`
 * is unset. Mirrors `components/templates/ContactTemplate.tsx` and
 * `components/nav/Footer.tsx` so every anti-fraud surface displays the
 * same digits. The production build-time env validator (R11.3) ensures
 * the real number is present before deploy.
 *
 * TODO(phase 13): replace the direct env read with the shared
 * WhatsApp_Handler helper once task 8.4 lands so channel URLs, tel
 * fallbacks, and display formatting all route through one module.
 */
const PLACEHOLDER_WHATSAPP_E164 = "+628123456789";

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

export default function BookingTemplate({
  locale,
  dict,
}: BookingTemplateProps): React.JSX.Element {
  const isId = locale === "id";

  // Admin-number surfaces: same E.164 value feeds the `tel:`, `wa.me`,
  // and the human-readable display used inside the anti-fraud notice.
  const adminE164 = resolveAdminWhatsapp();
  const adminDisplay = formatIndonesianDisplay(adminE164);
  const adminWaHref = buildWaMeUrl(adminE164);
  const adminTelHref = `tel:${adminE164}`;

  // Locale-scoped labels. Not part of the `Pick<Dictionary, ...>`
  // surface the template accepts, so inlined here. A future
  // `booking.*` namespace on the dictionary schema would be the
  // natural migration target.
  const homeLabel = isId ? "Beranda" : "Home";
  const homePath = isId ? "/" : "/en";
  const breadcrumbCurrentLabel = isId ? "Booking" : "Booking";

  const heroHeadline = isId
    ? "Pesan sewa mobil dengan supir profesional"
    : "Book your chauffeur car rental";

  // R1.6: hero copy uses the chauffeur-only phrase from the dictionary
  // so the Phase 12 forbidden-phrase lint sees the expected string on
  // the booking page as well as the home / contact pages.
  const chauffeurPhrase = dict.common.chauffeurOnlyPhrase;
  const heroSubheadline = isId
    ? `Layanan ${chauffeurPhrase} untuk perjalanan dalam dan luar kota. Isi data perjalanan Anda — admin resmi akan mengonfirmasi via WhatsApp.`
    : `Our ${chauffeurPhrase} service covers in-town and out-of-town trips. Share your trip details — the official admin will confirm via WhatsApp.`;

  const formHeading = isId ? "Formulir pemesanan" : "Booking form";

  const trustHeading = isId ? "Mengapa memesan di sini" : "Why book with us";
  const trustRegionLabel = isId
    ? "Alasan memesan di Arasya Rentcar"
    : "Reasons to book with Arasya Rentcar";

  const trustSignals = isId
    ? [
        {
          key: "rates",
          icon: BadgeCheck,
          title: "Harga transparan",
          description:
            "Tarif sudah mencakup supir dan bahan bakar dasar dengan rincian yang jelas sejak awal — tanpa biaya tersembunyi.",
        },
        {
          key: "chauffeurs",
          icon: UserCheck,
          title: "Supir profesional",
          description:
            "Supir berpengalaman, paham rute kota utama, dan menjaga etika pelayanan penumpang sepanjang perjalanan.",
        },
        {
          key: "admin",
          icon: ShieldCheck,
          title: "WhatsApp admin resmi",
          description:
            "Konfirmasi reservasi hanya melalui satu nomor WhatsApp admin resmi Arasya Rentcar yang tertera di halaman ini.",
        },
      ]
    : [
        {
          key: "rates",
          icon: BadgeCheck,
          title: "Transparent rates",
          description:
            "Rates include the chauffeur and basic fuel with a clear breakdown from the start — no hidden fees.",
        },
        {
          key: "chauffeurs",
          icon: UserCheck,
          title: "Professional chauffeurs",
          description:
            "Experienced chauffeurs who know the main city routes and maintain a courteous standard throughout your trip.",
        },
        {
          key: "admin",
          icon: ShieldCheck,
          title: "Official WhatsApp admin",
          description:
            "Booking confirmation comes only from the single official Arasya Rentcar admin WhatsApp number shown on this page.",
        },
      ];

  // Anti-fraud notice copy. R13.5 requires the notice to name the
  // single official admin number; the dictionary copy already states
  // the general warning, and we append the admin line (label +
  // formatted number) so the section is self-contained and the
  // `+62 xxx-xxxx-xxxx` grouping from R13.6 is visible without
  // scrolling back to the footer.
  const antiFraudRegionLabel = isId
    ? "Pemberitahuan anti-penipuan"
    : "Anti-fraud notice";

  const ctaBandHeading = isId
    ? "Butuh bantuan langsung?"
    : "Need direct assistance?";
  const ctaBandSubheading = isId
    ? "Tim admin resmi siap menjawab pertanyaan dan memproses reservasi Anda lewat WhatsApp."
    : "Our official admin team is ready to answer questions and process your booking via WhatsApp.";

  // Self-path for `<Breadcrumb>`. `staticPath(locale, "booking")` returns
  // `/booking` or `/en/booking`, which is the canonical URL for this page.
  const selfPath = staticPath(locale, "booking");

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
       * 2. Hero (R9.7 item 1). Single `<h1>` per R9.10; the secondary
       *    CTA goes straight to the official admin WhatsApp so a
       *    visitor who prefers chat over the form can convert above
       *    the fold.
       */}
      <section
        aria-labelledby="booking-hero-heading"
        className="container mx-auto px-4 py-16 md:py-24"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h1
            id="booking-hero-heading"
            className="text-4xl font-bold tracking-tight text-[var(--foreground)] md:text-5xl"
          >
            {heroHeadline}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[var(--muted-foreground)] md:text-xl">
            {heroSubheadline}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
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

      {/*
       * 3. Booking form (R9.7 item 2). Phase 8 owns the real form —
       *    task 8.3 builds `<BookingForm>` (RHF + Zod + WhatsApp_Handler
       *    wiring) and task 8.17 mounts it inside this card. Until
       *    then we ship a placeholder Card that explains the situation
       *    and points the visitor at the WhatsApp fallback so the page
       *    still converts.
       */}
      <section
        aria-labelledby="booking-form-heading"
        className="container mx-auto px-4 py-8"
      >
        <div className="mx-auto max-w-2xl">
          <h2
            id="booking-form-heading"
            className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
          >
            {formHeading}
          </h2>
          <Card className="mt-6">
            <CardContent className="pt-6">
              <BookingFormClientWrapper locale={locale} dict={dict} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/*
       * 4. Trust signals (R9.7 narrative). Three-card grid covering
       *    transparent rates, professional chauffeurs, and the
       *    official WhatsApp admin trio. Mirrors the
       *    `home.trustSignals` shape so the visual language stays
       *    consistent across pages even though the booking variant
       *    uses booking-specific copy rather than the home dictionary.
       */}
      <section
        aria-labelledby="booking-trust-heading"
        className="container mx-auto px-4 py-16"
      >
        <div className="mb-8 text-center md:text-left">
          <h2
            id="booking-trust-heading"
            className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
          >
            {trustHeading}
          </h2>
          <p className="sr-only">{trustRegionLabel}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trustSignals.map((signal) => {
            const Icon = signal.icon;
            return (
              <Card key={signal.key}>
                <CardHeader>
                  <Icon
                    aria-hidden="true"
                    className="h-8 w-8 text-[var(--primary)]"
                  />
                  <CardTitle>{signal.title}</CardTitle>
                  <CardDescription>{signal.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/*
       * 5. Anti-fraud notice (R9.7 item 4, R13.5, R13.6). Prominent
       *    Alert placed immediately after the trust strip so a visitor
       *    who just read about the official WhatsApp admin sees the
       *    warning at the same scroll depth. The admin number is
       *    rendered in the `+62 xxx-xxxx-xxxx` grouping required by
       *    R13.6 via `formatIndonesianDisplay`, paired with a `tel:`
       *    and a `wa.me` link so the number is both readable and
       *    actionable.
       */}
      <section
        aria-labelledby="booking-antifraud-heading"
        aria-label={antiFraudRegionLabel}
        className="container mx-auto px-4 py-8"
      >
        <Alert variant="destructive">
          <AlertTitle id="booking-antifraud-heading">
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
       * TODO(R9.7): booking-FAQs (3–6 items). Omitted until the
       * Content_Layer FAQ feeder lands; per R9.10 we render no empty
       * shell rather than a partial section.
       */}

      {/*
       * 6. Final CTA band (R9.9). Mirrors the standard primary-booking
       *    + secondary-WhatsApp pair. The primary link cycles back to
       *    `/booking` itself (the visitor is already here, but keeping
       *    the same shape across pages means analytics tagging in
       *    later tasks only has one component to target) and the
       *    secondary link opens the official admin WhatsApp.
       */}
      <section
        aria-labelledby="booking-cta-heading"
        className="bg-[var(--secondary)] py-16 text-[var(--secondary-foreground)]"
      >
        <div className="container mx-auto px-4 text-center">
          <h2
            id="booking-cta-heading"
            className="text-3xl font-bold tracking-tight"
          >
            {ctaBandHeading}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[var(--muted-foreground)]">
            {ctaBandSubheading}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={selfPath}>{dict.cta.primaryBooking}</Link>
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
