'use client';

import { useMemo, useState } from 'react';
import { WaGlyph } from '@/components/icons';
import { useWaHref } from '@/lib/campaign';
import { priceLabel, routeCode, routeMessage, routesFor, unitRows } from '@/lib/travel';
import { waHref } from '@/lib/shared';
import type { Travel } from '@/types';
import type { TravelStrings } from '@/lib/i18n';

/**
 * Origin → destination → unit tariff lookup in the hero.
 *
 * Selecting an origin resets the destination, because routes are origin-scoped
 * and a stale destination would show a price for a route that isn't offered.
 */
export function TariffChecker({
  travel,
  strings,
  phone,
}: {
  travel: Travel;
  strings: TravelStrings;
  phone: string;
}) {
  const T = strings;
  const withTag = useWaHref();

  const [originKey, setOriginKey] = useState(travel.origins[0]?.key ?? '');
  const [destKey, setDestKey] = useState<string | null>(null);
  const [unitKey, setUnitKey] = useState<string | null>(null);

  const dests = useMemo(() => routesFor(travel, originKey), [travel, originKey]);
  const route = dests.find((r) => r.dest === destKey) ?? dests[0] ?? null;
  const units = useMemo(() => unitRows(travel, route), [travel, route]);
  const unit = units.find((u) => u.key === unitKey) ?? units[0] ?? null;
  const price = route && unit ? route.prices[unit.key] : null;

  const bookHref =
    route && unit
      ? waHref(
          phone,
          routeMessage(travel, route, unit, T),
          `TRV-cek-${routeCode(travel, route)}-${unit.key}`
        )
      : waHref(phone, T.waGeneral, 'TRV-cek');

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 'var(--ar-radius-xl)',
        boxShadow: 'var(--ar-shadow-xl)',
        padding: 'clamp(20px, 3vw, 26px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        color: 'var(--ar-color-text)',
      }}
    >
      <h2 style={{ margin: 0, fontSize: 'var(--ar-text-lg)', fontWeight: 'var(--ar-weight-bold)', color: 'var(--ar-color-text)' }}>
        {T.bTitle}
      </h2>

      <Field label={T.bOrigin}>
        <select
          value={originKey}
          onChange={(e) => {
            setOriginKey(e.target.value);
            setDestKey(null);
            setUnitKey(null);
          }}
          style={SELECT}
        >
          {travel.origins.map((o) => (
            <option key={o.key} value={o.key}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label={T.bDest}>
        <select
          value={route?.dest ?? ''}
          onChange={(e) => {
            setDestKey(e.target.value);
            setUnitKey(null);
          }}
          style={SELECT}
        >
          {dests.map((r) => (
            <option key={r.dest} value={r.dest}>
              {r.destName}
            </option>
          ))}
        </select>
      </Field>

      <Field label={T.bUnit}>
        <select value={unit?.key ?? ''} onChange={(e) => setUnitKey(e.target.value)} style={SELECT}>
          {units.map((u) => (
            <option key={u.key} value={u.key}>
              {u.name} — {priceLabel(route?.prices[u.key])}
            </option>
          ))}
        </select>
      </Field>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          padding: '14px 16px',
          borderRadius: 'var(--ar-radius-md)',
          background: 'var(--ar-blue-50)',
          border: '1px solid var(--ar-blue-100)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={LABEL}>{T.bPriceLabel}</span>
          <span
            style={{
              fontSize: 'clamp(22px, 3vw, 28px)',
              fontWeight: 'var(--ar-weight-bold)',
              color: 'var(--ar-color-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {priceLabel(price)}
          </span>
        </div>
      </div>

      <p style={{ margin: '-6px 0 0', fontSize: 'var(--ar-text-xs)', lineHeight: 1.5, color: 'var(--ar-color-text-muted)', textWrap: 'pretty' }}>
        {T.bPriceNote}
      </p>

      <a
        href={withTag(bookHref)}
        target="_blank"
        rel="noopener noreferrer"
        data-cta="travel-builder-wa"
        data-route={route ? routeCode(travel, route) : ''}
        className="cta-wa-flat"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          minHeight: 48,
          borderRadius: 'var(--ar-radius-md)',
          background: 'var(--ar-color-whatsapp)',
          color: '#ffffff',
          fontSize: 'var(--ar-text-md)',
          fontWeight: 'var(--ar-weight-semibold)',
          textDecoration: 'none',
          transition: 'background var(--ar-duration-fast) var(--ar-ease)',
        }}
      >
        <WaGlyph size={20} />
        {T.bCta}
      </a>

      <p style={{ margin: 0, fontSize: 'var(--ar-text-xs)', color: 'var(--ar-color-text-secondary)' }}>
        {T.bOther}{' '}
        <a
          href={withTag(waHref(phone, T.waGeneral, 'TRV-rute-khusus'))}
          target="_blank"
          rel="noopener noreferrer"
          data-cta="travel-builder-custom"
          style={{ color: 'var(--ar-color-primary)', fontWeight: 'var(--ar-weight-semibold)', textDecoration: 'none' }}
        >
          {T.bOtherLink}
        </a>
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={LABEL}>{label}</span>
      <span style={{ position: 'relative', display: 'block' }}>
        {children}
        <span
          aria-hidden
          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 9, color: 'var(--ar-color-text-muted)' }}
        >
          ▼
        </span>
      </span>
    </label>
  );
}

const LABEL = {
  fontSize: 'var(--ar-text-xs)',
  fontWeight: 'var(--ar-weight-semibold)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--ar-color-text-muted)',
} as const;

const SELECT = {
  appearance: 'none',
  WebkitAppearance: 'none',
  width: '100%',
  minHeight: 46,
  padding: '0 38px 0 14px',
  border: '1px solid var(--ar-color-border)',
  borderRadius: 'var(--ar-radius-md)',
  background: '#ffffff',
  fontFamily: 'inherit',
  fontSize: 'var(--ar-text-sm)',
  fontWeight: 'var(--ar-weight-medium)',
  color: 'var(--ar-color-text)',
  cursor: 'pointer',
} as const;
