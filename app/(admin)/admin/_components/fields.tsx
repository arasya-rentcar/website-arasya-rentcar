'use client';

import { useId } from 'react';
import { META_DESC_TARGET, META_TITLE_TARGET, type Issue } from '@/lib/validate';

/**
 * Form primitives for Content Studio.
 *
 * Underscore-prefixed folder, so Next never routes it.
 */

/* ------------------------------------------------------------------- text */

export function Field({
  label,
  value,
  onChange,
  hint,
  limit,
  multiline,
  rows,
  readOnly,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  /** Shows a counter against this target. Never blocks typing — see below. */
  limit?: number;
  multiline?: boolean;
  rows?: number;
  readOnly?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const over = limit !== undefined && value.length > limit;

  return (
    <div>
      <label className="cs-label" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          className="cs-textarea"
          value={value}
          rows={rows}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          className="ar-field__input"
          value={value}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {(hint || limit !== undefined) && (
        <div className="cs-count" data-over={over || undefined}>
          <span className="cs-hint">{hint}</span>
          {limit !== undefined && (
            // No `maxLength`. Google truncates by pixel width, so the target is
            // advisory — a hard cap would stop the owner mid-word and make a
            // guideline feel like a defect. The counter turns amber instead.
            <span>
              {value.length}/{limit}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ SERP preview */

/**
 * What this entry looks like in Google.
 *
 * Truncated at the target length with an ellipsis, because seeing the sentence
 * cut is the only thing that makes a character counter mean anything. A number
 * going from 58 to 63 says nothing about which words are lost.
 */
export function SerpPreview({
  url,
  title,
  description,
}: {
  url: string;
  title: string;
  description: string;
}) {
  const cut = (text: string, limit: number) =>
    text.length <= limit ? (
      <>{text}</>
    ) : (
      <>
        {text.slice(0, limit)}
        <span className="cs-serp-cut">…</span>
      </>
    );

  return (
    <div className="cs-serp">
      <p className="cs-serp-url">{url}</p>
      <p className="cs-serp-title">{title ? cut(title, META_TITLE_TARGET) : 'Judul belum diisi'}</p>
      <p className="cs-serp-desc">
        {description ? cut(description, META_DESC_TARGET) : 'Deskripsi belum diisi.'}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- issues */

/**
 * Validation output.
 *
 * Errors and warnings are visually distinct and labelled, never colour alone.
 * The list is `aria-live` so an issue appearing while the owner types is
 * announced rather than silently added below the fold.
 */
export function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length) {
    return (
      <p className="cs-issue" data-level="ok" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
        Tidak ada masalah. Siap diterbitkan.
      </p>
    );
  }

  return (
    <ul className="cs-issues" aria-live="polite">
      {issues.map((issue, i) => (
        <li key={`${issue.field}-${i}`} className="cs-issue" data-level={issue.level}>
          <span className="cs-issue-field">
            {issue.level === 'error' ? 'Wajib' : 'Saran'} · {issue.field}
          </span>
          <br />
          {issue.message}
        </li>
      ))}
    </ul>
  );
}
