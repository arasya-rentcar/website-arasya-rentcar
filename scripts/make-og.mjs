/**
 * Generates the site-wide Open Graph card.
 *
 *   node scripts/make-og.mjs
 *
 * The output is committed, so this runs on demand rather than during the build —
 * nothing in CI depends on sharp or on the fonts installed here.
 *
 * Why a generated JPEG rather than pointing og:image at a hero photo:
 *
 *   - Format. Every image in /public is WebP, and WebP support across link-
 *     preview crawlers is inconsistent. WhatsApp is where this business actually
 *     shares links, so a format that is universally decodable matters more than
 *     the last few KB. JPEG is the safe floor.
 *   - Size. The hero is 750x500. OG wants 1200x630 at roughly 1.91:1, so the
 *     photo is cropped and upscaled ~1.6x. That would look soft on its own, but
 *     it sits under a heavy gradient and the text is vector, so what the eye
 *     reads is crisp.
 *   - Coverage. Only Bogor has a hero image at all; the other five cities have
 *     none. One card that works everywhere beats one page with a preview and
 *     eleven without.
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const W = 1200;
const H = 630;

const photo = await sharp(resolve(root, 'public/assets/images/bogor/hero-bogor.webp'))
  .resize(W, H, { fit: 'cover', position: 'centre' })
  .toBuffer();

// The landing hero's own gradient, deepened: a social card is read at thumbnail
// size against an unknown background, so it needs more contrast than a hero that
// fills the viewport.
const overlay = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.55" y2="1">
      <stop offset="0%" stop-color="#021021" stop-opacity="0.90"/>
      <stop offset="55%" stop-color="#06213f" stop-opacity="0.74"/>
      <stop offset="100%" stop-color="#042b54" stop-opacity="0.58"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <text x="90" y="300" font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="72" font-weight="700" fill="#ffffff" letter-spacing="1">
    ARASYA RENT CAR
  </text>
  <text x="90" y="366" font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="34" font-weight="400" fill="#cfe2fb">
    Sewa Mobil Premium dengan Supir
  </text>
  <rect x="90" y="410" width="96" height="4" rx="2" fill="#d4af37"/>
  <text x="90" y="480" font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="26" font-weight="600" fill="#93c5f6">
    Bogor · Yogyakarta · Bali · Thailand · Malaysia · Singapura
  </text>
  <text x="90" y="524" font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="23" font-weight="400" fill="#7ea9d6">
    PT. Ayomi Raya
  </text>
</svg>`);

const out = resolve(root, 'public/assets/brand/og-default.jpg');
await sharp(photo)
  .composite([{ input: overlay, top: 0, left: 0 }])
  // Chroma subsampling off: the gold rule and the light-blue type on navy are
  // exactly where 4:2:0 smears colour edges.
  .jpeg({ quality: 86, chromaSubsampling: '4:4:4', mozjpeg: true })
  .toFile(out);

const { size } = await sharp(out).metadata().then(async (m) => ({ ...m, size: (await import('node:fs')).statSync(out).size }));
console.log(`wrote ${out} — ${W}x${H}, ${(size / 1024).toFixed(0)} KB`);
