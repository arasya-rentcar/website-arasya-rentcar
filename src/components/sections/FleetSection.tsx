'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Chip, SectionHeading } from '@/design-system';
import { useWaHref } from '@/lib/campaign';
import { CONTAINER } from './styles';

export interface FleetCardData {
  name: string;
  slug: string;
  capacity: number;
  /** Transparent cutout — rendered `contain` with padding. */
  image?: string;
  /** Photo with the brand plate — rendered `cover`. */
  imageLogo?: string;
  dalamKota: number | null;
  allin: number | null;
  priceDalamKota: string | null;
  priceAllin: string | null;
  waHrefDalamKota: string;
  waHrefAllin: string;
}

interface FleetSectionProps {
  cars: FleetCardData[];
  cityName: string;
  cityCode: string;
  noteDalamKota: string;
  noteAllin: string;
  useLogoImages?: boolean;
  labels: {
    eyebrow: string;
    title: string;
    subtitle: string;
    tierDalamKota: string;
    tierAllin: string;
    capacitySuffix: string;
    order: string;
    contactPrice: string;
    perDay: string;
    per12h: string;
    specialRate: string;
  };
}

/**
 * Armada & Tarif — the image card grid with the Dalam Kota / All-in toggle.
 *
 * Note this is NOT the design system's `FleetTable`, which the handoff README
 * names: every city and region prototype renders this card grid instead, and
 * the prototypes are the stated pixel reference.
 *
 * Client component because the tier toggle rewrites every price and every
 * per-card WhatsApp message. Both tiers' hrefs are computed server-side and
 * passed in, so no message building happens in the browser.
 */
export function FleetSection({
  cars,
  cityName,
  cityCode,
  noteDalamKota,
  noteAllin,
  useLogoImages = true,
  labels,
}: FleetSectionProps) {
  const [allin, setAllin] = useState(false);
  const withTag = useWaHref();

  return (
    <section id="armada" data-screen-label="Armada & Tarif" style={{ order: 50, background: 'var(--ar-color-bg)' }}>
      <div style={CONTAINER}>
        <div
          className="ar-reveal"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ maxWidth: 560 }}>
            <SectionHeading eyebrow={labels.eyebrow} title={labels.title} subtitle={labels.subtitle} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Chip selected={!allin} onClick={() => setAllin(false)}>
              {labels.tierDalamKota}
            </Chip>
            <Chip selected={allin} onClick={() => setAllin(true)}>
              {labels.tierAllin}
            </Chip>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))',
            gap: 16,
            marginTop: 24,
          }}
        >
          {cars.map((car) => {
            const price = allin ? car.priceAllin : car.priceDalamKota;
            const hasPrice = (allin ? car.allin : car.dalamKota) != null;
            const src = useLogoImages ? car.imageLogo : car.image;
            return (
              <div
                key={car.slug}
                className="ar-reveal card-lift-bordered"
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--ar-color-border)',
                  borderRadius: 'var(--ar-radius-lg)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {src && (
                  <Image
                    src={src}
                    alt={`Sewa ${car.name} dengan supir di ${cityName}`}
                    width={400}
                    height={267}
                    loading="lazy"
                    style={{
                      width: '100%',
                      // `height: auto` is load-bearing. next/image emits a
                      // height attribute, which counts as a definite height and
                      // makes the browser ignore aspect-ratio entirely — the
                      // box collapses to the attribute's pixel height and
                      // object-fit crops against the wrong ratio.
                      height: 'auto',
                      aspectRatio: '3 / 2',
                      // Photos with the brand plate fill the box; transparent
                      // cutouts are inset so they don't crop.
                      objectFit: useLogoImages ? 'cover' : 'contain',
                      padding: useLogoImages ? 0 : 14,
                      boxSizing: 'border-box',
                      display: 'block',
                      background: '#ffffff',
                    }}
                  />
                )}
                <div
                  style={{
                    padding: 'var(--ar-space-4)',
                    borderTop: '1px solid var(--ar-gray-100)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    flex: 1,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 'var(--ar-text-md)',
                        fontWeight: 'var(--ar-weight-semibold)',
                        color: 'var(--ar-color-text)',
                      }}
                    >
                      {car.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: 'var(--ar-text-xs)', color: 'var(--ar-color-text-muted)' }}>
                      {labels.capacitySuffix.replace('{n}', String(car.capacity))}
                    </p>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      marginTop: 'auto',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span
                        style={{
                          fontSize: 'var(--ar-text-md)',
                          fontWeight: 'var(--ar-weight-bold)',
                          color: 'var(--ar-color-text)',
                        }}
                      >
                        {hasPrice ? price : labels.contactPrice}
                      </span>
                      <span style={{ fontSize: 'var(--ar-text-xs)', color: 'var(--ar-color-text-muted)' }}>
                        {hasPrice ? (allin ? labels.perDay : labels.per12h) : labels.specialRate}
                      </span>
                    </div>
                    <a
                      href={withTag(allin ? car.waHrefAllin : car.waHrefDalamKota)}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-cta="fleet-pesan"
                      data-city={cityCode}
                      data-unit={car.slug}
                      className="site-cta"
                      style={{
                        flex: '0 0 auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 38,
                        padding: '0 16px',
                        borderRadius: 'var(--ar-radius-md)',
                        background: 'var(--city-cta)',
                        color: '#ffffff',
                        fontSize: 'var(--ar-text-sm)',
                        fontWeight: 'var(--ar-weight-semibold)',
                        textDecoration: 'none',
                        transition: 'background var(--ar-duration-fast) var(--ar-ease)',
                      }}
                    >
                      {labels.order}
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p
          className="ar-reveal"
          style={{
            margin: '16px 0 0',
            fontSize: 'var(--ar-text-sm)',
            color: 'var(--ar-color-text-muted)',
            textWrap: 'pretty',
            maxWidth: 760,
          }}
        >
          {allin ? noteAllin : noteDalamKota}
        </p>
      </div>
    </section>
  );
}
