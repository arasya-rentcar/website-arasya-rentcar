import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  formatIndonesianDisplay,
  isValidE164,
} from "@/lib/booking/normalizePhone";
import type { Locale } from "@/lib/content";
import type { Dictionary } from "@/lib/i18n/getDictionary";

/**
 * Anti-fraud notice — shared component for footer / booking / contact
 * surfaces (R13.4, R13.5, R13.6).
 *
 * Renders an `Alert variant="destructive"` containing the warning copy
 * from `dict.footer.antiFraudNotice` plus the single official admin
 * WhatsApp number in `+62 xxx-xxxx-xxxx` display form (R13.6) paired
 * with a `wa.me` link and a `tel:` link.
 *
 * Server Component — the notice ships in the initial HTML payload so it
 * is visible without interaction (R13.5). No client-side JavaScript.
 *
 * Accessibility: `AlertTitle` carries the `headingId` so callers can
 * reference it via `aria-labelledby` if they need to wrap the notice in
 * a region. The `headingId` must be unique per-page since multiple
 * notices may render on a single page (e.g. the footer + a contact
 * page that both use this component).
 *
 * Phase 13 a11y polish is the natural follow-up window for refactoring
 * the inline copies in `BookingTemplate.tsx`, `ContactTemplate.tsx`,
 * and `Footer.tsx` to use this shared component; until then this file
 * exists alongside those inline copies as the canonical version.
 */

/**
 * Placeholder admin WhatsApp number used when `ARASYA_WHATSAPP_NUMBER`
 * is unset. Mirrors the same constant in `Footer.tsx`,
 * `ContactTemplate.tsx`, and `BookingTemplate.tsx` so every anti-fraud
 * surface displays the same digits in local dev. The production
 * build-time env validator (R11.3) ensures the real number is present
 * before deploy.
 */
const PLACEHOLDER_E164 = "+628123456789";

/**
 * Resolve the admin WhatsApp number from the environment, falling back
 * to {@link PLACEHOLDER_E164} in local dev. Returns an E.164 string
 * that {@link formatIndonesianDisplay} can split into the
 * `+62 xxx-xxxx-xxxx` visual form required by R13.6.
 */
function resolveAdmin(): string {
  const raw = process.env.ARASYA_WHATSAPP_NUMBER ?? PLACEHOLDER_E164;
  return isValidE164(raw) ? raw : PLACEHOLDER_E164;
}

/**
 * Build the `wa.me` URL for the resolved admin number. `wa.me` requires
 * the digits without the leading `+`, so we strip it here instead of at
 * every call site.
 */
function buildWaMeUrl(e164: string): string {
  return `https://wa.me/${e164.startsWith("+") ? e164.slice(1) : e164}`;
}

export interface AntiFraudNoticeProps {
  readonly locale: Locale;
  readonly dict: Pick<Dictionary, "common" | "meta" | "footer">;
  /** Unique id for the alert title (avoids duplicate IDs across pages that mount multiple notices). */
  readonly headingId: string;
}

export default function AntiFraudNotice(
  props: AntiFraudNoticeProps,
): React.JSX.Element {
  // `locale` is part of the public API for future i18n hooks (e.g. a
  // localized aria-label region wrapper) but the rendered copy comes
  // entirely from `dict`, so it is intentionally not consumed here.
  const { dict, headingId } = props;
  const adminE164 = resolveAdmin();
  const adminDisplay = formatIndonesianDisplay(adminE164);
  const adminWaHref = buildWaMeUrl(adminE164);
  const adminTelHref = `tel:${adminE164}`;

  return (
    <Alert variant="destructive">
      <AlertTitle id={headingId}>{dict.footer.adminWhatsappLabel}</AlertTitle>
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
  );
}
