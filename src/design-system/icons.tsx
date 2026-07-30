/**
 * Icon set from @arasya/design-system, ported verbatim from `_ds_bundle.js`.
 * Path data is unchanged — do not redraw these.
 */
import type { CSSProperties, SVGProps } from 'react';

export interface IconProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

function svgProps({ size = 20, className, style }: IconProps): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    className,
    style,
  };
}

export function WhatsAppIcon({ size = 20, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
      style={style}
    >
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.94L2 22l5.2-1.5A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.08.9.88-3.02-.2-.31a8.2 8.2 0 1 1 6.9 3.76Zm4.5-6.14c-.25-.12-1.46-.72-1.68-.8-.23-.09-.4-.13-.56.12-.17.25-.64.8-.79.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.35-2.93c-.25-.43.25-.4.72-1.34.08-.16.04-.3-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.48c-.16 0-.43.06-.66.3-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.6.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function ChevronDownIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function UsersIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function ShieldIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function CarIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
      <path d="M3 11h18a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1" />
      <path d="M3 11a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
      <path d="M9 17h6" />
    </svg>
  );
}

export function PhoneIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function StarIcon({ size = 20, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
      style={style}
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export const TRUST_PRESETS = {
  shield: ShieldIcon,
  car: CarIcon,
  users: UsersIcon,
  phone: PhoneIcon,
  check: CheckIcon,
  star: StarIcon,
} as const;

export type TrustPreset = keyof typeof TRUST_PRESETS;
