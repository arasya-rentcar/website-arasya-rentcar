/**
 * lib/security/notify.ts
 *
 * Fire-and-forget admin notification webhook for newly persisted leads.
 *
 * Requirements:
 * - R12.6 — WHERE an Admin notification webhook is configured, WHEN a
 *   lead is successfully persisted to the Supabase Lead_Store, THE
 *   Website SHALL send a notification payload containing the lead's
 *   full name, WhatsApp number, pickup city, pickup date, pickup time,
 *   trip type, and source page to the webhook within 5 seconds.
 * - R12.10 — IF the Admin notification webhook request fails or does
 *   not respond within 5 seconds, THEN THE Website SHALL log the
 *   failure server-side and SHALL NOT block or delay the WhatsApp
 *   handoff for the Visitor.
 *
 * Design references:
 * - §16 (Booking Route Handler) — the route handler invokes
 *   {@link notifyAdmin} *after* the Supabase insert resolves and
 *   *before* responding to the client. Because this function returns
 *   synchronously (the network call is `void`-ed), the response to
 *   the visitor never waits on the webhook's round-trip.
 * - §20 (Environment variables) — the webhook URL lives in
 *   `ADMIN_NOTIFICATION_WEBHOOK_URL` (optional). When unset, this
 *   module logs a single warning and returns immediately, which is
 *   the desired no-op for local development.
 *
 * Why fire-and-forget? The conversion funnel hinges on the
 * Visitor seeing their WhatsApp deep link the moment the form
 * submits. Waiting for an external webhook (which may live in a
 * different region, behind a slow Slack proxy, etc.) would inject
 * up-to-five seconds of latency directly into that path. R12.10
 * formalizes that constraint, so this module deliberately discards
 * the in-flight Promise and lets the runtime drain the request after
 * the response has been sent.
 *
 * Why a 5-second timeout? Without one, a hung webhook would keep
 * the underlying `fetch` Promise alive (and the Vercel serverless
 * function billable) until the platform's hard timeout kicked in.
 * The {@link AbortController} fence below caps the in-flight time at
 * {@link TIMEOUT_MS} and routes the abort into the same
 * `console.error` sink as any other failure.
 */

// Server-only module (R21.8 / design §22). Enforced by the
// `import "server-only"` directive below — any accidental client
// import will hard-fail Next.js's bundler. This module reads only
// `ADMIN_NOTIFICATION_*` env vars (no Supabase secrets), so the
// `arasya/no-service-key-in-client` lint rule has nothing to flag.

import "server-only";

/**
 * Payload shipped to the Admin notification webhook.
 *
 * Mirrors the columns enumerated in R12.6 (full name, WhatsApp
 * number, pickup city, pickup date, pickup time, trip type, source
 * page) plus the freshly minted Supabase row id (so the Admin's
 * downstream tooling can deep-link back to the lead) and the locale
 * (so the Admin's notification template can render in the visitor's
 * language).
 *
 * All fields are `readonly` because the payload is assembled once by
 * the Route Handler and serialized verbatim — there is no reason for
 * intermediate code to mutate it, and `readonly` makes any such
 * attempt a compile-time error.
 *
 * Field naming intentionally mirrors {@link bookingSchema}'s
 * camelCase rather than the Supabase table's snake_case so the
 * webhook contract reads identically to the form payload that
 * generated it.
 */
export interface AdminNotificationPayload {
  /** UUID of the freshly inserted `leads` row. */
  readonly leadId: string;
  /** Visitor-supplied full name (R10.2; trimmed, 3–80 chars). */
  readonly fullName: string;
  /** E.164 WhatsApp number (R10.3; e.g. `+628123456789`). */
  readonly whatsappNumber: string;
  /** Pickup city as typed by the visitor (R10.4). */
  readonly pickupCity: string;
  /** Pickup date in ISO `YYYY-MM-DD` (R10.7). */
  readonly pickupDate: string;
  /** Pickup time in 24-hour `HH:MM` (R10.8). */
  readonly pickupTime: string;
  /** Trip type slug from {@link tripTypeEnum} (R10.12). */
  readonly tripType: string;
  /** Visitor's interface locale (R10.14). */
  readonly locale: "id" | "en";
  /**
   * Optional: page path that referred the booking,
   * e.g. `/sewa-mobil/bogor`. Mapped from the form's `sourcePage`
   * field; named identically here for parity with R12.6's "source
   * page" wording and the `bookingSchema.sourcePage` field.
   */
  readonly sourcePage?: string;
}

