"use client";

import { useState } from "react";

import BookingConfirmation from "@/components/booking/BookingConfirmation";
import BookingForm from "@/components/booking/BookingForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trackBookingFormSubmit } from "@/lib/analytics/events";
import {
  formatIndonesianDisplay,
  isValidE164,
} from "@/lib/booking/normalizePhone";
import type { BookingParsed } from "@/lib/booking/schema";
import type { Locale } from "@/lib/content";
import type { Dictionary } from "@/lib/i18n/getDictionary";

/**
 * BookingFormClientWrapper — owns the Booking_Form submit lifecycle and
 * the swap to {@link BookingConfirmation} after a successful POST to
 * `/api/booking` (R11.5, R11.6, R11.9 + design §14).
 *
 * `<BookingForm>` is intentionally I/O-free so it stays unit-testable
 * without a network or a router. This wrapper supplies the missing
 * piece: it tracks a four-state `Stage` machine (form → submitting →
 * error | confirmed), posts the parsed payload to `/api/booking`, and
 * — on success — renders {@link BookingConfirmation} which then opens
 * the prefilled `wa.me` URL the server returned.
 *
 * Stage transitions:
 *   - `form`        → initial render. Form visible, no banners.
 *   - `submitting`  → request in flight. Form disabled via the
 *                     `isSubmitting` prop so users see the inflight
 *                     state directly on the submit button.
 *   - `error`       → request failed (network / non-2xx / malformed
 *                     response). A destructive `<Alert>` is rendered
 *                     above the form and the form re-enables so the
 *                     user can retry without re-entering data.
 *   - `confirmed`   → success. Wrapper unmounts the form and renders
 *                     {@link BookingConfirmation}, which auto-opens
 *                     `wa.me` and exposes the popup-blocked fallback
 *                     (R11.6).
 *
 * The wrapper never reads or writes the parsed payload itself — it
 * just forwards it to the server, surfaces the resulting WhatsApp URL,
 * and stays out of the way.
 */

/**
 * Placeholder admin WhatsApp number used when
 * `NEXT_PUBLIC_ARASYA_WHATSAPP_NUMBER` is unset or malformed. Mirrors
 * the placeholder used by `BookingTemplate` / `ContactTemplate` so the
 * confirmation card never displays a different number than the rest of
 * the page even in misconfigured local dev.
 */
const PLACEHOLDER_WHATSAPP_E164 = "+628123456789";

/**
 * Resolve the admin display number for the confirmation screen. Reads
 * the public env var so it is available in the client bundle, falls
 * back to {@link PLACEHOLDER_WHATSAPP_E164} when missing, and runs the
 * value through {@link formatIndonesianDisplay} so the visitor sees the
 * `+62 xxx-xxxx-xxxx` grouping required by R13.5 / R13.6.
 */
function adminDisplay(): string {
  const raw =
    process.env.NEXT_PUBLIC_ARASYA_WHATSAPP_NUMBER ?? PLACEHOLDER_WHATSAPP_E164;
  return isValidE164(raw)
    ? formatIndonesianDisplay(raw)
    : formatIndonesianDisplay(PLACEHOLDER_WHATSAPP_E164);
}

/**
 * Wrapper-internal state machine. Modeled as a discriminated union so
 * each branch's payload is exact: `error` carries a localized message,
 * `confirmed` carries the server-issued `whatsappUrl` plus `leadId`.
 */
type Stage =
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "confirmed"; whatsappUrl: string; leadId: string };

export interface BookingFormClientWrapperProps {
  readonly locale: Locale;
  readonly dict: Pick<Dictionary, "cta" | "common" | "meta">;
}

export default function BookingFormClientWrapper({
  locale,
  dict,
}: BookingFormClientWrapperProps): React.JSX.Element {
  const [stage, setStage] = useState<Stage>({ kind: "form" });
  const display = adminDisplay();

  /**
   * Handle a validated submission from the inner `<BookingForm>`. The
   * payload is already canonicalised by the schema (E.164 phone,
   * trimmed strings, etc.), so we forward it to `/api/booking` as-is
   * and trust the server response shape spelled out in design §16:
   *
   *   { ok: true, code: "ok", whatsappUrl, leadId }
   *
   * Any deviation — non-2xx, `ok !== true`, missing `whatsappUrl` —
   * collapses into the `error` stage with a locale-appropriate
   * message; we deliberately do not surface server-side codes to the
   * visitor (R19.8).
   *
   * `sourcePage` is captured here rather than in the form so the form
   * stays SSR-safe; `window.location.pathname` is read inside the
   * submit handler which only runs in the browser.
   */
  const handleSubmit = async (values: BookingParsed): Promise<void> => {
    setStage({ kind: "submitting" });
    try {
      const sourcePage =
        typeof window !== "undefined" ? window.location.pathname : undefined;

      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, sourcePage }),
        credentials: "same-origin",
      });
      const payload = (await res.json().catch(() => null)) as
        | { ok?: boolean; whatsappUrl?: unknown; leadId?: unknown }
        | null;

      if (
        !res.ok ||
        payload?.ok !== true ||
        typeof payload.whatsappUrl !== "string"
      ) {
        setStage({
          kind: "error",
          message:
            locale === "id"
              ? "Permintaan gagal. Silakan coba lagi atau hubungi admin via WhatsApp."
              : "Submission failed. Please try again or contact us via WhatsApp.",
        });
        return;
      }

      setStage({
        kind: "confirmed",
        whatsappUrl: payload.whatsappUrl,
        leadId: typeof payload.leadId === "string" ? payload.leadId : "",
      });

      // Fire `booking_form_submit` only after the server has accepted
      // the lead (R18.3). Forbidden fields — name, WhatsApp number,
      // notes, pickup location, destination — are excluded by the
      // typed helper's signature; only the structured fields that
      // R18.3 lists travel with the event. Wrapped in try/catch so a
      // misbehaving analytics layer cannot block the navigation to
      // the confirmation screen.
      try {
        trackBookingFormSubmit({
          locale,
          trip_type: values.tripType,
          pickup_city: values.pickupCity,
          preferred_vehicle: values.preferredVehicle ?? null,
        });
      } catch (err) {
        console.error("[bookingForm] submit event failed", err);
      }
    } catch (err) {
      // Network failures (offline, DNS, CORS, abort, …) land here.
      // Log for ops; show the visitor a generic localized message so
      // they can retry without leaking server detail.
      console.error("[bookingForm] submit failed", err);
      setStage({
        kind: "error",
        message:
          locale === "id"
            ? "Tidak dapat menghubungi server. Periksa koneksi Anda."
            : "Cannot reach the server. Please check your connection.",
      });
    }
  };

  if (stage.kind === "confirmed") {
    return (
      <BookingConfirmation
        locale={locale}
        whatsappUrl={stage.whatsappUrl}
        adminDisplay={display}
        dict={dict}
      />
    );
  }

  return (
    <div className="space-y-6">
      {stage.kind === "error" ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>
            {locale === "id" ? "Terjadi kesalahan" : "Something went wrong"}
          </AlertTitle>
          <AlertDescription>{stage.message}</AlertDescription>
        </Alert>
      ) : null}
      <BookingForm
        locale={locale}
        dict={dict}
        onSubmit={handleSubmit}
        isSubmitting={stage.kind === "submitting"}
      />
    </div>
  );
}
