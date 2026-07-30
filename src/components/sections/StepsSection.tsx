import { SectionHeading } from '@/design-system';
import { CONTAINER } from './styles';

export interface BookingStep {
  n: number;
  title: string;
  description: string;
}

interface StepsSectionProps {
  steps: BookingStep[];
  eyebrow: string;
  title: string;
  subtitle: string;
}

export function StepsSection({ steps, eyebrow, title, subtitle }: StepsSectionProps) {
  return (
    <section
      id="langkah"
      data-screen-label="Langkah Pemesanan"
      style={{ order: 90, background: 'var(--ar-color-bg)', borderTop: '1px solid var(--ar-color-border)' }}
    >
      <div style={CONTAINER}>
        <div className="ar-reveal">
          <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: '18px clamp(24px, 4vw, 48px)',
            marginTop: 28,
          }}
        >
          {steps.map((step) => (
            <div
              key={step.n}
              className="ar-reveal"
              style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  flex: '0 0 30px',
                  borderRadius: 999,
                  background: 'var(--ar-blue-50)',
                  color: 'var(--ar-blue-700)',
                  border: '1px solid var(--ar-blue-100)',
                  fontWeight: 'var(--ar-weight-bold)',
                  fontSize: 'var(--ar-text-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {step.n}
              </div>
              <div>
                <h3
                  style={{
                    margin: '3px 0 4px',
                    fontSize: 'var(--ar-text-md)',
                    fontWeight: 'var(--ar-weight-semibold)',
                    color: 'var(--ar-color-text)',
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 'var(--ar-text-sm)',
                    lineHeight: 1.6,
                    color: 'var(--ar-color-text-secondary)',
                  }}
                >
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