/**
 * Maximum time to wait for the webhook to respond before aborting
 * (R12.10). Five seconds is the contractual ceiling.
 *
 * Lives as a module-level constant so the value is grep-able from a
 * single place when ops want to confirm or tune the budget.
 */
const TIMEOUT_MS = 5000;

/**
 * Fire-and-forget notification of a newly persisted lead to the
 * configured Admin webhook.
 *
 * Behavior:
 *   1. Reads `ADMIN_NOTIFICATION_WEBHOOK_URL` from env. If unset or
 *      empty, logs one `console.warn` ("[adminNotify] … not set;
 *      skipping") and returns synchronously — notifications are
 *      optional in dev, and this branch is the dominant code path
 *      on developer machines.
 *   2. If `ADMIN_NOTIFICATION_WEBHOOK_SECRET` is also set, attaches
 *      it as `authorization: Bearer <secret>` so the webhook can
 *      verify the request originated from this app (defense in
 *      depth; the URL itself should be treated as an additional
 *      secret per design §20).
 *   3. POSTs the JSON-serialized payload to the webhook with a
 *      5-second {@link AbortController} fence (R12.10).
 *   4. Logs (`console.error`) on non-2xx responses, network errors,
 *      and timeouts — never re-throws and never returns a Promise
 *      the caller could await.
 *
 * The function signature is `void`-returning rather than
 * `Promise<void>` to make the fire-and-forget semantics part of the
 * type contract: a caller that tries to `await notifyAdmin(…)`
 * will get a TypeScript error.
 *
 * Pure infrastructure: no Supabase, no shared mutable state. Each
 * call reads env vars fresh (cheap) and starts an independent
 * `fetch`.
 *
 * @param payload The notification payload. See
 *                {@link AdminNotificationPayload}.
 */
export function notifyAdmin(payload: AdminNotificationPayload): void {
  const url = process.env.ADMIN_NOTIFICATION_WEBHOOK_URL;
  if (typeof url !== "string" || url.length === 0) {
    console.warn(
      "[adminNotify] ADMIN_NOTIFICATION_WEBHOOK_URL not set; skipping",
    );
    return;
  }

  // Build headers separately so the optional bearer token is only
  // included when the secret is actually configured. We avoid
  // sending an empty `authorization` header (some webhook
  // receivers reject those with 400).
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const secret = process.env.ADMIN_NOTIFICATION_WEBHOOK_SECRET;
  if (typeof secret === "string" && secret.length > 0) {
    headers.authorization = `Bearer ${secret}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Intentionally not awaiting — fire-and-forget per R12.10.
  // The `void` operator silences the floating-promise lint and
  // documents the intent at the call site.
  void fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: controller.signal,
    cache: "no-store",
  })
    .then((res) => {
      if (!res.ok) {
        console.error(
          "[adminNotify] webhook responded with non-OK status",
          {
            status: res.status,
            leadId: payload.leadId,
          },
        );
      }
    })
    .catch((err: unknown) => {
      // AbortError (timeout) and other network failures both land
      // here. We discriminate between them in the log so ops can
      // distinguish a slow webhook from a broken one.
      const isTimeout = err instanceof Error && err.name === "AbortError";
      console.error("[adminNotify] webhook failed", {
        leadId: payload.leadId,
        kind: isTimeout ? "timeout" : "error",
        message: err instanceof Error ? err.message : String(err),
      });
    })
    .finally(() => {
      clearTimeout(timeoutId);
    });
}
