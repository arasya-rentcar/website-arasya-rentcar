import { AnalyticsBridge } from '@/components/AnalyticsBridge';
import { NavAutoClose } from '@/components/layout/NavAutoClose';
import { Reveals } from '@/components/Reveal';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader, type NavItem } from '@/components/layout/SiteHeader';
import { WaFab } from '@/components/layout/WaFab';
import { HeroConcierge, HeroDark, HeroDirectory, HeroLight } from '@/components/sections/Hero';
import { DestinationsSection } from '@/components/sections/DestinationsSection';
import { DirectorySection, UnitClassesSection } from '@/components/sections/CountrySections';
import { EditorialSection } from '@/components/sections/EditorialSection';
import { FaqSection } from '@/components/sections/FaqSection';
import { FleetSection, type FleetCardData } from '@/components/sections/FleetSection';
import { GallerySection } from '@/components/sections/GallerySection';
import { MapSection } from '@/components/sections/MapSection';
import { QuoteSection } from '@/components/sections/QuoteSection';
import { RoutesSection } from '@/components/sections/RoutesSection';
import { ServicesSection } from '@/components/sections/ServicesSection';
import { StepsSection } from '@/components/sections/StepsSection';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { TrustSection } from '@/components/sections/TrustSection';
import { tLanding, withCity } from '@/lib/i18n';
import { blogHref, hasEnLocation, localeHref, localizeLocation, localizeSite } from '@/lib/localize';
import {
  bookingSteps,
  fleet as fleetOf,
  formatIdr,
  fullFaq,
  officialFor,
  otherCities,
  slugify,
  trustItems,
  waHref,
} from '@/lib/shared';
import type { Locale, Location, Site } from '@/types';

interface LandingProps {
  location: Location;
  site: Site;
  allLocations: Location[];
  locale: Locale;
  /** `with-logo` photos fill the 3:2 box; `clean` cutouts are inset. */
  carImages?: 'with-logo' | 'clean';
}

/**
 * One screen renders all three landing templates and all eight layout variants.
 *
 * Variant ordering is done exactly as the prototypes do it — every section
 * carries a flex `order`, and `data-variant` + `data-sec` CSS rules in
 * landing.css move specific sections for specific variants. That keeps the
 * markup order stable (and therefore the DOM reading order sensible) while the
 * visual order changes.
 */
