/**
 * Icon set used by the landing templates — path data copied verbatim from the
 * `svcIcon()` / `waIcon()` helpers in the `.dc.html` prototypes.
 *
 * Distinct from the design system's own icons (`src/design-system/icons.tsx`):
 * these are the page-level set with a 1.8 stroke weight, and the two are not
 * interchangeable.
 */
import type { CSSProperties } from 'react';

export interface GlyphProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Service + trust presets. Keys match `Service.icon` and `TrustCard.preset`. */
export const GLYPH_PATHS: Record<string, React.ReactNode> = {
  car: (
    <>
      <path d="M4 16v-3.2c0-.5.1-1 .3-1.4L5.9 8.2A2 2 0 0 1 7.7 7h8.6a2 2 0 0 1 1.8 1.2l1.6 3.2c.2.4.3.9.3 1.4V16" />
      <path d="M2.5 16h19" />
      <circle cx="7" cy="18.5" r="1.5" />
      <circle cx="17" cy="18.5" r="1.5" />
      <path d="M6.5 12h11" />
    </>
  ),
  plane: (
    <>
      <path d="M22 2 11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </>
  ),
  route: (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  heart: (
    <path d="M12 20.3l-1.2-1.1C5.4 14.4 2 11.3 2 7.9 2 5.2 4.2 3 6.9 3c1.9 0 3.7.9 5.1 2.4C13.4 3.9 15.2 3 17.1 3 19.8 3 22 5.2 22 7.9c0 3.4-3.4 6.5-8.8 11.3L12 20.3z" />
  ),
  building: (
    <>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" />
      <circle cx="12" cy="11" r="2.2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5.2c0 4.3-3 8.2-7 9.3-4-1.1-7-5-7-9.3V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z" />
  ),
  alert: (
    <>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  star: (
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  ),
};

export type GlyphName = keyof typeof GLYPH_PATHS;

/** Falls back to the car glyph for unknown names, matching the prototypes. */
export function Glyph({ name, size = 22, className, style }: GlyphProps & { name: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      style={style}
      {...STROKE}
    >
      {GLYPH_PATHS[name] ?? GLYPH_PATHS.car}
    </svg>
  );
}

/** WhatsApp mark — the landing templates' filled variant. */
export function WaGlyph({ size = 20, className, style }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39c1.45.79 3.08 1.21 4.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.65-1.03-5.14-2.9-7.01A9.83 9.83 0 0 0 12.04 2Zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.64.8-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

/** Thicker check used in list bullets and the "Termasuk" chips. */
export function CheckGlyph({ size = 14, className, style }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/** Arrow used by blog "Baca artikel →" affordances. */
export function ArrowGlyph({ size = 14, className, style }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}
