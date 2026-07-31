'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Chip } from '@/design-system';
import { ArrowGlyph } from '@/components/icons';
import { postHref } from '@/lib/localize';
import type { Locale, Post } from '@/types';

/**
 * Category filter, featured article, and the remaining grid.
 *
 * The first article of the active filter is promoted to the featured card, so
 * the layout has no empty state as long as any post matches.
 */
export function PostFilter({ posts, locale }: { posts: Post[]; locale: Locale }) {
  const en = locale === 'en';
  const all = en ? 'All' : 'Semua';
  const [cat, setCat] = useState(all);

  const categories = [all, ...Array.from(new Set(posts.map((p) => p.category)))];
  const filtered = cat === all ? posts : posts.filter((p) => p.category === cat);
  const [featured, ...rest] = filtered;

  const href = (p: Post) => postHref(p, locale);

  return (
    <section data-screen-label="Daftar Artikel" style={{ borderBottom: '1px solid var(--ar-color-border)' }}>
      <div
        style={{
          maxWidth: 1160,
          margin: '0 auto',
          padding: 'clamp(28px, 4vw, 40px) clamp(20px, 4vw, 32px) clamp(48px, 6vw, 72px)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((c) => (
            <Chip key={c} selected={cat === c} onClick={() => setCat(c)}>
              {c}
            </Chip>
          ))}
        </div>

        {featured && (
          <Link
            className="ar-reveal"
            href={href(featured)}
            style={{
              marginTop: 24,
              display: 'flex',
              flexWrap: 'wrap',
              border: '1px solid var(--ar-color-border)',
              borderRadius: 'var(--ar-radius-xl)',
              overflow: 'hidden',
              textDecoration: 'none',
              background: '#ffffff',
              boxShadow: 'var(--ar-shadow-sm)',
            }}
          >
            <div
              style={{
                flex: '1 1 320px',
                minWidth: 'min(100%, 320px)',
                padding: 'clamp(22px, 3vw, 34px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                justifyContent: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={CATEGORY_PILL}>{featured.category}</span>
                <span style={{ fontSize: 'var(--ar-text-xs)', fontWeight: 'var(--ar-weight-semibold)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ar-gold-600)' }}>
                  {en ? 'Featured' : 'Artikel Pilihan'}
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: 'clamp(22px, 2.8vw, 30px)', lineHeight: 1.2, letterSpacing: '-0.01em', fontWeight: 'var(--ar-weight-bold)', color: 'var(--ar-blue-950)', textWrap: 'balance' }}>
                {featured.title}
              </h2>
              <p style={{ margin: 0, fontSize: 'var(--ar-text-sm)', lineHeight: 1.7, color: 'var(--ar-color-text-secondary)', textWrap: 'pretty' }}>
                {featured.excerpt}
              </p>
              <p style={{ margin: 0, fontSize: 'var(--ar-text-sm)', color: 'var(--ar-color-text-muted)' }}>
                {featured.dateDisplay} · {featured.readMinutes} {en ? 'min read' : 'menit baca'}
              </p>
              <span style={{ fontSize: 'var(--ar-text-sm)', fontWeight: 'var(--ar-weight-semibold)', color: 'var(--ar-blue-600)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {en ? 'Read article' : 'Baca artikel'} <ArrowGlyph size={14} />
              </span>
            </div>
          </Link>
        )}

        {rest.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
              gap: 16,
              marginTop: 20,
            }}
          >
            {rest.map((p) => (
              <Link
                key={p.key}
                className="ar-reveal card-lift"
                href={href(p)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#ffffff',
                  border: '1px solid var(--ar-color-border)',
                  borderRadius: 'var(--ar-radius-xl)',
                  overflow: 'hidden',
                  textDecoration: 'none',
                  boxShadow: 'var(--ar-shadow-sm)',
                }}
              >
                <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                  <span style={{ ...CATEGORY_PILL, alignSelf: 'flex-start' }}>{p.category}</span>
                  <span style={{ fontSize: 'var(--ar-text-lg)', fontWeight: 'var(--ar-weight-bold)', lineHeight: 1.35, color: 'var(--ar-blue-950)', textWrap: 'balance' }}>
                    {p.title}
                  </span>
                  <span style={{ fontSize: 'var(--ar-text-sm)', lineHeight: 1.65, color: 'var(--ar-color-text-secondary)' }}>{p.excerpt}</span>
                  <span style={{ marginTop: 'auto', paddingTop: 6, fontSize: 'var(--ar-text-xs)', color: 'var(--ar-color-text-muted)' }}>
                    {p.dateDisplay} · {p.readMinutes} {en ? 'min read' : 'menit baca'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const CATEGORY_PILL = {
  display: 'inline-flex',
  padding: '3px 10px',
  borderRadius: 999,
  background: 'var(--ar-blue-50)',
  border: '1px solid var(--ar-blue-100)',
  color: 'var(--ar-blue-700)',
  fontSize: 'var(--ar-text-xs)',
  fontWeight: 'var(--ar-weight-semibold)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
} as const;
