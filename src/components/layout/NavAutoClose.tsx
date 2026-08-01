'use client';

import { useEffect } from 'react';

/** The two nav disclosures. Scoped deliberately: Escape must not collapse an
 *  FAQ item, and clicking the page must not close the accordion you just read. */
const NAV_MENUS = 'details.site-nav-drop, details.site-nav-burger';

/**
 * Dismissal behaviour for the header menus.
 *
 * Native `<details>` gives open/close for free, which is why the headers are
 * server components with no JS — but it gives *only* that. It stays open when
 * you click elsewhere on the page, when you press Escape, and across an in-page
 * anchor jump, so the panel sits over the section you just navigated to. None of
 * that is what anyone expects from a menu.
 *
 * One delegated listener rather than state in the header, so the whole nav still
 * renders on the server and works before hydration: without JS the menu opens
 * and closes from the summary, exactly as it did.
 */
export function NavAutoClose() {
  useEffect(() => {
    const openMenus = () =>
      [...document.querySelectorAll<HTMLDetailsElement>(NAV_MENUS)].filter((d) => d.open);

    /** A link inside the menu was chosen. */
    function onClick(ev: MouseEvent) {
      const target = ev.target as HTMLElement | null;
      if (!target?.closest('.js-nav-close')) return;
      target.closest('details')?.removeAttribute('open');
    }

    /**
     * A press anywhere outside an open menu closes it.
     *
     * `pointerdown` rather than `click` so it dismisses on press instead of
     * release, which is what makes it feel like a menu rather than a lag. A
     * press on the summary is inside the element, so it falls through to the
     * native toggle instead of being closed here and reopened by the click.
     */
    function onPointerDown(ev: PointerEvent) {
      const target = ev.target as Node | null;
      for (const d of openMenus()) {
        if (target && d.contains(target)) continue;
        d.open = false;
      }
    }

    /** Escape closes and hands focus back to the control that opened it —
     *  otherwise a keyboard user is left focused on nothing. */
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key !== 'Escape') return;
      const open = openMenus();
      if (!open.length) return;
      ev.preventDefault();
      const summary = open[0].querySelector('summary');
      for (const d of open) d.open = false;
      summary?.focus();
    }

    document.addEventListener('click', onClick);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return null;
}
