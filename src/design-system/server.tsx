/**
 * Server-renderable components from @arasya/design-system, ported verbatim
 * from `_ds_bundle.js`. These carry no state and no event handlers, so they
 * stay out of the client bundle entirely.
 *
 * Markup and `ar-*` class names are unchanged — `arasya-ds.css` styles them.
 */
import type { HTMLAttributes, ReactNode } from 'react';
import { CheckIcon, ChevronDownIcon, TRUST_PRESETS, type TrustPreset } from './icons';

/* ------------------------------------------------------------------ Provider */

export interface ArasyaProviderProps {
  children?: ReactNode;
  className?: string;
}

/** Root wrapper for every Arasya screen. Applies brand font, text colour, background. */
export function ArasyaProvider({ children, className }: ArasyaProviderProps) {
  return <div className={['ar-root', className].filter(Boolean).join(' ')}>{children}</div>;
}

/* -------------------------------------------------------------------- Avatar */

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const cls = ['ar-avatar', `ar-avatar--${size}`, className].filter(Boolean).join(' ');
  return (
    <span className={cls} title={name}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}

/* --------------------------------------------------------------------- Badge */

export interface BadgeProps {
  tone?: 'primary' | 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  variant?: 'solid' | 'subtle';
  children?: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', variant = 'subtle', children, className }: BadgeProps) {
  const cls = ['ar-badge', `ar-badge--${tone}`, `ar-badge--${variant}`, className]
    .filter(Boolean)
    .join(' ');
  return <span className={cls}>{children}</span>;
}

/* ---------------------------------------------------------------------- Card */

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'outline' | 'filled' | 'dark';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ variant = 'elevated', padding = 'md', className, children, ...rest }: CardProps) {
  const cls = ['ar-card', `ar-card--${variant}`, `ar-card--pad-${padding}`, className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['ar-card__header', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['ar-card__body', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['ar-card__footer', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------- Divider */

export interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className }: DividerProps) {
  const cls = ['ar-divider', label && 'ar-divider--labeled', className].filter(Boolean).join(' ');
  return (
    <div className={cls} role="separator">
      {label && <span className="ar-divider__label">{label}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------- Spinner */

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function Spinner({ size = 'md', label = 'Memuat…', className }: SpinnerProps) {
  const cls = ['ar-spinner', `ar-spinner--${size}`, className].filter(Boolean).join(' ');
  return <span className={cls} role="status" aria-label={label} />;
}

/* ----------------------------------------------------------------- Accordion */

export interface AccordionItem {
  question: string;
  answer: ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  defaultOpen?: number;
  className?: string;
}

/** FAQ accordion built on native details/summary — no JS state, statically renderable. */
export function Accordion({ items, defaultOpen, className }: AccordionProps) {
  return (
    <div className={['ar-accordion', className].filter(Boolean).join(' ')}>
      {items.map((item, i) => (
        <details key={i} className="ar-accordion__item" open={i === defaultOpen || undefined}>
          <summary className="ar-accordion__question">
            <span>{item.question}</span>
            <span className="ar-accordion__chevron" aria-hidden>
              <ChevronDownIcon size={18} />
            </span>
          </summary>
          <div className="ar-accordion__answer">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ SectionHeading */

export interface SectionHeadingProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  align?: 'left' | 'center';
  level?: 2 | 3;
  className?: string;
}

export function SectionHeading({
  title,
  eyebrow,
  subtitle,
  align = 'left',
  level = 2,
  className,
}: SectionHeadingProps) {
  const Tag = level === 3 ? 'h3' : 'h2';
  const cls = ['ar-sectionheading', align === 'center' && 'ar-sectionheading--center', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls}>
      {eyebrow && <span className="ar-sectionheading__eyebrow">{eyebrow}</span>}
      <Tag className="ar-sectionheading__title">{title}</Tag>
      {subtitle && <p className="ar-sectionheading__subtitle">{subtitle}</p>}
    </div>
  );
}

/* --------------------------------------------------------------- TrustStrip */

export interface TrustStripItem {
  title: string;
  description?: string;
  preset?: TrustPreset;
  icon?: ReactNode;
}

export interface TrustStripProps {
  items: TrustStripItem[];
  className?: string;
}

/** Only real, verified claims — never invented ratings or counts. */
export function TrustStrip({ items, className }: TrustStripProps) {
  return (
    <div className={['ar-truststrip', className].filter(Boolean).join(' ')}>
      {items.map((item, i) => {
        const Preset = item.preset ? TRUST_PRESETS[item.preset] : null;
        return (
          <div key={i} className="ar-truststrip__item">
            <span className="ar-truststrip__icon" aria-hidden>
              {item.icon ?? (Preset ? <Preset size={22} /> : <CheckIcon size={22} />)}
            </span>
            <div className="ar-truststrip__text">
              <span className="ar-truststrip__title">{item.title}</span>
              {item.description && <span className="ar-truststrip__desc">{item.description}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
