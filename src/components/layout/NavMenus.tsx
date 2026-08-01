import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import type { NavItem } from '@/lib/nav';
import type { Locale } from '@/types';

/**
 * The two menu widgets, shared by `SiteHeader` and `BlogHeader`.
 *
 * They live here rather than in either header because both need them and
 * neither should own them. The blog kept its own three-link nav and no mobile
 * menu at all, so the site's navigation changed shape when you opened an
 * article; the headers still differ in brand and surface, but no longer in what
 * they let you reach.
 *
 * Both are native `<details>`, so every header stays a server component with no
 * JS. `js-nav-close` is picked up by one delegated listener (`NavAutoClose`) to
 * collapse the menu after a choice.
 */

export const DROP_LINK_STYLE = {
  display: 'block',
  padding: '10px 12px',
  borderRadius: 'var(--ar-radius-md)',
  fontSize: 'var(--ar-text-sm)',
  fontWeight: 'var(--ar-weight-medium)',
  color: 'var(--ar-color-text-secondary)',
  textDecoration: 'none',
} as const;

/**
 * The page you are on, inside a panel.
 *
 * A tinted row plus weight, not colour alone — colour by itself fails WCAG 1.4.1
 * and is invisible to a good share of the audience. `aria-current="page"` on the
 * anchor carries the same fact to a screen reader, which had no way of knowing
 * it before.
 */
const DROP_LINK_CURRENT = {
  background: 'var(--ar-blue-50)',
  color: 'var(--ar-color-text)',
  fontWeight: 'var(--ar-weight-semibold)',
} as const;

/** Props every nav anchor needs, so the current-page treatment cannot be
 *  applied in one place and forgotten in another. */
export function navLinkProps(link: { href: string; current?: boolean }, base: object) {
  return {
    href: link.href,
    ...(link.current ? { 'aria-current': 'page' as const } : {}),
    style: link.current ? { ...base, ...DROP_LINK_CURRENT } : base,
  };
}

const DROP_HEADING = {
  margin: '6px 0 2px',
  padding: '0 12px',
  fontSize: 'var(--ar-text-sm)',
  fontWeight: 'var(--ar-weight-semibold)',
  color: 'var(--ar-color-text)',
} as const;

const DROP_SUBHEADING = {
  margin: '6px 0 2px',
  padding: '0 12px',
  fontSize: 'var(--ar-text-xs)',
  fontWeight: 'var(--ar-weight-semibold)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ar-color-text-muted)',
} as const;

/**
 * Desktop "Area Layanan" menu.
 *
 * Click to open, not hover: hover cannot be opened on a touch device, and the
 * desktop bar starts at 768px — squarely tablet territory.
 */
export function NavDropdown({ item, linkStyle }: { item: NavItem; linkStyle: CSSProperties }) {
  return (
    <details className="site-nav-drop">
      <summary
        // The dropdown holds the current page, so the closed summary carries the
        // marker — otherwise the header goes blank about where you are on six of
        // the twelve pages.
        className={item.current ? 'site-nav-item is-current' : 'site-nav-item'}
        style={{
          ...linkStyle,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          cursor: 'pointer',
          listStyle: 'none',
        }}
      >
        {item.label}
        <span className="site-nav-caret" aria-hidden style={{ fontSize: 9, lineHeight: 1 }}>
          ▼
        </span>
      </summary>
      <div className="site-nav-drop-panel">
        {(item.groups ?? []).map((g) => (
          <div key={g.label}>
            <p style={DROP_SUBHEADING}>{g.label}</p>
            {g.items.map((n) => (
              <Link key={n.href} className="js-nav-close" {...navLinkProps(n, DROP_LINK_STYLE)}>
                {n.label}
              </Link>
            ))}
          </div>
        ))}
        {item.groupsFooter && (
          <Link
            className="js-nav-close"
            {...navLinkProps(item.groupsFooter, {
              ...DROP_LINK_STYLE,
              marginTop: 4,
              paddingTop: 10,
              borderTop: '1px solid var(--ar-color-border)',
              borderRadius: 0,
              color: 'var(--ar-color-primary)',
              fontWeight: 'var(--ar-weight-semibold)',
            })}
          >
            {item.groupsFooter.label}
          </Link>
        )}
      </div>
    </details>
  );
}

