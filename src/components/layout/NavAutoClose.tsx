'use client';

import { useEffect } from 'react';

/**
 * Collapses the mobile burger when a link inside it is clicked.
 *
 * Native `<details>` stays open across an in-page anchor jump, which leaves the
 * dropdown covering the section the user just navigated to. One delegated
 * listener fixes that without making the header a client component.
 */
export function NavAutoClose() {
  useEffect(() => {
    function onClick(ev: MouseEvent) {
      const target = ev.target as HTMLElement | null;
      if (!target?.closest('.js-nav-close')) return;
      target.closest('details')?.removeAttribute('open');
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
