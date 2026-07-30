'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Chip, SectionHeading } from '@/design-system';
import { WaGlyph } from '@/components/icons';
import { useWaHref } from '@/lib/campaign';
import { CONTAINER } from '@/components/sections/styles';
import type { Locale } from '@/types';

export interface HubCard {
  key: string;
  name: string;
  code: string;
  href: string;
  serviceLine: string;
  typeLabel: string;
  /** ISO-3166 alpha-2 — drives the Indonesia / Luar Negeri split. */
  country: string;
  /** "Mulai Rp 500.000 · 12 jam termasuk driver", empty for quote-based cities. */
  priceLine: string;
}

type Region = 'semua' | 'indonesia' | 'luar-negeri';

/**
 * The city directory with its Indonesia / Luar Negeri filter.
 *
 * Filtering hides cards with CSS-free conditional rendering rather than routing,
 * so every entry is still in the initial HTML under a heading — the crawl path
 * must not depend on client state.
 */
export function HubDirectory({
  cards,
  locale,
  waNewCity,
}: {
  cards: HubCard[];
  locale: Locale;
  waNewCity: string;
}) {
  const [region, setRegion] = useState<Region>('semua');
  const withTag = useWaHref();
  const en = locale === 'en';

  const groups = [
    { key: 'indonesia' as const, label: 'Indonesia', items: cards.filter((c) => c.country === 'ID') },
    { key: 'luar-negeri' as const, label: en ? 'International' : 'Luar Negeri', items: cards.filter((c) => c.country !== 'ID') },
  ]
    .filter((g) => g.items.length)
    .filter((g) => region === 'semua' || g.key === region);

  return (
    <section id="kota" data-screen-label="Direktori Kota" style={{ background: 'var(--ar-color-bg)' }}>
      <div style={CONTAINER}>
        <div
          className="ar-reveal"
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}
        >
          <div style={{ maxWidth: 560 }}>
            <SectionHeading
              eyebrow={en ? 'Service Cities' : 'Kota Layanan'}
              title={en ? 'Choose your departure city' : 'Pilih kota keberangkatan Anda'}
              subtitle={
                en
                  ? 'Each page carries that city’s own rates, fleet, destinations, and routes.'
                  : 'Setiap halaman memuat tarif, armada, destinasi, dan rute khas kota tersebut.'
              }
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Chip selected={region === 'semua'} onClick={() => setRegion('semua')}>
              {en ? 'All' : 'Semua'}
            </Chip>
            <Chip selected={region === 'indonesia'} onClick={() => setRegion('indonesia')}>
              Indonesia
            </Chip>
            <Chip selected={region === 'luar-negeri'} onClick={() => setRegion('luar-negeri')}>
              {en ? 'International' : 'Luar Negeri'}
            </Chip>
          </div>
        </div>

        {groups.map((g) => (
          <div key={g.key} style={{ marginTop: 32 }}>
            <div className="ar-reveal" style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 'var(--ar-text-lg)', fontWeight: 'var(--ar-weight-bold)', color: 'var(--ar-color-text)' }}>
                {g.label}
              </h2>
              <span style={{ fontSize: 'var(--ar-text-xs)', fontWeight: 'var(--ar-weight-semibold)', letterSpacing: '0.06em', color: 'var(--ar-color-text-muted)' }}>
                {g.items.length} {en ? 'pages' : 'halaman'}
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                gap: 16,
                marginTop: 16,
              }}
            >
              {g.items.map((ct) => (
                <Link
                  key={ct.key}
                  className="ar-reveal card-lift-bordered"
                  href={ct.href}
                  data-cta="hub-card"
                  data-city={ct.code}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    background: '#ffffff',
                    border: '1px solid var(--ar-color-border)',
                    borderRadius: 'var(--ar-radius-lg)',
                    padding: 'var(--ar-space-5)',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: 'var(--ar-blue-50)',
                        border: '1px solid var(--ar-blue-100)',
                        fontSize: 'var(--ar-text-xs)',
                        fontWeight: 'var(--ar-weight-semibold)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--ar-blue-700)',
                      }}
                    >
                      {ct.typeLabel}
                    </span>
                    <span style={{ fontSize: 'var(--ar-text-xs)', fontWeight: 'var(--ar-weight-semibold)', letterSpacing: '0.1em', color: 'var(--ar-color-text-muted)' }}>
                      {ct.code}
                    </span>
                  </div>
                  <h3 style={{ margin: '4px 0 0', fontSize: 'var(--ar-text-lg)', fontWeight: 'var(--ar-weight-semibold)', color: 'var(--ar-color-text)' }}>
                    {en ? 'Car Rental ' : 'Sewa Mobil '}
                    {ct.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: 'var(--ar-text-sm)', lineHeight: 1.6, color: 'var(--ar-color-text-secondary)', textWrap: 'pretty' }}>
                    {en ? 'Serving ' : 'Melayani '}
                    {ct.serviceLine}.
                  </p>
                  {/* Overseas cities are quote-based, so no starting price. */}
                  {ct.priceLine && (
                    <span style={{ fontSize: 'var(--ar-text-sm)', fontWeight: 'var(--ar-weight-bold)', color: 'var(--ar-color-text)' }}>
                      {ct.priceLine}
                    </span>
                  )}
                  <span style={{ marginTop: 'auto', paddingTop: 6, fontSize: 'var(--ar-text-sm)', fontWeight: 'var(--ar-weight-semibold)', color: 'var(--ar-color-primary)' }}>
                    {en ? 'See rates & fleet →' : 'Lihat tarif & armada →'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div
          className="ar-reveal"
          style={{
            marginTop: 32,
            background: '#ffffff',
            border: '2px dashed var(--ar-color-border)',
            borderRadius: 'var(--ar-radius-xl)',
            padding: 'clamp(24px, 4vw, 40px)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 18,
          }}
        >
          <div style={{ flex: '1 1 320px', minWidth: 'min(100%, 320px)' }}>
            <h3 style={{ margin: 0, fontSize: 'clamp(18px, 2.2vw, 24px)', fontWeight: 'var(--ar-weight-bold)', color: 'var(--ar-color-text)', textWrap: 'balance' }}>
              {en ? 'City not listed yet?' : 'Kota Anda belum terdaftar?'}
            </h3>
            <p style={{ margin: '8px 0 0', fontSize: 'var(--ar-text-sm)', lineHeight: 1.65, color: 'var(--ar-color-text-secondary)', textWrap: 'pretty' }}>
              {en
                ? 'We can still help — tell us your city and travel plan and our admins will prepare a written quote.'
                : 'Kami tetap dapat melayani — sampaikan kota dan rencana perjalanan Anda, admin kami menyiapkan penawaran tertulis.'}
            </p>
          </div>
          <a
            href={withTag(waNewCity)}
            target="_blank"
            rel="noopener noreferrer"
            data-cta="hub-kota-baru"
            className="cta-wa-flat"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              minHeight: 48,
              padding: '0 24px',
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
            {en ? 'Ask About Another City' : 'Tanya Kota Lain'}
          </a>
        </div>
      </div>
    </section>
  );
}