function Bar() {
  return <span style={{ width: 18, height: 2, borderRadius: 2, background: 'var(--ar-color-text)' }} />;
}

/**
 * Sub-768px menu: the same items, collapsed.
 *
 * Groups render inline and indented rather than as a nested `<details>`. A
 * disclosure inside a disclosure costs two taps to reach a city on the device
 * where the menu matters most, and the panel has room for all six.
 */
export function NavBurger({
  items,
  label,
  footer,
}: {
  items: NavItem[];
  /** aria-label for the toggle, localised by the caller. */
  label: string;
  /** CTA and language pill, appended below the links. */
  footer?: ReactNode;
}) {
  return (
    <details className="site-nav-burger">
      <summary
        aria-label={label}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          border: '1px solid var(--ar-color-border)',
          borderRadius: 'var(--ar-radius-md)',
          background: '#ffffff',
          cursor: 'pointer',
        }}
      >
        <span className="site-burger-open" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Bar />
          <Bar />
          <Bar />
        </span>
        <span className="site-burger-close" aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>
          ✕
        </span>
      </summary>
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 10px)',
          minWidth: 230,
          background: '#ffffff',
          border: '1px solid var(--ar-color-border)',
          borderRadius: 'var(--ar-radius-lg)',
          boxShadow: 'var(--ar-shadow-lg)',
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          zIndex: 40,
        }}
      >
        {/* `data-nav="items"` marks the navigation proper, separating it from
            the footer slot (CTA, language pill) that each header fills
            differently. `qa:interactions` asserts this region is byte-identical
            across every page type. */}
        <div data-nav="items" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((it) =>
          it.groups?.length ? (
            <div key={'m' + it.href + it.label}>
              <p style={DROP_HEADING}>{it.label}</p>
              {it.groups.map((g) => (
                <div key={g.label}>
                  <p style={DROP_SUBHEADING}>{g.label}</p>
                  {g.items.map((n) => (
                    <Link
                      key={n.href}
                      className="js-nav-close"
                      {...navLinkProps(n, { ...DROP_LINK_STYLE, paddingLeft: 22 })}
                    >
                      {n.label}
                    </Link>
                  ))}
                </div>
              ))}
              {it.groupsFooter && (
                <Link
                  className="js-nav-close"
                  {...navLinkProps(it.groupsFooter, {
                    ...DROP_LINK_STYLE,
                    paddingLeft: 22,
                    color: 'var(--ar-color-primary)',
                  })}
                >
                  {it.groupsFooter.label}
                </Link>
              )}
            </div>
          ) : (
            <Link key={'m' + it.href + it.label} className="js-nav-close" {...navLinkProps(it, DROP_LINK_STYLE)}>
              {it.label}
            </Link>
          )
        )}
        </div>
        {footer}
      </div>
    </details>
  );
}

/**
 * ID | EN switcher. Only rendered when the page exists in both locales —
 * offering a toggle that leads to a 404 is worse than offering none.
 *
 * Shared rather than owned by SiteHeader: the blog header had no pill at all,
 * so an English article was a dead end for anyone wanting to switch back.
 */
export function LangPill({ locale, other, href }: { locale: Locale; other: Locale; href: string }) {
  const cell = (active: boolean) =>
    ({
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: 999,
      fontSize: 'var(--ar-text-xs)',
      fontWeight: 'var(--ar-weight-semibold)',
      letterSpacing: '0.04em',
      textDecoration: 'none',
      background: active ? 'var(--ar-blue-950)' : 'transparent',
      color: active ? '#ffffff' : 'var(--ar-color-text-secondary)',
    }) as const;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: 2,
        border: '1px solid var(--ar-color-border)',
        borderRadius: 999,
      }}
    >
      <span style={cell(true)}>{locale.toUpperCase()}</span>
      <Link href={href} hrefLang={other} style={cell(false)}>
        {other.toUpperCase()}
      </Link>
    </span>
  );
}
