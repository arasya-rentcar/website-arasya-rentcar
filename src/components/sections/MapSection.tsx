import { SectionHeading } from '@/design-system';
import { CONTAINER } from './styles';

interface MapSectionProps {
  mapsEmbed: string;
  addressLine: string;
  eyebrow: string;
  title: string;
}

/**
 * Office location. The physical address is the Bogor HQ on every page — one
 * legal entity, with `areaServed` in the JSON-LD doing the differentiating.
 */
export function MapSection({ mapsEmbed, addressLine, eyebrow, title }: MapSectionProps) {
  if (!mapsEmbed) return null;

  return (
    <section
      data-screen-label="Lokasi"
      style={{ order: 115, background: '#ffffff', borderTop: '1px solid var(--ar-color-border)' }}
    >
      <div style={CONTAINER}>
        <div className="ar-reveal">
          <SectionHeading eyebrow={eyebrow} title={title} subtitle={`${addressLine}.`} />
        </div>
        <div
          className="ar-reveal"
          style={{
            marginTop: 24,
            borderRadius: 'var(--ar-radius-xl)',
            overflow: 'hidden',
            border: '1px solid var(--ar-color-border)',
            boxShadow: 'var(--ar-shadow-sm)',
          }}
        >
          <iframe
            src={mapsEmbed}
            title="Lokasi kantor Arasya Rent Car di Bogor"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            style={{ display: 'block', width: '100%', height: 'clamp(280px, 40vw, 420px)', border: 0 }}
          />
        </div>
      </div>
    </section>
  );
}
