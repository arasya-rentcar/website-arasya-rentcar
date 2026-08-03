'use client';

import { useRef, useState } from 'react';
import { Button } from '@/design-system';
import { createBrowserSupabase } from '@/lib/supabase/client';

/**
 * Uploads a photo to Supabase Storage and returns its object path.
 *
 * Resized and converted in the browser before it leaves, for a reason that is
 * about the published site rather than about convenience: a phone photo is
 * 3–6 MB of JPEG, and the fleet grid shows a card roughly 400px wide. Storing
 * the original would put megabytes behind a thumbnail on a page whose whole
 * purpose is to load fast on a phone on mobile data. 800px WebP at q0.85 is
 * indistinguishable at that size and lands around 40–80 KB.
 *
 * The upload goes straight from the browser to Storage rather than through a
 * server action. That is what the `media admin write` policy was written for —
 * it re-evaluates `is_admin()` against the caller's own JWT — so this path
 * proves the policy works instead of bypassing it with a service key.
 *
 * What is stored in the database is the object path (`fleet/avanza-1234.webp`),
 * never a blob or a data URL. `shared.ts` turns anything containing a slash
 * into a public Storage URL; bare filenames stay repo assets under /public.
 */

const MAX_EDGE = 800;
const QUALITY = 0.85;

/** Filesystem-safe, collision-free, and still recognisable in the bucket. */
function objectName(original: string): string {
  const base = original
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${base || 'foto'}-${Date.now()}.webp`;
}

async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser ini tidak mendukung konversi gambar.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', QUALITY)
  );
  if (!blob) throw new Error('Gagal mengubah gambar ke WebP.');
  return blob;
}

export function ImageUpload({
  label,
  bucket,
  value,
  onChange,
  hint,
}: {
  label: string;
  bucket: 'fleet' | 'fleet-logo' | 'gallery';
  /** Current reference: a bare filename, a /public path, or a Storage path. */
  value: string;
  onChange: (ref: string) => void;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const upload = async (file: File) => {
    setBusy(true);
    setError('');
    setNote('');
    try {
      const blob = await toWebp(file);
      const name = objectName(file.name);

      const supabase = createBrowserSupabase();
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(name, blob, { contentType: 'image/webp', upsert: false });

      if (upErr) {
        // The most likely cause by far is the session not reaching Storage, and
        // "new row violates row-level security policy" does not say that to
        // anyone who has not read the migration.
        setError(
          /row-level security|not authorized|jwt/i.test(upErr.message)
            ? 'Unggahan ditolak — sesi tidak diterima Storage. Coba keluar lalu masuk lagi.'
            : upErr.message
        );
        return;
      }

      onChange(`${bucket}/${name}`);
      setNote(`${Math.round(blob.size / 1024)} KB setelah dikecilkan`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengunggah.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="cs-upload">
      <span className="cs-label">{label}</span>

      <div className="cs-upload-row">
        {/* Deliberately still a text field. Existing entries point at repo
            assets by bare filename, and an upload-only control would make those
            uneditable and invite re-uploading photos that are already there. */}
        <input
          className="ar-field__input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="mis. avanza atau fleet/avanza-123.webp"
        />
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="cs-sr"
          id={`up-${bucket}-${label}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button
          size="sm"
          variant="outline"
          loading={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? 'Mengunggah…' : 'Unggah'}
        </Button>
      </div>

      {error ? (
        <p className="cs-hint" role="alert" style={{ color: '#991b1b' }}>
          {error}
        </p>
      ) : (
        <p className="cs-hint">
          {note || hint || 'Dikecilkan ke 800px dan diubah ke WebP sebelum diunggah.'}
        </p>
      )}
    </div>
  );
}
