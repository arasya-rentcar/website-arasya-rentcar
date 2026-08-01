import { Accordion, SectionHeading } from '@/design-system';
import { AnalyticsBridge } from '@/components/AnalyticsBridge';
import { CheckGlyph, WaGlyph } from '@/components/icons';
import { MAIN_ID, SkipLink } from '@/components/layout/SkipLink';
import { Reveals } from '@/components/Reveal';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { WaFab } from '@/components/layout/WaFab';
import { WaLink } from '@/components/WaLink';
import { RouteTabs } from '@/components/travel/RouteTabs';
import { TariffChecker } from '@/components/travel/TariffChecker';
import { StepsSection } from '@/components/sections/StepsSection';
import { CONTAINER, CHIP_DARK, CTA_WA, EYEBROW_BADGE } from '@/components/sections/styles';
import { fillBank, tTravel } from '@/lib/i18n';
import { localeHref } from '@/lib/localize';
import { official as officialOf, waHref } from '@/lib/shared';
import type { Locale, Location, Site, Travel as TravelData } from '@/types';
import { siteNav } from '@/lib/nav';
import { PageAnchors } from '@/components/layout/PageAnchors';

interface TravelProps {
  travel: TravelData;
  site: Site;
  /** Every published entry — the header's "Area Layanan" menu lists them. */
  locations: Location[];
  locale: Locale;
}

/**
 * `/travel` — intercity drop-off charter.
 *
 * A distinct product from the city landings: one car, one pick-up, one
 * destination, at a fixed all-in rate. Fully bilingual, since `travel.js`
 * ships both dictionaries.
 */
