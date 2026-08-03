'use client';

import { useId } from 'react';

/**
 * The English tab.
 *
 * Two rules shape everything here.
 *
 * The Indonesian text is always on screen next to the field being filled. The
 * owner is translating, not composing — asking them to hold the source in their
 * head while typing is how a paragraph quietly ends up saying something the
 * Indonesian version does not.
 *
 * And the tab writes *only* prose. The English overlay is merged element-wise
 * into the Indonesian record (`MERGE_BY_INDEX` in `localize.ts`), so a
 * destination's English entry carries its name and description and nothing
 * else. If it carried the whole object it would overwrite `image` and
 * `imageCredit` with blanks — dropping a licensed photo's attribution, which is
 * a licence breach rather than a display bug — and translate `cityDirectory.slug`,
 * which is an address and would 404.
 */

export function LangTabs({
  lang,
  onChange,
  translated,
}: {
  lang: 'id' | 'en';
  onChange: (l: 'id' | 'en') => void;
  /** Whether any English content exists yet, for the tab's own label. */
  translated: boolean;
}) {
  return (
    <div className="cs-tabs" role="tablist" aria-label="Bahasa">
      <button
        type="button"
        role="tab"
        aria-selected={lang === 'id'}
        className="cs-tab"
        onClick={() => onChange('id')}
      >
        Indonesia
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={lang === 'en'}
        className="cs-tab"
        onClick={() => onChange('en')}
      >
        English {translated ? '' : '· belum ada'}
      </button>
    </div>
  );
}

/**
 * One translatable field, with its Indonesian source shown above it.
 *
 * An empty English value is not an error and never becomes one: translation is
 * partial by design, and `localize.ts` falls back to the Indonesian field. What
 * it does mean is that the page will show that one line in Indonesian, so the
 * placeholder says exactly that rather than nagging.
 */
export function TranslateField({
  label,
  source,
  value,
  onChange,
  multiline,
  rows,
  limit,
}: {
  label: string;
  /** The Indonesian text this translates. */
  source: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
  limit?: number;
}) {
  const id = useId();
  const over = limit !== undefined && value.length > limit;

  return (
    <div className="cs-translate">
      <label className="cs-label" htmlFor={id}>
        {label}
      </label>

      {source ? (
        <p className="cs-source" lang="id">
          {source}
        </p>
      ) : (
        <p className="cs-source cs-source-empty">Versi Indonesia kosong.</p>
      )}

      {multiline ? (
        <textarea
          id={id}
          className="cs-textarea"
          lang="en"
          value={value}
          rows={rows}
          placeholder="Belum diterjemahkan — halaman akan memakai teks Indonesia di atas."
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          className="ar-field__input"
          lang="en"
          value={value}
          placeholder="Belum diterjemahkan"
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {limit !== undefined && (
        <div className="cs-count" data-over={over || undefined}>
          <span className="cs-hint" />
          <span>
            {value.length}/{limit}
          </span>
        </div>
      )}
    </div>
  );
}

/** Progress across a set of translatable fields. */
export function TranslationProgress({ filled, total }: { filled: number; total: number }) {
  const pct = total ? Math.round((filled / total) * 100) : 0;
  return (
    <p className="cs-hint">
      {filled} dari {total} field terisi ({pct}%).{' '}
      {filled === 0
        ? 'Halaman /en/ tidak dibuat sampai slug Inggrisnya diisi.'
        : 'Field yang kosong akan tampil dalam bahasa Indonesia.'}
    </p>
  );
}