export function Landing({ location: raw, site: rawSite, allLocations, locale, carImages = 'with-logo' }: LandingProps) {
  const location = localizeLocation(raw, locale);
  const site = localizeSite(rawSite, locale);
  const t = tLanding(locale);
  // Per-entry WhatsApp routing. Resolved once here, so every CTA on the page,
  // the anti-fraud panel, the quote form and the JSON-LD telephone all follow
  // the same number and cannot drift apart.
  const off = officialFor(site, location);
  const phone = off.waPrimary;

  const cityName = location.name;
  const cityCode = location.code;
  const isCountry = location.template === 'country';
  const isRegion = location.template === 'region';
  const variant = location.variant;

  /**
   * Outside Indonesia, availability and pricing are settled over WhatsApp
   * rather than published: the tariff table in `site.fleet` is the Jabodetabek
   * rate card in IDR, and quoting it for an overseas trip would advertise a
   * price that cannot be honoured.
   *
   * Country pages already behaved this way. Keyed off `country` rather than a
   * list of slugs so any new overseas entry inherits it — the failure mode is a
   * page that quietly publishes domestic prices for a city we cannot serve at
   * them, which nobody would notice from the layout.
   */
  const isInternational = location.country !== 'ID';
  const consultOnly = isCountry || isInternational;

  /* ------------------------------------------------------------ WhatsApp */

  const noun = isCountry ? 'negara tujuan saya' : isRegion ? 'wilayah Anda' : 'kota Anda';
  const generalMsg = isCountry
    ? `Halo admin Arasya Rent Car, saya ingin memesan mobil dengan supir di ${cityName || noun}. Mohon dibantu. Terima kasih.`
    : `Halo admin Arasya Rent Car, saya ingin memesan unit mobil dengan supir di ${cityName || noun}. Mohon dibantu. Terima kasih.`;

  const wa = (msg: string, ref: string) => waHref(phone, msg, ref);

  /* ---------------------------------------------------------------- data */

  const trust = trustItems(site, location);
  // Same call the FAQPage JSON-LD uses, so the two can't drift apart.
  const faq = fullFaq(location, off);
  const steps = bookingSteps(off);

  const services = site.services.map((s) => ({
    ...s,
    waHref: wa(
      `Halo admin Arasya Rent Car, saya ingin menanyakan layanan ${s.title} di ${cityName || noun}. Mohon dibantu. Terima kasih.`,
      `${cityCode}-layanan-${s.slug}`
    ),
  }));

  const fleetEntries = fleetOf(site);
  const fleetCards: FleetCardData[] = fleetEntries.map((f) => {
    const slug = slugify(f.name);
    const msg = (tier: string) =>
      `Halo admin Arasya Rent Car, saya ingin memesan unit ${f.name} (tarif ${tier}) di ${cityName || noun}. Mohon dibantu. Terima kasih.`;
    return {
      name: f.name,
      slug,
      capacity: f.capacity,
      image: f.image,
      imageLogo: f.imageLogo,
      dalamKota: f.dalamKota,
      allin: f.allin,
      priceDalamKota: formatIdr(f.dalamKota),
      priceAllin: formatIdr(f.allin),
      waHrefDalamKota: wa(msg('Dalam Kota 12 jam'), `${cityCode}-fleet-${slug}`),
      waHrefAllin: wa(msg('All-in'), `${cityCode}-fleet-${slug}`),
    };
  });

  const directory = (location.cityDirectory ?? []).map((d) => ({
    ...d,
    waHref: wa(
      `Halo admin Arasya Rent Car, saya ingin menanyakan layanan sewa mobil dengan supir di ${d.name}, ${cityName}. Mohon dibantu. Terima kasih.`,
      `${cityCode}-kota-${slugify(d.name)}`
    ),
  }));

  // The quote form offers generic classes wherever exact models are confirmed
  // in conversation, so it can't imply a specific unit is on the forecourt.
  const carOptions = consultOnly ? site.genericUnits : fleetCards.map((f) => f.name);

  /* -------------------------------------------------------------- chrome */

  // Two in-page anchors plus the site-wide destinations. Capped at five: the
  // desktop bar appears at 768px and has to fit the logo, the ID|EN pill and the
  // CTA alongside these, so a sixth item overflows at that breakpoint.
  const nav: NavItem[] = [
    { label: t.navBeranda, href: localeHref(locale) },
    isCountry
      ? { label: t.navKota, href: '#kota', anchor: true }
      : { label: t.navArmada, href: '#armada', anchor: true },
    { label: t.navFaq, href: '#faq', anchor: true },
    { label: t.navTravel, href: localeHref(locale, 'travel') },
    { label: t.navBlog, href: blogHref() },
  ];

  // Only offer the language pill when this entry exists in the other locale.
  const altHref = hasEnLocation(raw)
    ? locale === 'id'
      ? localeHref('en', raw.slugEn as string)
      : localeHref('id', raw.slug)
    : undefined;

  const heroChips =
    isRegion && variant === 'peta'
      ? location.areaServed
      : (location.heroStat || '')
          .split('·')
          .map((s) => s.trim())
          .filter(Boolean);

  const heroProps = {
    h1: location.h1,
    subtitle: location.heroSubtitle,
    chips: heroChips,
    chipsLabel: isRegion
      ? variant === 'peta'
        ? t.chipsLabelArea
        : t.chipsLabelBenefits
      : undefined,
    heroImage: location.heroImage,
    cityCode,
    waHref: wa(generalMsg, `${cityCode}-hero`),
    badge: isCountry ? t.heroBadgeCountry : t.heroBadge,
    ctaPrimary: isCountry && variant === 'direktori' ? t.heroDirectoryCta : t.cta,
    ctaPrimaryHref: isCountry && variant === 'direktori' ? '#kota' : '#penawaran',
    ctaWa: t.heroWa,
  };

  return (
    <>
      <div
        data-variant={variant}
        style={{
          minHeight: '100vh',
          background: 'var(--ar-color-bg)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <SiteHeader
          locale={locale}
          items={nav}
          ctaLabel={t.cta}
          ctaHref="#penawaran"
          cityCode={cityCode}
          altLocaleHref={altHref}
        />

        {isCountry ? (
          variant === 'direktori' ? (
            <HeroDirectory {...heroProps} />
          ) : (
            <HeroConcierge {...heroProps} />
          )
        ) : variant === 'terang' ? (
          <HeroLight {...heroProps} cityName={cityName} />
        ) : (
          <HeroDark {...heroProps} />
        )}

        {isCountry && (
          <DirectorySection
            entries={directory}
            countryName={cityName}
            cityCode={cityCode}
            labels={{
              eyebrow: t.dirEyebrow,
              title: t.dirTitle,
              subtitle: withCity(t.dirSub, cityName),
              ask: t.dirAsk,
            }}
          />
        )}

        <TrustSection
          cards={trust}
          official={off}
          labels={{ copy: t.copy, copied: t.copied }}
        />

        <ServicesSection
          services={services}
          cityCode={cityCode}
          labels={{ eyebrow: t.layananEyebrow, title: t.layananTitle, ask: t.layananAsk }}
        />

        {consultOnly ? (
          <UnitClassesSection
            units={site.genericUnits}
            cityCode={cityCode}
            waHref={wa(
              isCountry
                ? `Halo admin Arasya Rent Car, saya ingin menanyakan ketersediaan unit di ${cityName || noun}. Mohon dibantu. Terima kasih.`
                : `Halo admin Arasya Rent Car, saya ingin menanyakan ketersediaan unit dan tarif di ${cityName || noun}. Mohon dibantu. Terima kasih.`,
              `${cityCode}-units`
            )}
            labels={{
              eyebrow: t.unitsEyebrow,
              // Country pages speak about a network of cities; a single overseas
              // city speaks about itself.
              title: isCountry ? t.unitsTitle : withCity(t.unitsCityTitle, cityName),
              subtitle: isCountry ? t.unitsSub : withCity(t.unitsCitySub, cityName),
              ask: isCountry ? t.unitsAsk : t.unitsCityAsk,
            }}
          />
        ) : (
          <FleetSection
            cars={fleetCards}
            cityName={cityName}
            cityCode={cityCode}
            noteDalamKota={site.fleetNotes.dalamKota}
            noteAllin={site.fleetNotes.allin}
            useLogoImages={carImages === 'with-logo'}
            labels={{
              eyebrow: t.armadaEyebrow,
              title: t.armadaTitle,
              subtitle: t.armadaSub,
              tierDalamKota: t.tierDalamKota,
              tierAllin: t.tierAllin,
              capacitySuffix: t.capacitySuffix,
              order: t.order,
              contactPrice: t.contactPrice,
              perDay: t.perDay,
              per12h: t.per12h,
              specialRate: t.specialRate,
            }}
          />
        )}

        <EditorialSection
          editorial={location.editorial}
          label={isCountry ? t.mengenalNegara : isRegion ? t.mengenalWilayah : t.mengenalKota}
        />

        <DestinationsSection
          destinations={location.destinations}
          cityName={cityName}
          eyebrow={t.destEyebrow}
          title={withCity(
            isCountry ? t.destTitleCountry : isRegion ? t.destTitleIn : t.destTitleFrom,
            cityName
          )}
          subtitle={location.destinationsSubtitle}
          layout={isCountry ? 'plain' : variant === 'terang' ? 'list' : 'cards'}
          order={isCountry ? 75 : 70}
        />

        <RoutesSection
          routes={location.routes}
          cityName={cityName}
          eyebrow={t.routesEyebrow}
          title={withCity(isRegion ? t.routesTitleRegion : t.routesTitleCity, cityName)}
          subtitle={t.routesSub}
        />

        <StepsSection
          steps={steps}
          eyebrow={t.stepsEyebrow}
          title={t.stepsTitle}
          subtitle={t.stepsSub}
        />

        {/* Country pages have no gallery in the prototypes. */}
        {!isCountry && (
          <GallerySection
            images={site.gallery}
            eyebrow={t.galleryEyebrow}
            title={t.galleryTitle}
            subtitle={t.gallerySub}
          />
        )}

        <TestimonialsSection
          testimonials={site.testimonials}
          eyebrow={t.testiEyebrow}
          title={t.testiTitle}
          googleLabel={t.testiGoogle}
        />

        <FaqSection items={faq} eyebrow={t.faqEyebrow} title={t.faqTitle} />

        <QuoteSection
          cityName={cityName}
          cityCode={cityCode}
          phone={phone}
          phoneDisplay={off.phones[0]?.display ?? ''}
          carOptions={carOptions}
          labels={{
            eyebrow: t.quoteEyebrow,
            title: t.quoteTitle,
            subtitle: t.quoteSub,
            orContact: t.quoteOrContact,
            hours: t.quoteHours,
            assurances: [...t.quoteAssurances],
          }}
        />

        <MapSection
          mapsEmbed={site.settings.mapsEmbed}
          addressLine={off.addressLine}
          eyebrow={t.mapEyebrow}
          title={isRegion || isCountry ? t.mapTitleRegion : t.mapTitleCity}
        />

        <SiteFooter
          locale={locale}
          official={off}
          serviceLine={location.serviceLine}
          otherCities={otherCities(allLocations, location.key, locale)}
          labels={{
            contact: t.footContact,
            explore: t.footExplore,
            rights: t.footRights,
            otherCities: t.footOtherCities,
            tagline: t.footTagline,
          }}
        />
      </div>

      <WaFab href={wa(generalMsg, `${cityCode}-fab`)} cityCode={cityCode} />
      <AnalyticsBridge />
      <NavAutoClose />
      <Reveals />
    </>
  );
}
