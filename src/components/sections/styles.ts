import type { CSSProperties } from 'react';

/**
 * Layout constants repeated across the landing sections, lifted verbatim from
 * the `.dc.html` prototypes so spacing stays identical section to section.
 */

/** Standard section inner container. */
export const CONTAINER: CSSProperties = {
  maxWidth: 1160,
  margin: '0 auto',
  padding: 'clamp(56px, 8vw, 88px) clamp(20px, 4vw, 32px)',
};

/** Tighter container used by the trust strip. */
export const CONTAINER_TIGHT: CSSProperties = {
  maxWidth: 1160,
  margin: '0 auto',
  padding: 'clamp(32px, 5vw, 52px) clamp(20px, 4vw, 32px)',
};

export const CARD: CSSProperties = {
  background: '#ffffff',
  border: '1px solid var(--ar-color-border)',
  borderRadius: 'var(--ar-radius-lg)',
};

export const CARD_SUBTLE: CSSProperties = {
  background: 'var(--ar-gray-25)',
  border: '1px solid var(--ar-color-border)',
  borderRadius: 'var(--ar-radius-lg)',
};

/** Orange CTA — deliberately not --ar-color-primary. */
export const CTA_PRIMARY: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 50,
  padding: '0 26px',
  borderRadius: 'var(--ar-radius-md)',
  background: 'var(--city-cta)',
  color: '#ffffff',
  fontSize: 'var(--ar-text-md)',
  fontWeight: 'var(--ar-weight-semibold)',
  textDecoration: 'none',
  transition:
    'background var(--ar-duration-fast) var(--ar-ease), transform var(--ar-duration-fast) var(--ar-ease)',
};

export const CTA_WA: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  minHeight: 50,
  padding: '0 24px',
  borderRadius: 'var(--ar-radius-md)',
  background: 'var(--ar-color-whatsapp)',
  color: '#ffffff',
  fontSize: 'var(--ar-text-md)',
  fontWeight: 'var(--ar-weight-semibold)',
  textDecoration: 'none',
  transition:
    'background var(--ar-duration-fast) var(--ar-ease), transform var(--ar-duration-fast) var(--ar-ease)',
};

/** Small hero chip / pill. */
export const CHIP_DARK: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '7px 14px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.10)',
  border: '1px solid rgba(255,255,255,0.22)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  fontSize: 'var(--ar-text-sm)',
  color: '#ffffff',
};

export const EYEBROW_BADGE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 14px',
  borderRadius: 999,
  background: 'rgba(147,197,246,0.14)',
  border: '1px solid rgba(147,197,246,0.35)',
  fontSize: 'var(--ar-text-xs)',
  fontWeight: 'var(--ar-weight-semibold)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--city-sky)',
};

/** Dark editorial band shared by Mengenal Kota / Wilayah / Negara. */
export const DARK_BAND: CSSProperties = {
  background:
    'linear-gradient(165deg, var(--ar-blue-950) 0%, var(--city-navy-2) 60%, var(--ar-blue-900) 100%)',
  color: '#ffffff',
};

export const GRID_AUTOFILL = (min: number): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${min}px), 1fr))`,
  gap: 16,
});

export const GRID_AUTOFIT = (min: number, gap = 16): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`,
  gap,
});
