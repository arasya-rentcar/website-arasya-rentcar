'use client';

import { useMemo, useState, useTransition } from 'react';
import { Button } from '@/design-system';
import { validateSite, type Issue } from '@/lib/validate';
import type { FleetUnit, GalleryImage, Site, UnitClass } from '@/types';
import { Field, IssueList } from '../_components/fields';
import { ImageUpload } from '../_components/image-upload';
import { ListEditor } from '../_components/list-editor';
import { describePublish } from '../_components/publish';
import { discardSite } from '../situs/actions';
import { publishFleetAction, saveFleet } from './actions';

/**
 * The fleet, the overseas unit classes, and the gallery.
 *
 * Split from `/admin/situs` because they are edited on different occasions —
 * a price changes far more often than a bank account — and because putting a
 * dozen photo uploads on the same screen as the address fields makes both
 * harder to find. Same row underneath, same draft, merged on save.
 */

const EDITABLE = ['fleet', 'fleetNotes', 'genericUnits', 'gallery'] as const;

/** Empty string clears the price, which renders "Hubungi untuk harga terbaik". */
const priceValue = (n: number | null) => (n === null ? '' : String(n));
const parsePrice = (v: string): number | null => {
  const digits = v.replace(/\D/g, '');
  return digits ? Number(digits) : null;
};

export function FleetForm({ initial, hasDraft }: { initial: Site; hasDraft: boolean }) {
  const [value, setValue] = useState<Site>(initial);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState(hasDraft ? 'Ada draf tersimpan' : '');
  const [draftExists, setDraftExists] = useState(hasDraft);
  const [pending, startTransition] = useTransition();

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
      const res = await saveFleet(patch);
      if (res.error) setStatus(`Gagal: ${res.error}`);
      else {
        setDirty(false);
        setDraftExists(true);
        setStatus(`Tersimpan sebagai draf ${new Date(res.savedAt!).toLocaleTimeString('id-ID')}`);
      }
    });
  };

  const discard = () => {
    if (!confirm('Buang semua editan Situs & Global yang belum diterbitkan, termasuk yang dari layar lain?'))
      return;
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
    // Names the scope, because there is one draft behind two screens and the
    // owner cannot see the other one from here.
    if (
      !confirm(
        'Terbitkan seluruh pengaturan global? Termasuk editan dari layar Situs & Global bila ada.'
      )
    )
      return;
    startTransition(async () => {
      const res = await publishFleetAction();
      setStatus(describePublish(res));
      if (res.ok) setTimeout(() => window.location.reload(), 2500);
    });
  };

  return (
    <div className="cs-editor">
      <div>
        <fieldset className="cs-fieldset">
          <legend>Armada</legend>
          <ListEditor
            label="Unit"
            hint="Urutannya adalah urutan tampil di halaman. Kosongkan harga untuk menampilkan “Hubungi untuk harga terbaik”."
            items={value.fleet ?? []}
            onChange={(next) => set('fleet', next)}
            blank={(): FleetUnit => ({ name: '', dalamKota: null, allin: null, capacity: 6 })}
            rowLabel={(f) => f.name || '(tanpa nama)'}
            renderRow={(f, update) => (
              <>
                <Field label="Nama unit" value={f.name} onChange={(v) => update({ name: v })} />
                <Field
                  label="Kapasitas"
                  value={String(f.capacity)}
                  onChange={(v) => update({ capacity: Number(v.replace(/\D/g, '')) || 0 })}
                  hint="Jumlah penumpang, di luar driver."
                />
                <Field
                  label="Harga Dalam Kota"
                  value={priceValue(f.dalamKota)}
                  onChange={(v) => update({ dalamKota: parsePrice(v) })}
                  hint="Rupiah, angka saja."
                />
                <Field
                  label="Harga All-in"
                  value={priceValue(f.allin)}
                  onChange={(v) => update({ allin: parsePrice(v) })}
                  hint="Rupiah, angka saja."
                />
                <Field
                  label="Badge"
                  value={f.badge ?? ''}
                  onChange={(v) => update({ badge: v || undefined })}
                  hint="Label kecil di kartu, misalnya “Paling dicari”."
                />
                <ImageUpload
                  label="Foto"
                  bucket="fleet"
                  value={f.img ?? ''}
                  onChange={(ref) => update({ img: ref || undefined })}
                />
                <ImageUpload
                  label="Foto berlogo"
                  bucket="fleet-logo"
                  value={f.imgLogo ?? ''}
                  onChange={(ref) => update({ imgLogo: ref || undefined })}
                />
              </>
            )}
          />

          <Field
            label="Catatan tarif Dalam Kota"
            value={value.fleetNotes?.dalamKota ?? ''}
            onChange={(v) => set('fleetNotes', { ...value.fleetNotes, dalamKota: v })}
            multiline
            rows={2}
          />
          <Field
            label="Catatan tarif All-in"
            value={value.fleetNotes?.allin ?? ''}
            onChange={(v) => set('fleetNotes', { ...value.fleetNotes, allin: v })}
            multiline
            rows={2}
          />
        </fieldset>

        <fieldset className="cs-fieldset">
          <legend>Kelas unit — halaman luar negeri</legend>
          <p className="cs-hint">
            Halaman luar negeri tidak menampilkan model mobil atau foto armada Indonesia: mobilnya
            bukan milik Arasya di sana, jadi menyebut model tertentu berarti menjanjikan unit yang
            belum tentu ada. Kelas menjelaskan yang benar-benar perlu diputuskan pelanggan.
          </p>
          <ListEditor
            label="Kelas"
            items={value.genericUnits ?? []}
            onChange={(next) => set('genericUnits', next)}
            blank={(): UnitClass => ({ name: '', seats: '', luggage: '', useCase: '' })}
            rowLabel={(u) => u.name || '(tanpa nama)'}
            renderRow={(u, update) => (
              <>
                <Field
                  label="Nama kelas"
                  value={u.name}
                  onChange={(v) => update({ name: v })}
                  hint="Dipakai juga sebagai pilihan di formulir penawaran, jadi buat singkat."
                />
                <Field
                  label="Kapasitas"
                  value={u.seats}
                  onChange={(v) => update({ seats: v })}
                  hint="Contoh: 6 penumpang + driver — ditulis begini karena kapasitas kendaraan menghitung driver."
                />
                <Field label="Bagasi" value={u.luggage} onChange={(v) => update({ luggage: v })} />
                <Field label="Cocok untuk" value={u.useCase} onChange={(v) => update({ useCase: v })} />
              </>
            )}
          />
        </fieldset>

        <fieldset className="cs-fieldset">
          <legend>Galeri</legend>
          <ListEditor
            label="Foto"
            hint="Bagian galeri disembunyikan seluruhnya bila daftar ini kosong."
            items={value.gallery ?? []}
            onChange={(next) => set('gallery', next)}
            blank={(): GalleryImage => ({ src: '', alt: '' })}
            rowLabel={(g) => g.alt || g.src || '(kosong)'}
            renderRow={(g, update) => (
              <>
                <ImageUpload
                  label="Berkas"
                  bucket="gallery"
                  value={g.src}
                  onChange={(ref) => update({ src: ref })}
                />
                <Field
                  label="Teks alternatif"
                  value={g.alt}
                  onChange={(v) => update({ alt: v })}
                  hint="Jelaskan isi fotonya untuk yang tidak bisa melihatnya. Bukan tempat kata kunci."
                />
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
          Layar ini dan Situs &amp; Global menyunting baris yang sama, jadi menyimpan di salah satu
          tidak menghapus editan di yang lain — tetapi menerbitkan akan menerbitkan keduanya.
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
