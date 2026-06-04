"use client";

/**
 * Inline locale switcher rendered in the site header and footer.
 *
 * Presents one control per supported {@link Locale} per R4.5. The option for
 * the active Locale is marked `aria-current="true"` and rendered as a
 * non-interactive `<span>` so screen readers announce it as the current
 * selection (R4.5, R13.6). The other Locale is rendered as a `<button>` that
 * navigates client-side via the App Router:
 *
 *   - If {@link getPageEquivalent} returns a rewritten path for the current
 *     {@link usePathname} (R4.6), the switcher pushes that path.
 *   - Otherwise the switcher falls back to the target Locale's homepage
 *     (`/` for `id`, `/en` for `en`) per R4.7.
 *
 * The component is the minimum viable shape: two short labels ("ID" / "EN")
 * side by side. We prefer plain buttons over a DropdownMenu here because the
 * list has only two options and the chooser needs to be visible at-a-glance
 * on every page without an extra click. No flag emojis are used because
 * flags are unreliable signals for language (R13.6 accessibility guidance).
 *
 * Design: §19 (Client Components list), §18 (i18n). Mounted by PrimaryNav
 * (task 7.3) as a Server Component child passes the resolved `locale`.
 *
 * Validates requirements: R4.5, R4.6, R4.7.
 */

import { useRouter, usePathname } from "next/navigation";

import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/getDictionary";
import { getPageEquivalent } from "@/lib/i18n/pageEquivalent";
import { cn } from "@/lib/utils";

/**
 * Short, all-caps label shown in the UI for each supported Locale. Kept as
 * a const record so TypeScript verifies every {@link Locale} has a label.
 */
const LOCALE_LABELS: Readonly<Record<Locale, string>> = {
  id: "ID",
  en: "EN",
};

/**
 * Accessible name for the switcher landmark. Uses a bilingual literal so
 * the control is understandable regardless of the current page Locale; the
 * visible text ("ID" / "EN") is the actionable surface.
 */
const SWITCHER_ARIA_LABEL = "Language / Bahasa";

/**
 * Return the homepage path for a given Locale, matching R4.7's fallback
 * target (`/` for `id`, `/en` for `en`). Kept local to avoid coupling this
 * component to any helper that might pull in heavier dependencies.
 */
function homepagePath(locale: Locale): string {
  return locale === "id" ? "/" : "/en";
}

export interface LocaleSwitcherProps {
  /**
   * The Locale currently active on the page, as resolved by the Server
   * Component parent (typically PrimaryNav / Footer) from the `[locale]`
   * route segment. This is the source of truth for which option is marked
   * selected; it is never inferred from the pathname on the client.
   */
  readonly locale: Locale;
}

/**
 * Client component that renders the two Locale options and wires the
 * non-active option to client-side navigation.
 */
export function LocaleSwitcher({ locale }: LocaleSwitcherProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div
      role="group"
      aria-label={SWITCHER_ARIA_LABEL}
      className="flex items-center gap-1 text-sm font-medium"
    >
      {SUPPORTED_LOCALES.map((target) => {
        const label = LOCALE_LABELS[target];
        const isActive = target === locale;

        if (isActive) {
          return (
            <span
              key={target}
              aria-current="true"
              lang={target === "id" ? "id-ID" : "en"}
              className={cn(
                "inline-flex h-8 items-center rounded-md px-2 font-semibold underline underline-offset-4",
                "text-[var(--foreground)]",
              )}
            >
              {label}
            </span>
          );
        }

        return (
          <button
            key={target}
            type="button"
            lang={target === "id" ? "id-ID" : "en"}
            onClick={() => {
              // `pathname` can legitimately be `null` in edge cases (e.g.
              // during the very first client render before the router has
              // hydrated). Treat that as "no structural equivalent" and
              // route to the target-locale homepage per R4.7.
              const equivalent =
                pathname === null
                  ? null
                  : getPageEquivalent(pathname, locale, target);
              router.push(equivalent ?? homepagePath(target));
            }}
            className={cn(
              "inline-flex h-8 items-center rounded-md px-2",
              "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              "hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
              "outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/50",
              "transition-colors",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default LocaleSwitcher;
