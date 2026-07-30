'use client';

/**
 * Interactive components from @arasya/design-system, ported verbatim from
 * `_ds_bundle.js`. Markup, `ar-*` class names, default prop values and the
 * QuoteForm field order are unchanged.
 */
import { useId, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes, InputHTMLAttributes } from 'react';
import { ChevronDownIcon, CloseIcon, PhoneIcon, WhatsAppIcon } from './icons';
import { buildQuoteMessage, buildWaHref, formatIDR, generateRefCode } from './utils';

/* -------------------------------------------------------------------- Button */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gold' | 'whatsapp';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Renders an <a> instead of a <button>. */
  href?: string;
  target?: string;
  rel?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  leadingIcon,
  trailingIcon,
  href,
  target,
  rel,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const cls = [
    'ar-btn',
    `ar-btn--${variant}`,
    `ar-btn--${size}`,
    fullWidth && 'ar-btn--full',
    loading && 'ar-btn--loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // `whatsapp` implies the WhatsApp glyph unless the caller supplies one.
  const lead = leadingIcon ?? (variant === 'whatsapp' ? <WhatsAppIcon size={size === 'sm' ? 16 : 20} /> : null);

  const content = (
    <>
      {loading && <span className="ar-btn__spinner" aria-hidden />}
      {lead && <span className="ar-btn__icon">{lead}</span>}
      <span className="ar-btn__label">{children}</span>
      {trailingIcon && <span className="ar-btn__icon">{trailingIcon}</span>}
    </>
  );

  if (href) {
    return (
      <a className={cls} href={href} target={target} rel={rel} aria-disabled={disabled || loading || undefined}>
        {content}
      </a>
    );
  }
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
}

/* ---------------------------------------------------------------------- Chip */

export interface ChipProps {
  children?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function Chip({ children, selected, disabled, icon, onClick, onRemove, className }: ChipProps) {
  const cls = ['ar-chip', selected && 'ar-chip--selected', className].filter(Boolean).join(' ');
  const interactive = Boolean(onClick);
  const Tag = (interactive ? 'button' : 'span') as 'button';
  return (
    <Tag
      className={cls}
      onClick={onClick}
      disabled={interactive ? disabled : undefined}
      type={interactive ? 'button' : undefined}
      aria-pressed={interactive ? selected : undefined}
    >
      {icon && <span className="ar-chip__icon">{icon}</span>}
      <span>{children}</span>
      {onRemove && (
        <button type="button" className="ar-chip__remove" aria-label="Hapus" onClick={onRemove}>
          <CloseIcon size={12} />
        </button>
      )}
    </Tag>
  );
}

/* ---------------------------------------------------------------- IconButton */

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  /** Required — the button has no visible label. */
  'aria-label': string;
}

