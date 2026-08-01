import Image from 'next/image';
import Link from 'next/link';
import { SectionHeading } from '@/design-system';
import { AnalyticsBridge } from '@/components/AnalyticsBridge';
import { Glyph, WaGlyph } from '@/components/icons';
import { CopyButton } from '@/components/CopyButton';
import { NavAutoClose } from '@/components/layout/NavAutoClose';
import { OfficialPhones } from '@/components/OfficialPhones';
import { Reveals } from '@/components/Reveal';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { WaFab } from '@/components/layout/WaFab';
import { WaLink } from '@/components/WaLink';
import { CONTAINER, CONTAINER_TIGHT, CTA_WA, EYEBROW_BADGE, GRID_AUTOFIT } from '@/components/sections/styles';
import { t as tStr } from '@/lib/i18n';
import { cityHref, localeHref } from '@/lib/localize';
import { siteNav } from '@/lib/nav';
import { fleet as fleetOf, formatIdr, official as officialOf, slugify, trustItems, waHref } from '@/lib/shared';
import type { Locale, Location, Site } from '@/types';

/** Cards shown before the "+N more" link out to the hub. */
const HOME_FLEET_LIMIT = 6;

interface HomeProps {
  locations: Location[];
  site: Site;
  locale: Locale;
}

/**
 * `/` — the brand homepage.
 *
 * Every value comes from the global registries; there are no page-specific CMS
 * fields. Fully bilingual, because `i18n.js` ships EN strings for this page.
 */
