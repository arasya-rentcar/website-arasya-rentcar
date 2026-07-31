import Link from 'next/link';
import { WaGlyph } from '@/components/icons';
import { WaLink } from '@/components/WaLink';
import { blogHref } from '@/lib/localize';
import { siteNav } from '@/lib/nav';
import { NavBurger, NavDropdown } from '@/components/layout/NavMenus';
import { OfficialPhones } from '@/components/OfficialPhones';
import type { Official } from '@/lib/shared';
// `Location` must be imported explicitly — the DOM lib declares a global of the
// same name, so an un-imported reference silently resolves to window.location's
// type rather than ours.
import type { Locale, Location } from '@/types';

/**
 * The blog runs its own lighter chrome — wordmark instead of the full nav, on a
 * white surface rather than the landing grey. Matches BlogIndex/BlogPost.dc.html.
 */
export function BlogHeader({
  locale,
  waHref,
  locations,
}: {
  locale: Locale;
  waHref: string;
  locations: Location[];
}) {
  // The same four items as every other page. The blog keeps its lighter chrome —
  // wordmark on white rather than the full logo bar — but not its own idea of
  // what the site's sections are.
  const nav = siteNav(locale, locations);
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--ar-color-border)',
      }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: '0 auto',
          padding: '12px clamp(20px, 4vw, 32px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Link href={blogHref()} style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 'var(--ar-text-lg)', fontWeight: 'var(--ar-weight-bold)', letterSpacing: '0.02em', color: 'var(--ar-blue-950)' }}>
            ARASYA
          </span>
          <span style={{ fontSize: 'var(--ar-text-xs)', fontWeight: 'var(--ar-weight-semibold)', letterSpacing: '0.16em', color: 'var(--ar-color-text-muted)' }}>
            BLOG
          </span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 2vw, 20px)' }}>
          {/* An article used to be a one-way street: the commercial pages linked
              in, and nothing linked back out except the footer. These carry the
              return half of the internal-link mesh — and now they are the same
              four items as every other page, rather than the blog's own idea of
              what the site contains. */}
          <div className="site-nav-links">
            {nav.map((it) =>
              it.groups?.length ? (
                <NavDropdown key={it.label} item={it} linkStyle={BLOG_NAV_LINK} />
              ) : (
                <Link key={it.href + it.label} href={it.href} style={BLOG_NAV_LINK}>
                  {it.label}
                </Link>
              )
            )}
          </div>

          {/* The blog had no mobile menu at all — below 768px `site-nav-links`
              is hidden and nothing replaced it, so an article on a phone offered
              only the wordmark and a WhatsApp button. Same burger as everywhere
              else now. */}
          {/* No footer slot: `siteNav` already leads with Beranda, and the
              WhatsApp button beside this is visible at every width. */}
          <NavBurger
            items={nav}
            label={locale === 'en' ? 'Open navigation menu' : 'Buka menu navigasi'}
          />

          <WaLink
            href={waHref}
            data-cta="blog-nav-wa"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: 40,
              padding: '0 18px',
              borderRadius: 999,
              background: 'var(--ar-blue-950)',
              color: '#ffffff',
              fontSize: 'var(--ar-text-sm)',
              fontWeight: 'var(--ar-weight-semibold)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {locale === 'en' ? 'Contact Us' : 'Hubungi Kami'}
          </WaLink>
        </nav>
      </div>
    </header>
  );
}

const BLOG_NAV_LINK = {
  fontSize: 'var(--ar-text-sm)',
  fontWeight: 'var(--ar-weight-medium)',
  color: 'var(--ar-color-text-secondary)',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
} as const;

export function BlogFooter({
  locale,
  official,
  cityLinks,
}: {
  locale: Locale;
  official: Official;
  cityLinks: { key: string; name: string; href: string }[];
}) {
  const en = locale === 'en';
  return (
    <footer style={{ background: 'var(--ar-blue-950)', color: 'var(--ar-blue-200)' }}>
      <div
        style={{
          maxWidth: 1160,
          margin: '0 auto',
          padding: 'clamp(36px, 5vw, 56px) clamp(20px, 4vw, 32px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 420 }}>
            <p style={{ margin: 0, fontSize: 'var(--ar-text-lg)', fontWeight: 'var(--ar-weight-bold)', color: '#ffffff', letterSpacing: '0.02em' }}>
              ARASYA RENT CAR
            </p>
            <p style={{ margin: 0, fontSize: 'var(--ar-text-sm)', lineHeight: 1.7 }}>
              {en
                ? 'Premium chauffeured car rental — PT. Ayomi Raya, Bogor.'
                : 'Sewa mobil premium dengan supir profesional — PT. Ayomi Raya, Bogor.'}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ margin: 0, fontSize: 'var(--ar-text-xs)', fontWeight: 'var(--ar-weight-semibold)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ar-blue-400)' }}>
              {en ? 'Service Cities' : 'Kota Layanan'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', maxWidth: 460 }}>
              {cityLinks.map((c) => (
                <Link key={c.key} href={c.href} className="tap-pad" style={{ fontSize: 'var(--ar-text-sm)', color: 'var(--ar-blue-100)', textDecoration: 'none' }}>
                  {en ? 'Car Rental ' : 'Sewa Mobil '}
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div style={{ paddingTop: 14, borderTop: '1px solid rgba(147,197,246,0.18)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 'var(--ar-text-xs)', color: 'var(--ar-blue-400)' }}>
            © {new Date().getFullYear()} PT. Ayomi Raya
          </p>
          <OfficialPhones
            official={official}
            style={{ fontSize: 'var(--ar-text-xs)', color: 'var(--ar-blue-200)' }}
            gap={2}
          />
        </div>
      </div>
    </footer>
  );
}

export function BlogFab({ href }: { href: string }) {
  return (
    <WaLink
      href={href}
      data-cta="blog-fab-wa"
      aria-label="WhatsApp Arasya"
      className="wa-fab"
      style={{
        position: 'fixed',
        right: 18,
        bottom: 18,
        zIndex: 60,
        width: 56,
        height: 56,
        borderRadius: 999,
        background: 'var(--ar-color-whatsapp)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 10px 24px rgba(1,24,48,0.35)',
        textDecoration: 'none',
        transition: 'background var(--ar-duration-fast) var(--ar-ease)',
      }}
    >
      <WaGlyph size={26} />
    </WaLink>
  );
}
