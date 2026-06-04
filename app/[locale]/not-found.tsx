import { headers } from "next/headers";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCities } from "@/lib/content";
import {
  DEFAULT_LOCALE,
  getDictionary,
  isLocale,
  type Locale,
} from "@/lib/i18n/getDictionary";
import { citySlugPath } from "@/lib/i18n/slugMap";

/**
 * Locale-aware not-found page (task 7.2, R3.5 / R3.6 / R4.9 / R22.7).
 *
 * Rendered by Next.js when a route inside `app/[locale]/*` resolves to
 * `notFound()` — that is, the invalid-slug branch of R3.5 ("dynamic
 * segment does not conform to the slug format") and the 404 branch of
 * R3.6 ("slug matches an inactive city or is not present in any
 * Content_Layer store"). The sibling `app/not-found.tsx` covers routes
 * that never entered the locale subtree.
 *
 * Locale resolution
 * -----------------
 * Next.js 16 does NOT pass the dynamic segment `params` to a not-found
 * component, so we cannot read `params.locale` here. Instead we read
 * the `x-locale` request header written by `middleware.ts` (task 1.9),
 * the same mechanism `app/layout.tsx` uses to set `<html lang>`. The
 * middleware inspects the raw pathname and writes `id` or `en` onto
 * every non-asset request, so the header is reliably set for routes
 * that can 404 under this subtree. When it is missing (tests, edge
 * requests that slip past the matcher) we fall back to {@link DEFAULT_LOCALE}
 * per R4.1.
 *
 * Content (R3.6 / R22.7)
 * ----------------------
 * The body offers up to six launched cities as next-step links. We
 * pull the list through the public Content_Layer (`getCities`) filtered
 * to `launched` coverage, so inactive cities are automatically absent.
 * Layout and styling mirror the featuredCities section of
 * `components/templates/HomeTemplate.tsx` so the two surfaces feel
 * consistent.
 *
 * Server Component — no `"use client"`, no client bundle, no JSON-LD,
 * and no `metadata` export (404 pages do not need structured data and
 * Next.js already serves this component with HTTP 404).
 */

/** Cap from R3.6 / R22.7 — at most six launched cities shown as next links. */
const MAX_LAUNCHED_SUGGESTIONS = 6;

/**
 * Resolve the active Locale from the `x-locale` header written by
 * `middleware.ts`. Falls back to {@link DEFAULT_LOCALE} when the header
 * is absent or outside {@link isLocale}'s accepted set, keeping the
 * page renderable in test harnesses and for edge requests that bypass
 * the middleware matcher.
 */
async function resolveRequestLocale(): Promise<Locale> {
  const h = await headers();
  const xLocale = h.get("x-locale");
  if (xLocale !== null && isLocale(xLocale)) {
    return xLocale;
  }
  return DEFAULT_LOCALE;
}

export default async function LocaleNotFound(): Promise<React.JSX.Element> {
  const locale = await resolveRequestLocale();
  const [dict, cities] = await Promise.all([
    getDictionary(locale),
    getCities(locale, { coverage: ["launched"] }),
  ]);

  const launchedCities = cities
    .filter((city) => city.coverageState === "launched")
    .slice(0, MAX_LAUNCHED_SUGGESTIONS);

  // R4.9 — 404 must respect the locale path prefix. The locale homepage
  // is `/` for Bahasa Indonesia and `/en` for English.
  const homeHref = locale === "id" ? "/" : "/en";

  return (
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
            <Link href={homeHref}>{dict.notFound.backHome}</Link>
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
  );
}
