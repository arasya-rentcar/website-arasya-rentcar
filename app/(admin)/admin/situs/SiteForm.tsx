'use client';

import { useMemo, useState, useTransition } from 'react';
import { Button } from '@/design-system';
import { PLACEHOLDER_REVIEWERS, validateSite, type Issue } from '@/lib/validate';
import { waDigits } from '@/lib/shared';
import type { BankAccount, OfficialPhone, Service, Site, Testimonial, TrustCard } from '@/types';
import { Field, IssueList } from '../_components/fields';
import { ListEditor } from '../_components/list-editor';
import { describePublish } from '../_components/publish';
import { discardSite, publishSiteAction, saveSite } from './actions';

/**
 * Everything shared by all 31 pages.
 *
 * Until now these were reachable only through SQL — which meant the bank
 * account the payment FAQ quotes, the numbers the anti-fraud panel lists, and
 * the three placeholder reviews the handoff shipped were all things the owner
 * could read on their own site and not change.
 */

const EDITABLE = ['settings', 'services', 'testimonials', 'trustDefaults'] as const;

/** Matches the icon union in `types.ts`; a value outside it renders nothing. */
const SERVICE_ICONS = ['car', 'plane', 'route', 'heart', 'building', 'pin'] as const;
const TRUST_PRESETS = ['shield', 'car', 'users', 'phone', 'check', 'star'] as const;

