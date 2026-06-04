import Link from "next/link";

import LocaleSwitcher from "@/components/nav/LocaleSwitcher";
import MobileNav from "@/components/nav/MobileNav";
import {
  citySlugPath,
  countrySlugPath,
  servicePath,
  staticPath,
} from "@/lib/i18n/slugMap";
import type { Locale } from "@/lib/i18n/getDictionary";

/**
 * Global primary navigation (R3.8, design §2).
 *
 * Server Component — renders as static HTML so it streams with the rest of
 * the locale-scoped layout (`app/[locale]/layout.tsx`) and contributes no
 * JavaScript to the critical path beyond the small `MobileNav` client
 * island used on narrow viewports. Locale-specific URL slugs are produced
 * via the centralized slug builders in `lib/i18n/slugMap.ts` so renaming a
 * route segment is a one-file change (R17.3).
 *
 * Responsive layout
 * -----------------
 * - `lg` (≥1024px): full horizontal link list rendered server-side, with
 *   the inline `LocaleSwitcher` on the right.
 * - `<lg`: the link list collapses behind a hamburger trigger backed by
 *   `MobileNav` (a small client component that opens a Radix `Sheet`).
 *   The drawer surfaces the same links plus the locale switcher.
 *
 * The same `items` array feeds both surfaces so the desktop and mobile
 * link sets cannot drift.
 *
 * Link set (R3.8):
 *   - Home       → locale homepage (`/` or `/en`)
 *   - Fleet      → `staticPath(locale, "vehicleListing")`
 *   - Services   → MVP: first seeded service (`corporate`); see note below
 *   - Cities     → MVP: first seeded city (`jakarta`); see note below
 *   - International → MVP: first seeded country (`singapore`); see note below
 *   - Blog       → `staticPath(locale, "blog")`
 *   - Contact    → `staticPath(locale, "contact")`
 *
 * MVP listing-page choice
 * -----------------------
 * The MVP does not yet ship dedicated listing pages for cities, services,
 * or international destinations. Rather than emit dead `#` links or hide
 * the items (both of which degrade navigation and violate R3.8), each of
 * those entries points at the first seeded entity in its category. This is
 * a pragmatic placeholder that keeps the primary nav complete while still
 * sending visitors to a real, indexed page. Phase 15 (or later) replaces
 * these placeholders with proper listing routes under `/kota`, `/layanan`,
 * `/internasional`, and their English mirrors.
 *
 * Tab order
 * ---------
 * The locale layout mounts this component AFTER the skip-to-content link
 * (R15.5) and BEFORE `<main>`, so the Tab order is:
 * skip-link → brand → nav items (desktop) or hamburger → LocaleSwitcher → main.
 */
export interface PrimaryNavDict {
  readonly home: string;
  readonly fleet: string;
  readonly services: string;
  readonly cities: string;
  readonly international: string;
  readonly blog: string;
  readonly contact: string;
}

export interface PrimaryNavProps {
  readonly locale: Locale;
  readonly dict: PrimaryNavDict;
}

/**
 * Absolute path to the locale homepage. `staticPath` does not expose a
 * `"home"` key because the homepage is the locale root itself rather than
 * a named static page, so we resolve it inline using the same `/` vs `/en`
 * convention that `withLocaleRoot` applies in `slugMap.ts`.
 */
function homePath(locale: Locale): string {
  return locale === "id" ? "/" : "/en";
}

export default function PrimaryNav({
  locale,
  dict,
}: PrimaryNavProps): React.JSX.Element {
  const items: ReadonlyArray<{ href: string; label: string }> = [
    { href: homePath(locale), label: dict.home },
    { href: staticPath(locale, "vehicleListing"), label: dict.fleet },
    { href: servicePath(locale, "corporate"), label: dict.services },
    { href: citySlugPath(locale, "jakarta"), label: dict.cities },
    {
      href: countrySlugPath(locale, "singapore"),
      label: dict.international,
    },
    { href: staticPath(locale, "blog"), label: dict.blog },
    { href: staticPath(locale, "contact"), label: dict.contact },
  ];

  const isId = locale === "id";
  const primaryLabel = isId ? "Navigasi utama" : "Primary";
  const menuLabel = isId ? "Buka menu" : "Open menu";
  const drawerTitle = isId ? "Menu" : "Menu";
  const drawerDescription = isId
    ? "Telusuri Arasya Rentcar."
    : "Browse Arasya Rentcar.";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80">
      <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
        <Link
          href={homePath(locale)}
          className="text-base font-semibold tracking-tight text-[var(--foreground)] sm:text-lg"
        >
          Arasya Rentcar
        </Link>

        {/*
         * Desktop navigation — visible from `lg` (1024px) up. Below that
         * breakpoint the entire `<nav>` is replaced by the MobileNav
         * trigger so the bar never overflows or wraps.
         */}
        <nav
          aria-label={primaryLabel}
          className="hidden items-center gap-1 lg:flex"
        >
          <ul className="flex items-center gap-1">
            {items.map((item) => (
              <li key={`${item.href}:${item.label}`}>
                <Link
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--secondary-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Task 7.4 — client-side Locale switcher (R4.5–R4.7). */}
          <LocaleSwitcher locale={locale} />
        </nav>

        {/* Mobile trigger — visible below `lg`. Same items, drawer UI. */}
        <div className="lg:hidden">
          <MobileNav
            locale={locale}
            items={items}
            triggerLabel={menuLabel}
            title={drawerTitle}
            description={drawerDescription}
          />
        </div>
      </div>
    </header>
  );
}
