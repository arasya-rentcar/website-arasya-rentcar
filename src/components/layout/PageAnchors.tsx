import type { NavLink } from '@/lib/nav';
import type { Locale } from '@/types';

/**
 * In-page section links, directly under the hero.
 *
 * The navbar used to carry these — Armada and FAQ on city pages, Rute on
 * /travel, Layanan on the home page — which is precisely why no two pages had
 * the same nav: every page has different sections, so a nav built from them
 * cannot be shared. `siteNav` now carries only site-wide destinations.
 *
 * They still earn their place on a page this long, so they move here, where
 * being page-specific is the point rather than a defect. A reader who wants the
 * rates should not have to scroll past four sections to find them.
 *
 * Scrolls horizontally rather than wrapping: on a 344px Fold cover five items
 * would stack into three rows and push the hero off screen.
 */
export function PageAnchors({
  items,
  order,
  locale,
}: {
  items: NavLink[];
  order?: number;
  locale: Locale;
}) {
  if (items.length < 2) return null;

  return (
    <nav
      // Localised, not hardcoded Indonesian: this is the only name a screen
      // reader has for the landmark, and it would announce "Bagian halaman" to
      // someone reading the English site.
      aria-label={locale === 'en' ? 'Page sections' : 'Bagian halaman'}
      style={{
        // Only set where the siblings use the ordering scheme. The landing
        // templates number every section (hero 20, trust 30 … footer 120), so
        // this needs 21 to follow the hero; /travel composes its sections
        // inline, where they all default to 0 — an order of 21 there would sort
        // this to the bottom of the page. That is exactly how the navbar ended
        // up above the footer once; see SiteHeader.
        ...(order === undefined ? {} : { order }),
        background: '#ffffff',
        borderBottom: '1px solid var(--ar-color-border)',
      }}
    >
      <div
        className="page-anchors"
        style={{
          maxWidth: 1160,
          margin: '0 auto',
          padding: '0 clamp(20px, 4vw, 32px)',
          display: 'flex',
          gap: 'clamp(14px, 3vw, 28px)',
          overflowX: 'auto',
        }}
      >
        {items.map((it) => (
          <a
            key={it.href}
            href={it.href}
            style={{
              flex: '0 0 auto',
              padding: '13px 0',
              fontSize: 'var(--ar-text-sm)',
              fontWeight: 'var(--ar-weight-medium)',
              color: 'var(--ar-color-text-secondary)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {it.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
