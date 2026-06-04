/**
 * SHA-256 IP hashing helper used by the Booking Route Handler and the
 * rate-limit middleware (design §16, §23).
 *
 * Requirements:
 * - R12.11: THE Website SHALL store the Visitor's IP address in the
 *   `ip_hash` column as a SHA-256 digest of the IP concatenated with a
 *   server-side salt loaded from environment variables, and SHALL NOT store
 *   the raw IP address anywhere in the Supabase Lead_Store.
 * - R19.6: THE Website SHALL store `LEAD_IP_HASH_SALT` (and other secrets)
 *   only in environment variables and SHALL NOT persist the raw IP.
 *
 * Design:
 * - §16 (Booking Route Handler): `app/api/booking/route.ts` calls
 *   {@link hashIp} on the client IP and writes the hex digest into
 *   `leads.ip_hash`. The raw IP never reaches Supabase.
 * - §23 (Rate-limit middleware): `lib/security/rateLimit.ts` keys the
 *   `rate_limit` table on the same digest, so the same IP resolves to the
 *   same key across both call sites — {@link hashClientIp} / {@link hashIp}
 *   are intentionally deterministic and side-effect-free.
 *
 * Salt hygiene:
 * - `LEAD_IP_HASH_SALT` is validated to be ≥32 characters by
 *   `scripts/validate-env.ts` (§20). This module enforces only that the
 *   salt is a non-empty string at call time; malformed salts surface as a
 *   thrown `Error` so env misconfig fails loudly instead of silently
 *   hashing with an empty pepper.
 *
 * Pure module: uses only `node:crypto`. No Next.js imports, no Supabase
 * imports, no side effects beyond reading `process.env.LEAD_IP_HASH_SALT`
 * when callers rely on the default salt. Safe to import from Route
 * Handlers, middleware, scripts, and unit tests alike.
 */

import { createHash } from "node:crypto";

/**
 * Shape of the `req` argument consumed by {@link extractClientIp} and
 * {@link hashClientIp}. Accepts either a live WHATWG `Headers` instance
 * (what Next.js Route Handlers pass in via `Request.headers`) or a plain
 * header bag (the `IncomingMessage.headers` shape used by Node APIs and
 * unit tests). Mirrors {@link import("./originCheck").OriginCheckRequestLike}
 * so both helpers can be fed the same request object.
 */
export interface HashIpRequestLike {
  readonly headers: Headers | Record<string, string | string[] | undefined>;
}

/**
 * Look up a header case-insensitively across both accepted input shapes.
 * Returns the first value when the header appears multiple times (mirrors
 * how proxies typically fold repeated `X-Forwarded-For` entries into a
 * single comma-separated string), and returns `null` when the header is
 * absent or empty.
 */
function readHeaderRaw(
  headers: Headers | Record<string, string | string[] | undefined>,
  name: string,
): string | null {
  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    const value = headers.get(name);
    return value !== null && value.length > 0 ? value : null;
  }

  const target = name.toLowerCase();
  const bag = headers as Record<string, string | string[] | undefined>;
  for (const key of Object.keys(bag)) {
    if (key.toLowerCase() !== target) continue;
    const raw = bag[key];
    if (typeof raw === "string") {
      return raw.length > 0 ? raw : null;
    }
    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0];
      return typeof first === "string" && first.length > 0 ? first : null;
    }
  }
  return null;
}

/**
 * Compute the hex SHA-256 digest of `salt + ip`.
 *
 * The concatenation order (`salt` first, `ip` second) is fixed so that both
 * the Booking Route Handler and the rate-limit middleware derive identical
 * hashes for the same IP (design §16, §23). Changing the order or the
 * digest algorithm would silently invalidate the `rate_limit` table's
 * existing rows, so callers MUST NOT reorder the inputs.
 *
 * Validation:
 * - Throws a clear `Error` when `salt` is unset, empty, or not a string.
 *   `LEAD_IP_HASH_SALT` is expected to be ≥32 characters (enforced at
 *   build time by `scripts/validate-env.ts`), so an empty default
 *   indicates an env misconfiguration that must not be papered over with
 *   silent zero-pepper hashes.
 * - Throws a clear `Error` when `ip` is not a non-empty string. Callers
 *   that may not have an IP in hand should use {@link hashClientIp}, which
 *   returns `null` instead of throwing when the request has no recognizable
 *   client-IP header.
 *
 * @param ip   Raw client IP address to hash (IPv4 or IPv6 textual form).
 *             Never persisted anywhere beyond this function's inputs.
 * @param salt Pepper to prepend before hashing. Defaults to
 *             `process.env.LEAD_IP_HASH_SALT`. Tests pass an explicit salt
 *             to avoid coupling to process env.
 * @returns    Lowercase 64-character hex SHA-256 digest.
 *
 * @example Canonical server-side use
 * ```ts
 * const digest = hashIp("203.0.113.42");
 * // → 64-char hex string, e.g. "a8f9…b3e1"
 * ```
 *
 * @example Explicit salt (preferred in unit tests)
 * ```ts
 * hashIp("203.0.113.42", "a-32-plus-character-test-salt-xx");
 * ```
 *
 * @example Salt misconfiguration surfaces loudly
 * ```ts
 * hashIp("203.0.113.42", "");   // throws Error (empty salt)
 * hashIp("", "some-salt");      // throws Error (empty ip)
 * ```
 */