export function Home({ locations, site, locale }: HomeProps) {
  const T = tStr(locale);
  const off = officialOf(site);
  const en = locale === 'en';
  const phone = off.waPrimary;
  const wa = (msg: string, ref: string) => waHref(phone, msg, ref);

  const fleetAll = fleetOf(site);
  const fleetCards = fleetAll.slice(0, HOME_FLEET_LIMIT).map((f) => ({
    name: f.name,
    slug: slugify(f.name),
    capacity: `${f.capacity}${T.seatsSuffix}`,
    badge: f.badge,
    // Brand-plate photos fill the frame; transparent cutouts are inset.
    img: f.imageLogo ?? f.image,
    isCutout: !f.imageLogo && Boolean(f.image),
    price: f.dalamKota != null ? T.fromPrefix + formatIdr(f.dalamKota) : T.priceContact,
    priceSub: f.dalamKota != null ? T.priceSubIn : T.priceContactSub,
    waHref: wa(T.waUnitPre + f.name + T.waUnitPost, `HOME-armada-${slugify(f.name)}`),
  }));
  const moreFleet = Math.max(0, fleetAll.length - fleetCards.length);

  const typeLabels: Record<string, string> = {
    city: T.typeCity,
    region: T.typeRegion,
    country: T.typeCountry,
  };

  const nav = siteNav(locale, locations, localeHref(locale));

  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--ar-color-bg)', display: 'flex', flexDirection: 'column' }}>
        <SiteHeader
          locale={locale}
          items={nav}
          ctaLabel={T.cta}
          ctaHref={wa(T.waGeneral, 'HOME-nav')}
          altLocaleHref={localeHref(en ? 'id' : 'en')}
        />

        <section
          data-screen-label="Hero"
          style={{
            background:
              "linear-gradient(165deg, rgba(2, 16, 33, 0.86) 0%, rgba(6, 33, 63, 0.78) 55%, rgba(4, 43, 84, 0.72) 100%), url('/assets/images/bogor/hero-bogor.webp') center / cover no-repeat",
            color: '#ffffff',
          }}
        >
          <div style={{ maxWidth: 1160, margin: '0 auto', padding: 'clamp(72px, 12vh, 140px) clamp(20px, 4vw, 32px) clamp(56px, 8vh, 84px)' }}>
            <span data-hero="1" style={EYEBROW_BADGE}>{T.heroBadge}</span>
            <h1
              data-hero="1"
              style={{ margin: '18px 0 0', maxWidth: 760, fontSize: 'clamp(34px, 5.8vw, 62px)', lineHeight: 1.06, letterSpacing: '-0.02em', fontWeight: 'var(--ar-weight-bold)', color: '#ffffff', textWrap: 'balance' }}
            >
              {T.heroTitle}
            </h1>
            <p data-hero="1" style={{ margin: '18px 0 0', maxWidth: 620, fontSize: 'clamp(1rem, 1.4vw, 1.125rem)', lineHeight: 1.65, color: 'var(--ar-blue-100)', textWrap: 'pretty' }}>
              {T.heroSub}
            </p>
            <div data-hero="1" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 30 }}>
              <WaLink
                href={wa(T.waGeneral, 'HOME-hero-wa')}
                data-cta="home-hero-wa"
                className="cta-wa"
                style={{ ...CTA_WA, padding: '0 26px', boxShadow: '0 8px 24px rgba(18,140,80,0.35)' }}
              >
                <WaGlyph size={20} />
                {T.heroWa}
              </WaLink>
              {/* Anchors to the city grid further down this page rather than
                  navigating to /sewa-mobil. Sending people to the hub made the
                  hub a toll gate: two clicks and two page loads to reach any
                  city, when the same six cards are already below the fold here.
                  The hub keeps its own SEO value and stays reachable from the
                  nav dropdown's footer — it just stops being compulsory. */}
              <a
                href="#kota"
                data-cta="home-hero-kota"
                className="cta-ghost"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 50,
                  padding: '0 24px',
                  borderRadius: 'var(--ar-radius-md)',
                  background: 'rgba(255,255,255,0.10)',
                  border: '1px solid rgba(255,255,255,0.32)',
                  color: '#ffffff',
                  fontSize: 'var(--ar-text-md)',
                  fontWeight: 'var(--ar-weight-semibold)',
                  textDecoration: 'none',
                  transition: 'background var(--ar-duration-fast) var(--ar-ease), transform var(--ar-duration-fast) var(--ar-ease)',
                }}
              >
                {T.heroKota}
              </a>
            </div>
            <div data-hero="1" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 26 }}>
              {[T.chipFleetTypes, T.chipTarif, T.chipSupport]
                .filter(Boolean)
                .map((c) => (
                  <span
                    key={c}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '7px 14px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.10)',
                      border: '1px solid rgba(255,255,255,0.22)',
                      fontSize: 'var(--ar-text-sm)',
                      color: '#ffffff',
                    }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--city-sky)', flex: '0 0 auto' }} />
                    {c}
                  </span>
                ))}
            </div>
          </div>
        </section>

        <section data-screen-label="Kepercayaan" style={{ background: '#ffffff', borderBottom: '1px solid var(--ar-color-border)' }}>
          <div className="ar-reveal" style={{ ...CONTAINER_TIGHT, ...GRID_AUTOFIT(240, 0), gap: 'clamp(18px, 3vw, 28px)' }}>
            {trustItems(site, null).map((tc) => (
              <div key={tc.preset} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, flex: '0 0 40px', borderRadius: 'var(--ar-radius-md)', background: 'var(--ar-blue-50)', border: '1px solid var(--ar-blue-100)', color: 'var(--ar-color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Glyph name={tc.preset} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--ar-text-sm)', fontWeight: 'var(--ar-weight-bold)', color: 'var(--ar-color-text)' }}>{tc.title}</h3>
                  <p style={{ margin: 0, fontSize: 'var(--ar-text-xs)', lineHeight: 1.6, color: 'var(--ar-color-text-secondary)', textWrap: 'pretty' }}>{tc.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="armada" data-screen-label="Armada" style={{ background: 'var(--ar-color-bg)' }}>
          <div style={CONTAINER}>
            <div className="ar-reveal" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ maxWidth: 560 }}>
                <SectionHeading eyebrow={T.armadaEyebrow} title={T.armadaTitle} subtitle={T.armadaSub} />
              </div>
              <Link href={localeHref(locale, 'sewa-mobil')} data-cta="home-armada-hub" className="tap-pad" style={LINK_STRONG}>
                {T.armadaAll}
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 16, marginTop: 24 }}>
              {fleetCards.map((f) => (
                <div
                  key={f.slug}
                  className="ar-reveal card-lift"
                  style={{ display: 'flex', flexDirection: 'column', background: '#ffffff', border: '1px solid var(--ar-color-border)', borderRadius: 'var(--ar-radius-lg)', overflow: 'hidden' }}
                >
                  <div style={{ position: 'relative', aspectRatio: '3 / 2', background: 'linear-gradient(180deg, #f2f6fb 0%, #e8eef6 100%)', overflow: 'hidden' }}>
                    {f.img && (
                      <Image
                        src={f.img}
                        alt={f.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 380px"
                        style={{ objectFit: f.isCutout ? 'contain' : 'cover', padding: f.isCutout ? 14 : 0, boxSizing: 'border-box' }}
                      />
                    )}
                    {f.badge && (
                      <span style={{ position: 'absolute', top: 10, left: 10, display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: 'var(--ar-gold-100)', border: '1px solid var(--ar-gold-300)', fontSize: 'var(--ar-text-xs)', fontWeight: 'var(--ar-weight-semibold)', color: 'var(--ar-gold-700)' }}>
                        {f.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 'var(--ar-space-4) var(--ar-space-5) var(--ar-space-5)' }}>
                    <h3 style={{ margin: 0, fontSize: 'var(--ar-text-md)', fontWeight: 'var(--ar-weight-semibold)', color: 'var(--ar-color-text)' }}>{f.name}</h3>
                    <p style={{ margin: 0, fontSize: 'var(--ar-text-xs)', color: 'var(--ar-color-text-muted)' }}>{f.capacity}</p>
                    <p style={{ margin: '6px 0 0', fontSize: 'var(--ar-text-md)', fontWeight: 'var(--ar-weight-bold)', color: 'var(--ar-color-primary)' }}>{f.price}</p>
                    <p style={{ margin: 0, fontSize: 'var(--ar-text-xs)', color: 'var(--ar-color-text-secondary)' }}>{f.priceSub}</p>
                    <WaLink
                      href={f.waHref}
                      data-cta="home-armada-wa"
                      data-unit={f.slug}
                      className="cta-wa-outline"
                      style={{
                        marginTop: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        minHeight: 40,
                        padding: '0 16px',
                        borderRadius: 'var(--ar-radius-md)',
                        border: '1px solid var(--ar-color-whatsapp)',
                        color: 'var(--ar-color-whatsapp-hover, #0e7a46)',
                        background: '#ffffff',
                        fontSize: 'var(--ar-text-sm)',
                        fontWeight: 'var(--ar-weight-semibold)',
                        textDecoration: 'none',
                        transition: 'background var(--ar-duration-fast) var(--ar-ease), color var(--ar-duration-fast) var(--ar-ease)',
                      }}
                    >
                      <WaGlyph size={16} />
                      {T.orderUnit}
                    </WaLink>
                  </div>
                </div>
              ))}
            </div>
            <div className="ar-reveal" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 20 }}>
              <p style={{ margin: 0, fontSize: 'var(--ar-text-xs)', lineHeight: 1.6, color: 'var(--ar-color-text-muted)', maxWidth: 640, textWrap: 'pretty' }}>
                {site.fleetNotes.dalamKota}
              </p>
              {moreFleet > 0 && (
                <Link href={localeHref(locale, 'sewa-mobil')} data-cta="home-armada-more" style={LINK_STRONG}>
                  +{moreFleet}
                  {T.moreUnitsSuffix}
                </Link>
              )}
            </div>
          </div>
        </section>

        <section id="layanan" data-screen-label="Layanan" style={{ background: '#ffffff', borderTop: '1px solid var(--ar-color-border)', borderBottom: '1px solid var(--ar-color-border)' }}>
          <div style={CONTAINER}>
            <div className="ar-reveal">
              <SectionHeading eyebrow={T.layananEyebrow} title={T.layananTitle} subtitle={T.layananSub} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 16, marginTop: 24 }}>
              {site.services.map((sv) => (
                <WaLink
                  key={sv.slug}
                  href={wa(T.waServicePre + sv.title + T.waServicePost, `HOME-layanan-${sv.slug}`)}
                  data-cta="home-layanan"
                  className="ar-reveal card-lift-bordered"
                  style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#ffffff', border: '1px solid var(--ar-color-border)', borderRadius: 'var(--ar-radius-lg)', padding: 'var(--ar-space-5)', textDecoration: 'none' }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 'var(--ar-radius-md)', background: 'var(--ar-blue-50)', border: '1px solid var(--ar-blue-100)', color: 'var(--ar-color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Glyph name={sv.icon} />
                  </div>
                  <h3 style={{ margin: '2px 0 0', fontSize: 'var(--ar-text-md)', fontWeight: 'var(--ar-weight-semibold)', color: 'var(--ar-color-text)' }}>{sv.title}</h3>
                  <p style={{ margin: 0, fontSize: 'var(--ar-text-sm)', lineHeight: 1.6, color: 'var(--ar-color-text-secondary)', textWrap: 'pretty' }}>{sv.description}</p>
                  <span style={{ marginTop: 'auto', paddingTop: 4, fontSize: 'var(--ar-text-sm)', fontWeight: 'var(--ar-weight-semibold)', color: 'var(--ar-color-primary)' }}>{T.layananAsk}</span>
                </WaLink>
              ))}
            </div>
          </div>
        </section>

        <section id="kota" data-screen-label="Kota Layanan" style={{ background: 'var(--ar-color-bg)' }}>
          <div style={CONTAINER}>
            <div className="ar-reveal">
              <SectionHeading eyebrow={T.kotaEyebrow} title={T.kotaTitle} subtitle={T.kotaSub} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 16, marginTop: 24 }}>
              {locations.map((l) => (
                <Link
                  key={l.key}
                  className="ar-reveal card-lift-bordered"
                  href={cityHref(l, locale)}
                  data-cta="home-kota"
                  data-city={l.code}
                  style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#ffffff', border: '1px solid var(--ar-color-border)', borderRadius: 'var(--ar-radius-lg)', padding: 'var(--ar-space-5)', textDecoration: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: 'var(--ar-blue-50)', border: '1px solid var(--ar-blue-100)', fontSize: 'var(--ar-text-xs)', fontWeight: 'var(--ar-weight-semibold)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ar-blue-700)' }}>
                      {typeLabels[l.pageType] ?? T.typeCity}
                    </span>
                    <span style={{ fontSize: 'var(--ar-text-xs)', fontWeight: 'var(--ar-weight-semibold)', letterSpacing: '0.1em', color: 'var(--ar-color-text-muted)' }}>{l.code}</span>
                  </div>
                  <h3 style={{ margin: '4px 0 0', fontSize: 'var(--ar-text-lg)', fontWeight: 'var(--ar-weight-semibold)', color: 'var(--ar-color-text)' }}>
                    {T.rentPrefix}
                    {l.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: 'var(--ar-text-sm)', lineHeight: 1.6, color: 'var(--ar-color-text-secondary)', textWrap: 'pretty' }}>
                    {T.servingPrefix}
                    {l.serviceLine}.
                  </p>
                  <span style={{ marginTop: 'auto', paddingTop: 6, fontSize: 'var(--ar-text-sm)', fontWeight: 'var(--ar-weight-semibold)', color: 'var(--ar-color-primary)' }}>{T.seeTariff}</span>
                </Link>
              ))}
              <Link
                className="ar-reveal"
                href={localeHref(locale, 'sewa-mobil')}
                data-cta="home-kota-semua"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 8, background: 'transparent', border: '2px dashed var(--ar-color-border-strong)', borderRadius: 'var(--ar-radius-lg)', padding: 'var(--ar-space-5)', textDecoration: 'none' }}
              >
                <h3 style={{ margin: 0, fontSize: 'var(--ar-text-lg)', fontWeight: 'var(--ar-weight-semibold)', color: 'var(--ar-color-text)' }}>{T.allCitiesTitle}</h3>
                <p style={{ margin: 0, fontSize: 'var(--ar-text-sm)', lineHeight: 1.6, color: 'var(--ar-color-text-secondary)', textWrap: 'pretty' }}>{T.allCitiesDesc}</p>
                <span style={{ fontSize: 'var(--ar-text-sm)', fontWeight: 'var(--ar-weight-semibold)', color: 'var(--ar-color-primary)' }}>{T.allCitiesLink}</span>
              </Link>
            </div>
          </div>
        </section>

        <section id="testimoni" data-screen-label="Testimoni" style={{ background: '#ffffff', borderTop: '1px solid var(--ar-color-border)' }}>
          <div style={CONTAINER}>
            <div className="ar-reveal">
              <SectionHeading eyebrow={T.testiEyebrow} title={T.testiTitle} subtitle={T.testiSub} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 16, marginTop: 24 }}>
              {site.testimonials.map((tm, i) => (
                <figure key={i} className="ar-reveal" style={{ margin: 0, background: '#ffffff', border: '1px solid var(--ar-color-border)', borderRadius: 'var(--ar-radius-lg)', padding: 'var(--ar-space-5)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <blockquote style={{ margin: 0, fontSize: 'var(--ar-text-md)', lineHeight: 1.7, color: 'var(--ar-color-text)', textWrap: 'pretty' }}>“{tm.quote}”</blockquote>
                  <figcaption style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 'auto' }}>
                    <span style={{ fontSize: 'var(--ar-text-sm)', fontWeight: 'var(--ar-weight-bold)', color: 'var(--ar-color-text)' }}>{tm.name}</span>
                    <span style={{ fontSize: 'var(--ar-text-xs)', color: 'var(--ar-color-text-muted)' }}>{tm.context}</span>
                    {tm.link && (
                      <a href={tm.link} target="_blank" rel="noopener noreferrer" className="link-arrow" style={{ marginTop: 6, fontSize: 'var(--ar-text-xs)', fontWeight: 'var(--ar-weight-medium)', color: 'var(--ar-color-primary)', textDecoration: 'none' }}>
                        {en ? 'See the review on Google ↗' : 'Lihat ulasan di Google ↗'}
                      </a>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section
          data-screen-label="Verifikasi Resmi"
          style={{ background: 'linear-gradient(165deg, var(--ar-blue-950) 0%, var(--city-navy-2) 60%, var(--ar-blue-900) 100%)', color: '#ffffff' }}
        >
          <div style={{ maxWidth: 1160, margin: '0 auto', padding: 'clamp(56px, 8vw, 96px) clamp(20px, 4vw, 32px)', display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px, 4vw, 56px)' }}>
            <div className="ar-reveal" style={{ flex: '1.3 1 320px', minWidth: 'min(100%, 320px)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, fontSize: 'var(--ar-text-xs)', fontWeight: 'var(--ar-weight-semibold)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--city-sky)' }}>{T.verifEyebrow}</p>
              <h2 style={{ margin: 0, fontSize: 'clamp(26px, 3.4vw, 40px)', lineHeight: 1.15, letterSpacing: '-0.01em', fontWeight: 'var(--ar-weight-bold)', color: '#ffffff', textWrap: 'balance' }}>{T.verifTitle}</h2>
              <p style={{ margin: 0, fontSize: 'var(--ar-text-md)', lineHeight: 1.75, color: 'var(--ar-blue-200)', textWrap: 'pretty' }}>{T.verifDesc}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 'var(--ar-text-xs)', fontWeight: 'var(--ar-weight-semibold)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ar-blue-400)' }}>{T.verifNumbers}</p>
                <OfficialPhones
                  official={off}
                  style={{ fontSize: 'var(--ar-text-md)', fontWeight: 'var(--ar-weight-bold)', color: '#ffffff' }}
                  gap={2}
                />
                <p style={{ margin: 0, fontSize: 'var(--ar-text-xs)', color: 'var(--ar-blue-200)' }}>{T.verifHours}</p>
              </div>
              <WaLink href={wa(T.waGeneral, 'HOME-verif-wa')} data-cta="home-verif-wa" className="cta-wa-flat" style={{ ...CTA_WA, alignSelf: 'flex-start', minHeight: 48, padding: '0 24px' }}>
                <WaGlyph size={20} />
                {T.verifWa}
              </WaLink>
            </div>
            <div className="ar-reveal" style={{ flex: '1 1 300px', minWidth: 'min(100%, 300px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 'var(--ar-text-xs)', fontWeight: 'var(--ar-weight-semibold)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ar-blue-400)' }}>{T.bankLabel}</p>
              {off.bankAccounts.map((bk) => (
                <div key={bk.key} style={{ borderRadius: 14, background: 'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05))', border: '1px solid rgba(147,197,246,0.3)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 'var(--ar-text-sm)', fontWeight: 'var(--ar-weight-bold)', letterSpacing: '0.06em', color: '#ffffff' }}>{bk.bank}</span>
                    <CopyButton
                      value={bk.digits}
                      label={T.bankCopy}
                      copiedLabel={T.bankCopied}
                      className="copy-chip-dark"
                      style={{ border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', color: '#ffffff', fontFamily: 'inherit', fontSize: 'var(--ar-text-xs)', fontWeight: 'var(--ar-weight-semibold)', padding: '4px 10px', borderRadius: 999, cursor: 'pointer', transition: 'background var(--ar-duration-fast) var(--ar-ease)' }}
                    />
                  </div>
                  <span style={{ fontSize: 'clamp(20px, 2.4vw, 24px)', fontWeight: 'var(--ar-weight-bold)', letterSpacing: '0.06em', color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}>{bk.number}</span>
                  <span style={{ fontSize: 'var(--ar-text-xs)', color: 'var(--ar-blue-200)' }}>{bk.owner}</span>
                </div>
              ))}
              <p style={{ margin: 0, fontSize: 'var(--ar-text-xs)', lineHeight: 1.6, color: 'var(--ar-blue-300, var(--ar-blue-200))', textWrap: 'pretty' }}>{T.bankNote}</p>
            </div>
          </div>
        </section>

        <SiteFooter
          locale={locale}
          official={off}
          labels={{ contact: T.footContact, explore: T.footExplore, rights: T.footRights, otherCities: T.navKota }}
          otherCities={locations.map((l) => ({ key: l.key, name: l.name, slug: l.slug, href: cityHref(l, locale) }))}
        />
      </div>

      <WaFab href={wa(T.waGeneral, 'HOME-fab')} cta="home-fab-wa" />
      <AnalyticsBridge />
      <NavAutoClose />
      <Reveals />
    </>
  );
}

const LINK_STRONG = {
  fontSize: 'var(--ar-text-sm)',
  fontWeight: 'var(--ar-weight-semibold)',
  color: 'var(--ar-color-primary)',
  textDecoration: 'none',
} as const;
