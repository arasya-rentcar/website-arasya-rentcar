'use client';

import { Button } from '@/design-system';

/**
 * Add / remove / reorder for any list of records.
 *
 * The handoff asks for this on eight different collections — destinations,
 * routes, FAQ, fleet, services, testimonials, trust cards, bank accounts — and
 * they differ only in the fields inside a row. So the rows are a render prop
 * and everything structural lives here once.
 *
 * Reorder is ↑/↓ buttons, not drag and drop. Dragging needs a pointer, a steady
 * hand and a mouse; these lists are edited on whatever device is nearby, and
 * every drag implementation has to grow a keyboard fallback that ends up being
 * ↑/↓ anyway. Two buttons are the fallback, so they are the whole feature.
 */
export function ListEditor<T>({
  label,
  hint,
  items,
  onChange,
  blank,
  renderRow,
  rowLabel,
  addLabel = 'Tambah',
  max,
}: {
  label: string;
  hint?: string;
  items: T[];
  onChange: (next: T[]) => void;
  /** A fresh, empty record. Called on add. */
  blank: () => T;
  renderRow: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  /** Heading for one row, e.g. the destination name. Falls back to the index. */
  rowLabel?: (item: T, index: number) => string;
  addLabel?: string;
  max?: number;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    onChange(next);
  };

  const update = (index: number, patch: Partial<T>) => {
    onChange(items.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const remove = (index: number) => {
    // Confirmed because there is no undo, and a row can hold a paragraph of
    // copy that took real effort. The name is in the prompt so the confirmation
    // is about *this* row rather than a generic "are you sure".
    const name = rowLabel?.(items[index], index) || `baris ${index + 1}`;
    if (!confirm(`Hapus ${name}?`)) return;
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="cs-listed">
      <div className="cs-listed-head">
        <span className="cs-label" style={{ marginBottom: 0 }}>
          {label} <span className="cs-listed-count">({items.length})</span>
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onChange([...items, blank()])}
          disabled={max !== undefined && items.length >= max}
        >
          {addLabel}
        </Button>
      </div>
      {hint && <p className="cs-hint">{hint}</p>}

      {items.length === 0 ? (
        <p className="cs-hint cs-listed-empty">Belum ada isi.</p>
      ) : (
        <ol className="cs-listed-rows">
          {items.map((item, i) => (
            <li key={i} className="cs-listed-row">
              <div className="cs-listed-row-head">
                <span className="cs-listed-row-title">
                  {i + 1}. {rowLabel?.(item, i) || '—'}
                </span>
                <span className="cs-listed-row-tools">
                  {/* Labelled for screen readers: three identical glyph buttons
                      per row, times ten rows, is unusable without them. */}
                  <button
                    type="button"
                    className="cs-icon-btn"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    aria-label={`Naikkan ${rowLabel?.(item, i) || `baris ${i + 1}`}`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="cs-icon-btn"
                    onClick={() => move(i, i + 1)}
                    disabled={i === items.length - 1}
                    aria-label={`Turunkan ${rowLabel?.(item, i) || `baris ${i + 1}`}`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="cs-icon-btn cs-icon-btn-danger"
                    onClick={() => remove(i)}
                    aria-label={`Hapus ${rowLabel?.(item, i) || `baris ${i + 1}`}`}
                  >
                    ✕
                  </button>
                </span>
              </div>
              <div className="cs-listed-row-body">{renderRow(item, (patch) => update(i, patch), i)}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
