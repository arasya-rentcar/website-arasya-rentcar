import Link from 'next/link';
import { AnalyticsBridge } from '@/components/AnalyticsBridge';
import { MAIN_ID, SkipLink } from '@/components/layout/SkipLink';
import { Reveals } from '@/components/Reveal';
import { BlogHeader, BlogFooter, BlogFab } from '@/components/blog/BlogChrome';
import { PostFilter } from '@/components/blog/PostFilter';
import { WaLink } from '@/components/WaLink';
import { blogHref, cityHref } from '@/lib/localize';
import { official as officialOf, waHref } from '@/lib/shared';
import type { Locale, Location, Post, Site } from '@/types';

interface BlogIndexProps {
  posts: Post[];
  locations: Location[];
  site: Site;
  locale: Locale;
}

/**
 * `/blog` — informational content that feeds authority into the commercial
 * city pages. The city links at the bottom are half of the two-way internal
 * link structure the pSEO spec requires.
 */
export function BlogIndex({ posts, locations, site, locale }: BlogIndexProps) {
  const off = officialOf(site);
  const en = locale === 'en';
  const wa = (msg: string) => waHref(off.waPrimary, msg);

  const cityLinks = locations.map((l) => ({ key: l.key, name: l.name, href: cityHref(l, locale) }));

  return (
    <>
      <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
        <SkipLink locale={locale} />

        <BlogHeader
          locale={locale}
          locations={locations}
          activePath={blogHref(locale)}
          // Both locales have an index, so the pill is unconditional here.
          altLocaleHref={blogHref(en ? 'id' : 'en')}
          waHref={wa(
            en
              ? 'Hello Arasya, I would like to ask about your chauffeured car rental. (ref: blog-index-nav)'
              : 'Halo Arasya, saya ingin bertanya tentang layanan sewa mobil dengan supir. (ref: blog-index-nav)'
          )}
        />

        <main id={MAIN_ID} style={{ flex: 1 }}>
          <section
            data-screen-label="Hero Blog"
            style={{ background: 'linear-gradient(150deg, var(--ar-blue-950) 0%, var(--ar-blue-900) 100%)', color: '#ffffff' }}
          >
            <div style={{ maxWidth: 1160, margin: '0 auto', padding: 'clamp(48px, 7vw, 84px) clamp(20px, 4vw, 32px)' }}>
              <p data-hero style={{ margin: 0, fontSize: 'var(--ar-text-xs)', fontWeight: 'var(--ar-weight-semibold)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ar-blue-200)' }}>
                {en ? 'Arasya Blog' : 'Blog Arasya'}
              </p>
              <h1
                data-hero
                style={{ margin: '14px 0 0', maxWidth: 640, fontSize: 'clamp(30px, 4.6vw, 50px)', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 'var(--ar-weight-bold)', textWrap: 'balance' }}
              >
                {en ? 'Travel guides from the team that drives you' : 'Panduan perjalanan dari tim yang mengantar Anda'}
              </h1>
              <p data-hero style={{ margin: '16px 0 0', maxWidth: 560, fontSize: 'clamp(15px, 1.6vw, 18px)', lineHeight: 1.7, color: 'var(--ar-blue-200)', textWrap: 'pretty' }}>
                {en
                  ? 'Itineraries, transport tips, and destination guides — written from what Arasya’s drivers and admins see on the ground.'
                  : 'Itinerari, tips transportasi, dan panduan destinasi — ditulis dari pengalaman supir dan admin Arasya di lapangan.'}
              </p>
            </div>
          </section>

          <PostFilter posts={posts} locale={locale} />

          <section data-screen-label="CTA Kota" style={{ background: 'var(--ar-gray-25)' }}>
            <div
              className="ar-reveal"
              style={{
                maxWidth: 1160,
                margin: '0 auto',
                padding: 'clamp(44px, 6vw, 68px) clamp(20px, 4vw, 32px)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 20,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ flex: '1 1 320px', minWidth: 'min(100%, 320px)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 'clamp(22px, 2.8vw, 30px)', lineHeight: 1.2, letterSpacing: '-0.01em', fontWeight: 'var(--ar-weight-bold)', color: 'var(--ar-blue-950)', textWrap: 'balance' }}>
                  {en ? 'Ready to plan your next trip?' : 'Siap merencanakan perjalanan berikutnya?'}
                </h2>
                <p style={{ margin: 0, fontSize: 'var(--ar-text-sm)', lineHeight: 1.7, color: 'var(--ar-color-text-secondary)', textWrap: 'pretty' }}>
                  {en
                    ? 'Talk through your route — a written quote in minutes, with no hidden fees.'
                    : 'Konsultasikan rute Anda — penawaran tertulis dalam hitungan menit, tanpa biaya tersembunyi.'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 4 }}>
                  {cityLinks.map((c) => (
                    <Link
                      key={c.key}
                      href={c.href}
                      className="tap-pad"
                      style={{ fontSize: 'var(--ar-text-sm)', fontWeight: 'var(--ar-weight-semibold)', color: 'var(--ar-blue-600)', textDecoration: 'none' }}
                    >
                      {en ? 'Car Rental ' : 'Sewa Mobil '}
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
              <WaLink
                href={wa(
                  en
                    ? 'Hello Arasya, I would like to plan a trip and book a car with a driver. (ref: blog-index-cta)'
                    : 'Halo Arasya, saya ingin merencanakan perjalanan dan memesan mobil dengan supir. (ref: blog-index-cta)'
                )}
                data-cta="blog-index-cta"
                style={PILL_WA}
              >
                {en ? 'Book via WhatsApp' : 'Pesan via WhatsApp'}
              </WaLink>
            </div>
          </section>
        </main>

        <BlogFooter locale={locale} official={off} cityLinks={cityLinks} />
      </div>

      <BlogFab
        href={wa(en ? 'Hello Arasya, I have a question. (ref: blog-index-fab)' : 'Halo Arasya, saya ingin bertanya. (ref: blog-index-fab)')}
      />
      <AnalyticsBridge />
      <Reveals />
    </>
  );
}

export const PILL_WA = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 52,
  padding: '0 26px',
  borderRadius: 999,
  background: 'var(--ar-color-whatsapp)',
  color: '#04310f',
  fontSize: 'var(--ar-text-md)',
  fontWeight: 'var(--ar-weight-bold)',
  textDecoration: 'none',
  boxShadow: 'var(--ar-shadow-lg)',
  transition: 'background var(--ar-duration-fast) var(--ar-ease)',
} as const;