export function IconButton({ variant = 'ghost', size = 'md', className, children, ...rest }: IconButtonProps) {
  const cls = ['ar-iconbtn', `ar-iconbtn--${variant}`, `ar-iconbtn--${size}`, className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------- TextField */

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, required, id, className, ...rest }: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;
  const cls = ['ar-field', error && 'ar-field--error', className].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <label className="ar-field__label" htmlFor={fieldId}>
        {label}
        {required && (
          <span className="ar-field__required" aria-hidden>
            *
          </span>
        )}
      </label>
      <input
        className="ar-field__input"
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {error ? (
        <span className="ar-field__error" id={`${fieldId}-error`}>
          {error}
        </span>
      ) : hint ? (
        <span className="ar-field__hint" id={`${fieldId}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------- Select */

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options?: SelectOption[];
  placeholder?: string;
  hint?: string;
  error?: string;
}

export function Select({
  label,
  options,
  placeholder,
  hint,
  error,
  required,
  id,
  className,
  children,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;
  const cls = ['ar-field', error && 'ar-field--error', className].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <label className="ar-field__label" htmlFor={fieldId}>
        {label}
        {required && (
          <span className="ar-field__required" aria-hidden>
            *
          </span>
        )}
      </label>
      <span className="ar-select">
        <select
          className="ar-field__select"
          id={fieldId}
          required={required}
          // Only used for the uncontrolled case; `...rest` below wins when the
          // caller passes `value`/`defaultValue`.
          defaultValue={
            rest.value === undefined && rest.defaultValue === undefined && placeholder ? '' : undefined
          }
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options ? options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>) : children}
        </select>
        <span className="ar-select__chevron" aria-hidden>
          <ChevronDownIcon size={16} />
        </span>
      </span>
      {error ? (
        <span className="ar-field__error" id={`${fieldId}-error`}>
          {error}
        </span>
      ) : hint ? (
        <span className="ar-field__hint" id={`${fieldId}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- QuoteForm */

export interface QuoteFormValues {
  pickupLocation: string;
  dropoffLocation: string;
  carType: string;
  duration: string;
  pickupTime: string;
  pickupDate: string;
  passengerInfo: string;
}

export interface QuoteFormSubmitPayload {
  refCode: string;
  message: string;
  waHref: string;
  values: QuoteFormValues;
}

export interface QuoteFormProps {
  cityName: string;
  /** Ref-code prefix, e.g. "BGR". */
  cityCode: string;
  phone: string;
  carOptions: string[];
  durationOptions?: string[];
  onFormStart?: () => void;
  onSubmit?: (payload: QuoteFormSubmitPayload) => void;
  openWhatsApp?: boolean;
  submitLabel?: string;
  title?: string;
  className?: string;
}

const DEFAULT_DURATIONS = ['12 jam', 'Full day + luar kota'];

/** THE conversion block. Generates the ref code, builds the WA message, opens wa.me. */
export function QuoteForm({
  cityName,
  cityCode,
  phone,
  carOptions,
  durationOptions = DEFAULT_DURATIONS,
  onFormStart,
  onSubmit,
  openWhatsApp = true,
  submitLabel = 'Minta Penawaran via WhatsApp',
  title,
  className,
}: QuoteFormProps) {
  const startedRef = useRef(false);
  const [values, setValues] = useState<QuoteFormValues>({
    pickupLocation: '',
    dropoffLocation: '',
    carType: '',
    duration: '',
    pickupTime: '',
    pickupDate: '',
    passengerInfo: '',
  });

  function markStarted() {
    if (!startedRef.current) {
      startedRef.current = true;
      onFormStart?.();
    }
  }

  function set(key: keyof QuoteFormValues) {
    return (e: { target: { value: string } }) => {
      markStarted();
      const value = e.target.value;
      setValues((v) => ({ ...v, [key]: value }));
    };
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const refCode = generateRefCode(cityCode);
    const message = buildQuoteMessage({
      refCode,
      cityName,
      pickupLocation: values.pickupLocation,
      dropoffLocation: values.dropoffLocation,
      carType: values.carType,
      duration: values.duration,
      pickupTime: values.pickupTime,
      pickupDate: values.pickupDate || undefined,
      passengerInfo: values.passengerInfo || undefined,
    });
    const waHref = buildWaHref(phone, message);
    onSubmit?.({ refCode, message, waHref, values });
    if (openWhatsApp && typeof window !== 'undefined') {
      window.open(waHref, '_blank', 'noopener');
    }
  }

  return (
    <form className={['ar-quoteform', className].filter(Boolean).join(' ')} onSubmit={handleSubmit}>
      {title && <h3 className="ar-quoteform__title">{title}</h3>}
      <div className="ar-quoteform__grid">
        <TextField
          label="Lokasi jemput"
          placeholder="cth. Stasiun Bogor"
          required
          value={values.pickupLocation}
          onChange={set('pickupLocation')}
          onFocus={markStarted}
        />
        <TextField
          label="Lokasi antar"
          placeholder="cth. Puncak"
          required
          value={values.dropoffLocation}
          onChange={set('dropoffLocation')}
          onFocus={markStarted}
        />
        <Select
          label="Jenis mobil"
          placeholder="Pilih mobil"
          required
          options={carOptions.map((c) => ({ value: c, label: c }))}
          value={values.carType}
          onChange={set('carType')}
          onFocus={markStarted}
        />
        <Select
          label="Durasi"
          placeholder="Pilih durasi"
          required
          options={durationOptions.map((d) => ({ value: d, label: d }))}
          value={values.duration}
          onChange={set('duration')}
          onFocus={markStarted}
        />
        <TextField
          label="Jam jemput"
          type="time"
          required
          value={values.pickupTime}
          onChange={set('pickupTime')}
          onFocus={markStarted}
        />
        <TextField
          label="Tanggal jemput"
          type="date"
          value={values.pickupDate}
          onChange={set('pickupDate')}
          onFocus={markStarted}
        />
        <TextField
          label="Nama / jumlah penumpang"
          placeholder="cth. Budi, 5 orang"
          className="ar-quoteform__span2"
          value={values.passengerInfo}
          onChange={set('passengerInfo')}
          onFocus={markStarted}
        />
      </div>
      <Button type="submit" variant="whatsapp" size="lg" fullWidth>
        {submitLabel}
      </Button>
      <p className="ar-quoteform__note">
        Balasan cepat di jam kerja. Harga final dikonfirmasi via WhatsApp.
      </p>
    </form>
  );
}

/* ---------------------------------------------------------------- FleetTable */

export interface FleetCar {
  name: string;
  priceFrom?: number | null;
  priceLabel?: string;
  capacity?: number;
  badge?: string;
}

export interface FleetTableProps {
  cars: FleetCar[];
  onQuote?: (car: FleetCar) => void;
  quoteLabel?: string;
  priceUnit?: string;
  className?: string;
}

export function FleetTable({
  cars,
  onQuote,
  quoteLabel = 'Pesan',
  priceUnit = '/ 12 jam',
  className,
}: FleetTableProps) {
  return (
    <div className={['ar-fleettable', className].filter(Boolean).join(' ')}>
      <div className="ar-fleettable__scroll">
        <table className="ar-fleettable__table">
          <thead>
            <tr>
              <th>Mobil</th>
              <th>Kapasitas</th>
              <th>Harga mulai</th>
              {onQuote && <th aria-label="Aksi" />}
            </tr>
          </thead>
          <tbody>
            {cars.map((car) => (
              <tr key={car.name}>
                <td className="ar-fleettable__name">
                  {car.name}
                  {car.badge && <span className="ar-fleettable__badge">{car.badge}</span>}
                </td>
                <td>{car.capacity != null ? `${car.capacity} penumpang` : '—'}</td>
                <td className="ar-fleettable__price">
                  {car.priceFrom != null ? (
                    <>
                      <strong>{formatIDR(car.priceFrom)}</strong>{' '}
                      <span className="ar-fleettable__unit">{priceUnit}</span>
                    </>
                  ) : (
                    <span className="ar-fleettable__contact">
                      {car.priceLabel ?? 'Hubungi untuk harga terbaik'}
                    </span>
                  )}
                </td>
                {onQuote && (
                  <td className="ar-fleettable__cta">
                    <Button variant="whatsapp" size="sm" onClick={() => onQuote(car)}>
                      {quoteLabel}
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- StickyCtaBar */

export interface StickyCtaBarProps {
  phone: string;
  waHref?: string;
  onWhatsApp?: () => void;
  whatsAppLabel?: string;
  callLabel?: string;
  className?: string;
}

/** Fixed bottom action bar for mobile — keeps the WhatsApp CTA always reachable. */
export function StickyCtaBar({
  phone,
  waHref,
  onWhatsApp,
  whatsAppLabel = 'Pesan Sekarang',
  callLabel = 'Telepon',
  className,
}: StickyCtaBarProps) {
  return (
    <div className={['ar-stickycta', className].filter(Boolean).join(' ')}>
      <Button variant="outline" href={`tel:${phone.replace(/\s/g, '')}`} leadingIcon={<PhoneIcon size={18} />}>
        {callLabel}
      </Button>
      {waHref ? (
        <Button variant="whatsapp" fullWidth href={waHref} target="_blank" rel="noopener">
          {whatsAppLabel}
        </Button>
      ) : (
        <Button variant="whatsapp" fullWidth onClick={onWhatsApp}>
          {whatsAppLabel}
        </Button>
      )}
    </div>
  );
}
