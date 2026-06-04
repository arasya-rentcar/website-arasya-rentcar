/* eslint-disable arasya/no-service-key-in-client --
 * R21.8 / design §22: this module IS a server-only surface (the
 * `import "server-only"` directive below makes Next.js hard-fail any
 * attempt to bundle it for the browser), it just doesn't follow the
 * `*server.ts` filename convention that `eslint.config.mjs` allowlists.
 * The lint rule is defense-in-depth keyed on filename; the `server-only`
 * import is the real enforcement. The file is consumed exclusively by
 * the booking Route Handler at `app/api/booking/route.ts` (design §16),
 * which is itself in the rule's `app/api/**` ignore glob.
 */

/**
 * lib/security/rateLimit.ts
 *
 * Server-side rate limiter for the public booking endpoint.
 *
 * Requirements:
 * - R12.8 — IF a client IP exceeds 10 Booking_Form submissions within a
 *   rolling 60-minute window, THEN the Route Handler SHALL reject
 *   subsequent submissions with a rate-limit error response and SHALL NOT
 *   write to the Supabase Lead_Store. Graceful-degradation clause: a
 *   transient Supabase outage MUST NOT block every booking — this module
 *   therefore fails OPEN on RPC errors and logs the failure for ops.
 *
 * Design:
 * - §16 (Booking Route Handler) — the route handler hashes the visitor IP
 *   via {@link hashIp} and gates the write path on this module's
 *   {@link checkBookingRateLimit} verdict.
 * - §23 (Rate-limit middleware) — the underlying counter lives in the
 *   Supabase `rate_limit` table (RLS-locked to service_role) and is
 *   incremented atomically by the `rl_increment(p_ip_hash text)` RPC
 *   defined in `supabase/migrations/0005_rate_limit.sql`. The RPC is the
 *   single source of truth for the bucket arithmetic: it aligns the
 *   window to the top of the hour and returns the post-increment count.
 *
 * Why a `booking:` key prefix?
 *   The same `rate_limit` table is the namespace any future endpoint-level
 *   limiter would also reuse. Prefixing the hashed IP with `booking:`
 *   keeps the booking budget isolated from any later limiter (e.g. an
 *   admin login throttle keyed on `admin-login:{hash}`) so a noisy
 *   neighbor on one endpoint cannot exhaust another endpoint's budget.
 *
 * Why fail OPEN?
 *   R12.8's purpose is abuse mitigation, not gatekeeping the legitimate
 *   funnel. If Supabase is unreachable or the RPC schema drifts, blocking
 *   every booking submission would cause a worse outcome than the
 *   ten-per-hour rate floor we are trying to enforce. We log the failure
 *   so ops can detect and remediate, and we let the request proceed.
 *
 * Pure infrastructure:
 *   This module is server-only by transitive import of
 *   `@/lib/supabase/server` (which is itself `import "server-only"`). It
 *   has no state of its own — every call performs exactly one round-trip
 *   to Supabase via the singleton service-role client.
 */

import "server-only";

import { hashIp } from "@/lib/security/hashIp";
import { supabaseService } from "@/lib/supabase/server";

/**
 * Verdict returned by {@link checkBookingRateLimit}.
 *
 * @property allowed `true` when the request is within the R12.8 budget
 *                   (or when the RPC failed and we fell open). `false`
 *                   only when the RPC successfully reported the bucket as
 *                   exhausted — the caller should then short-circuit with
 *                   HTTP 429 (`code: "rate_limited"`, see design §16
 *                   error matrix).
 * @property key     The salted-hash key actually used to look up the
 *                   bucket in the `rate_limit` table. Returned so callers
 *                   can structured-log it alongside the verdict (it is
 *                   already non-PII — a SHA-256 digest of `salt + ip`).
 */
export interface RateLimitResult {
  readonly allowed: boolean;
  readonly key: string;
}

/**
 * Maximum booking submissions permitted per IP per 60-minute window
 * (R12.8). Lives as a module-level constant so the value is grep-able
 * from a single place when ops want to confirm or tune the budget.
 */
const BOOKING_MAX_PER_WINDOW = 10;

