"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import LocaleSwitcher from "@/components/nav/LocaleSwitcher";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Locale } from "@/lib/i18n/getDictionary";
import { cn } from "@/lib/utils";

/**
 * Mobile navigation drawer (R3.8, R13.x — keyboard accessible).
 *
 * Client component sibling of `PrimaryNav`. Renders only below the `lg`
 * breakpoint (hidden on desktop via the parent's responsive class). Tapping
 * the hamburger opens a right-side `Sheet` that lists the same links the
 * desktop nav exposes, plus the locale switcher.
 *
 * Each link is wrapped in `SheetClose` so it dismisses the drawer
 * automatically on click — Radix's `Sheet` (Dialog) returns focus to the
 * trigger element after closing, satisfying R13.2 (focus return).
 */

export interface MobileNavItem {
  readonly href: string;
  readonly label: string;
}

export interface MobileNavProps {
  readonly locale: Locale;
  readonly items: readonly MobileNavItem[];
  /** Trigger button accessible label, locale-correct from the dictionary. */
  readonly triggerLabel: string;
  /** Drawer title — used as `<SheetTitle>` for the dialog accessible name. */
  readonly title: string;
  /** Drawer description, shown beneath the title. */
  readonly description: string;
}

export default function MobileNav({
  locale,
  items,
  triggerLabel,
  title,
  description,
}: MobileNavProps): React.JSX.Element {
  // Controlled state so we can dismiss the sheet when a nav link is
  // followed; `SheetClose` handles the focus return after close.
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={triggerLabel}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-md",
          "text-[var(--foreground)] transition-colors",
          "hover:bg-[var(--secondary)] hover:text-[var(--secondary-foreground)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
        )}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-[85vw] max-w-sm flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          <SheetDescription className="text-xs">
            {description}
          </SheetDescription>
        </SheetHeader>

        <nav
          aria-label={triggerLabel}
          className="flex-1 overflow-y-auto px-3 py-4"
        >
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={`${item.href}:${item.label}`}>
                <SheetClose asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "block rounded-md px-3 py-3 text-base font-medium",
                      "text-[var(--foreground)] transition-colors",
                      "hover:bg-[var(--secondary)] hover:text-[var(--secondary-foreground)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
                    )}
                  >
                    {item.label}
                  </Link>
                </SheetClose>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t px-6 py-4">
          <LocaleSwitcher locale={locale} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
