import { SectionHeading } from '@/design-system';
import type { Testimonial } from '@/types';
import { CONTAINER } from './styles';

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** "Lihat ulasan di Google ↗" */
  googleLabel: string;
}

/**
 * Customer quotes.
 *
 * Review text is rendered verbatim and never translated — real quotes keep
 * their original language in both locales. `link` points at the Google review
 * when one exists, which is what makes the quote checkable.
 */
export function TestimonialsSection({
  testimonials,
  eyebrow,
  title,
  subtitle,
  googleLabel,
}: TestimonialsSectionProps) {
  if (!testimonials.length) return null;

  return (
    <section data-screen-label="Testimoni" style={{ order: 94, background: 'var(--ar-color-bg)' }}>
      <div style={CONTAINER}>
        <div className="ar-reveal">
          <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: 16,
            marginTop: 24,
          }}
        >
          {testimonials.map((t, i) => (
            <figure
              key={i}
              className="ar-reveal"
              style={{
                margin: 0,
                background: '#ffffff',
                border: '1px solid var(--ar-color-border)',
                borderRadius: 'var(--ar-radius-lg)',
                padding: 'var(--ar-space-5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <blockquote
                style={{
                  margin: 0,
                  fontSize: 'var(--ar-text-md)',
                  lineHeight: 1.7,
                  color: 'var(--ar-color-text)',
                  textWrap: 'pretty',
                }}
              >
                “{t.quote}”
              </blockquote>
              <figcaption
                style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 'auto' }}
              >
                <span
                  style={{
                    fontWeight: 'var(--ar-weight-semibold)',
                    fontSize: 'var(--ar-text-sm)',
                    color: 'var(--ar-color-text)',
                  }}
                >
                  {t.name}
                </span>
                <span style={{ fontSize: 'var(--ar-text-xs)', color: 'var(--ar-color-text-muted)' }}>
                  {t.context}
                </span>
                {t.link && (
                  <a
                    href={t.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-arrow"
                    style={{
                      marginTop: 6,
                      fontSize: 'var(--ar-text-xs)',
                      fontWeight: 'var(--ar-weight-medium)',
                      color: 'var(--ar-color-primary)',
                      textDecoration: 'none',
                    }}
                  >
                    {googleLabel}
                  </a>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
