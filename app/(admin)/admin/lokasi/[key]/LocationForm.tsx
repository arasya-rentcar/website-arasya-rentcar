'use client';

import { useMemo, useState, useTransition } from 'react';
import { Badge, Button } from '@/design-system';
import { validateLocation, type Issue } from '@/lib/validate';
import { waDigits } from '@/lib/shared';
import type { Location, Site } from '@/types';
import { Field, IssueList, SerpPreview } from '../../_components/fields';
import { discardLocation, publishLocationAction, saveLocation } from './actions';
import { describePublish } from '../../_components/publish';

/**
 * The editable half of a landing page.
 *
 * Scope is deliberate. Structural fields — template, variant, pageType, code —
 * are shown but locked: they choose which of the eight layouts renders, and a
 * wrong value there does not produce bad copy, it produces a page that does not
 * work. They are a developer's decision with a migration behind it, not
 * something to change while editing a paragraph. Lists (destinations, routes,
 * FAQ) land in the next commit; this one covers every scalar.
 */

/** Fields this form owns. Anything outside it is never written to the draft. */
const EDITABLE = [
  'slug',
  'slugEn',
  'name',
  'h1',
  'heroSubtitle',
  'heroStat',
  'metaTitle',
  'metaDescription',
  'serviceLine',
  'trustRouteDesc',
  'destinationsSubtitle',
  'outOfTownExamples',
  'pickupPoints',
  'waPhone',
  'editorial',
] as const;