export function SiteForm({ initial, hasDraft }: { initial: Site; hasDraft: boolean }) {
  const [value, setValue] = useState<Site>(initial);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState(hasDraft ? 'Ada draf tersimpan' : '');
  const [draftExists, setDraftExists] = useState(hasDraft);
  const [pending, startTransition] = useTransition();

  const setSettings = <K extends keyof Site['settings']>(field: K, v: Site['settings'][K]) => {
    setValue((prev) => ({ ...prev, settings: { ...prev.settings, [field]: v } }));
    setDirty(true);
  };

  const set = <K extends keyof Site>(field: K, v: Site[K]) => {
    setValue((prev) => ({ ...prev, [field]: v }));
    setDirty(true);
  };

  const issues: Issue[] = useMemo(() => validateSite(value), [value]);
  const errors = issues.filter((i) => i.level === 'error').length;

  const save = () => {
    const patch: Record<string, unknown> = {};
    for (const field of EDITABLE) patch[field] = value[field as keyof Site];
    startTransition(async () => {
      const res = await saveSite(patch);
      if (res.error) setStatus(`Gagal: ${res.error}`);
      else {
        setDirty(false);
        setDraftExists(true);
        setStatus(`Tersimpan sebagai draf ${new Date(res.savedAt!).toLocaleTimeString('id-ID')}`);
      }
    });
  };

  const discard = () => {
    if (!confirm('Buang semua editan yang belum diterbitkan?')) return;
    startTransition(async () => {
      const res = await discardSite();
      if (res.error) setStatus(`Gagal: ${res.error}`);
      else window.location.reload();
    });
  };

  const publish = () => {
    if (dirty) {
      setStatus('Simpan dulu sebelum menerbitkan.');
      return;
    }
    if (!confirm('Terbitkan perubahan ini? Pengaturan global tampil di semua halaman.')) return;
    startTransition(async () => {
      const res = await publishSiteAction();
      setStatus(describePublish(res));
      if (res.ok) setTimeout(() => window.location.reload(), 2500);
    });
  };

  const s = value.settings;
  const officialWa = (s.officialPhones ?? []).map((p) => waDigits(p.display));

  return (
    <div className="cs-editor">
      <div>
        <fieldset className="cs-fieldset">
          <legend>WhatsApp & nomor resmi</legend>

          <ListEditor
            label="Nomor resmi"
            hint="Ditampilkan di panel anti-penipuan setiap halaman, yang menyuruh pengunjung mengabaikan nomor di luar daftar ini. Setiap tombol WhatsApp di situs wajib memakai salah satu nomor di sini."
            items={s.officialPhones ?? []}
            onChange={(next) => setSettings('officialPhones', next)}
            blank={(): OfficialPhone => ({ display: '' })}
            rowLabel={(p) => p.display || '(kosong)'}
            renderRow={(p, update) => (
              <Field
                label="Nomor"
                value={p.display}
                onChange={(v) => update({ display: v })}
                hint="Tulis seperti dibaca orang: 0821-2402-4281"
              />
            )}
          />

          <div>
            <label className="cs-label" htmlFor="wa-main">
              Nomor WhatsApp utama
            </label>
            <select
              id="wa-main"
              className="ar-field__input"
              value={waDigits(s.waPhone)}
              onChange={(e) => setSettings('waPhone', e.target.value)}
            >
              {officialWa.length === 0 && <option value="">— isi Nomor Resmi dulu —</option>}
              {(s.officialPhones ?? []).map((p) => (
                <option key={p.display} value={waDigits(p.display)}>
                  {p.display}
                </option>
              ))}
            </select>
            <p className="cs-hint">
              Dipakai halaman yang tidak punya nomor sendiri. Wajib salah satu dari daftar di atas.
            </p>
          </div>
        </fieldset>

        <fieldset className="cs-fieldset">
          <legend>Rekening bank</legend>
          <ListEditor
            label="Rekening"
            hint="Baris pertama adalah rekening utama — itu yang dikutip FAQ pembayaran. Urutkan dengan ↑ ↓ untuk menggantinya."
            items={s.bankAccounts ?? []}
            onChange={(next) => setSettings('bankAccounts', next)}
            blank={(): BankAccount => ({ bank: '', number: '', owner: '' })}
            rowLabel={(b, i) => `${b.bank || '(bank)'} ${i === 0 ? '· utama' : ''}`.trim()}
            renderRow={(b, update) => (
              <>
                <Field label="Bank" value={b.bank} onChange={(v) => update({ bank: v })} />
                <Field label="Nomor rekening" value={b.number} onChange={(v) => update({ number: v })} />
                <Field label="Atas nama" value={b.owner} onChange={(v) => update({ owner: v })} />
              </>
            )}
          />
        </fieldset>

        <fieldset className="cs-fieldset">
          <legend>Alamat & kontak</legend>
          <Field label="Alamat ringkas" value={s.addressLine} onChange={(v) => setSettings('addressLine', v)} />
          <Field
            label="Jalan"
            value={s.addressStreet}
            onChange={(v) => setSettings('addressStreet', v)}
            hint="Masuk ke JSON-LD sebagai streetAddress — dipakai Google untuk profil bisnis."
          />
          <Field label="Kota / kabupaten" value={s.addressLocality} onChange={(v) => setSettings('addressLocality', v)} />
          <Field label="Kode pos" value={s.postalCode} onChange={(v) => setSettings('postalCode', v)} />
          <Field label="Instagram" value={s.instagram} onChange={(v) => setSettings('instagram', v)} />
          <Field
            label="Alamat situs"
            value={s.siteUrl}
            onChange={(v) => setSettings('siteUrl', v)}
            hint="Dasar canonical dan sitemap. Diabaikan bila NEXT_PUBLIC_SITE_URL diset di hosting."
          />
          <Field
            label="Embed peta"
            value={s.mapsEmbed}
            onChange={(v) => setSettings('mapsEmbed', v)}
            multiline
            rows={3}
            hint="URL embed Google Maps."
          />
        </fieldset>

        <fieldset className="cs-fieldset">
          <legend>Layanan</legend>
          <ListEditor
            label="Kartu layanan"
            items={value.services ?? []}
            onChange={(next) => set('services', next)}
            blank={(): Service => ({ slug: '', icon: 'car', title: '', description: '' })}
            rowLabel={(x) => x.title || '(tanpa judul)'}
            renderRow={(x, update) => (
              <>
                <Field label="Judul" value={x.title} onChange={(v) => update({ title: v })} />
                <Field
                  label="Deskripsi"
                  value={x.description}
                  onChange={(v) => update({ description: v })}
                  multiline
                  rows={2}
                />
                <Field
                  label="Slug"
                  value={x.slug}
                  onChange={(v) => update({ slug: v })}
                  hint="Kunci terjemahan Inggris. Mengubahnya memutus terjemahan yang sudah ada."
                />
                <div>
                  <span className="cs-label">Ikon</span>
                  <select
                    className="ar-field__input"
                    value={x.icon}
                    onChange={(e) => update({ icon: e.target.value as Service['icon'] })}
                  >
                    {SERVICE_ICONS.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          />
        </fieldset>

        <fieldset className="cs-fieldset">
          <legend>Testimoni</legend>
          {(value.testimonials ?? []).some((t) => PLACEHOLDER_REVIEWERS.includes(t.name)) && (
            <p className="cs-alert cs-alert-error" role="alert">
              Masih ada testimoni contoh bawaan handoff. Ganti dengan ulasan Google asli sebelum
              situs diindeks — ulasan karangan melanggar kebijakan Google dan bisa menjatuhkan
              profil bisnisnya.
            </p>
          )}
          <ListEditor
            label="Ulasan"
            hint="Kutip apa adanya. Bahasa ulasan asli memang tidak formal, dan merapikannya membuatnya jadi ulasan karangan."
            items={value.testimonials ?? []}
            onChange={(next) => set('testimonials', next)}
            blank={(): Testimonial => ({ quote: '', name: '', context: '' })}
            rowLabel={(x) => x.name || '(tanpa nama)'}
            renderRow={(x, update) => (
              <>
                <Field label="Kutipan" value={x.quote} onChange={(v) => update({ quote: v })} multiline rows={3} />
                <Field label="Nama" value={x.name} onChange={(v) => update({ name: v })} />
                <Field
                  label="Konteks"
                  value={x.context}
                  onChange={(v) => update({ context: v })}
                  hint="Contoh: Rombongan keluarga, Bogor–Bandung"
                />
                <Field
                  label="Tautan ulasan Google"
                  value={x.link ?? ''}
                  onChange={(v) => update({ link: v || undefined })}
                  hint="Opsional. Bila diisi, kartunya menampilkan tautan ke ulasan aslinya."
                />
              </>
            )}
          />
        </fieldset>

        <fieldset className="cs-fieldset">
          <legend>Kartu kepercayaan</legend>
          <ListEditor
            label="Kartu"
            hint="Dipakai semua halaman yang tidak menetapkan kartunya sendiri."
            items={value.trustDefaults ?? []}
            onChange={(next) => set('trustDefaults', next)}
            blank={(): TrustCard => ({ preset: 'shield', title: '', description: '' })}
            rowLabel={(x) => x.title || '(tanpa judul)'}
            renderRow={(x, update) => (
              <>
                <Field label="Judul" value={x.title} onChange={(v) => update({ title: v })} />
                <Field
                  label="Deskripsi"
                  value={x.description}
                  onChange={(v) => update({ description: v })}
                  multiline
                  rows={2}
                />
                <div>
                  <span className="cs-label">Ikon</span>
                  <select
                    className="ar-field__input"
                    value={x.preset}
                    onChange={(e) => update({ preset: e.target.value as TrustCard['preset'] })}
                  >
                    {TRUST_PRESETS.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          />
        </fieldset>
      </div>

      <aside className="cs-aside">
        <div>
          <h2 className="cs-h2">
            Pemeriksaan {errors > 0 && <span style={{ color: '#991b1b' }}>· {errors} wajib</span>}
          </h2>
          <IssueList issues={issues} />
        </div>
        <p className="cs-hint">
          Pengaturan di sini tampil di seluruh {31} halaman, jadi menerbitkannya memperbarui
          semuanya sekaligus.
        </p>
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
