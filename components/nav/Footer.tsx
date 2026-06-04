import Link from "next/link";

import {
  formatIndonesianDisplay,
  isValidE164,
} from "@/lib/booking/normalizePhone";
import type { Locale } from "@/lib/i18n/getDictionary";
import { staticPath } from "@/lib/i18n/slugMap";

/**
 * Global site footer (R3.9, R13.5, design §2).
 *
 * Server Component — renders as static HTML so the footer (and its
 * anti-fraud copy, which MUST be visible on every page per R13.5) is
 * delivered without client-side JavaScript. All legal links go through
 * `staticPath()` so locale slugs stay in sync with the central mapping
 * in `lib/i18n/slugMap.ts` (R17.3).
 *
 * Responsibilities
 * ----------------
 *   - Brand and about paragraph.
 *   - Links column: FAQ / Terms / Privacy (R3.9).
 *   - Official admin WhatsApp number in the `+62 xxx-xxxx-xxxx` display
 *     format required by R13.5. The number is read from
 *     `ARASYA_WHATSAPP_NUMBER` (design §20) and formatted via the shared
 *     helper in `lib/booking/normalizePhone.ts`. A placeholder is used
 *     when the env var is missing so local dev still renders correctly;
 *     production builds fail earlier in `scripts/validate-env.ts`.
 *   - Copyright line with `{year}` interpolated from the render-time
 *     `Date`, plus the anti-fraud notice sourced from the dictionary
 *     (R13.5 — copy is translator-managed).
 */
export interface FooterDict {
  readonly about: string;
  readonly links: {
    readonly faq: string;
    readonly terms: string;
    readonly privacy: string;
  };
  readonly antiFraudNotice: string;
  readonly adminWhatsappLabel: string;
  /**
   * Template string containing the literal token `{year}`, e.g.
   * `"© {year} Arasya Rentcar."`. The token is replaced at render time
   * with the current four-digit year.
   */
  readonly copyright: string;
}

export interface FooterProps {
  readonly locale: Locale;
  readonly dict: FooterDict;
}

/**
 * Placeholder number used when `ARASYA_WHATSAPP_NUMBER` is unset. This
 * keeps the footer renderable in local dev and during early-phase content
 * review; production deploys trip the build-time env validator so the real
 * admin number is always present before users see the site.
 */
const PLACEHOLDER_WHATSAPP = "+628123456789";

function resolveAdminWhatsapp(): string {
  const raw = process.env.ARASYA_WHATSAPP_NUMBER;
  if (typeof raw === "string" && isValidE164(raw)) {
    return raw;
  }
  return PLACEHOLDER_WHATSAPP;
}

export default function Footer({
  locale,
  dict,
}: FooterProps): React.JSX.Element {
  const year = new Date().getFullYear();
  const copyright = dict.copyright.replace("{year}", String(year));

  const adminE164 = resolveAdminWhatsapp();
  const adminDisplay = formatIndonesianDisplay(adminE164);

  const legalLinks: ReadonlyArray<{ href: string; label: string }> = [
    { href: staticPath(locale, "faq"), label: dict.links.faq },
    { href: staticPath(locale, "terms"), label: dict.links.terms },
    { href: staticPath(locale, "privacy"), label: dict.links.privacy },
  ];

  return (
    <footer className="border-t bg-[var(--secondary)] py-12 text-[var(--secondary-foreground)]">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="space-y-3">
            <p className="text-lg font-semibold tracking-tight">
              Arasya Rentcar
            </p>
            <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
              {dict.about}
            </p>
          </div>

          <nav
            aria-label={locale === "id" ? "Tautan legal" : "Legal"}
            className="space-y-3"
          >
            <p className="text-sm font-semibold">
              {locale === "id" ? "Informasi" : "Information"}
            </p>
            <ul className="space-y-2 text-sm">
              {legalLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-3">
            <p className="text-sm font-semibold">{dict.adminWhatsappLabel}</p>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {adminDisplay}
            </p>
          </div>
        </div>

        <div className="mt-10 space-y-4 border-t pt-6">
          <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
            {dict.antiFraudNotice}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">{copyright}</p>
        </div>
      </div>
    </footer>
  );
}
