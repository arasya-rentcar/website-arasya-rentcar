import type { Editorial } from '@/types';
import { DARK_BAND } from './styles';

interface EditorialSectionProps {
  editorial: Editorial;
  /** "Mengenal Kota" / "Mengenal Wilayah" / "Mengenal Negara". */
  label: string;
}

/**
 * The dark editorial band. This is the section that carries per-entry unique
 * prose — the primary defence against doorway-page filters, since identical
 * copy with only the city name swapped is exactly what triggers them.
 */
export function EditorialSection({ editorial, label }: EditorialSectionProps) {
  return (
    <section data-sec="mengenal" data-screen-label={label} style={{ order: 60, ...DARK_BAND }}>
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
          <p
            style={{
              margin: 0,
              fontSize: 'var(--ar-text-xs)',
              fontWeight: 'var(--ar-weight-semibold)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--city-sky)',
            }}
          >
            {editorial.eyebrow}
          </p>
          <h2
            style={{
              margin: '12px 0 0',
              fontSize: 'clamp(26px, 3.4vw, 40px)',
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              fontWeight: 'var(--ar-weight-bold)',
              color: '#ffffff',
              textWrap: 'balance',
            }}
          >
            {editorial.title}
          </h2>
          <div style={{ width: 56, height: 2, background: 'var(--ar-blue-400)', marginTop: 20 }} />
        </div>
        <div
          className="ar-reveal"
          style={{
            flex: '1.4 1 320px',
            minWidth: 'min(100%, 320px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 'var(--ar-text-lg)',
              lineHeight: 1.65,
              color: 'var(--ar-blue-100)',
              textWrap: 'pretty',
            }}
          >
            {editorial.lead}
          </p>
          {(editorial.paragraphs ?? []).map((para, i) => (
            <p
              key={i}
              style={{
                margin: 0,
                fontSize: 'var(--ar-text-md)',
                lineHeight: 1.75,
                color: 'var(--ar-blue-200)',
                textWrap: 'pretty',
              }}
            >
              {para}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
