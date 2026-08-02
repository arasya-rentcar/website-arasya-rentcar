'use client';

import { useMemo, useState, useTransition } from 'react';
import { Badge, Button } from '@/design-system';
import { validatePost, type Issue } from '@/lib/validate';
import type { Location, Post } from '@/types';
import { Field, IssueList, SerpPreview } from '../../_components/fields';
import { discardPost, publishPostAction, savePost } from './actions';
import { describePublish } from '../../_components/publish';

/**
 * The editable half of a blog article.
 *
 * `sections` — the article body — lands with the other list editors in the next
 * commit. This covers identity, SEO and the two relations the handoff's
 * editorial rules are built on: exactly one city page, exactly two related
 * articles. Those relations are what make the blog support the landing pages
 * structurally rather than just sit next to them, so they are edited as
 * pickers, never as free text where a typo becomes a dead link.
 */

const EDITABLE = [
  'slug',
  'slugEn',
  'title',
  'category',
  'excerpt',
  'metaTitle',
  'metaDescription',
  'author',
  'readMinutes',
  'cityKey',
  'cityName',
  'citySlug',
  'related',
] as const;

export function PostForm({
  initial,
  locations,
  posts,
  otherSlugs,
  otherSlugsEn,
  hasDraft,
  siteUrl,
}: {
  initial: Post;
  locations: Location[];
  posts: Post[];
  otherSlugs: string[];
  otherSlugsEn: string[];
  hasDraft: boolean;
  siteUrl: string;
}) {
  const [value, setValue] = useState<Post>(initial);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState(hasDraft ? 'Ada draf tersimpan' : '');
  const [pending, startTransition] = useTransition();

  /** Stateful, not the prop — see the note in LocationForm. */
  const [draftExists, setDraftExists] = useState(hasDraft);

  const set = <K extends keyof Post>(field: K, v: Post[K]) => {
    setValue((prev) => ({ ...prev, [field]: v }));
    setDirty(true);
  };

  /**
   * Changing the city updates the denormalised name and slug alongside the key.
   * Those three are stored together because the article card renders the name
   * without a join; letting them drift would show one city and link to another.
   */
  const setCity = (key: string) => {
    const loc = locations.find((l) => l.key === key);
    setValue((prev) => ({
      ...prev,
      cityKey: key,
      cityName: loc?.name ?? '',
      citySlug: loc?.slug ?? '',
    }));
    setDirty(true);
  };

  const toggleRelated = (key: string) => {
    setValue((prev) => {
      const has = prev.related.includes(key);
      return { ...prev, related: has ? prev.related.filter((k) => k !== key) : [...prev.related, key] };
    });
    setDirty(true);
  };

  const issues: Issue[] = useMemo(
    () =>
      validatePost(value, {
        otherSlugs,
        otherSlugsEn,
        locationKeys: locations.map((l) => l.key),
      }),
    [value, otherSlugs, otherSlugsEn, locations]
  );

  const errors = issues.filter((i) => i.level === 'error').length;

  const save = () => {
    const patch: Record<string, unknown> = {};
    for (const field of EDITABLE) patch[field] = value[field as keyof Post];

    startTransition(async () => {
      const res = await savePost(value.key, patch);
      if (res.error) setStatus(`Gagal: ${res.error}`);
      else {
        setDirty(false);
        setDraftExists(true);
        setStatus(`Tersimpan sebagai draf ${new Date(res.savedAt!).toLocaleTimeString('id-ID')}`);
      }
    });
  };

  const discard = () => {
    if (!confirm('Buang semua editan yang belum diterbitkan dan kembali ke versi yang tayang?')) return;
    startTransition(async () => {
      const res = await discardPost(value.key);
      if (res.error) setStatus(`Gagal: ${res.error}`);
      else window.location.reload();
    });
  };

  const publish = () => {
    if (dirty) {
      setStatus('Simpan dulu sebelum menerbitkan.');
      return;
    }
    if (!confirm('Terbitkan perubahan ini ke situs yang dilihat pengunjung?')) return;
    startTransition(async () => {
      const res = await publishPostAction(value.key);
      setStatus(describePublish(res));
      if (res.ok) setTimeout(() => window.location.reload(), 2500);
    });
  };

  return (
    <div className="cs-editor">
      <div>
        <fieldset className="cs-fieldset">
          <legend>Identitas</legend>
          <Field label="Judul" value={value.title} onChange={(v) => set('title', v)} />
          <Field
            label="Slug (Indonesia)"
            value={value.slug}
            onChange={(v) => set('slug', v)}
            hint={`Harus diawali "blog/". Alamat: ${siteUrl}/${value.slug}`}
          />
          <Field
            label="Slug (Inggris)"
            value={value.slugEn ?? ''}
            onChange={(v) => set('slugEn', v || undefined)}
            hint={
              value.slugEn
                ? `${siteUrl}/en/${value.slugEn}`
                : 'Kosongkan bila artikel ini belum diterjemahkan.'
            }
          />
          <Field label="Kategori" value={value.category} onChange={(v) => set('category', v)} />
          <Field label="Penulis" value={value.author} onChange={(v) => set('author', v)} />
          <Field
            label="Lama baca (menit)"
            value={String(value.readMinutes)}
            onChange={(v) => set('readMinutes', Number(v.replace(/\D/g, '')) || 0)}
          />
        </fieldset>

        <fieldset className="cs-fieldset">
          <legend>Tampilan di Google</legend>
          <Field
            label="Meta title"
            value={value.metaTitle}
            onChange={(v) => set('metaTitle', v)}
            limit={60}
          />
          <Field
            label="Meta description"
            value={value.metaDescription}
            onChange={(v) => set('metaDescription', v)}
            limit={160}
            multiline
            rows={3}
          />
          <Field
            label="Ringkasan (kartu artikel)"
            value={value.excerpt}
            onChange={(v) => set('excerpt', v)}
            multiline
            rows={3}
            hint="Muncul di daftar blog, bukan di hasil pencarian."
          />
        </fieldset>

        <fieldset className="cs-fieldset">
          <legend>Tautan internal</legend>
          <div>
            <label className="cs-label" htmlFor="city">
              Halaman kota
            </label>
            <select
              id="city"
              className="ar-field__input"
              value={value.cityKey}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">— belum dipilih —</option>
              {locations.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.name} (/{l.slug})
                </option>
              ))}
            </select>
            <p className="cs-hint">
              Aturan redaksi: setiap artikel menaut ke tepat satu halaman kota. Ini yang membuat blog
              menopang halaman pendaratan, bukan berdiri sendiri.
            </p>
          </div>

          <div>
            <span className="cs-label">Artikel terkait (pilih 2)</span>
            <ul className="cs-issues">
              {posts
                .filter((p) => p.key !== value.key)
                .map((p) => (
                  <li key={p.key}>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.875rem' }}>
                      <input
                        type="checkbox"
                        checked={value.related.includes(p.key)}
                        onChange={() => toggleRelated(p.key)}
                      />
                      <span>{p.title}</span>
                    </label>
                  </li>
                ))}
            </ul>
            <p className="cs-hint">Dipilih sekarang: {value.related.length}</p>
          </div>
        </fieldset>

        <fieldset className="cs-fieldset">
          <legend>Struktur — dikunci</legend>
          <p className="cs-hint">
            Isi artikel (bagian, paragraf, daftar) menyusul di editor daftar.
          </p>
          <div className="cs-row-meta" style={{ marginLeft: 0, flexWrap: 'wrap' }}>
            <Badge tone="neutral">key: {value.key}</Badge>
            <Badge tone="neutral">{value.sections?.length ?? 0} bagian</Badge>
            <Badge tone="neutral">terbit: {value.datePublished || '—'}</Badge>
          </div>
        </fieldset>
      </div>

      <aside className="cs-aside">
        <div>
          <h2 className="cs-h2">Pratinjau hasil Google</h2>
          <SerpPreview
            url={`${siteUrl}/${value.slug}`}
            title={value.metaTitle}
            description={value.metaDescription}
          />
        </div>
        <div>
          <h2 className="cs-h2">
            Pemeriksaan {errors > 0 && <span style={{ color: '#991b1b' }}>· {errors} wajib</span>}
          </h2>
          <IssueList issues={issues} />
        </div>
      </aside>

      <div className="cs-bar">
        <span className="cs-bar-status" role="status">
          {dirty ? 'Ada perubahan belum disimpan' : status}
        </span>
        <span className="cs-bar-end">
          {draftExists && (
            <Button variant="ghost" onClick={discard} disabled={pending}>
              Buang draf
            </Button>
          )}
          <Button variant="outline" onClick={save} loading={pending} disabled={!dirty && !pending}>
            Simpan draf
          </Button>
          {draftExists && (
            <Button onClick={publish} loading={pending} disabled={errors > 0 || dirty}>
              Terbitkan
            </Button>
          )}
        </span>
      </div>
    </div>
  );
}
