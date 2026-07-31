import { AnalyticsBridge } from '@/components/AnalyticsBridge';
import { Glyph, WaGlyph } from '@/components/icons';
import { NavAutoClose } from '@/components/layout/NavAutoClose';
import { Reveals } from '@/components/Reveal';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { WaFab } from '@/components/layout/WaFab';
import { WaLink } from '@/components/WaLink';
import { HubDirectory, type HubCard } from '@/components/hub/HubDirectory';
import { CONTAINER_TIGHT, CTA_PRIMARY, CTA_WA, CHIP_DARK, EYEBROW_BADGE, GRID_AUTOFIT } from '@/components/sections/styles';
import { tLanding } from '@/lib/i18n';
import { cityHref, localeHref } from '@/lib/localize';
import { siteNav } from '@/lib/nav';
import { fleet as fleetOf, formatIdr, official as officialOf, waHref } from '@/lib/shared';
import type { Locale, Location, Site } from '@/types';

interface HubProps {
  locations: Location[];
  site: Site;
  locale: Locale;
}

const WA_GENERAL =
  'Halo admin Arasya Rent Car, saya ingin memesan unit mobil dengan supir. Mohon dibantu. Terima kasih.';

/**
 * `/sewa-mobil` — the directory of every landing page.
 *
 * This is the required crawl node: it is what gets deep city pages discovered.
 * Every published entry must appear here, which is why the grid is built from
 * the full list rather than a curated subset.
 */
