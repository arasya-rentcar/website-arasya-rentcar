import { Accordion, SectionHeading } from '@/design-system';
import type { FaqItem } from '@/types';
import { CONTAINER } from './styles';

interface FaqSectionProps {
  items: FaqItem[];
  eyebrow: string;
  title: string;
}

/**
 * FAQ accordion.
 *
 * Built on native `details/summary`, so the answers are in the HTML whether or
 * not JS runs. That matters beyond progressive enhancement: this markup has to
 * mirror the FAQPage JSON-LD exactly, and content hidden behind JS would make
 * the structured data unsupported by the visible page.
 */
export function FaqSection({ items, eyebrow, title }: FaqSectionProps) {
  return (
    <section
      id="faq"
      data-screen-label="FAQ"
      style={{
        order: 100,
        background: '#ffffff',
        borderTop: '1px solid var(--ar-color-border)',
        borderBottom: '1px solid var(--ar-color-border)',
      }}
    >
      <div style={CONTAINER}>
        <div className="ar-reveal">
          <SectionHeading eyebrow={eyebrow} title={title} />
        </div>
        <div className="ar-reveal" style={{ marginTop: 24, maxWidth: 800 }}>
          <Accordion items={items} defaultOpen={0} />
        </div>
      </div>
    </section>
  );
}
