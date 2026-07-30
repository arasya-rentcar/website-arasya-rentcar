import Image from 'next/image';
import { SectionHeading } from '@/design-system';
import type { Destination, ImageCredit } from '@/types';
import { CONTAINER } from './styles';

interface DestinationsSectionProps {
  destinations: Destination[];
  cityName: string;
  subtitle: string;
  /** "Rute favorit dari {city}" (city) vs "di {city}" (region/country). */
  title: string;
  eyebrow: string;
  /** The `terang` variant renders a compact list instead of image cards. */
  layout?: 'cards' | 'list' | 'plain';
  /** Country pages sit at 75 — the city directory occupies 70. */
  order?: number;
}

export function DestinationsSection({
  destinations,
  cityName,
  subtitle,
  title,
  eyebrow,
  layout = 'cards',
  order = 70,
}: DestinationsSectionProps) {
  return (
    <section data-sec="dest" data-screen-label="Destinasi Populer" style={{ order, background: '#ffffff' }}>
      <div style={CONTAINER}>
        <div className="ar-reveal">
          <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />
        </div>

        {layout === 'list' ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 24,
              borderTop: '1px solid var(--ar-color-border)',
            }}
          >
            {destinations.map((dest, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px 18px',
                  padding: '16px 0',
                  borderBottom: '1px solid var(--ar-color-border)',
                  alignItems: 'baseline',
                }}
              >
                <p style={{ ...AREA_LABEL, flex: '0 0 130px' }}>{dest.area}</p>
                <div style={{ flex: '1 1 300px' }}>
                  <h3 style={{ ...DEST_TITLE, margin: '0 0 4px' }}>{dest.name}</h3>
                  <p style={DEST_BODY}>{dest.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
              gap: 16,
              marginTop: 28,
            }}
          >
            {destinations.map((dest, i) => (
              <div
                key={i}
                className="ar-reveal card-lift"
                style={{
                  background: 'var(--ar-gray-25)',
                  border: '1px solid var(--ar-color-border)',
                  borderRadius: 'var(--ar-radius-lg)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  ...(layout === 'plain' ? { padding: 'var(--ar-space-5)' } : {}),
                }}
              >
                {layout === 'cards' && dest.image && (
                  <div className="zoom-media">
                    <Image
                      src={dest.image}
                      alt={`${dest.name} — destinasi dari ${cityName}`}
                      width={480}
                      height={270}
                      loading="lazy"
                      style={{
                        width: '100%',
                        // See FleetSection: without this, next/image's height
                        // attribute suppresses aspect-ratio.
                        height: 'auto',
                        aspectRatio: '16 / 9',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </div>
                )}
                <div style={layout === 'plain' ? undefined : { padding: 'var(--ar-space-5)' }}>
                  <p style={AREA_LABEL}>{dest.area}</p>
                  <h3 style={DEST_TITLE}>{dest.name}</h3>
                  <p style={DEST_BODY}>{dest.description}</p>
                  <PhotoCredit credit={dest.imageCredit} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Attribution for third-party photos.
 *
 * Required by CC BY / BY-SA: creator, title, licence, and links to both the
 * original and the licence deed. This is a licence condition, not styling —
 * do not hide it. Cards using Arasya-owned photography render nothing here.
 */
function PhotoCredit({ credit }: { credit?: ImageCredit }) {
  if (!credit) return null;
  return (
    <p
      style={{
        margin: '10px 0 0',
        fontSize: 11,
        lineHeight: 1.5,
        color: 'var(--ar-color-text-muted)',
      }}
    >
      Foto:{' '}
      <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" style={CREDIT_LINK}>
        {credit.title ?? 'sumber'}
      </a>{' '}
      oleh {credit.author} ·{' '}
      <a href={credit.licenceUrl} target="_blank" rel="noopener noreferrer nofollow license" style={CREDIT_LINK}>
        {credit.licence}
      </a>
      {credit.modified ? ` · ${credit.modified}` : ''}
    </p>
  );
}

const CREDIT_LINK = {
  color: 'var(--ar-color-text-muted)',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
} as const;

const AREA_LABEL = {
  margin: 0,
  fontSize: 'var(--ar-text-xs)',
  fontWeight: 'var(--ar-weight-semibold)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ar-color-primary)',
} as const;

const DEST_TITLE = {
  margin: '8px 0 6px',
  fontSize: 'var(--ar-text-md)',
  fontWeight: 'var(--ar-weight-semibold)',
  color: 'var(--ar-color-text)',
} as const;

const DEST_BODY = {
  margin: 0,
  fontSize: 'var(--ar-text-sm)',
  lineHeight: 1.6,
  color: 'var(--ar-color-text-secondary)',
  textWrap: 'pretty',
} as const;
