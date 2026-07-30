'use client';

import { WaGlyph } from '@/components/icons';
import { useWaHref } from '@/lib/campaign';

interface WaFabProps {
  href: string;
  cityCode?: string;
  cta?: string;
  label?: string;
}

/**
 * Floating WhatsApp button, present on every landing page in the prototypes.
 *
 * Note this is NOT the design system's `StickyCtaBar`, despite the handoff
 * README naming that component — every `.dc.html` landing ships this 58px FAB,
 * and the prototypes are the stated pixel reference. `StickyCtaBar` remains
 * available in the vendored DS if it is ever wanted instead.
 *
 * `id="wa-fab"` is load-bearing: the GSAP entrance animation targets it.
 */
export function WaFab({ href, cityCode, cta = 'fab-wa', label = 'Chat WhatsApp Arasya Rent Car' }: WaFabProps) {
  const withTag = useWaHref();
  return (
    <a
      id="wa-fab"
      href={withTag(href)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      data-cta={cta}
      data-city={cityCode}
      className="wa-fab"
      style={{
        position: 'fixed',
        right: 'max(20px, env(safe-area-inset-right))',
        bottom: 'max(20px, env(safe-area-inset-bottom))',
        zIndex: 40,
        width: 58,
        height: 58,
        borderRadius: 999,
        background: 'var(--ar-color-whatsapp)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 10px 28px rgba(37,211,102,0.4), 0 2px 8px rgba(1,24,48,0.2)',
        transition: 'transform var(--ar-duration-fast) var(--ar-ease), background var(--ar-duration-fast) var(--ar-ease)',
      }}
    >
      <WaGlyph size={30} />
    </a>
  );
}
