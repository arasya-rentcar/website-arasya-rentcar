import Link from "next/link";

import Footer from "@/components/nav/Footer";
import PrimaryNav from "@/components/nav/PrimaryNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCities } from "@/lib/content";
import { DEFAULT_LOCALE, getDictionary } from "@/lib/i18n/getDictionary";
import { citySlugPath } from "@/lib/i18n/slugMap";

/**
 * Root not-found fallback (task 7.2).
 *
 * Next.js matches this component for any URL that does not resolve to a
 * route inside `app/[locale]/*` — for example an unmatched top-level path
 * that never entered the locale subtree at all. The companion file at
 * `app/[locale]/not-found.tsx` handles the common case of an invalid slug
 * or inactive city inside a valid locale segment (R3.5 / R3.6 / R22.7).
 *
 * Because this file lives OUTSIDE `[locale]`, the root `app/layout.tsx`
 * is the only layout Next.js wraps around it — and that layout
 * intentionally renders nothing but `<html>/<body>` so the `<html lang>`
 * attribute can be driven by the `x-locale` header. PrimaryNav and Footer
 * are therefore mounted inline here so the 404 surface still renders the
 * global chrome expected by R3.8 / R3.9.
 *
 * Locale
 * ------
 * We cannot reliably read a locale at this level (middleware may not have
 * run for truly unmatched paths), so this page renders in the default
 * Bahasa Indonesia locale per R4.1. A visitor who landed here while
 * browsing in English can jump back to `/en` via the PrimaryNav locale
 * switcher once they reach a real page.
 *
 * Server Component — no `"use client"`, no client bundle, no structured
 * data (404 pages MUST NOT be indexed and do not need JSON-LD).
 */

/** Cap from R3.6 / R22.7 — at most six launched cities shown as next links. */
const MAX_LAUNCHED_SUGGESTIONS = 6;

export default async function RootNotFound(): Promise<React.JSX.Element> {
  const locale = DEFAULT_LOCALE;
  const [dict, cities] = await Promise.all([
    getDictionary(locale),
    getCities(locale, { coverage: ["launched"] }),
  ]);

  const launchedCities = cities
    .filter((city) => city.coverageState === "launched")
    .slice(0, MAX_LAUNCHED_SUGGESTIONS);

  return (
    <>
      <PrimaryNav locale={locale} dict={dict.nav} />

      <main id="main" className="min-h-screen">
        <div className="container mx-auto px-4 py-16 text-center md:py-24">
          <div className="mx-auto max-w-2xl">
            <p
              aria-hidden="true"
              className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]"
            >
              404
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-[var(--foreground)] md:text-5xl">
              {dict.notFound.title}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-[var(--muted-foreground)]">
              {dict.notFound.description}
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg">
                <Link href="/">{dict.notFound.backHome}</Link>
              </Button>
            </div>
          </div>

          {launchedCities.length === 0 ? null : (
            <nav
              aria-label={dict.notFound.citiesNavLabel}
              className="mx-auto mt-16 w-full max-w-4xl text-left"
            >
              <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                {dict.notFound.citiesHeading}
              </h2>
              <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {launchedCities.map((city) => {
                  const blurb =
                    typeof city.shortBlurb === "string" &&
                    city.shortBlurb.length > 0
                      ? city.shortBlurb
                      : null;
                  return (
                    <li key={city.slug}>
                      <Link
                        href={citySlugPath(locale, city.slug)}
                        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                      >
                        <Card className="h-full transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]">
                          <CardHeader>
                            <CardTitle className="text-lg">
                              {city.displayName}
                            </CardTitle>
                          </CardHeader>
                          {blurb === null ? null : (
                            <CardContent>
                              <p className="text-sm text-[var(--muted-foreground)]">
                                {blurb}
                              </p>
                            </CardContent>
                          )}
                        </Card>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </div>
      </main>

      <Footer locale={locale} dict={dict.footer} />
    </>
  );
}
