"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Locale } from "@/lib/content";
import type { Dictionary } from "@/lib/i18n/getDictionary";

/**
 * BookingConfirmation — post-submit confirmation screen with popup-blocked
 * fallback (R11.5, R11.6 + design §9 / §14).
 *
 * Renders after `<BookingForm>` successfully posts the lead and the
 * WhatsApp_Handler has already produced a `wa.me` URL. On mount the
 * component attempts to auto-open WhatsApp in a new tab; whether or not the
 * popup actually opens, the card always exposes:
 *
 *   1. The official admin number in the `+62 xxx-xxxx-xxxx` display form
 *      (passed in by the parent) so the visitor can verify they're
 *      contacting the official Admin (R13.5 / R13.6 are owned by the
 *      Booking_Page itself, but surfacing the same number here keeps the
 *      hand-off cohesive).
 *   2. A primary "Open WhatsApp" CTA pointed at the same `wa.me` URL — this
 *      is the popup-blocked fallback required by R11.6: the visitor can
 *      always re-attempt the open by clicking the button, regardless of
 *      whether the auto-open succeeded.
 *   3. A "Back to home" link so a visitor who has finished can leave the
 *      flow without using the browser back button.
 *
 * Popup detection (R11.6) is rendered as a polite live-region notice when
 * `window.open` returns `null` or the returned window closes within ~50ms
 * (Safari closes blocked popups synchronously; Chrome returns `null`). The
 * notice is a *hint* — the CTA button is always present, so the user is
 * never gated on the detection being correct.
 *
 * The component owns the page's primary heading because it is mounted on
 * the dedicated confirmation route (task 8.17 wires it up): exactly one
 * `<h1>` lives here, on the `CardTitle` with id
 * `booking-confirmation-heading`, satisfying the single-h1 invariant
 * (R9.10).
 */
export interface BookingConfirmationProps {
  readonly locale: Locale;
  /** The pre-built `wa.me` URL the user should open. */
  readonly whatsappUrl: string;
  /** The official admin display number (`+62 xxx-xxxx-xxxx`). */
  readonly adminDisplay: string;
  readonly dict: Pick<Dictionary, "cta" | "common" | "meta">;
}

/**
 * Delay (ms) before checking `popup.closed` after `window.open`. Chrome and
 * Safari behave differently on blocked popups: Chrome returns `null`
 * immediately, Safari returns a window object whose `closed` flag flips to
 * `true` on the next tick. Waiting ~50ms covers both without making the
 * fallback feel sluggish to a visitor whose popup actually did open.
 */
const POPUP_CLOSED_PROBE_DELAY_MS = 50;

export default function BookingConfirmation({
  locale,
  whatsappUrl,
  adminDisplay,
  dict,
}: BookingConfirmationProps): React.JSX.Element {
  const isId = locale === "id";
  const [popupBlocked, setPopupBlocked] = useState(false);

  useEffect(() => {
    let probe: ReturnType<typeof setTimeout> | undefined;

    // React 19 rejects synchronous `setState` calls inside `useEffect`
    // (the `react-hooks/set-state-in-effect` rule). Schedule the
    // popup-blocked state flip on a microtask so the effect commits
    // first; the visitor still sees the fallback within ~1ms of the
    // initial paint, well below any perceptual threshold.
    const markBlocked = (): void => {
      queueMicrotask(() => setPopupBlocked(true));
    };

    try {
      const opened = window.open(
        whatsappUrl,
        "_blank",
        "noopener,noreferrer",
      );
      if (opened === null) {
        // Chrome path: blocked popups return `null`.
        markBlocked();
        return;
      }

      // Safari path: blocked popups return a window object that is
      // already (or near-immediately) closed. Probe after a short
      // delay since `closed` is racy on the very first tick.
      probe = setTimeout(() => {
        try {
          if (opened.closed) markBlocked();
        } catch {
          // Cross-origin access can throw; if we can't read `closed`,
          // assume the popup opened successfully and stay silent.
        }
      }, POPUP_CLOSED_PROBE_DELAY_MS);
    } catch {
      // Some sandboxed contexts (e.g. embedded iframes with restrictive
      // sandbox attributes) throw on `window.open`. Treat as blocked so
      // the visitor sees the explicit fallback CTA.
      markBlocked();
    }

    return () => {
      if (probe !== undefined) clearTimeout(probe);
    };
    // Empty deps: auto-open only fires once on mount per R11.5 ("attempt
    // to open the generated wa.me URL within 1 second"). Re-running on
    // prop changes would surprise users with a second popup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Locale-scoped copy. Not part of the dictionary `Pick<...>` surface
  // because no other page renders these strings; keeping them inline
  // here avoids growing the shared dictionary for a single-screen flow.
  const title = isId
    ? "Permintaan reservasi terkirim!"
    : "Reservation request sent!";
  const body = isId
    ? "Kami akan mengarahkan Anda ke WhatsApp admin resmi untuk konfirmasi. Jika halaman WhatsApp tidak terbuka otomatis, klik tombol di bawah."
    : "We're directing you to our official admin WhatsApp for confirmation. If the WhatsApp page doesn't open automatically, click the button below.";
  const adminLabel = isId ? "Nomor admin resmi" : "Official admin number";
  const popupBlockedNotice = isId
    ? "Pop-up tampaknya diblokir. Klik tombol di bawah untuk membuka WhatsApp."
    : "The pop-up appears to be blocked. Click the button below to open WhatsApp.";
  const backHomeLabel = isId ? "Kembali ke beranda" : "Back to home";
  const homePath = isId ? "/" : "/en";

  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          {/*
           * The confirmation route gives this component the primary
           * heading slot, so the title is rendered as a real <h1>
           * (R9.10 single-h1 invariant). `CardTitle` in this project
           * is a styled div without `asChild` support, so the <h1>
           * lives inside it as a child — the heading carries the id
           * referenced by any future `aria-labelledby` association.
           */}
          <CardTitle className="text-3xl font-bold">
            <h1 id="booking-confirmation-heading">{title}</h1>
          </CardTitle>
          <CardDescription>{body}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {popupBlocked ? (
            <p
              role="status"
              aria-live="polite"
              className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[var(--foreground)]"
            >
              {popupBlockedNotice}
            </p>
          ) : null}

          <div className="rounded-md border border-[var(--border)] bg-[var(--muted)]/50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              {adminLabel}
            </p>
            <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
              {adminDisplay}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild size="lg">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={dict.meta.whatsappAriaLabel}
              >
                {dict.cta.secondaryWhatsapp}
              </a>
            </Button>
            <Link
              href={homePath}
              className="text-center text-sm text-[var(--muted-foreground)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
            >
              {backHomeLabel}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
