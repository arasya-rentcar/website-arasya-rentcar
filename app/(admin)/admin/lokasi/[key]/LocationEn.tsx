'use client';

import type { Location, LocationTranslation } from '@/types';
import { TranslateField, TranslationProgress } from '../../_components/translate';

/**
 * The English side of a landing page.
 *
 * Every list here is rebuilt to the same length as the Indonesian one and
 * carries prose only. That is not a simplification — it is the contract
 * `MERGE_BY_INDEX` in `localize.ts` depends on. Writing whole objects would
 * blank `image` and `imageCredit` on the destinations, and a destination whose
 * licence attribution has been replaced with `undefined` is a licence breach
 * that renders perfectly.
 */

/**
 * The shape a translated row may carry — prose only.
 *
 * Named types rather than inference, because inferring from the patch narrows
 * `T` to whichever single field is being edited and the rebuild then drops the
 * other two. Writing them down also documents the contract: anything absent
 * here is a field the English overlay must never contain.
 */
type TransDestination = { area: string; name: string; description: string };
type TransRoute = { to: string; duration: string; note: string };
type TransFaq = { question: string; answer: string };

export function LocationEn({
  value,
  setEn,
}: {
  value: Location;
  setEn: <K extends keyof LocationTranslation>(field: K, v: LocationTranslation[K]) => void;
}) {
  const en = value.en ?? {};

  /**
   * Rebuilds a translated list at the Indonesian list's length.
   *
   * Keyed by position, so adding a destination in Indonesian shifts every
   * translation after it — which is why the Indonesian source is shown on each
   * row rather than assumed. Nothing here reads the Indonesian element beyond
   * displaying it, so no untranslatable field can leak into the overlay.
   */
  const setList = <T extends object>(
    field: 'destinations' | 'routes' | 'faqExtra' | 'trust' | 'cityDirectory',
    index: number,
    patch: Partial<T>,
    shape: (row: T | undefined) => T
  ) => {
    const source = (value[field] ?? []) as unknown as T[];
    const existing = (en[field] ?? []) as unknown as T[];
    const next = source.map((_, i) => {
      const row = shape(existing[i]);
      return i === index ? { ...row, ...patch } : row;
    });
    setEn(field, next as never);
  };

  const destinations = en.destinations ?? [];
  const routes = en.routes ?? [];
  const faqExtra = en.faqExtra ?? [];

  /* Progress counts only the scalar fields — enough to tell "started" from
     "finished" without pretending a half-translated list is a single unit. */
  const scalars: [string, string | undefined][] = [
    ['h1', en.h1],
    ['heroSubtitle', en.heroSubtitle],
    ['heroStat', en.heroStat],
    ['metaTitle', en.metaTitle],
    ['metaDescription', en.metaDescription],
    ['serviceLine', en.serviceLine],
    ['destinationsSubtitle', en.destinationsSubtitle],
    ['outOfTownExamples', en.outOfTownExamples],
    ['pickupPoints', en.pickupPoints],
  ];
  const filled = scalars.filter(([, v]) => v?.trim()).length;

  return (
    <div>
      <fieldset className="cs-fieldset">
        <legend>Kemajuan</legend>
        <TranslationProgress filled={filled} total={scalars.length} />
        {!value.slugEn && (
          <p className="cs-alert cs-alert-error" role="alert">
            Slug Inggris masih kosong, jadi halaman /en/ untuk kota ini belum dibuat sama sekali —
            terjemahan di bawah tidak akan terlihat siapa pun sampai slug itu diisi di tab
            Indonesia.
          </p>
        )}
      </fieldset>

      <fieldset className="cs-fieldset">
        <legend>Tampilan di Google</legend>
        <TranslateField
          label="Meta title"
          source={value.metaTitle}
          value={en.metaTitle ?? ''}
          onChange={(v) => setEn('metaTitle', v)}
          limit={60}
        />
        <TranslateField
          label="Meta description"
          source={value.metaDescription}
          value={en.metaDescription ?? ''}
          onChange={(v) => setEn('metaDescription', v)}
          limit={160}
          multiline
          rows={3}
        />
      </fieldset>

      <fieldset className="cs-fieldset">
        <legend>Hero</legend>
        <TranslateField label="H1" source={value.h1} value={en.h1 ?? ''} onChange={(v) => setEn('h1', v)} />
        <TranslateField
          label="Subjudul"
          source={value.heroSubtitle}
          value={en.heroSubtitle ?? ''}
          onChange={(v) => setEn('heroSubtitle', v)}
          multiline
          rows={2}
        />
        <TranslateField
          label="Statistik hero"
          source={value.heroStat}
          value={en.heroStat ?? ''}
          onChange={(v) => setEn('heroStat', v)}
        />
      </fieldset>

      <fieldset className="cs-fieldset">
        <legend>Editorial</legend>
        <TranslateField
          label="Judul"
          source={value.editorial?.title ?? ''}
          value={en.editorial?.title ?? ''}
          onChange={(v) =>
            setEn('editorial', {
              eyebrow: en.editorial?.eyebrow ?? '',
              title: v,
              lead: en.editorial?.lead ?? '',
              paragraphs: en.editorial?.paragraphs ?? [],
            })
          }
        />
        <TranslateField
          label="Lead"
          source={value.editorial?.lead ?? ''}
          value={en.editorial?.lead ?? ''}
          onChange={(v) =>
            setEn('editorial', {
              eyebrow: en.editorial?.eyebrow ?? '',
              title: en.editorial?.title ?? '',
              lead: v,
              paragraphs: en.editorial?.paragraphs ?? [],
            })
          }
          multiline
          rows={3}
        />
        <TranslateField
          label="Paragraf"
          source={(value.editorial?.paragraphs ?? []).join('\n\n')}
          value={(en.editorial?.paragraphs ?? []).join('\n\n')}
          onChange={(v) =>
            setEn('editorial', {
              eyebrow: en.editorial?.eyebrow ?? '',
              title: en.editorial?.title ?? '',
              lead: en.editorial?.lead ?? '',
              paragraphs: v.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
            })
          }
          multiline
          rows={12}
        />
      </fieldset>

      <fieldset className="cs-fieldset">
        <legend>Layanan &amp; rute</legend>
        <TranslateField
          label="Baris layanan"
          source={value.serviceLine}
          value={en.serviceLine ?? ''}
          onChange={(v) => setEn('serviceLine', v)}
        />
        <TranslateField
          label="Deskripsi rute (kartu kepercayaan)"
          source={value.trustRouteDesc ?? ''}
          value={en.trustRouteDesc ?? ''}
          onChange={(v) => setEn('trustRouteDesc', v)}
          multiline
          rows={2}
        />
        <TranslateField
          label="Subjudul destinasi"
          source={value.destinationsSubtitle}
          value={en.destinationsSubtitle ?? ''}
          onChange={(v) => setEn('destinationsSubtitle', v)}
        />
        <TranslateField
          label="Contoh tujuan luar kota"
          source={value.outOfTownExamples}
          value={en.outOfTownExamples ?? ''}
          onChange={(v) => setEn('outOfTownExamples', v)}
        />
        <TranslateField
          label="Titik penjemputan"
          source={value.pickupPoints}
          value={en.pickupPoints ?? ''}
          onChange={(v) => setEn('pickupPoints', v)}
        />
      </fieldset>

      <fieldset className="cs-fieldset">
        <legend>Destinasi</legend>
        <p className="cs-hint">
          Hanya teksnya. Foto dan kredit lisensinya melekat pada versi Indonesia dan tidak
          disentuh dari sini.
        </p>
        {(value.destinations ?? []).map((d, i) => (
          <div key={i} className="cs-listed-row">
            <div className="cs-listed-row-head">
              <span className="cs-listed-row-title">
                {i + 1}. {d.name}
              </span>
            </div>
            <div className="cs-listed-row-body">
              <TranslateField
                label="Nama"
                source={d.name}
                value={destinations[i]?.name ?? ''}
                onChange={(v) =>
                  setList<TransDestination>('destinations', i, { name: v }, (row) => ({
                    area: row?.area ?? '',
                    name: row?.name ?? '',
                    description: row?.description ?? '',
                  }))
                }
              />
              <TranslateField
                label="Area"
                source={d.area}
                value={destinations[i]?.area ?? ''}
                onChange={(v) =>
                  setList<TransDestination>('destinations', i, { area: v }, (row) => ({
                    area: row?.area ?? '',
                    name: row?.name ?? '',
                    description: row?.description ?? '',
                  }))
                }
              />
              <TranslateField
                label="Deskripsi"
                source={d.description}
                value={destinations[i]?.description ?? ''}
                onChange={(v) =>
                  setList<TransDestination>('destinations', i, { description: v }, (row) => ({
                    area: row?.area ?? '',
                    name: row?.name ?? '',
                    description: row?.description ?? '',
                  }))
                }
                multiline
                rows={3}
              />
            </div>
          </div>
        ))}
      </fieldset>

      <fieldset className="cs-fieldset">
        <legend>Rute</legend>
        {(value.routes ?? []).map((r, i) => (
          <div key={i} className="cs-listed-row">
            <div className="cs-listed-row-head">
              <span className="cs-listed-row-title">
                {i + 1}. {r.to}
              </span>
            </div>
            <div className="cs-listed-row-body">
              <TranslateField
                label="Tujuan"
                source={r.to}
                value={routes[i]?.to ?? ''}
                onChange={(v) =>
                  setList<TransRoute>('routes', i, { to: v }, (row) => ({
                    to: row?.to ?? '',
                    duration: row?.duration ?? '',
                    note: row?.note ?? '',
                  }))
                }
              />
              <TranslateField
                label="Durasi"
                source={r.duration}
                value={routes[i]?.duration ?? ''}
                onChange={(v) =>
                  setList<TransRoute>('routes', i, { duration: v }, (row) => ({
                    to: row?.to ?? '',
                    duration: row?.duration ?? '',
                    note: row?.note ?? '',
                  }))
                }
              />
              <TranslateField
                label="Catatan"
                source={r.note}
                value={routes[i]?.note ?? ''}
                onChange={(v) =>
                  setList<TransRoute>('routes', i, { note: v }, (row) => ({
                    to: row?.to ?? '',
                    duration: row?.duration ?? '',
                    note: row?.note ?? '',
                  }))
                }
                multiline
                rows={2}
              />
            </div>
          </div>
        ))}
      </fieldset>

      {(value.faqExtra ?? []).length > 0 && (
        <fieldset className="cs-fieldset">
          <legend>FAQ tambahan</legend>
          {(value.faqExtra ?? []).map((f, i) => (
            <div key={i} className="cs-listed-row">
              <div className="cs-listed-row-head">
                <span className="cs-listed-row-title">{i + 1}</span>
              </div>
              <div className="cs-listed-row-body">
                <TranslateField
                  label="Pertanyaan"
                  source={f.question}
                  value={faqExtra[i]?.question ?? ''}
                  onChange={(v) =>
                    setList<TransFaq>('faqExtra', i, { question: v }, (row) => ({
                      question: row?.question ?? '',
                      answer: row?.answer ?? '',
                    }))
                  }
                />
                <TranslateField
                  label="Jawaban"
                  source={f.answer}
                  value={faqExtra[i]?.answer ?? ''}
                  onChange={(v) =>
                    setList<TransFaq>('faqExtra', i, { answer: v }, (row) => ({
                      question: row?.question ?? '',
                      answer: row?.answer ?? '',
                    }))
                  }
                  multiline
                  rows={3}
                />
              </div>
            </div>
          ))}
        </fieldset>
      )}
    </div>
  );
}
