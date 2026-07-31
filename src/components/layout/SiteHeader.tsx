import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/types';
import { localeHref } from '@/lib/localize';
import type { NavItem } from '@/lib/nav';
import { DROP_LINK_STYLE, NavBurger, NavDropdown } from './NavMenus';

export type { NavItem };

interface SiteHeaderProps {
  locale: Locale;
  ctaLabel: string;
  ctaHref: string;
  /** `data-city` on the CTA, for GA4 attribution. */
  cityCode?: string;
  items: NavItem[];
  /** Path of the current page in the other locale; omit to hide the pill. */
  altLocaleHref?: string;
}

const LINK_STYLE = {
  fontSize: 'var(--ar-text-sm)',
  fontWeight: 'var(--ar-weight-medium)',
  color: 'var(--ar-color-text-secondary)',
  textDecoration: 'none',
} as const;

/**
 * Sticky header shared by every marketing page.
 *
 * The sub-768px menu is a native `<details>/<summary>`, exactly as the
 * prototypes do it — which means the whole header is a server component with no
 * JS at all. `js-nav-close` lets one tiny delegated listener collapse the menu
 * on link click (see landing.css / NavAutoClose).
 */
export function SiteHeader({
  locale,
  ctaLabel,
  ctaHref,
  cityCode,
  items,
  altLocaleHref,
}: SiteHeaderProps) {
  const other: Locale = locale === 'id' ? 'en' : 'id';

  return (
    <header
      data-screen-label="Header"
      style={{
        // The header is chrome, not part of the section-ordering scheme, so it
        // sits below every possible section order rather than at the bottom of
        // the numbered range.
        //
        // It used to be `order: 10`, which only worked while every sibling set a
        // HIGHER order. The landing templates do (hero 20, trust 30 … footer
        // 120) but Home and Travel compose their sections inline, so those
        // defaulted to `order: 0` and sorted ahead of the header — putting the
        // navbar at the very bottom of the page, just above the footer, on / ,
        // /en and /travel. A negative order removes the dependency on what any
        // sibling chooses.
        order: -1,
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--ar-color-border)',
      }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: '0 auto',
          padding: '10px clamp(20px, 4vw, 32px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <Link
          href={localeHref(locale)}
          aria-label="Beranda Arasya Rent Car"
          style={{ display: 'inline-flex', alignItems: 'center' }}
        >
          <Image
            src="/assets/brand/logo-arasya.png"
            alt="Arasya Rent Car"
            width={128}
            height={32}
            priority
            style={{ height: 'clamp(26px, 4vw, 32px)', width: 'auto', display: 'block' }}
          />
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 2.4vw, 14px)' }}>
          <div className="site-nav-links">
            {items.map((it) =>
              it.groups?.length ? (
                <NavDropdown key={it.href + it.label} item={it} linkStyle={LINK_STYLE} />
              ) : (
                <Link key={it.href + it.label} href={it.href} style={LINK_STYLE}>
                  {it.label}
                </Link>
              )
            )}
            {altLocaleHref && <LangPill locale={locale} other={other} href={altLocaleHref} />}
            <a
              href={ctaHref}
              data-cta="nav-pesan"
              data-city={cityCode}
              className="site-cta"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 38,
                padding: '0 clamp(12px, 2.4vw, 18px)',
                borderRadius: 'var(--ar-radius-md)',
                background: 'var(--city-cta)',
                color: '#ffffff',
                fontSize: 'var(--ar-text-sm)',
                fontWeight: 'var(--ar-weight-semibold)',
                textDecoration: 'none',
                transition: 'background var(--ar-duration-fast) var(--ar-ease)',
              }}
            >
              {ctaLabel}
            </a>
          </div>

          <NavBurger
            items={items}
            label={locale === 'en' ? 'Open navigation menu' : 'Buka menu navigasi'}
            footer={
              <>
                <a href={ctaHref} className="js-nav-close" style={DROP_LINK_STYLE}>
                  {ctaLabel}
                </a>
                {altLocaleHref && (
                  <div style={{ padding: '8px 12px 2px' }}>
                    <LangPill locale={locale} other={other} href={altLocaleHref} />
                  </div>
                )}
              </>
            }
          />
        </nav>
      </div>
    </header>
  );
}

/** ID | EN switcher. Only rendered when the page exists in both locales. */
function LangPill({ locale, other, href }: { locale: Locale; other: Locale; href: string }) {
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