export function hashIp(
  ip: string,
  salt: string | undefined = process.env.LEAD_IP_HASH_SALT,
): string {
  if (typeof salt !== "string" || salt.length === 0) {
    throw new Error(
      "hashIp: salt is empty. Set LEAD_IP_HASH_SALT in the environment " +
        "(must be at least 32 characters; validated by " +
        "scripts/validate-env.ts) or pass an explicit salt argument.",
    );
  }
  if (typeof ip !== "string" || ip.length === 0) {
    throw new Error("hashIp: ip must be a non-empty string.");
  }

  return createHash("sha256").update(salt + ip, "utf8").digest("hex");
}

/**
 * Extract the client IP address from a request's headers, honoring the
 * common proxy-provided headers in priority order:
 *
 * 1. `X-Forwarded-For` — the de-facto standard set by Vercel's edge and
 *    most reverse proxies. When the header holds a comma-separated list
 *    (`client, proxy1, proxy2`), the FIRST entry is used and trimmed —
 *    that entry is the client as observed by the closest upstream proxy.
 * 2. `X-Real-IP` — nginx-style single-value fallback.
 * 3. `CF-Connecting-IP` — Cloudflare's canonical single-value header.
 *
 * Returns `null` when none of those headers are present or all of them
 * contain only whitespace. Callers that require an IP to proceed (e.g. the
 * rate-limit middleware falling back to a shared bucket on `null`) must
 * decide their own null-handling policy — this helper never fabricates an
 * address.
 *
 * Header lookup is case-insensitive across both {@link Headers} and plain
 * header-bag input shapes so unit tests can pass either form.
 *
 * @example Vercel / typical reverse-proxy chain
 * ```ts
 * extractClientIp({ headers: new Headers({ "x-forwarded-for": "203.0.113.42, 10.0.0.1" }) });
 * // → "203.0.113.42"
 * ```
 *
 * @example nginx-style
 * ```ts
 * extractClientIp({ headers: { "x-real-ip": "203.0.113.42" } });
 * // → "203.0.113.42"
 * ```
 *
 * @example Cloudflare
 * ```ts
 * extractClientIp({ headers: new Headers({ "cf-connecting-ip": "203.0.113.42" }) });
 * // → "203.0.113.42"
 * ```
 *
 * @example No proxy header set
 * ```ts
 * extractClientIp({ headers: new Headers() }); // → null
 * ```
 */
export function extractClientIp(req: HashIpRequestLike): string | null {
  const xff = readHeaderRaw(req.headers, "x-forwarded-for");
  if (xff !== null) {
    // Take the left-most entry: that's the client per RFC 7239 convention.
    const first = xff.split(",")[0];
    if (first !== undefined) {
      const trimmed = first.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }

  const realIp = readHeaderRaw(req.headers, "x-real-ip");
  if (realIp !== null) {
    const trimmed = realIp.trim();
    if (trimmed.length > 0) return trimmed;
  }

  const cfIp = readHeaderRaw(req.headers, "cf-connecting-ip");
  if (cfIp !== null) {
    const trimmed = cfIp.trim();
    if (trimmed.length > 0) return trimmed;
  }

  return null;
}

/**
 * Convenience wrapper that extracts the client IP from `req` and hashes it
 * with `LEAD_IP_HASH_SALT`. Returns `null` iff no client-IP header is
 * present (so callers can distinguish "no IP" from "IP hashed"); salt
 * misconfiguration still throws from {@link hashIp} because that indicates
 * a server-side bug rather than a request anomaly.
 *
 * @example Route Handler usage
 * ```ts
 * const ipHash = hashClientIp(req);
 * if (ipHash !== null) {
 *   await supabaseService().from("leads").insert({ …, ip_hash: ipHash });
 * }
 * ```
 *
 * @example Falls through to rate-limit shared bucket
 * ```ts
 * const key = hashClientIp(req) ?? "unknown";
 * await consumeRateLimit(key, 10, 60 * 60);
 * ```
 */
export function hashClientIp(req: HashIpRequestLike): string | null {
  const ip = extractClientIp(req);
  if (ip === null) return null;
  return hashIp(ip);
}