/**
 * Namespace prefix on the `rate_limit.ip_hash` column. Keeps the booking
 * budget isolated from any future endpoint-level limiter that also keys
 * on hashed IPs (see module docstring).
 */
const KEY_NAMESPACE = "booking:";

/**
 * Shape of the `rl_increment(p_ip_hash text) returns integer` RPC defined
 * by `supabase/migrations/0005_rate_limit.sql`. The migration aligns the
 * window to the top of the hour internally, so the TS caller passes only
 * the namespaced hash and reads back the post-increment count.
 *
 * This local type exists because `types/database.ts` is still the
 * generator's empty stub (Functions: Record<string, never>), so the
 * typed `supabase.rpc("rl_increment", …)` overload cannot infer the
 * argument or result shape yet. A narrow cast at the single call site
 * below is preferable to widening the whole client to `any` — once
 * `pnpm db:types` is run against the live schema, this file will need
 * no changes (the cast simply becomes redundant but stays sound).
 */
interface RlIncrementCall {
  (
    fn: "rl_increment",
    args: { p_ip_hash: string },
  ): Promise<{ data: number | null; error: { message: string } | null }>;
}

/**
 * Check whether a booking submission from this IP is allowed under the
 * R12.8 budget (10 submissions per 60 minutes per IP).
 *
 * Pipeline:
 *   1. Hash the raw IP with `LEAD_IP_HASH_SALT` (so the Supabase row key
 *      is non-PII) and prefix it with `booking:` to namespace the bucket.
 *   2. Atomically insert-or-increment the `(ip_hash, hour-aligned window)`
 *      counter via the `rl_increment` RPC. The RPC returns the
 *      post-increment count.
 *   3. Compare the count to {@link BOOKING_MAX_PER_WINDOW}. The first 10
 *      calls within a window resolve to `count ∈ 1..10` → `allowed: true`;
 *      the 11th call resolves to `count = 11` → `allowed: false`.
 *
 * Fail-open behavior:
 *   - RPC error (network, schema mismatch, etc.) → log via `console.error`
 *     with the `[rateLimit]` tag and return `{ allowed: true }`.
 *   - RPC returns null / non-numeric data → same: log and fail open.
 *   - Any thrown exception (e.g. service-role key missing at boot in a
 *     misconfigured environment) → same: log and fail open. We never
 *     allow a Supabase fault to take the booking funnel offline.
 *
 * @param rawIp The visitor's raw client IP, typically extracted via
 *              `extractClientIp(req)` from `@/lib/security/hashIp`. Must
 *              be a non-empty string; an empty/missing IP indicates a
 *              caller bug (the route handler is expected to short-circuit
 *              before reaching this module when no IP can be resolved).
 *              Surfaces as a thrown `Error` from {@link hashIp}.
 * @returns     `{ allowed, key }` — see {@link RateLimitResult}.
 */
export async function checkBookingRateLimit(
  rawIp: string,
): Promise<RateLimitResult> {
  // hashIp throws on empty rawIp / unset salt — both indicate a server bug
  // rather than a request anomaly, and must surface loudly. The route
  // handler is responsible for ensuring rawIp is present before calling.
  const key = `${KEY_NAMESPACE}${hashIp(rawIp)}`;

  try {
    const supabase = supabaseService();

    // See RlIncrementCall doc above for why this cast exists.
    const rpc = supabase.rpc.bind(supabase) as unknown as RlIncrementCall;
    const { data, error } = await rpc("rl_increment", { p_ip_hash: key });

    if (error !== null) {
      console.error("[rateLimit] rl_increment RPC returned an error", {
        message: error.message,
      });
      return { allowed: true, key };
    }

    if (typeof data !== "number" || !Number.isFinite(data)) {
      console.error(
        "[rateLimit] rl_increment returned unexpected non-numeric data; failing open",
        { data },
      );
      return { allowed: true, key };
    }

    return { allowed: data <= BOOKING_MAX_PER_WINDOW, key };
  } catch (err) {
    console.error("[rateLimit] unexpected failure invoking rl_increment", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { allowed: true, key };
  }
}
