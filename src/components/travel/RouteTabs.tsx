'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SectionHeading } from '@/design-system';
import { WaGlyph } from '@/components/icons';
import { useWaHref } from '@/lib/campaign';
import { CONTAINER } from '@/components/sections/styles';
import { originOf, priceLabel, routeCode, routeMessage, routesFor, unitImage, unitRows } from '@/lib/travel';
import { waHref } from '@/lib/shared';
import type { Travel } from '@/types';
import type { TravelStrings } from '@/lib/i18n';

/**
 * Fixed-rate route list, grouped by departure city.
 *
 * Only the selected origin's routes are rendered, matching the prototype. Every
 * origin is reachable from the tab row, so no route is unreachable without JS
 * beyond the default tab — acceptable here because /travel's indexable content
 * is the service description, not individual route rows.
 */
export function RouteTabs({
  travel,
  strings,
  phone,
  defaultOrigin = 'bogor',
}: {
  travel: Travel;
  strings: TravelStrings;
  phone: string;
  defaultOrigin?: string;
}) {
  const T = strings;
  const withTag = useWaHref();
  const initial = travel.origins.some((o) => o.key === defaultOrigin)
    ? defaultOrigin
    : (travel.origins[0]?.key ?? '');
  const [active, setActive] = useState(initial);

  const activeName = originOf(travel, active).name;
  const routes = routesFor(travel, active);

  return (
    <section id="rute" data-screen-label="Rute & Tarif" style={{ background: 'var(--ar-color-bg)' }}>
      <div style={CONTAINER}>
        <div className="ar-reveal" style={{ maxWidth: 560 }}>
          <SectionHeading eyebrow={T.ruteEyebrow} title={T.ruteTitle} subtitle={T.ruteSub} />
        </div>

        <div className="ar-reveal" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 22 }}>
          {travel.origins.map((o) => {
            const on = o.key === active;
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => setActive(o.key)}
                data-cta="travel-tab"
                data-origin={o.key}
                aria-pressed={on}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  minHeight: 44,
                  padding: '0 18px',
                  borderRadius: 999,
                  border: `1px solid ${on ? 'var(--ar-blue-950)' : 'var(--ar-color-border)'}`,
                  background: on ? 'var(--ar-blue-950)' : '#ffffff',
                  color: on ? '#ffffff' : 'var(--ar-color-text-secondary)',
                  fontFamily: 'inherit',
                  fontSize: 'var(--ar-text-sm)',
                  fontWeight: 'var(--ar-weight-semibold)',
                  cursor: 'pointer',
                  transition: 'background var(--ar-duration-fast) var(--ar-ease)',
                }}
              >
                {o.name}
                <span style={{ fontSize: 'var(--ar-text-xs)', fontWeight: 'var(--ar-weight-medium)', opacity: 0.72 }}>
                  {routesFor(travel, o.key).length}
                  {T.routeSuffix}
                </span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 330px), 1fr))',
            gap: 16,
            marginTop: 22,
            alignItems: 'start',
          }}
        >
          {routes.map((r) => (
            <div
              key={`${r.origin}-${r.dest}`}
              className="ar-reveal"
              style={{
                background: '#ffffff',
                border: '1px solid var(--ar-color-border)',
                borderRadius: 'var(--ar-radius-lg)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ padding: '16px 18px 12px', display: 'flex', flexDirection: 'column', gap: 3, borderBottom: '1px solid var(--ar-color-border)' }}>
                <h3 style={{ margin: 0, fontSize: 'var(--ar-text-lg)', fontWeight: 'var(--ar-weight-bold)', color: 'var(--ar-color-text)', textWrap: 'balance' }}>
                  {r.destName}
                </h3>
                <p style={{ margin: 0, fontSize: 'var(--ar-text-xs)', color: 'var(--ar-color-text-muted)' }}>
                  {T.fromPrefix}
                  {activeName}
                  {T.doorNote}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 18px 10px' }}>
                {unitRows(travel, r).map((u) => {
                  const href = waHref(
                    phone,
                    routeMessage(travel, r, u, T),
                    `TRV-${routeCode(travel, r)}-${u.key}`
                  );
                  const img = unitImage(u);
                  return (
                    <div
                      key={u.key}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px dashed var(--ar-color-border)' }}
                    >
                      {img && (
                        <Image
                          src={img}
                          alt={u.name}
                          width={58}
                          height={36}
                          loading="lazy"
                          style={{ width: 58, height: 36, objectFit: 'contain', flex: '0 0 58px' }}
                        />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 'var(--ar-text-sm)', fontWeight: 'var(--ar-weight-semibold)', color: 'var(--ar-color-text)' }}>
                          {u.name}
                        </span>
                        <span style={{ fontSize: 'var(--ar-text-xs)', color: 'var(--ar-color-text-muted)' }}>
                          {u.capacity}
                          {T.seatsSuffix}
                        </span>
                      </div>
                      <span style={{ fontSize: 'var(--ar-text-sm)', fontWeight: 'var(--ar-weight-bold)', color: 'var(--ar-color-primary)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {priceLabel(r.prices[u.key])}
                      </span>
                      <a
                        href={withTag(href)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${T.pesan} ${u.name}`}
                        data-cta="travel-list-wa"
                        data-route={routeCode(travel, r)}
                        data-unit={u.key}
                        className="cta-wa-flat"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          minHeight: 34,
                          padding: '0 12px',
                          borderRadius: 999,
                          background: 'var(--ar-color-whatsapp)',
                          color: '#ffffff',
                          fontSize: 'var(--ar-text-xs)',
                          fontWeight: 'var(--ar-weight-semibold)',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          transition: 'background var(--ar-duration-fast) var(--ar-ease)',
                        }}
                      >
                        <WaGlyph size={13} />
                        {T.pesan}
                      </a>
                    </div>
                  );
                })}
                <p style={{ margin: 0, padding: '10px 0 6px', fontSize: 'var(--ar-text-xs)', lineHeight: 1.55, color: 'var(--ar-color-text-muted)', textWrap: 'pretty' }}>
                  {T.cardNote}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
