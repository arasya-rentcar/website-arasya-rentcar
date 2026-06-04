"use client";

/**
 * Floating WhatsApp button (task 9.1, design §19).
 *
 * Client Component — uses `useState`/`useEffect` for the auto-hide
 * tooltip, must mount in the locale subtree of `app/[locale]/layout.tsx`
 * so it appears on every page (per R13.1 the floating button is
 * required on every page except the booking confirmation screen; that
 * exclusion is handled at the page level by not rendering the
 * confirmation screen inside the locale layout's content slot, or by
 * the screen overriding the layout).
 *
 * Requirements:
 * - R11.7 — Floating WhatsApp CTA fixed to the bottom-right of the
 *   viewport on every page.
 * - R13.1 — Minimum tap target of 56×56 CSS pixels (`h-14 w-14` = 56px
 *   given Tailwind's default `1rem = 16px` base, where `h-14` =
 *   `3.5rem` = 56px). Minimum offset 16 CSS pixels from the nearest
 *   viewport edge (`bottom-4 right-4` = 16px each).
 * - R13.2 — Visible label/tooltip in the current Locale, accessible
 *   name announcing the WhatsApp action, link routes through the
 *   WhatsApp_Handler (`buildGenericWaUrl`) to the official Admin
 *   number.
 * - R13.3 — Fallback `tel:` link when the device or browser does not
 *   support `wa.me`. Rendered as a sibling icon button so the fallback
 *   is always available and never overlaps the WhatsApp button.
 * - R15.6 — Accessible name on every non-text control. Both the
 *   WhatsApp icon button and the `tel:` icon button carry an
 *   `aria-label` in the active Locale; the inner SVG icons are marked
 *   `aria-hidden`.
 *
 * The component reads the public Admin number from
 * `NEXT_PUBLIC_ARASYA_WHATSAPP_NUMBER` because the floating button is a
 * Client Component and only `NEXT_PUBLIC_*` env vars are inlined into
 * the client bundle. The authoritative server-only value is
 * `ARASYA_WHATSAPP_NUMBER`, validated at build time by
 * `scripts/validate-env.ts` (R13.7). When the public value is missing
 * or invalid, we fall back to a local placeholder so the component
 * still renders in dev — production deploys cannot ship without the
 * server-side env var per the build-time validator.
 *
 * Design reference: §19 (client component allowlist).
 */

import { useEffect, useState } from "react";
import { MessageCircle, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isValidE164 } from "@/lib/booking/normalizePhone";
import type { Locale } from "@/lib/content";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import {
  buildGenericWaUrl,
  formatWhatsAppNumberDisplay,
} from "@/lib/whatsapp/handler";

/**
 * Placeholder used when `NEXT_PUBLIC_ARASYA_WHATSAPP_NUMBER` is unset
 * or malformed. Mirrors the placeholder in `components/nav/Footer.tsx`
 * so dev-only renders stay consistent across the chrome. Production
 * builds trip the env validator before this fallback can ship.
 */
const PLACEHOLDER_E164 = "+628123456789";

/**
 * Resolve the Admin WhatsApp number for client-side rendering. The
 * `NEXT_PUBLIC_*` form is the only env value Next.js inlines into the
 * client bundle, and the value is gated through {@link isValidE164} so
 * a malformed env override (e.g. an unformatted local number copied
 * from a phone) cannot produce a broken `wa.me` URL.
 */
function resolveAdminE164(): string {
  const raw =
    process.env.NEXT_PUBLIC_ARASYA_WHATSAPP_NUMBER ?? PLACEHOLDER_E164;
  return isValidE164(raw) ? raw : PLACEHOLDER_E164;
}

/**
 * Tooltip auto-hide window in milliseconds. Three seconds is long
 * enough for sighted Visitors to read the localized number, short
 * enough that the tooltip does not linger over page content after the
 * pointer leaves the button.
 */
const TOOLTIP_AUTO_HIDE_MS = 3000;

export interface WhatsAppButtonProps {
  /** Active Locale; controls the tooltip + `aria-label` language. */
  readonly locale: Locale;
  /**
   * Subset of the locale Dictionary needed for the button copy. Kept
   * narrow so callers do not have to thread the entire dictionary
   * object into a Client Component (which would bloat the client
   * bundle with translation strings unrelated to this widget).
   */
  readonly dict: Pick<Dictionary, "common" | "meta">;
  /**
   * Optional override for the prefilled WhatsApp message. Pages that
   * want to mention the city / vehicle / service in the opening line
   * (e.g. the city template's hero CTA) can pass a fully-composed
   * sentence; the floating button on the homepage and other generic
   * surfaces leaves this `undefined` so the handler emits its locale-
   * default greeting + opening question.
   */
  readonly prefilledMessage?: string;
}

export default function WhatsAppButton({
  locale,
  dict,
  prefilledMessage,
}: WhatsAppButtonProps): React.JSX.Element {
  const adminE164 = resolveAdminE164();
  const adminDisplay = formatWhatsAppNumberDisplay(adminE164);
  const waUrl = buildGenericWaUrl(adminE164, locale, prefilledMessage);
  const telUrl = `tel:${adminE164}`;

  const [tooltipOpen, setTooltipOpen] = useState(false);

  useEffect(() => {
    if (!tooltipOpen) return;
    const timeoutId = window.setTimeout(() => {
      setTooltipOpen(false);
    }, TOOLTIP_AUTO_HIDE_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [tooltipOpen]);

  const tooltipLabel =
    locale === "id"
      ? `Chat WhatsApp ${adminDisplay}`
      : `Chat WhatsApp ${adminDisplay}`;
  const telLabel = dict.common.phone;
  const waLabel = dict.meta.whatsappAriaLabel;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6"
      data-testid="whatsapp-floating"
    >
      {tooltipOpen ? (
        <div
          role="tooltip"
          className="rounded-md bg-[var(--popover)] px-3 py-2 text-sm text-[var(--popover-foreground)] shadow-lg ring-1 ring-[var(--border)]"
        >
          {tooltipLabel}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        {/*
         * R13.3 — `tel:` fallback. Rendered as a sibling so it is
         * always available even on devices/browsers that do not honor
         * `wa.me`; sized identically (56×56) per R13.1 so the two
         * tap targets line up visually.
         */}
        <Button
          asChild
          variant="outline"
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          aria-label={telLabel}
        >
          <a href={telUrl}>
            <Phone className="h-6 w-6" aria-hidden="true" />
          </a>
        </Button>

        {/*
         * R11.7 / R13.1 / R13.2 — primary floating WhatsApp button.
         * Uses the brand-recommended green (#25D366) so the affordance
         * reads as "WhatsApp" at a glance.
         */}
        <Button
          asChild
          size="icon"
          className="h-14 w-14 rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#20bf5a]"
          aria-label={waLabel}
          onMouseEnter={() => setTooltipOpen(true)}
          onMouseLeave={() => setTooltipOpen(false)}
          onFocus={() => setTooltipOpen(true)}
          onBlur={() => setTooltipOpen(false)}
          onTouchStart={() => setTooltipOpen(true)}
        >
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-analytics-event="whatsapp_click"
            data-analytics-source="floating_button"
          >
            <MessageCircle className="h-6 w-6" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </div>
  );
}
