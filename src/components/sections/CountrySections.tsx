import { SectionHeading } from '@/design-system';
import { WaGlyph } from '@/components/icons';
import { WaLink } from '@/components/WaLink';
import type { DirectoryEntry, UnitClass } from '@/types';
import { CONTAINER } from './styles';

/* ------------------------------------------------------- city directory */

export interface DirectoryCard extends DirectoryEntry {
  waHref: string;
  /**
   * Whether this city is live, decided from the untranslated record.
   *
   * It used to be `status === 'Aktif'` here, read off the rendered text — which
   * works exactly until the text is translated, at which point every city on the
   * English page silently renders as "coming soon". A flag computed before
   * localisation cannot be broken by a translator.
   */
  active: boolean;
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
            const active = d.active;
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
  units: UnitClass[];
  waHref: string;
  cityCode: string;
  labels: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ask: string;
    seats: string;
    luggage: string;
    partnerNote: string;
  };
}

/**
 * Kelas Unit — overseas pages show car classes instead of the fleet grid,
 * because exact models and tariffs are confirmed per city in writing.
 *
 * These were four pills, which left the section ~425px tall next to Bogor's
 * 1681px of fleet cards and answered none of the questions someone sizing a car
 * has. Still no photos and no model names: Arasya does not own these cars, so
 * anything resembling a specific vehicle re-implies the forecourt that dropping
 * the price grid was meant to avoid. The partner note says so outright rather
 * than leaving the reader to infer it.
 */
export function UnitClassesSection({ units, waHref, cityCode, labels }: UnitClassesSectionProps) {
  return (
    <section id="armada" data-screen-label="Kelas Unit" style={{ order: 50, background: 'var(--ar-color-bg)' }}>
      <div style={CONTAINER}>
        <div className="ar-reveal">
          <SectionHeading eyebrow={labels.eyebrow} title={labels.title} subtitle={labels.subtitle} />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
            gap: 14,
            marginTop: 24,
          }}
        >
          {units.map((unit) => (
            <div
              key={unit.name}
              className="ar-reveal card-lift-bordered"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: 'var(--ar-space-5)',
                background: '#ffffff',
                border: '1px solid var(--ar-color-border)',
                borderRadius: 'var(--ar-radius-lg)',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 'var(--ar-text-md)',
                  fontWeight: 'var(--ar-weight-semibold)',
                  color: 'var(--ar-color-text)',
                }}
              >
                {unit.name}
              </h3>

              {/* A description list, not a paragraph: these are two labelled
                  facts a reader scans and compares across cards. */}
              <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <SpecRow label={labels.seats} value={unit.seats} />
                <SpecRow label={labels.luggage} value={unit.luggage} />
              </dl>

              <p
                style={{
                  margin: 0,
                  paddingTop: 12,
                  borderTop: '1px solid var(--ar-color-border)',
                  fontSize: 'var(--ar-text-sm)',
                  lineHeight: 1.6,
                  color: 'var(--ar-color-text-secondary)',
                  textWrap: 'pretty',
                }}
              >
                {unit.useCase}
              </p>
            </div>
          ))}
        </div>

        <p
          className="ar-reveal"
          style={{
            margin: '20px 0 0',
            maxWidth: '68ch',
            fontSize: 'var(--ar-text-sm)',
            lineHeight: 1.7,
            color: 'var(--ar-color-text-muted)',
            textWrap: 'pretty',
          }}
        >
          {labels.partnerNote}
        </p>

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

/**
 * One labelled spec inside a class card.
 *
 * `<dt>`/`<dd>` rather than two spans: a screen reader announces "Kapasitas,
 * 6 penumpang + driver" instead of two orphaned fragments.
 *
 * Label always on its own line. Laying these out as a wrapping flex row put the
 * label beside short values and above long ones, so the same field sat
 * differently on each card and the four read as a ragged column rather than a
 * comparable spec sheet. Stacking is uniform regardless of how long a
 * translation turns out to be.
 */
function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt
        style={{
          fontSize: 'var(--ar-text-xs)',
          fontWeight: 'var(--ar-weight-semibold)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--ar-color-text-muted)',
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          margin: '2px 0 0',
          fontSize: 'var(--ar-text-sm)',
          lineHeight: 1.5,
          color: 'var(--ar-color-text)',
        }}
      >
        {value}
      </dd>
    </div>
  );
}