export function LocationForm({
  initial,
  site,
  otherSlugs,
  otherSlugsEn,
  hasDraft,
  siteUrl,
}: {
  initial: Location;
  site: Site;
  otherSlugs: string[];
  otherSlugsEn: string[];
  hasDraft: boolean;
  siteUrl: string;
}) {
  const [value, setValue] = useState<Location>(initial);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string>(hasDraft ? 'Ada draf tersimpan' : '');
  const [pending, startTransition] = useTransition();

  /**
   * Whether a draft exists, tracked in state rather than read from the prop.
   *
   * The prop is fixed at the server render, so gating Terbitkan on it hid the
   * button for the entire session in which the draft was created: save, then
   * nothing to publish with until a manual reload. Saving something and being
   * unable to publish it is the one sequence this screen has to get right.
   */
  const [draftExists, setDraftExists] = useState(hasDraft);

  const set = <K extends keyof Location>(field: K, v: Location[K]) => {
    setValue((prev) => ({ ...prev, [field]: v }));
    setDirty(true);
  };

  const setEditorial = (field: keyof Location['editorial'], v: unknown) => {
    setValue((prev) => ({ ...prev, editorial: { ...prev.editorial, [field]: v } }));
    setDirty(true);
  };

  // Runs on every keystroke, in the browser, from the same module the build
  // uses. That is the point of `src/lib/validate.ts`: what the owner sees here
  // and what CI enforces cannot disagree.
  const issues: Issue[] = useMemo(
    () => validateLocation(value, { otherSlugs, otherSlugsEn, site }),
    [value, otherSlugs, otherSlugsEn, site]
  );

  const errors = issues.filter((i) => i.level === 'error').length;

  const save = () => {
    const patch: Record<string, unknown> = {};
    for (const field of EDITABLE) patch[field] = value[field as keyof Location];

    startTransition(async () => {
      const res = await saveLocation(value.key, patch);
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
      const res = await discardLocation(value.key);
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
      const res = await publishLocationAction(value.key);
      setStatus(describePublish(res));
      // Reloaded only on success, so a failure leaves the message on screen
      // next to the form that produced it.
      if (res.ok) setTimeout(() => window.location.reload(), 2500);
    });
  };

  const officialOptions = (site.settings.officialPhones ?? []).map((p) => ({
    display: p.display,
    wa: waDigits(p.display),
  }));

  return (
    <div className="cs-editor">
      <div>
        <fieldset className="cs-fieldset">
          <legend>Identitas</legend>
          <Field label="Nama entri" value={value.name} onChange={(v) => set('name', v)} />
          <Field
            label="Slug (Indonesia)"
            value={value.slug}
            onChange={(v) => set('slug', v)}
            hint={`Alamat halaman: ${siteUrl}/${value.slug}`}
          />
          <Field
            label="Slug (Inggris)"
            value={value.slugEn ?? ''}
            onChange={(v) => set('slugEn', v || undefined)}
            hint={
              value.slugEn
                ? `${siteUrl}/en/${value.slugEn}`
                : 'Kosongkan bila halaman ini belum diterjemahkan — tanpa slug, versi /en/ tidak dibuat.'
            }
          />
        </fieldset>

        <fieldset className="cs-fieldset">
          <legend>Tampilan di Google</legend>
          <Field
            label="Meta title"
            value={value.metaTitle}
            onChange={(v) => set('metaTitle', v)}
            limit={60}
            hint="Judul di hasil pencarian."
          />
          <Field
            label="Meta description"
            value={value.metaDescription}
            onChange={(v) => set('metaDescription', v)}
            limit={160}
            multiline
            rows={3}
            hint="Cuplikan di bawah judul. Kosong berarti Google mengarang sendiri."
          />
        </fieldset>

        <fieldset className="cs-fieldset">
          <legend>Hero</legend>
          <Field label="H1" value={value.h1} onChange={(v) => set('h1', v)} hint="Judul utama halaman." />
          <Field
            label="Subjudul"
            value={value.heroSubtitle}
            onChange={(v) => set('heroSubtitle', v)}
            multiline
            rows={2}
          />
          <Field
            label="Statistik hero"
            value={value.heroStat}
            onChange={(v) => set('heroStat', v)}
            hint="Baris pendek di bawah tombol. Hindari angka yang terbaca sebagai batas atas."
          />
        </fieldset>

        <fieldset className="cs-fieldset">
          <legend>Editorial</legend>
          <Field
            label="Eyebrow"
            value={value.editorial?.eyebrow ?? ''}
            onChange={(v) => setEditorial('eyebrow', v)}
          />
          <Field
            label="Judul"
            value={value.editorial?.title ?? ''}
            onChange={(v) => setEditorial('title', v)}
          />
          <Field
            label="Lead"
            value={value.editorial?.lead ?? ''}
            onChange={(v) => setEditorial('lead', v)}
            multiline
            rows={3}
          />
          <Field
            label="Paragraf"
            value={(value.editorial?.paragraphs ?? []).join('\n\n')}
            onChange={(v) =>
              setEditorial(
                'paragraphs',
                v.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
              )
            }
            multiline
            rows={10}
            hint="Pisahkan paragraf dengan satu baris kosong. Copy di sini wajib unik per kota — paragraf yang diduplikat antar kota adalah pemicu filter doorway page."
          />
        </fieldset>

        <fieldset className="cs-fieldset">
          <legend>Layanan & rute</legend>
          <Field label="Baris layanan" value={value.serviceLine} onChange={(v) => set('serviceLine', v)} />
          <Field
            label="Deskripsi rute (kartu kepercayaan)"
            value={value.trustRouteDesc ?? ''}
            onChange={(v) => set('trustRouteDesc', v || undefined)}
            multiline
            rows={2}
            hint="Mengganti deskripsi kartu pertama bila diisi."
          />
          <Field
            label="Subjudul destinasi"
            value={value.destinationsSubtitle}
            onChange={(v) => set('destinationsSubtitle', v)}
          />
          <Field
            label="Contoh tujuan luar kota"
            value={value.outOfTownExamples}
            onChange={(v) => set('outOfTownExamples', v)}
            hint="Disisipkan ke dalam FAQ standar."
          />
          <Field
            label="Titik penjemputan"
            value={value.pickupPoints}
            onChange={(v) => set('pickupPoints', v)}
            hint="Disisipkan ke dalam FAQ standar."
          />
        </fieldset>

        <fieldset className="cs-fieldset">
          <legend>WhatsApp</legend>
          <div>
            <label className="cs-label" htmlFor="wa">
              Nomor tujuan untuk halaman ini
            </label>
            <select
              id="wa"
              className="ar-field__input"
              value={waDigits(value.waPhone) || ''}
              onChange={(e) => set('waPhone', e.target.value || undefined)}
            >
              <option value="">Pakai nomor utama ({site.settings.waPhone})</option>
              {officialOptions.map((o) => (
                <option key={o.wa} value={o.wa}>
                  {o.display}
                </option>
              ))}
            </select>
            <p className="cs-hint">
              Hanya nomor dari daftar Nomor Resmi. Halaman ini memuat peringatan agar pengunjung
              mengabaikan nomor di luar daftar tersebut, jadi tombol yang menghubungi nomor lain
              membuat halaman membantah peringatannya sendiri.
            </p>
          </div>
        </fieldset>

        <fieldset className="cs-fieldset">
          <legend>Struktur — dikunci</legend>
          <p className="cs-hint">
            Menentukan layout mana yang dipakai. Mengubahnya bukan pekerjaan editorial: nilai yang
            salah tidak menghasilkan copy yang jelek, tetapi halaman yang tidak berfungsi.
          </p>
          <div className="cs-row-meta" style={{ marginLeft: 0, flexWrap: 'wrap' }}>
            <Badge tone="neutral">key: {value.key}</Badge>
            <Badge tone="neutral">template: {value.template}</Badge>
            <Badge tone="neutral">variant: {value.variant}</Badge>
            <Badge tone="neutral">tipe: {value.pageType}</Badge>
            <Badge tone="neutral">kode: {value.code}</Badge>
            <Badge tone="neutral">negara: {value.country}</Badge>
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
            // Disabled while there are blocking issues, and the reason is in
            // the panel above rather than in a tooltip — a disabled button with
            // no visible explanation is the most common way validation becomes
            // something to fight rather than read.
            <Button onClick={publish} loading={pending} disabled={errors > 0 || dirty}>
              Terbitkan
            </Button>
          )}
        </span>
      </div>
    </div>
  );
}
