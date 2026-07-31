import type { CSSProperties } from 'react';
import type { Official } from '@/lib/shared';

interface OfficialPhonesProps {
  official: Official;
  /** Applied to each number. */
  style: CSSProperties;
  gap?: number;
}

/**
 * The official WhatsApp numbers, one per line.
 *
 * Stacked rather than joined with " · ". Three numbers on one line read as a
 * single run-on string — worse here than anywhere else on the site, because this
 * list is the anti-fraud reference a visitor checks their chat against, digit by
 * digit. `TrustSection` already stacked them; the footers and the home
 * verification band did not, so the same list looked different depending on
 * which page you were on.
 *
 * Deliberately NOT links. Making them tappable was tried and reverted: every
 * clickable WhatsApp CTA on a page must dial that page's routed number, so that
 * a Yogyakarta lead reaches whoever handles Yogyakarta (`locations.wa_phone`,
 * enforced by `qa:interactions`). Three tappable numbers put three different
 * inboxes on every page and quietly defeated that. The cost was real and the
 * gain was not: this list is reference material, and a visitor is never more
 * than one tap from WhatsApp anyway — the verification band has a CTA directly
 * beneath it, the footer has the floating button, and the header has its own.
 */
export function OfficialPhones({ official, style, gap = 4 }: OfficialPhonesProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {official.phones.map((p) => (
        <span key={p.key} style={style}>
          {p.display}
        </span>
      ))}
    </div>
  );
}