export function Travel({ travel, site, locations, locale }: TravelProps) {
  const T = tTravel(locale);
  const off = officialOf(site);
  const en = locale === 'en';
  const phone = off.waPrimary;
  const wa = (ref: string) => waHref(phone, T.waGeneral, ref);

  // The payment answer interpolates the live primary bank account.
  const faqItems = T.faqs.map((f) => ({ question: f.question, answer: fillBank(f.answer, off.bank) }));

  const nav = siteNav(locale, locations, localeHref(locale, 'travel'));

  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--ar-color-bg)', display: 'flex', flexDirection: 'column' }}>
        <SkipLink locale={locale} />

        <SiteHeader
          locale={locale}
          items={nav}
          ctaLabel={T.cta}
          ctaHref={wa('TRV-nav')}
          altLocaleHref={localeHref(en ? 'id' : 'en', 'travel')}
        />

        {/*
          A flex column, not a plain wrapper. Every section carries a flex
          `order` and the variant rules in landing.css reorder them, so `main`
          has to be the flex container they belong to — wrapping them in a plain
          div would collapse the whole scheme into a single flex item.
          `display: contents` would also preserve it, but it has a history of
          dropping the landmark from the accessibility tree, which is the one
          thing this element exists for.
        */}
        <main id={MAIN_ID} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

          <section
            data-screen-label="Hero Travel"
            style={{
              background:
                "linear-gradient(165deg, rgba(2, 16, 33, 0.9) 0%, rgba(6, 33, 63, 0.84) 55%, rgba(4, 43, 84, 0.78) 100%), url('/assets/images/bogor/hero-bogor.webp') center / cover no-repeat",
              color: '#ffffff',
            }}
          >
            <div
              style={{
                maxWidth: 1160,
                margin: '0 auto',
                padding: 'clamp(56px, 9vh, 110px) clamp(20px, 4vw, 32px) clamp(48px, 7vh, 76px)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 'clamp(28px, 4vw, 56px)',
              }}
            >
              <div style={{ flex: '1.25 1 320px', minWidth: 'min(100%, 320px)' }}>
                <span data-hero="1" style={EYEBROW_BADGE}>{T.heroBadge}</span>
                <h1
                  data-hero="1"
                  style={{ margin: '18px 0 0', maxWidth: 620, fontSize: 'clamp(32px, 5vw, 54px)', lineHeight: 1.08, letterSpacing: '-0.02em', fontWeight: 'var(--ar-weight-bold)', color: '#ffffff', textWrap: 'balance' }}
                >
                  {T.heroTitle}
                </h1>
                <p data-hero="1" style={{ margin: '18px 0 0', maxWidth: 560, fontSize: 'clamp(1rem, 1.4vw, 1.125rem)', lineHeight: 1.65, color: 'var(--ar-blue-100)', textWrap: 'pretty' }}>
                  {T.heroSub}
                </p>
                <div data-hero="1" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 26 }}>
                  {[`${travel.routes.length}${T.chipRoutesSuffix}`, T.chipAllin, T.chipPrivate].map((c) => (
                    <span key={c} style={{ ...CHIP_DARK, backdropFilter: undefined, WebkitBackdropFilter: undefined }}>
                      <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--city-sky)', flex: '0 0 auto' }} />
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div data-hero="1" style={{ flex: '1 1 330px', minWidth: 'min(100%, 330px)', maxWidth: 460 }}>
                <TariffChecker travel={travel} strings={T} phone={phone} />
              </div>
            </div>
          </section>

          {/* No `order` — this page composes its sections inline, so they all
              default to 0 and document order is what places them. */}
          <PageAnchors
            locale={locale}
            items={[
              { label: T.navRute, href: '#rute' },
              { label: T.navCara, href: '#cara' },
              { label: T.navFaq, href: '#faq' },
            ]}
          />

          <section data-screen-label="Termasuk Tarif" style={{ background: '#ffffff', borderBottom: '1px solid var(--ar-color-border)' }}>
            <div
              className="ar-reveal"
              style={{
                maxWidth: 1160,
                margin: '0 auto',
                padding: 'clamp(24px, 4vw, 36px) clamp(20px, 4vw, 32px)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 'clamp(12px, 2vw, 20px)',
              }}
            >
              <span style={{ fontSize: 'var(--ar-text-xs)', fontWeight: 'var(--ar-weight-semibold)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ar-color-text-muted)' }}>
                {T.incLabel}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {T.incItems.map((label) => (
                  <span
                    key={label}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '7px 13px',
                      borderRadius: 999,
                      background: 'var(--ar-blue-50)',
                      border: '1px solid var(--ar-blue-100)',
                      fontSize: 'var(--ar-text-sm)',
                      fontWeight: 'var(--ar-weight-medium)',
                      color: 'var(--ar-color-text)',
                    }}
                  >
                    <span style={{ display: 'inline-flex', color: 'var(--ar-color-primary)' }}>
                      <CheckGlyph size={14} />
                    </span>
                    {label}
                  </span>
                ))}
              </div>
              <p style={{ margin: 0, flex: '1 1 100%', fontSize: 'var(--ar-text-xs)', color: 'var(--ar-color-text-muted)' }}>{T.incNote}</p>
            </div>
          </section>

          <RouteTabs travel={travel} strings={T} phone={phone} />

          <div id="cara">
            <StepsSection
              steps={T.steps.map((s, i) => ({ n: i + 1, title: s.title, description: s.desc }))}
              eyebrow={T.caraEyebrow}
              title={T.caraTitle}
              subtitle=""
            />
          </div>

          <section id="faq" data-screen-label="FAQ" style={{ background: '#ffffff', borderTop: '1px solid var(--ar-color-border)' }}>
            <div style={CONTAINER}>
              <div className="ar-reveal">
                <SectionHeading eyebrow={T.faqEyebrow} title={T.faqTitle} />
              </div>
              <div className="ar-reveal" style={{ marginTop: 24, maxWidth: 800 }}>
                <Accordion items={faqItems} defaultOpen={0} />
              </div>
            </div>
          </section>

          <section
            data-screen-label="CTA"
            style={{ background: 'linear-gradient(165deg, var(--ar-blue-950) 0%, var(--city-navy-2) 60%, var(--ar-blue-900) 100%)', color: '#ffffff' }}
          >
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
                <h2 style={{ margin: 0, fontSize: 'clamp(22px, 2.8vw, 32px)', lineHeight: 1.2, letterSpacing: '-0.01em', fontWeight: 'var(--ar-weight-bold)', color: '#ffffff', textWrap: 'balance' }}>
                  {T.ctaTitle}
                </h2>
                <p style={{ margin: 0, fontSize: 'var(--ar-text-md)', lineHeight: 1.7, color: 'var(--ar-blue-200)', textWrap: 'pretty' }}>{T.ctaDesc}</p>
              </div>
              <WaLink href={wa('TRV-cta')} data-cta="travel-cta-wa" className="cta-wa-flat" style={{ ...CTA_WA, minHeight: 52, padding: '0 26px' }}>
                <WaGlyph size={20} />
                {T.ctaWa}
              </WaLink>
            </div>
          </section>

        </main>

        <SiteFooter
          locale={locale}
          official={off}
          labels={{
            contact: T.footContact,
            explore: T.footExplore,
            rights: T.footRights,
            otherCities: T.footExplore,
          }}
        />
      </div>

      <WaFab href={wa('TRV-fab')} cta="travel-fab-wa" />
      <AnalyticsBridge />
      <Reveals />
    </>
  );
}
