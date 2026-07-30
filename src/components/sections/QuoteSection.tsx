'use client';

import { QuoteForm, SectionHeading } from '@/design-system';
import { Glyph } from '@/components/icons';
import { pushFormStart, pushQuoteSubmit } from '@/components/AnalyticsBridge';
import { CONTAINER } from './styles';

interface QuoteSectionProps {
  cityName: string;
  cityCode: string;
  phone: string;
  phoneDisplay: string;
  carOptions: string[];
  labels: {
    eyebrow: string;
    title: string;
    subtitle: string;
    orContact: string;
    hours: string;
    assurances: string[];
  };
}

/**
 * The conversion block. `QuoteForm` comes from the design system and is never
 * hand-built — it owns ref-code generation, the WhatsApp message format, and
 * the wa.me handoff.
 *
 * `onFormStart` / `onSubmit` feed GA4; `quote_submit` is imported as a Google
 * Ads conversion, so this is the second half of the attribution story that
 * `[data-cta]` delegation covers for everything else.
 */
export function QuoteSection({
  cityName,
  cityCode,
  phone,
  phoneDisplay,
  carOptions,
  labels,
}: QuoteSectionProps) {
  return (
    <section id="penawaran" data-screen-label="Formulir Penawaran" style={{ order: 110, background: 'var(--ar-color-bg)' }}>
      <div
        style={{
          ...CONTAINER,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'clamp(24px, 4vw, 56px)',
          alignItems: 'flex-start',
        }}
      >
        <div className="ar-reveal" style={{ flex: '1 1 280px', minWidth: 'min(100%, 280px)' }}>
          <SectionHeading eyebrow={labels.eyebrow} title={labels.title} subtitle={labels.subtitle} />
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 'var(--ar-text-sm)', color: 'var(--ar-color-text-secondary)' }}>
              {labels.orContact}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 'var(--ar-text-lg)',
                fontWeight: 'var(--ar-weight-bold)',
                color: 'var(--ar-color-text)',
              }}
            >
              {phoneDisplay}
            </p>
            <p style={{ margin: 0, fontSize: 'var(--ar-text-sm)', color: 'var(--ar-color-text-muted)' }}>
              {labels.hours}
            </p>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {labels.assurances.map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span
                    style={{
                      flex: '0 0 auto',
                      width: 20,
                      height: 20,
                      borderRadius: 999,
                      background: 'var(--ar-blue-50)',
                      border: '1px solid var(--ar-blue-100)',
                      color: 'var(--ar-blue-700)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Glyph name="check" size={12} />
                  </span>
                  <span style={{ fontSize: 'var(--ar-text-sm)', color: 'var(--ar-color-text-secondary)' }}>
                    {line}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="ar-reveal"
          style={{
            flex: '1.3 1 340px',
            minWidth: 'min(100%, 340px)',
            background: '#ffffff',
            border: '1px solid var(--ar-color-border)',
            borderRadius: 'var(--ar-radius-xl)',
            padding: 'clamp(20px, 3vw, 32px)',
            boxShadow: 'var(--ar-shadow-md)',
          }}
        >
          <QuoteForm
            cityName={cityName}
            cityCode={cityCode}
            phone={phone}
            carOptions={carOptions}
            onFormStart={() => pushFormStart(cityName)}
            onSubmit={({ refCode }) => pushQuoteSubmit({ refCode, cityName })}
          />
        </div>
      </div>
    </section>
  );
}