export function Hub({ locations, site, locale }: HubProps) {
  const t = tLanding(locale);
  const off = officialOf(site);
  const en = locale === 'en';

  // Indonesian cards advertise a starting price from the global fleet; overseas
  // cards stay quote-based, since tariffs there are confirmed per city.
  const lows = fleetOf(site)
    .map((f) => f.dalamKota)
    .filter((n): n is number => typeof n === 'number');
  const fleetFrom = lows.length
    ? `${en ? 'From ' : 'Mulai '}${formatIdr(Math.min(...lows))}${en ? ' · 12 hours, driver included' : ' · 12 jam termasuk driver'}`
    : '';

  const typeLabels: Record<string, string> = {
    city: en ? 'City' : 'Kota',
    region: en ? 'Region' : 'Wilayah',
    country: en ? 'Country' : 'Negara',
  };

  const cards: HubCard[] = locations.map((l) => ({
    key: l.key,
    name: l.name,
    code: l.code,
    href: cityHref(l, locale),
    serviceLine: l.serviceLine,
    typeLabel: typeLabels[l.pageType] ?? typeLabels.city,
    country: l.country,
    priceLine: l.country === 'ID' ? fleetFrom : '',
  }));

  const nav = siteNav(locale, locations);

  const wa = (ref: string, msg = WA_GENERAL) => waHref(off.waPrimary, msg, ref);

  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--ar-color-bg)', display: 'flex', flexDirection: 'column' }}>
        <SiteHeader
          locale={locale}
          items={nav}
          ctaLabel={t.cta}
          ctaHref={wa('HUB-nav')}
          altLocaleHref={localeHref(en ? 'id' : 'en', 'sewa-mobil')}
        />

        <section
          data-screen-label="Hero"
          style={{
            background:
              'linear-gradient(165deg, var(--ar-blue-950) 0%, var(--city-navy-2) 60%, var(--ar-blue-900) 100%)',
            color: '#ffffff',
          }}
        >
          <div
            style={{
              maxWidth: 1160,
              margin: '0 auto',
              padding: 'clamp(64px, 10vh, 120px) clamp(20px, 4vw, 32px) clamp(48px, 7vh, 72px)',
            }}
          >
            <span data-hero="1" style={EYEBROW_BADGE}>
              {en ? 'Service City Directory' : 'Direktori Kota Layanan'}
            </span>
            <h1
              data-hero="1"
              style={{
                margin: '18px 0 0',
                maxWidth: 780,
                fontSize: 'clamp(32px, 5.5vw, 58px)',
                lineHeight: 1.08,
                letterSpacing: '-0.02em',
                fontWeight: 'var(--ar-weight-bold)',
                color: '#ffffff',
                textWrap: 'balance',
              }}
            >
              {en
                ? 'Car Rental with a Driver in Your Destination City'
                : 'Sewa Mobil dengan Supir di Kota Tujuan Anda'}
            </h1>
            <p
              data-hero="1"
              style={{
                margin: '18px 0 0',
                maxWidth: 620,
                fontSize: 'clamp(1rem, 1.4vw, 1.125rem)',
                lineHeight: 1.65,
                color: 'var(--ar-blue-100)',
                textWrap: 'pretty',
              }}
            >
              {en
                ? 'One premium Arasya standard in every city — pick your departure city to see rates, fleet, and routes, then book over WhatsApp.'
                : 'Satu standar layanan premium Arasya di setiap kota — pilih kota keberangkatan Anda untuk melihat tarif, armada, dan rute, lalu pesan melalui WhatsApp.'}
            </p>
            <div data-hero="1" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 30 }}>
              <a
                href="#kota"
                data-cta="hub-hero-pilih"
                className="cta-primary"
                style={{ ...CTA_PRIMARY, boxShadow: '0 8px 24px rgba(217,81,28,0.35)' }}
              >
                {en ? 'Choose a City' : 'Pilih Kota'}
              </a>
              <WaLink href={wa('HUB-hero')} data-cta="hub-hero-wa" className="cta-wa" style={CTA_WA}>
                <WaGlyph size={20} />
                {en ? 'Chat on WhatsApp' : 'Konsultasi WhatsApp'}
              </WaLink>
            </div>
            <div data-hero="1" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 26 }}>
              {(en
                ? ['Indonesia & abroad', 'Transparent per-city rates', '24/7 admin support']
                : ['Indonesia & luar negeri', 'Tarif transparan per kota', 'Support admin 24/7']
              ).map((c) => (
                <span key={c} style={{ ...CHIP_DARK, backdropFilter: undefined, WebkitBackdropFilter: undefined }}>
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--city-sky)', flex: '0 0 auto' }} />
                  {c}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section
          data-screen-label="Kepercayaan"
          style={{ background: '#ffffff', borderBottom: '1px solid var(--ar-color-border)' }}
        >
          <div className="ar-reveal" style={{ ...CONTAINER_TIGHT, ...GRID_AUTOFIT(240, 0), gap: 'clamp(18px, 3vw, 28px)' }}>
            {[
              ['shield', en ? 'Experienced Drivers' : 'Driver Berpengalaman', en ? 'Disciplined, punctual, and familiar with every service route.' : 'Tertib, tepat waktu, dan memahami rute setiap kota layanan.'],
              ['car', en ? 'Well-Maintained Cars' : 'Mobil Terawat', en ? 'A clean fleet, inspected before every pick-up.' : 'Armada bersih dan diperiksa sebelum setiap penjemputan.'],
              ['check', en ? 'Transparent Pricing' : 'Harga Transparan', en ? 'Written quotes with no hidden fees, in any city.' : 'Penawaran tertulis tanpa biaya tersembunyi, di kota mana pun.'],
              ['phone', en ? '24/7 Support' : 'Support 24/7', en ? 'Our admins can help you book at any hour on WhatsApp.' : 'Admin siap membantu pemesanan kapan pun melalui WhatsApp.'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    flex: '0 0 40px',
                    borderRadius: 'var(--ar-radius-md)',
                    background: 'var(--ar-blue-50)',
                    border: '1px solid var(--ar-blue-100)',
                    color: 'var(--ar-color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Glyph name={icon} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--ar-text-sm)', fontWeight: 'var(--ar-weight-bold)', color: 'var(--ar-color-text)' }}>
                    {title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 'var(--ar-text-xs)', lineHeight: 1.6, color: 'var(--ar-color-text-secondary)', textWrap: 'pretty' }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <HubDirectory
          cards={cards}
          locale={locale}
          waNewCity={wa(
            'HUB-kota-baru',
            en
              ? 'Hello Arasya Rent Car, I need service in a city that is not listed on the site. My destination city is: '
              : 'Halo admin Arasya Rent Car, saya membutuhkan layanan di kota yang belum terdaftar di situs. Kota tujuan saya: '
          )}
        />

        <section
          data-screen-label="Standar Layanan"
          style={{
            background:
              'linear-gradient(165deg, var(--ar-blue-950) 0%, var(--city-navy-2) 60%, var(--ar-blue-900) 100%)',
            color: '#ffffff',
          }}
        >
          <div
            style={{
              maxWidth: 1160,
              margin: '0 auto',
              padding: 'clamp(56px, 8vw, 96px) clamp(20px, 4vw, 32px)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'clamp(24px, 4vw, 56px)',
            }}
          >
            <div className="ar-reveal" style={{ flex: '1 1 280px', minWidth: 'min(100%, 280px)' }}>
              <p style={{ margin: 0, fontSize: 'var(--ar-text-xs)', fontWeight: 'var(--ar-weight-semibold)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--city-sky)' }}>
                {en ? 'Service Standard' : 'Standar Layanan'}
              </p>
              <h2 style={{ margin: '12px 0 0', fontSize: 'clamp(26px, 3.4vw, 40px)', lineHeight: 1.15, letterSpacing: '-0.01em', fontWeight: 'var(--ar-weight-bold)', color: '#ffffff', textWrap: 'balance' }}>
                {en ? 'Different cities, the same Arasya standard' : 'Kota berbeda, standar Arasya yang sama'}
              </h2>
              <div style={{ width: 56, height: 2, background: 'var(--ar-blue-400)', marginTop: 20 }} />
            </div>
            <div className="ar-reveal" style={{ flex: '1.4 1 320px', minWidth: 'min(100%, 320px)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, fontSize: 'var(--ar-text-lg)', lineHeight: 1.65, color: 'var(--ar-blue-100)', textWrap: 'pretty' }}>
                {en
                  ? 'Every service city is operated by the same company — PT. Ayomi Raya — with identical official procedures from booking to departure.'
                  : 'Seluruh kota layanan dioperasikan oleh satu perusahaan yang sama — PT. Ayomi Raya — dengan prosedur resmi yang identik dari pemesanan hingga keberangkatan.'}
              </p>
              <p style={{ margin: 0, fontSize: 'var(--ar-text-md)', lineHeight: 1.75, color: 'var(--ar-blue-200)', textWrap: 'pretty' }}>
                {en
                  ? 'Wherever you depart from, you deal with the same official admins: written quotes with no hidden fees, payment only to the official company account, and verified drivers who know the local routes.'
                  : 'Di kota mana pun Anda berangkat, Anda berhadapan dengan admin resmi yang sama: penawaran tertulis tanpa biaya tersembunyi, pembayaran hanya ke rekening resmi perusahaan, dan driver terverifikasi yang memahami rute setempat.'}
              </p>
              <p style={{ margin: 0, fontSize: 'var(--ar-text-md)', lineHeight: 1.75, color: 'var(--ar-blue-200)', textWrap: 'pretty' }}>
                {en
                  ? 'Our service cities grow gradually. Each city page always carries current rates and fleet — bookmark this page as the starting point for your next trip.'
                  : 'Kota layanan kami bertambah secara bertahap. Halaman setiap kota selalu memuat tarif dan armada terkini — simpan halaman ini sebagai titik awal perjalanan Anda berikutnya.'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 8 }}>
                <WaLink href={wa('HUB-standar')} data-cta="hub-consult" className="cta-wa-flat" style={{ ...CTA_WA, minHeight: 48, padding: '0 24px' }}>
                  <WaGlyph size={20} />
                  {en ? 'Chat on WhatsApp' : 'Konsultasi WhatsApp'}
                </WaLink>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 'var(--ar-text-md)', fontWeight: 'var(--ar-weight-bold)', color: '#ffffff' }}>
                    {off.phones[0]?.display}
                  </span>
                  <span style={{ fontSize: 'var(--ar-text-xs)', color: 'var(--ar-blue-200)' }}>{t.quoteHours}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <SiteFooter
          locale={locale}
          official={off}
          labels={{
            contact: t.footContact,
            explore: t.footExplore,
            rights: t.footRights,
            otherCities: t.footExplore,
          }}
          otherCities={locations.map((l) => ({ key: l.key, name: l.name, slug: l.slug, href: cityHref(l, locale) }))}
        />
      </div>

      <WaFab href={wa('HUB-fab')} cta="hub-fab-wa" />
      <AnalyticsBridge />
      <NavAutoClose />
      <Reveals />
    </>
  );
}
