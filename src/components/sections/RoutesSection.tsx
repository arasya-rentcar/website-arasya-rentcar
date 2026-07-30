import { SectionHeading } from '@/design-system';
import type { RouteRow } from '@/types';
import { CONTAINER } from './styles';

interface RoutesSectionProps {
  routes: RouteRow[];
  cityName: string;
  eyebrow: string;
  title: string;
  subtitle: string;
}

/**
 * Rute Antarkota. Renders only when the entry has routes — the optional module
 * is one of the structural defences against doorway-page filters, since it
 * makes page shape vary between entries. Rows also target long-tail queries
 * like "sewa mobil bogor ke bandung".
 */
export function RoutesSection({ routes, cityName, eyebrow, title, subtitle }: RoutesSectionProps) {
  if (!routes.length) return null;

  return (
    <section
      data-sec="routes"
      data-screen-label="Rute Antarkota"
      style={{ order: 80, background: 'var(--ar-blue-50)', borderTop: '1px solid var(--ar-color-border)' }}
    >
      <div style={CONTAINER}>
        <div className="ar-reveal">
          <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
            gap: '0 clamp(24px, 4vw, 48px)',
            marginTop: 16,
          }}
        >
          {routes.map((route, i) => (
            <div
              key={i}
              className="ar-reveal"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 12,
                padding: '16px 0',
                borderBottom: '1px solid rgba(4,107,210,0.16)',
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 'var(--ar-text-md)',
                    fontWeight: 'var(--ar-weight-semibold)',
                    color: 'var(--ar-color-text)',
                  }}
                >
                  {cityName} → {route.to}
                </p>
                <p
                  style={{
                    margin: '2px 0 0',
                    fontSize: 'var(--ar-text-sm)',
                    lineHeight: 1.6,
                    color: 'var(--ar-color-text-secondary)',
                    textWrap: 'pretty',
                  }}
                >
                  {route.note}
                </p>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--ar-text-sm)',
                  color: 'var(--ar-color-text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {route.duration}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
