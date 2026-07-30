/**
 * Regenerates `public/assets/images/bogor/situ-gede.webp` from its source.
 *
 * PROVENANCE — this asset is NOT owned by Arasya. It is a CC BY-SA 2.0 photo
 * adapted (centre-cropped 4:3 → 16:9, downscaled, re-encoded as WebP) for the
 * destination card. Because the crop is an adaptation, the derived file remains
 * licensed CC BY-SA 2.0 and must keep its on-page credit.
 *
 *   Title   : Langit Biru Situ Gede
 *   Author  : Pebi Yudha Krisnapati
 *   Source  : https://www.flickr.com/photos/77566046@N04/14986182212
 *   Licence : https://creativecommons.org/licenses/by-sa/2.0/
 *   Taken   : 24 December 2013 — "Danau Situ Gede, CIFOR, Bogor"
 *
 * This script exists so the exact adaptation is reproducible and auditable.
 * Replace the asset with an Arasya-owned photograph when one is available, and
 * drop the `imageCredit` field from the registry entry at the same time.
 *
 *   npx tsx scripts/media-situ-gede.mts
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const OUT = 'public/assets/images/bogor/situ-gede.webp';

// 2048px variant first, falling back to the 1024px "_b" size.
const SOURCES = [
  'https://live.staticflickr.com/3865/14986182212_eeecccd67e_k.jpg',
  'https://live.staticflickr.com/3865/14986182212_eeecccd67e_b.jpg',
];

let buf: Buffer | null = null;
let used = '';
for (const url of SOURCES) {
  const r = await fetch(url);
  if (r.ok) {
    buf = Buffer.from(await r.arrayBuffer());
    used = url;
    break;
  }
  console.log(`  (HTTP ${r.status} for ${url})`);
}
if (!buf) throw new Error('could not download the source image');

const meta = await sharp(buf).metadata();
console.log(`source  ${used}`);
console.log(`        ${meta.width}x${meta.height}, ${(buf.length / 1024).toFixed(0)} KB`);

// Destination cards render 16:9; the other Bogor photos sit around 800px wide.
await sharp(buf).resize(800, 450, { fit: 'cover', position: 'centre' }).webp({ quality: 82 }).toFile(OUT);

const out = await sharp(OUT).metadata();
console.log(`\nwrote   ${OUT}`);
console.log(`        ${out.width}x${out.height}, ${(readFileSync(OUT).length / 1024).toFixed(0)} KB`);
