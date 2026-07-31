import Link from 'next/link';
import { SectionHeading } from '@/design-system';
import { AnalyticsBridge } from '@/components/AnalyticsBridge';
import { ArrowGlyph, CheckGlyph } from '@/components/icons';
import { Reveals } from '@/components/Reveal';
import { BlogFab, BlogFooter, BlogHeader } from '@/components/blog/BlogChrome';
import { WaLink } from '@/components/WaLink';
import { PILL_WA } from '@/screens/BlogIndex';
import { blogHref, cityHref, postHref } from '@/lib/localize';
import { official as officialOf, officialFor, waHref } from '@/lib/shared';
import type { Locale, Location, Post, Site } from '@/types';

interface BlogPostProps {
  post: Post;
  related: Post[];
  locations: Location[];
  site: Site;
  locale: Locale;
}

/**
 * `/blog/{slug}` — an article.
 *
 * Every article links to exactly one city page and two related articles; that
 * is the editorial rule that keeps the internal-link structure intact and
 * flows authority to the commercial pages.
 */
export function BlogPost({ post, related, locations, site, locale }: BlogPostProps) {
  // An article belongs to exactly one city, so its CTAs route to that city's
  // WhatsApp number. A Puncak itinerary is a Bogor lead, and it should reach
  // whoever handles Bogor rather than the shared inbox.
  const city = locations.find((l) => l.key === post.cityKey);
  const off = city ? officialFor(site, city) : officialOf(site);
  const en = locale === 'en';
  const wa = (msg: string) => waHref(off.waPrimary, msg);
  const cityLinks = locations.map((l) => ({ key: l.key, name: l.name, href: cityHref(l, locale) }));

  return (
    <>
      <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
        <BlogHeader
          locale={locale}
          waHref={wa(
            en
              ? 'Hello Arasya, I would like to ask about your chauffeured car rental. (ref: blog-nav)'
              : 'Halo Arasya, saya ingin bertanya tentang layanan sewa mobil dengan supir. (ref: blog-nav)'
          )}
        />

        <main style={{ flex: 1 }}>
          <article style={{ maxWidth: 768, margin: '0 auto', padding: 'clamp(36px, 6vw, 60px) clamp(20px, 4vw, 32px) 0' }}>
            <nav
              data-hero
              aria-label="Breadcrumb"
              style={{ display: 'flex', flexWrap: 'wrap', gap: 7, fontSize: 'var(--ar-text-sm)', color: 'var(--ar-color-text-muted)' }}
            >
              <Link href={blogHref()} style={{ color: 'var(--ar-blue-600)', textDecoration: 'none' }}>
                Blog
              </Link>
              <span>/</span>
              <span>{post.category}</span>
            </nav>

            <h1
              data-hero
              style={{ margin: '14px 0 0', fontSize: 'clamp(30px, 4.6vw, 46px)', lineHeight: 1.12, letterSpacing: '-0.02em', fontWeight: 'var(--ar-weight-bold)', color: 'var(--ar-blue-950)', textWrap: 'balance' }}
            >
              {post.title}
            </h1>
            <p data-hero style={{ margin: '14px 0 0', fontSize: 'clamp(16px, 1.6vw, 19px)', lineHeight: 1.7, color: 'var(--ar-color-text-secondary)', textWrap: 'pretty' }}>
              {post.excerpt}
            </p>
            <div
              data-hero
              style={{ margin: '18px 0 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px', fontSize: 'var(--ar-text-sm)', color: 'var(--ar-color-text-muted)' }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: 'var(--ar-blue-50)',
                  border: '1px solid var(--ar-blue-100)',
                  color: 'var(--ar-blue-700)',
                  fontSize: 'var(--ar-text-xs)',
                  fontWeight: 'var(--ar-weight-semibold)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {post.category}
              </span>
              <span>{post.author}</span>
              <span>·</span>
              <span>{post.dateDisplay}</span>
              <span>·</span>
              <span>
                {post.readMinutes} {en ? 'min read' : 'menit baca'}
              </span>
            </div>

            <div style={{ marginTop: 'clamp(28px, 4vw, 42px)', display: 'flex', flexDirection: 'column', gap: 'clamp(26px, 3.5vw, 36px)' }}>
              {post.sections.map((sec, i) => (
                <section key={i} className="ar-reveal">
                  <h2 style={{ margin: 0, fontSize: 'clamp(21px, 2.6vw, 28px)', lineHeight: 1.25, letterSpacing: '-0.01em', fontWeight: 'var(--ar-weight-bold)', color: 'var(--ar-blue-950)', textWrap: 'balance' }}>
                    {sec.heading}
                  </h2>
                  {sec.paragraphs.map((para, j) => (
                    <p key={j} style={{ margin: '12px 0 0', fontSize: 'var(--ar-text-md)', lineHeight: 1.85, color: 'var(--ar-gray-700)', textWrap: 'pretty' }}>
                      {para}
                    </p>
                  ))}
                  {sec.list && sec.list.length > 0 && (
                    <div
                      style={{
                        margin: '16px 0 0',
                        padding: '16px 18px',
                        borderRadius: 'var(--ar-radius-lg)',
                        background: 'var(--ar-gray-25)',
                        border: '1px solid var(--ar-color-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 9,
                      }}
                    >
                      {sec.list.map((poin, k) => (
                        <div key={k} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span
                            style={{
                              flex: '0 0 auto',
                              marginTop: 3,
                              width: 18,
                              height: 18,
                              borderRadius: 999,
                              background: 'var(--ar-blue-50)',
                              border: '1px solid var(--ar-blue-100)',
                              color: 'var(--ar-blue-700)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <CheckGlyph size={11} />
                          </span>
                          <span style={{ fontSize: 'var(--ar-text-sm)', lineHeight: 1.7, color: 'var(--ar-gray-700)' }}>{poin}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>

            <aside
              className="ar-reveal"
              style={{
                marginTop: 'clamp(30px, 4vw, 44px)',
                borderRadius: 'var(--ar-radius-xl)',
                background: 'linear-gradient(150deg, var(--ar-blue-950), var(--ar-blue-800))',
                color: '#ffffff',
                padding: 'clamp(24px, 3.5vw, 36px)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 18,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ flex: '1 1 300px', minWidth: 'min(100%, 300px)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 'var(--ar-text-xs)', fontWeight: 'var(--ar-weight-semibold)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ar-blue-200)' }}>
                  Arasya Rent Car
                </p>
                <p style={{ margin: 0, fontSize: 'clamp(19px, 2.2vw, 24px)', fontWeight: 'var(--ar-weight-bold)', lineHeight: 1.3, textWrap: 'balance' }}>
                  {en
                    ? `Need a car with a driver in ${post.cityName || 'your city'}?`
                    : `Butuh mobil dengan supir di ${post.cityName || 'kota Anda'}?`}
                </p>
                <p style={{ margin: 0, fontSize: 'var(--ar-text-sm)', lineHeight: 1.7, color: 'var(--ar-blue-200)', textWrap: 'pretty' }}>
                  {en
                    ? 'Professional drivers, transparent rates, and admins who plan the route with you.'
                    : 'Supir profesional, tarif transparan, dan admin yang merencanakan rute bersama Anda.'}
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <WaLink
                  href={wa(
                    en
                      ? `Hello Arasya, I read "${post.title}" and would like to book a car with a driver. (ref: blog-${post.key})`
                      : `Halo Arasya, saya membaca artikel "${post.title}" dan ingin memesan mobil dengan supir. (ref: blog-${post.key})`
                  )}
                  data-cta="blog-cta-wa"
                  data-city={post.cityKey}
                  style={{ ...PILL_WA, minHeight: 48, padding: '0 22px' }}
                >
                  {en ? 'Book via WhatsApp' : 'Pesan via WhatsApp'}
                </WaLink>
                {post.citySlug && city && (
                  <Link
                    href={cityHref(city, locale)}
                    data-cta="blog-cta-kota"
                    data-city={post.cityKey}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 48,
                      padding: '0 22px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#ffffff',
                      fontSize: 'var(--ar-text-md)',
                      fontWeight: 'var(--ar-weight-semibold)',
                      textDecoration: 'none',
                    }}
                  >
                    {en ? 'Car Rental ' : 'Sewa Mobil '}
                    {post.cityName}
                  </Link>
                )}
              </div>
            </aside>

            <div
              className="ar-reveal"
              style={{
                marginTop: 'clamp(26px, 3.5vw, 36px)',
                padding: '16px 18px',
                border: '1px solid var(--ar-color-border)',
                borderRadius: 'var(--ar-radius-lg)',
                display: 'flex',
                gap: 14,
                alignItems: 'center',
                background: 'var(--ar-gray-25)',
              }}
            >
              <span
                style={{
                  flex: '0 0 auto',
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  background: 'var(--ar-blue-950)',
                  color: '#7cc0f8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'var(--ar-weight-bold)',
                  fontSize: 'var(--ar-text-md)',
                }}
              >
                A
              </span>
              <div>
                <p style={{ margin: 0, fontSize: 'var(--ar-text-sm)', fontWeight: 'var(--ar-weight-bold)', color: 'var(--ar-color-text)' }}>{post.author}</p>
                <p style={{ margin: '2px 0 0', fontSize: 'var(--ar-text-xs)', color: 'var(--ar-color-text-muted)' }}>
                  {en ? 'Updated' : 'Diperbarui'} {post.updatedDisplay} ·{' '}
                  {en ? 'reviewed by the Arasya operations team' : 'Ditinjau tim operasional Arasya'}
                </p>
              </div>
            </div>
          </article>

          {related.length > 0 && (
            <section
              data-screen-label="Artikel Terkait"
              style={{ marginTop: 'clamp(40px, 6vw, 64px)', background: 'var(--ar-gray-25)', borderTop: '1px solid var(--ar-color-border)' }}
            >
              <div style={{ maxWidth: 1160, margin: '0 auto', padding: 'clamp(44px, 6vw, 64px) clamp(20px, 4vw, 32px)' }}>
                <div className="ar-reveal">
                  <SectionHeading eyebrow={en ? 'Read Next' : 'Baca Juga'} title={en ? 'Related articles' : 'Artikel terkait'} />
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
                    gap: 16,
                    marginTop: 24,
                  }}
                >
                  {related.map((rel) => (
                    <Link
                      key={rel.key}
                      className="ar-reveal card-lift"
                      href={postHref(rel, locale)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        padding: 22,
                        background: '#ffffff',
                        border: '1px solid var(--ar-color-border)',
                        borderRadius: 'var(--ar-radius-xl)',
                        textDecoration: 'none',
                        boxShadow: 'var(--ar-shadow-sm)',
                      }}
                    >
                      <span
                        style={{
                          alignSelf: 'flex-start',
                          display: 'inline-flex',
                          padding: '3px 10px',
                          borderRadius: 999,
                          background: 'var(--ar-blue-50)',
                          border: '1px solid var(--ar-blue-100)',
                          color: 'var(--ar-blue-700)',
                          fontSize: 'var(--ar-text-xs)',
                          fontWeight: 'var(--ar-weight-semibold)',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {rel.category}
                      </span>
                      <span style={{ fontSize: 'var(--ar-text-lg)', fontWeight: 'var(--ar-weight-bold)', lineHeight: 1.35, color: 'var(--ar-blue-950)', textWrap: 'balance' }}>
                        {rel.title}
                      </span>
                      <span style={{ fontSize: 'var(--ar-text-sm)', lineHeight: 1.65, color: 'var(--ar-color-text-secondary)' }}>{rel.excerpt}</span>
                      <span style={{ marginTop: 'auto', fontSize: 'var(--ar-text-sm)', fontWeight: 'var(--ar-weight-semibold)', color: 'var(--ar-blue-600)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {en ? 'Read article' : 'Baca artikel'} <ArrowGlyph size={14} />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>

        <BlogFooter locale={locale} official={off} cityLinks={cityLinks} />
      </div>

      <BlogFab
        href={wa(
          en ? `Hello Arasya, I have a question. (ref: blog-fab-${post.key})` : `Halo Arasya, saya ingin bertanya. (ref: blog-fab-${post.key})`
        )}
      />
      <AnalyticsBridge />
      <Reveals />
    </>
  );
}
