'use client';

import { useMemo, useState, useTransition } from 'react';
import { Button } from '@/design-system';
import { validateTravel, type Issue } from '@/lib/validate';
import type { Travel, TravelOrigin, TravelRoute, TravelUnit } from '@/types';
import { Field, IssueList } from '../_components/fields';
import { ImageUpload } from '../_components/image-upload';
import { ListEditor } from '../_components/list-editor';
import { describePublish } from '../_components/publish';
import { discardTravel, publishTravelAction, saveTravel } from './actions';

/**
 * The charter tariff registry.
 *
 * Shaped unlike every other editor here, because the data is: a route holds one
 * price per unit, so each route row grows a column for every unit that exists.
 * That is why units are edited above routes on the same screen — adding a unit
 * changes the shape of every route below it, and doing that across two pages
 * would mean saving one and then discovering the other.
 *
 * An empty price cell is not zero. It means the unit does not serve that route,
 * and the tariff checker filters the unit out entirely — `prices[key] != null`
 * is the actual test in `travel.ts`. So clearing a cell deletes the key rather
 * than writing 0, which would advertise a free trip.
 */

const EDITABLE = ['units', 'origins', 'routes'] as const;

export function TravelForm({ initial, hasDraft }: { initial: Travel; hasDraft: boolean }) {
  const [value, setValue] = useState<Travel>(initial);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState(hasDraft ? 'Ada draf tersimpan' : '');
  const [draftExists, setDraftExists] = useState(hasDraft);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Travel>(field: K, v: Travel[K]) => {
    setValue((prev) => ({ ...prev, [field]: v }));
    setDirty(true);
  };

  const issues: Issue[] = useMemo(() => validateTravel(value), [value]);
  const errors = issues.filter((i) => i.level === 'error').length;

  const setPrice = (routeIndex: number, unitKey: string, raw: string) => {
    setValue((prev) => {
      const routes = prev.routes.map((r, i) => {
        if (i !== routeIndex) return r;
        const prices = { ...r.prices };
        const digits = raw.replace(/\D/g, '');
        if (!digits) delete prices[unitKey];
        else prices[unitKey] = Number(digits);
        return { ...r, prices };
      });
      return { ...prev, routes };
    });
    setDirty(true);
  };

  const save = () => {
    const patch: Record<string, unknown> = {};
    for (const field of EDITABLE) patch[field] = value[field as keyof Travel];
    startTransition(async () => {
      const res = await saveTravel(patch);
      if (res.error) setStatus(`Gagal: ${res.error}`);
      else {
        setDirty(false);
        setDraftExists(true);
        setStatus(`Tersimpan sebagai draf ${new Date(res.savedAt!).toLocaleTimeString('id-ID')}`);
      }
    });
  };

  const discard = () => {
    if (!confirm('Buang semua editan tarif yang belum diterbitkan?')) return;
    startTransition(async () => {
      const res = await discardTravel();
      if (res.error) setStatus(`Gagal: ${res.error}`);
      else window.location.reload();
    });
  };

  const publish = () => {
    if (dirty) {
      setStatus('Simpan dulu sebelum menerbitkan.');
      return;
    }
    if (!confirm('Terbitkan tarif ini ke halaman /travel?')) return;
    startTransition(async () => {
      const res = await publishTravelAction();
      setStatus(describePublish(res));
      if (res.ok) setTimeout(() => window.location.reload(), 2500);
    });
  };

  return (
    <div className="cs-editor">
      <div>
        <fieldset className="cs-fieldset">
          <legend>Unit</legend>
          <ListEditor
            label="Kelas kendaraan"
            hint="Kuncinya dipakai sebagai penghubung ke harga di setiap rute. Mengubah kunci tidak memindahkan harganya — harga lama jadi yatim dan unitnya hilang dari pengecek tarif."
            items={value.units ?? []}
            onChange={(next) => set('units', next)}
            blank={(): TravelUnit => ({ key: '', name: '', capacity: 6 })}
            rowLabel={(u) => u.name || u.key || '(tanpa nama)'}
            renderRow={(u, update) => (
              <>
                <Field label="Nama" value={u.name} onChange={(v) => update({ name: v })} />
                <Field
                  label="Kunci"
                  value={u.key}
                  onChange={(v) => update({ key: v.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                  hint="Huruf kecil tanpa spasi. Jangan diubah setelah harga diisi."
                />
                <Field
                  label="Kapasitas"
                  value={String(u.capacity)}
                  onChange={(v) => update({ capacity: Number(v.replace(/\D/g, '')) || 0 })}
                />
                <ImageUpload
                  label="Foto"
                  bucket="fleet-logo"
                  value={u.img ?? ''}
                  onChange={(ref) => update({ img: ref || undefined })}
                />
              </>
            )}
          />
        </fieldset>

        <fieldset className="cs-fieldset">
          <legend>Kota asal</legend>
          <ListEditor
            label="Asal"
            items={value.origins ?? []}
            onChange={(next) => set('origins', next)}
            blank={(): TravelOrigin => ({ key: '', code: '', name: '' })}
            rowLabel={(o) => o.name || o.key || '(tanpa nama)'}
            renderRow={(o, update) => (
              <>
                <Field label="Nama" value={o.name} onChange={(v) => update({ name: v })} />
                <Field
                  label="Kunci"
                  value={o.key}
                  onChange={(v) => update({ key: v.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                  hint="Dipakai rute untuk menunjuk asal ini."
                />
                <Field
                  label="Kode"
                  value={o.code}
                  onChange={(v) => update({ code: v.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                  hint="Muncul pada kode referensi setiap pesan WhatsApp dari asal ini, misalnya TRV-BGR-avanza. Tanpa ini, lead-nya tidak bisa ditelusuri."
                />
              </>
            )}
          />
        </fieldset>

        <fieldset className="cs-fieldset">
          <legend>Rute &amp; tarif</legend>
          <ListEditor
            label="Rute"
            hint="Kosongkan harga bila unit tersebut tidak melayani rute ini — unitnya akan disembunyikan untuk rute itu, bukan ditampilkan seharga Rp 0."
            items={value.routes ?? []}
            onChange={(next) => set('routes', next)}
            blank={(): TravelRoute => ({
              origin: value.origins?.[0]?.key ?? '',
              dest: '',
              destName: '',
              prices: {},
            })}
            rowLabel={(r) => {
              const from = value.origins?.find((o) => o.key === r.origin)?.name ?? r.origin;
              return `${from || '?'} → ${r.destName || r.dest || '?'}`;
            }}
            renderRow={(r, update, index) => (
              <>
                <div>
                  <span className="cs-label">Asal</span>
                  <select
                    className="ar-field__input"
                    value={r.origin}
                    onChange={(e) => update({ origin: e.target.value })}
                  >
                    <option value="">— pilih —</option>
                    {(value.origins ?? []).map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Field label="Nama tujuan" value={r.destName} onChange={(v) => update({ destName: v })} />
                <Field
                  label="Kunci tujuan"
                  value={r.dest}
                  onChange={(v) => update({ dest: v.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                  hint="Singkatan pendek, misalnya cgk. Ikut membentuk kode referensi."
                />

                <div className="cs-prices">
                  <span className="cs-label">Tarif per unit</span>
                  {(value.units ?? []).map((u) => (
                    <Field
                      key={u.key}
                      label={u.name || u.key}
                      value={r.prices?.[u.key] == null ? '' : String(r.prices[u.key])}
                      onChange={(v) => setPrice(index, u.key, v)}
                      hint={r.prices?.[u.key] == null ? 'Tidak melayani rute ini' : 'Rupiah'}
                    />
                  ))}
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
          {value.units?.length ?? 0} unit · {value.origins?.length ?? 0} asal ·{' '}
          {value.routes?.length ?? 0} rute
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
