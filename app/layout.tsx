import type { ReactNode } from "react";
import { headers } from "next/headers";

import { display, sans } from "./fonts";
import "./globals.css";

/**
 * Root layout (task 7.1).
 *
 * Owns the single `<html>` / `<body>` document shell for every route in
 * the app. Next.js App Router permits exactly one root layout, and it
 * MUST render `<html>` and `<body>` — a pass-through root layout is
 * rejected at build time. That constraint means the locale-correct
 * `lang` attribute cannot be set from `app/[locale]/layout.tsx`
 * (nested layouts can't re-render `<html>`) and it cannot be derived
 * from `params.locale` here (root layouts don't receive dynamic
 * segment params).
 *
 * The Arasya middleware (`middleware.ts`, task 1.9) already inspects
 * the incoming URL and writes the detected locale onto the
 * `x-locale` request header so Server Components can read it without
 * re-parsing the path. We consume that header here to drive R4.8:
 *
 *   - `<html lang="id-ID">` when the active Locale is `id`
 *   - `<html lang="en">`    when the active Locale is `en`
 *
 * The `lang` values match the `hreflang` values emitted by the SEO
 * metadata helper (R4.3, R4.8). When the middleware has not run (for
 * example, unit tests that render the tree standalone, or asset
 * requests that slip past the matcher) the header is absent and we
 * fall back to `id-ID`, the default Locale per R4.1.
 *
 * The two `next/font` CSS variables from `app/fonts.ts` — `--font-
 * sans-loaded` and `--font-display-loaded` — are attached on the root
 * `<html>` element so every subtree (including routes rendered
 * outside `app/[locale]/`, e.g. `app/not-found.tsx` and error
 * surfaces) sees them. The design-token `@theme` block in
 * `app/globals.css` composes those variables in front of the system-
 * font fallback chain, honoring `font-display: swap` (R14.2, R14.9).
 *
 * Business chrome (PrimaryNav, Footer, skip link, Toaster, consent
 * banner) deliberately lives in `app/[locale]/layout.tsx` so it can
 * render locale-aware copy from `getDictionary`. This layout stays
 * minimal on purpose.
 */
export const metadata = {
  title: "Arasya Rentcar",
  description:
    "Arasya Rentcar — WhatsApp-first chauffeur-only rental website.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // R4.8: html lang must match the active Locale (id → id-ID, en → en).
  // The middleware writes the detected locale to `x-locale`; we read
  // it here because the root layout cannot receive `[locale]` params
  // directly. If the header is missing (asset request, test harness,
  // etc.) we fall back to the default Locale per R4.1.
  const h = await headers();
  const xLocale = h.get("x-locale");
  const lang = xLocale === "en" ? "en" : "id-ID";

  return (
    <html lang={lang} className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
