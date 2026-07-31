import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/types';
import type { Official, OtherCityLink } from '@/lib/shared';
import { localeHref } from '@/lib/localize';

interface SiteFooterProps {
  locale: Locale;
  official: Official;
  /** "Sewa mobil premium dengan supir — melayani {serviceLine}." */
  serviceLine?: string;
  otherCities?: OtherCityLink[];
  labels: {
    contact: string;
    explore: string;
    rights: string;
    otherCities: string;
    tagline?: string;
  };
}

const HEADING = {
  margin: '0 0 4px',
  fontSize: 'var(--ar-text-xs)',
  fontWeight: 'var(--ar-weight-semibold)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ar-blue-400)',
} as const;

const LINE = { margin: 0, fontSize: 'var(--ar-text-sm)', lineHeight: 1.7 } as const;
const SKY_LINK = { fontSize: 'var(--ar-text-sm)', color: 'var(--city-sky)', textDecoration: 'none' } as const;

/**
 * Footer for the landing templates.
 *
 * The "Kota Layanan Lain" column is not decoration — it is the internal-linking
 * mesh the pSEO spec requires. Without these cross-links deep city pages never
 * get crawled. The prototypes swapped previews in place on click; production
 * uses real `/{slug}` navigation.
 */
export function SiteFooter({
  locale,
  official,
  serviceLine,
  otherCities = [],
  labels,
}: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      data-screen-label="Footer"
      style={{ order: 120, background: 'var(--ar-blue-950)', color: 'var(--ar-blue-200)' }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: '0 auto',
          padding: 'clamp(44px, 6vw, 64px) clamp(20px, 4vw, 32px)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'clamp(28px, 4vw, 64px)',
        }}
      >
        <div
          style={{
            flex: '1.4 1 280px',
            minWidth: 'min(100%, 280px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <Image
            src="/assets/brand/logo-arasya.png"
            alt="Arasya Rent Car"
            width={128}
            height={32}
            style={{
              height: 32,
              width: 'auto',
              display: 'block',
              alignSelf: 'flex-start',
              filter: 'invert(1) brightness(1.6)',
            }}
          />
          {serviceLine && (
            <p style={{ ...LINE, maxWidth: 380 }}>
              {labels.tagline ?? 'Sewa mobil premium dengan supir — melayani'} {serviceLine}.
            </p>
          )}
          <p style={LINE}>{official.addressLine}</p>
        </div>

        <div
          style={{
            flex: '1 1 220px',
            minWidth: 'min(100%, 220px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <p style={HEADING}>{labels.contact}</p>
          <p style={LINE}>WhatsApp: {official.phones[0]?.display}</p>
          {official.phones.length > 1 && (
            <p style={LINE}>
              {official.phones
                .slice(1)
                .map((p) => p.display)
                .join(' · ')}
            </p>
          )}
          <p style={{ margin: 0, fontSize: 'var(--ar-text-sm)' }}>
            Instagram:{' '}
            <a href={official.instagram} target="_blank" rel="noopener" style={SKY_LINK}>
              @arasyarentcar
            </a>
          </p>
        </div>

        <div
          style={{
            flex: '1 1 220px',
            minWidth: 'min(100%, 220px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <p style={HEADING}>{labels.otherCities}</p>
          {otherCities.map((c) => (
            <Link key={c.key} href={localeHref(locale, c.slug)} className="tap-pad" style={SKY_LINK}>
              {locale === 'en' ? 'Car Rental ' : 'Sewa Mobil '}
              {c.name}
            </Link>
          ))}
          <Link href={localeHref(locale, 'travel')} className="tap-pad" style={SKY_LINK}>
            Arasya Travel — {locale === 'en' ? 'Intercity' : 'Antar Kota'}
          </Link>
        </div>

        <p
          style={{
            margin: 0,
            flex: '1 1 100%',
            paddingTop: 18,
            borderTop: '1px solid rgba(147,197,246,0.18)',
            fontSize: 'var(--ar-text-xs)',
            color: 'var(--ar-blue-400)',
          }}
        >
          © {year} PT. Ayomi Raya — Arasya Rent Car. {labels.rights}
        </p>
      </div>
    </footer>
  );
}
