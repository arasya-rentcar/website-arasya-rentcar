import { SectionHeading } from '@/design-system';
import { Glyph } from '@/components/icons';
import { WaLink } from '@/components/WaLink';
import type { Service } from '@/types';
import { CONTAINER, GRID_AUTOFIT } from './styles';

export interface ServiceCard extends Service {
  waHref: string;
}

interface ServicesSectionProps {
  services: ServiceCard[];
  cityCode: string;
  labels: { eyebrow: string; title: string; ask: string };
}

export function ServicesSection({ services, cityCode, labels }: ServicesSectionProps) {
  return (
    <section
      data-sec="layanan"
      id="layanan"
      data-screen-label="Layanan"
      style={{ order: 45, background: 'var(--ar-color-bg)' }}
    >
      <div style={{ ...CONTAINER, paddingBottom: 0 }}>
        <div className="ar-reveal">
          <SectionHeading eyebrow={labels.eyebrow} title={labels.title} />
        </div>
        <div style={{ ...GRID_AUTOFIT(300, 14), marginTop: 24 }}>
          {services.map((svc) => (
            <div
              key={svc.slug}
              className="ar-reveal card-lift"
              style={{
                background: '#ffffff',
                border: '1px solid var(--ar-color-border)',
                borderRadius: 'var(--ar-radius-lg)',
                padding: 'var(--ar-space-5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--ar-radius-md)',
                  background: 'var(--ar-blue-50)',
                  border: '1px solid var(--ar-blue-100)',
                  color: 'var(--ar-color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Glyph name={svc.icon} />
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 'var(--ar-text-md)',
                  fontWeight: 'var(--ar-weight-semibold)',
                  color: 'var(--ar-color-text)',
                }}
              >
                {svc.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--ar-text-sm)',
                  lineHeight: 1.6,
                  color: 'var(--ar-color-text-secondary)',
                  textWrap: 'pretty',
                }}
              >
                {svc.description}
              </p>
              <WaLink
                href={svc.waHref}
                data-cta="layanan-wa"
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
          ))}
        </div>
      </div>
    </section>
  );
}
