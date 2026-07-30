import Image from 'next/image';
import { WaGlyph } from '@/components/icons';
import { WaLink } from '@/components/WaLink';
import { CHIP_DARK, CTA_PRIMARY, CTA_WA, EYEBROW_BADGE } from './styles';

export interface HeroProps {
  h1: string;
  subtitle: string;
  chips: string[];
  /** Label above the chip row — the region `peta` variant names it "Wilayah Layanan". */
  chipsLabel?: string;
  heroImage?: string;
  cityCode: string;
  waHref: string;
  badge: string;
  ctaPrimary: string;
  ctaPrimaryHref: string;
  ctaWa: string;
}

/**
 * Dark photographic hero — city `navy`/`editorial`, and every region variant.
 * The image sits behind a three-stop scrim so white text keeps contrast
 * regardless of what the photo looks like.
 */
export function HeroDark({
  h1,
  subtitle,
  chips,
  chipsLabel,
  heroImage,
  cityCode,
  waHref,
  badge,
  ctaPrimary,
  ctaPrimaryHref,
  ctaWa,
}: HeroProps) {
  return (
    <section
      data-screen-label="Hero"
      style={{
        order: 20,
        position: 'relative',
        background: 'var(--ar-blue-950)',
        color: '#ffffff',
        overflow: 'hidden',
      }}
    >
      {heroImage && (
        <Image
          className="ar-hero-img"
          src={heroImage}
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover', opacity: 0.55, transformOrigin: '50% 30%' }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(178deg, rgba(1,24,48,0.40) 0%, rgba(1,24,48,0.62) 55%, rgba(1,24,48,0.95) 100%)',
        }}
      />
      <div
        style={{
          position: 'relative',
          maxWidth: 1160,
          margin: '0 auto',
          padding: 'clamp(72px, 12vh, 140px) clamp(20px, 4vw, 32px) clamp(48px, 7vh, 72px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          minHeight: 'clamp(420px, 58vh, 640px)',
        }}
      >
        <span data-hero="1" style={{ ...EYEBROW_BADGE, alignSelf: 'flex-start' }}>
          {badge}
        </span>
        <h1
          data-hero="1"
          style={{
            margin: '18px 0 0',
            maxWidth: 760,
            fontSize: 'clamp(32px, 5.5vw, 58px)',
            lineHeight: 1.08,
            letterSpacing: '-0.02em',
            fontWeight: 'var(--ar-weight-bold)',
            color: '#ffffff',
            textWrap: 'balance',
            textShadow: '0 2px 28px rgba(1,24,48,0.55)',
          }}
        >
          {h1}
        </h1>
        <p
          data-hero="1"
          style={{
            margin: '18px 0 0',
            maxWidth: 600,
            fontSize: 'clamp(1rem, 1.4vw, 1.125rem)',
            lineHeight: 1.65,
            color: 'var(--ar-blue-100)',
            textWrap: 'pretty',
          }}
        >
          {subtitle}
        </p>
        <HeroCtas
          cityCode={cityCode}
          waHref={waHref}
          ctaPrimary={ctaPrimary}
          ctaPrimaryHref={ctaPrimaryHref}
          ctaWa={ctaWa}
          shadow="0 8px 24px rgba(217,81,28,0.35)"
        />
        {chipsLabel && (
          <p
            data-hero="1"
            style={{
              margin: '26px 0 0',
              fontSize: 'var(--ar-text-xs)',
              fontWeight: 'var(--ar-weight-semibold)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--city-sky)',
            }}
          >
            {chipsLabel}
          </p>
        )}
        <div
          data-hero="1"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: chipsLabel ? 10 : 26 }}
        >
          {chips.map((chip) => (
            <span key={chip} style={CHIP_DARK}>
              <Dot />
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Light hero with a photo card beside the copy — city `terang` (Bangkok). */
export function HeroLight({
  h1,
  subtitle,
  chips,
  heroImage,
  cityCode,
  waHref,
  badge,
  ctaPrimary,
  ctaPrimaryHref,
  ctaWa,
  cityName,
}: HeroProps & { cityName: string }) {
  return (
    <section
      data-screen-label="Hero"
      style={{
        order: 20,
        background: 'linear-gradient(180deg, #ffffff 0%, #e8f1fb 100%)',
        borderBottom: '1px solid var(--ar-color-border)',
      }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: '0 auto',
          padding: 'clamp(56px, 9vh, 110px) clamp(20px, 4vw, 32px) clamp(40px, 6vh, 64px)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'clamp(28px, 4vw, 56px)',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: '1.2 1 320px', minWidth: 'min(100%, 320px)' }}>
          <span
            data-hero="1"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 999,
              background: '#ffffff',
              border: '1px solid var(--ar-blue-100)',
              fontSize: 'var(--ar-text-xs)',
              fontWeight: 'var(--ar-weight-semibold)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ar-blue-700)',
            }}
          >
            {badge}
          </span>
          <h1
            data-hero="1"
            style={{
              margin: '18px 0 0',
              fontSize: 'clamp(32px, 5vw, 52px)',
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              fontWeight: 'var(--ar-weight-bold)',
              color: 'var(--ar-blue-950)',
              textWrap: 'balance',
            }}
          >
            {h1}
          </h1>
          <p
            data-hero="1"
            style={{
              margin: '16px 0 0',
              maxWidth: 560,
              fontSize: 'clamp(1rem, 1.4vw, 1.125rem)',
              lineHeight: 1.65,
              color: 'var(--ar-color-text-secondary)',
              textWrap: 'pretty',
            }}
          >
            {subtitle}
          </p>
          <HeroCtas
            cityCode={cityCode}
            waHref={waHref}
            ctaPrimary={ctaPrimary}
            ctaPrimaryHref={ctaPrimaryHref}
            ctaWa={ctaWa}
            shadow="0 8px 24px rgba(217,81,28,0.25)"
            marginTop={28}
          />
          <div data-hero="1" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 26 }}>
            {chips.map((chip) => (
              <span
                key={chip}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '7px 14px',
                  borderRadius: 999,
                  background: '#ffffff',
                  border: '1px solid var(--ar-color-border)',
                  fontSize: 'var(--ar-text-sm)',
                  color: 'var(--ar-color-text-secondary)',
                }}
              >
                <Dot color="var(--ar-color-primary)" />
                {chip}
              </span>
            ))}
          </div>
        </div>
        {heroImage && (
          <div style={{ flex: '1 1 300px', minWidth: 'min(100%, 300px)' }}>
            <Image
              src={heroImage}
              alt={cityName}
              width={600}
              height={450}
              priority
              style={{
                width: '100%',
                // See FleetSection: without this, next/image's height attribute
                // suppresses aspect-ratio.
                height: 'auto',
                aspectRatio: '4 / 3',
                objectFit: 'cover',
                borderRadius: 'var(--ar-radius-xl)',
                boxShadow: 'var(--ar-shadow-lg)',
                display: 'block',
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}

/** Centred gradient hero — country `concierge` (Thailand). */
export function HeroConcierge(props: HeroProps) {
  const { h1, subtitle, chips, cityCode, waHref, badge, ctaPrimary, ctaPrimaryHref, ctaWa } = props;
  return (
    <section
      data-screen-label="Hero"
      style={{
        order: 20,
        background:
          'linear-gradient(170deg, var(--ar-blue-950) 0%, var(--city-navy-2) 70%, var(--ar-blue-900) 100%)',
        color: '#ffffff',
      }}
    >
      <div
        style={{
          maxWidth: 860,
          margin: '0 auto',
          padding: 'clamp(72px, 12vh, 150px) clamp(20px, 4vw, 32px) clamp(56px, 9vh, 90px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <span data-hero="1" style={EYEBROW_BADGE}>
          {badge}
        </span>
        <h1
          data-hero="1"
          style={{
            margin: '18px 0 0',
            fontSize: 'clamp(32px, 5.5vw, 56px)',
            lineHeight: 1.08,
            letterSpacing: '-0.02em',
            fontWeight: 'var(--ar-weight-bold)',
            color: '#ffffff',
            textWrap: 'balance',
          }}
        >
          {h1}
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
          {subtitle}
        </p>
        <HeroCtas
          cityCode={cityCode}
          waHref={waHref}
          ctaPrimary={ctaPrimary}
          ctaPrimaryHref={ctaPrimaryHref}
          ctaWa={ctaWa}
          shadow="0 8px 24px rgba(217,81,28,0.35)"
          center
        />
        <div
          data-hero="1"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 8,
            marginTop: 26,
          }}
        >
          {chips.map((chip) => (
            <span key={chip} style={{ ...CHIP_DARK, backdropFilter: undefined, WebkitBackdropFilter: undefined }}>
              <Dot />
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Left-aligned gradient hero whose primary CTA jumps to the directory —
 *  country `direktori` (Malaysia). */
export function HeroDirectory(props: HeroProps) {
  const { h1, subtitle, cityCode, waHref, badge, ctaPrimary, ctaPrimaryHref, ctaWa } = props;
  return (
    <section
      data-screen-label="Hero"
      style={{
        order: 20,
        background:
          'linear-gradient(170deg, var(--ar-blue-950) 0%, var(--city-navy-2) 70%, var(--ar-blue-900) 100%)',
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
          {badge}
        </span>
        <h1
          data-hero="1"
          style={{
            margin: '18px 0 0',
            maxWidth: 760,
            fontSize: 'clamp(32px, 5.5vw, 56px)',
            lineHeight: 1.08,
            letterSpacing: '-0.02em',
            fontWeight: 'var(--ar-weight-bold)',
            color: '#ffffff',
            textWrap: 'balance',
          }}
        >
          {h1}
        </h1>
        <p
          data-hero="1"
          style={{
            margin: '18px 0 0',
            maxWidth: 600,
            fontSize: 'clamp(1rem, 1.4vw, 1.125rem)',
            lineHeight: 1.65,
            color: 'var(--ar-blue-100)',
            textWrap: 'pretty',
          }}
        >
          {subtitle}
        </p>
        <HeroCtas
          cityCode={cityCode}
          waHref={waHref}
          ctaPrimary={ctaPrimary}
          ctaPrimaryHref={ctaPrimaryHref}
          ctaWa={ctaWa}
          shadow="0 8px 24px rgba(217,81,28,0.35)"
          ctaName="hero-kota"
        />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- internals */

function HeroCtas({
  cityCode,
  waHref,
  ctaPrimary,
  ctaPrimaryHref,
  ctaWa,
  shadow,
  center,
  marginTop = 30,
  ctaName = 'hero-pesan',
}: {
  cityCode: string;
  waHref: string;
  ctaPrimary: string;
  ctaPrimaryHref: string;
  ctaWa: string;
  shadow: string;
  center?: boolean;
  marginTop?: number;
  ctaName?: string;
}) {
  return (
    <div
      data-hero="1"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        marginTop,
        ...(center ? { justifyContent: 'center' } : {}),
      }}
    >
      <a
        href={ctaPrimaryHref}
        data-cta={ctaName}
        data-city={cityCode}
        className="cta-primary"
        style={{ ...CTA_PRIMARY, boxShadow: shadow }}
      >
        {ctaPrimary}
      </a>
      <WaLink href={waHref} data-cta="hero-wa" data-city={cityCode} className="cta-wa" style={CTA_WA}>
        <WaGlyph size={20} />
        {ctaWa}
      </WaLink>
    </div>
  );
}

function Dot({ color = 'var(--city-sky)' }: { color?: string }) {
  return (
    <span style={{ width: 5, height: 5, borderRadius: 999, background: color, flex: '0 0 auto' }} />
  );
}
