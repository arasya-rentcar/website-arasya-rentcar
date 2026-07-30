import { SectionHeading } from '@/design-system';
import { WaGlyph } from '@/components/icons';
import { WaLink } from '@/components/WaLink';
import type { DirectoryEntry } from '@/types';
import { CONTAINER } from './styles';

/* ------------------------------------------------------- city directory */

export interface DirectoryCard extends DirectoryEntry {
  waHref: string;
}

interface DirectorySectionProps {
  entries: DirectoryCard[];
  countryName: string;
  cityCode: string;
  labels: { eyebrow: string; title: string; subtitle: string; ask: string };
}

/**
 * Kota Layanan — country pages only. `status` is either "Aktif" (green) or
 * anything else, rendered neutral; cities without a landing page yet are still
 * listed so the country page answers "do you serve X?" without a dead link.
 */
export function DirectorySection({ entries, cityCode, labels }: DirectorySectionProps) {
  if (!entries.length) return null;

  return (
    <section
      data-sec="dir"
      id="kota"
      data-screen-label="Kota Layanan"
      style={{ order: 70, background: '#ffffff', borderBottom: '1px solid var(--ar-color-border)' }}
    >
      <div style={CONTAINER}>
        <div className="ar-reveal">
          <SectionHeading eyebrow={labels.eyebrow} title={labels.title} subtitle={labels.subtitle} />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))',
            gap: 14,
            marginTop: 24,
          }}
        >
          {entries.map((d, i) => {
            const active = d.status === 'Aktif';
            return (
              <div
                key={i}
                className="ar-reveal card-lift"
                style={{
                  background: 'var(--ar-gray-25)',
                  border: '1px solid var(--ar-color-border)',
                  borderRadius: 'var(--ar-radius-lg)',
                  padding: 'var(--ar-space-5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 'var(--ar-text-md)',
                      fontWeight: 'var(--ar-weight-semibold)',
                      color: 'var(--ar-color-text)',
                    }}
                  >
                    {d.name}
                  </h3>
                  <span
                    style={{
                      flex: '0 0 auto',
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontSize: 'var(--ar-text-xs)',
                      fontWeight: 'var(--ar-weight-semibold)',
                      background: active ? '#e6f6ec' : '#eef1f5',
                      color: active ? '#1a7f4b' : '#5b6b7d',
                    }}
                  >
                    {d.status}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 'var(--ar-text-sm)',
                    lineHeight: 1.6,
                    color: 'var(--ar-color-text-secondary)',
                    textWrap: 'pretty',
                  }}
                >
                  {d.description}
                </p>
                <WaLink
                  href={d.waHref}
                  data-cta="kota-wa"
                  data-city={cityCode}
                  className="link-arrow"
                  style={{
                    marginTop: 'auto',
                    fontSize: 'var(--ar-text-sm)',
                    fontWeight: 'var(--ar-weight-semibold)',
                    color: 'var(--ar-color-primary)',
                    textDecoration: 'none',
                  }}
                >
                  {labels.ask}
                </WaLink>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- unit classes */

interface UnitClassesSectionProps {
  units: string[];
  waHref: string;
  cityCode: string;
  labels: { eyebrow: string; title: string; subtitle: string; ask: string };
}

/**
 * Kelas Unit — country pages show generic classes instead of the fleet grid,
 * because exact models and tariffs are confirmed per city in writing.
 */
export function UnitClassesSection({ units, waHref, cityCode, labels }: UnitClassesSectionProps) {
  return (
    <section id="armada" data-screen-label="Kelas Unit" style={{ order: 50, background: 'var(--ar-color-bg)' }}>
      <div style={CONTAINER}>
        <div className="ar-reveal">
          <SectionHeading eyebrow={labels.eyebrow} title={labels.title} subtitle={labels.subtitle} />
        </div>
        <div
          className="ar-reveal"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 }}
        >
          {units.map((unit) => (
            <span
              key={unit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '10px 18px',
                borderRadius: 999,
                background: '#ffffff',
                border: '1px solid var(--ar-color-border)',
                fontSize: 'var(--ar-text-sm)',
                fontWeight: 'var(--ar-weight-medium)',
                color: 'var(--ar-color-text)',
              }}
            >
              {unit}
            </span>
          ))}
        </div>
        <div className="ar-reveal" style={{ marginTop: 20 }}>
          <WaLink
            href={waHref}
            data-cta="units-wa"
            data-city={cityCode}
            className="cta-wa-flat"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              minHeight: 44,
              padding: '0 20px',
              borderRadius: 'var(--ar-radius-md)',
              background: 'var(--ar-color-whatsapp)',
              color: '#ffffff',
              fontSize: 'var(--ar-text-sm)',
              fontWeight: 'var(--ar-weight-semibold)',
              textDecoration: 'none',
              transition: 'background var(--ar-duration-fast) var(--ar-ease)',
            }}
          >
            <WaGlyph size={20} />
            {labels.ask}
          </WaLink>
        </div>
      </div>
    </section>
  );
}
