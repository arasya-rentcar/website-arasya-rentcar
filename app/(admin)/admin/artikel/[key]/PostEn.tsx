'use client';

import type { Post, PostTranslation } from '@/types';
import { TranslateField, TranslationProgress } from '../../_components/translate';

/**
 * The English side of an article.
 *
 * `sections` merges by index like the location lists, for the same reason: a
 * translated section that omitted `list` would drop the checklist from the
 * article rather than leave it in Indonesian. So each section is rebuilt at the
 * Indonesian length and carries heading, paragraphs and list together.
 */
export function PostEn({
  value,
  setEn,
}: {
  value: Post;
  setEn: <K extends keyof PostTranslation>(field: K, v: PostTranslation[K]) => void;
}) {
  const en = value.en ?? {};
  const sections = en.sections ?? [];

  const setSection = (index: number, patch: Partial<(typeof sections)[number]>) => {
    const next = (value.sections ?? []).map((_, i) => {
      const row = {
        heading: sections[i]?.heading ?? '',
        paragraphs: sections[i]?.paragraphs ?? [],
        ...(sections[i]?.list ? { list: sections[i]!.list } : {}),
      };
      return i === index ? { ...row, ...patch } : row;
    });
    setEn('sections', next);
  };

  const scalars: [string, string | undefined][] = [
    ['title', en.title],
    ['category', en.category],
    ['metaTitle', en.metaTitle],
    ['metaDescription', en.metaDescription],
    ['excerpt', en.excerpt],
  ];
  const filled = scalars.filter(([, v]) => v?.trim()).length;

  return (
    <div>
      <fieldset className="cs-fieldset">
        <legend>Kemajuan</legend>
        <TranslationProgress filled={filled} total={scalars.length} />
        {!value.slugEn && (
          <p className="cs-alert cs-alert-error" role="alert">
            Slug Inggris masih kosong, jadi artikel ini tidak punya URL Inggris — terjemahan di
            bawah tidak akan terlihat sampai slug itu diisi di tab Indonesia.
          </p>
        )}
      </fieldset>

      <fieldset className="cs-fieldset">
        <legend>Identitas</legend>
        <TranslateField
          label="Judul"
          source={value.title}
          value={en.title ?? ''}
          onChange={(v) => setEn('title', v)}
        />
        <TranslateField
          label="Kategori"
          source={value.category}
          value={en.category ?? ''}
          onChange={(v) => setEn('category', v)}
        />
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
        <TranslateField
          label="Ringkasan"
          source={value.excerpt}
          value={en.excerpt ?? ''}
          onChange={(v) => setEn('excerpt', v)}
          multiline
          rows={3}
        />
      </fieldset>

      <fieldset className="cs-fieldset">
        <legend>Isi artikel</legend>
        {(value.sections ?? []).map((s, i) => (
          <div key={i} className="cs-listed-row">
            <div className="cs-listed-row-head">
              <span className="cs-listed-row-title">
                {i + 1}. {s.heading}
              </span>
            </div>
            <div className="cs-listed-row-body">
              <TranslateField
                label="Judul bagian"
                source={s.heading}
                value={sections[i]?.heading ?? ''}
                onChange={(v) => setSection(i, { heading: v })}
              />
              <TranslateField
                label="Paragraf"
                source={(s.paragraphs ?? []).join('\n\n')}
                value={(sections[i]?.paragraphs ?? []).join('\n\n')}
                onChange={(v) =>
                  setSection(i, {
                    paragraphs: v.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
                  })
                }
                multiline
                rows={10}
              />
              {s.list && (
                <TranslateField
                  label="Daftar poin"
                  source={s.list.join('\n')}
                  value={(sections[i]?.list ?? []).join('\n')}
                  onChange={(v) => {
                    const items = v.split('\n').map((l) => l.trim()).filter(Boolean);
                    setSection(i, { list: items.length ? items : undefined });
                  }}
                  multiline
                  rows={4}
                />
              )}
            </div>
          </div>
        ))}
      </fieldset>
    </div>
  );
}
