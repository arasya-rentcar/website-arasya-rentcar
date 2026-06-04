# Alur penyuntingan konten

Konten Arasya Rentcar terbagi menjadi dua lapisan. Tiap lapisan punya
permukaan penyuntingan dan jalur peninjauan sendiri.

## Model dua lapisan

| Lapisan          | Lokasi                                                      | Disunting via       | Jalur tinjauan     |
| ---------------- | ----------------------------------------------------------- | ------------------- | ------------------ |
| Terstruktur      | Postgres Supabase (kota, negara, kendaraan, layanan)        | Supabase Studio     | Tulis langsung     |
| Naratif (MDX)    | `content/{entitas}/{locale}/{slug}.mdx`                     | Git PR              | CI `Content Checks` |

## Konten terstruktur (Supabase Studio)

Metadata operasional disimpan di Supabase. Sunting melalui dashboard
Studio proyek.

- **`cities`** — `slug`, `coverage_state` (`launched` | `coverable`),
  `chauffeur_only` (selalu `true`), `allow_index`, data geo. Kota
  berstatus `launched` dirender dengan `index, follow`. Kota berstatus
  `coverable` dirender dengan `noindex` mengikuti kebijakan robot pada
  `CoverageTemplate`.
- **`countries`** — bentuk sama dengan cities untuk halaman cakupan
  internasional.
- **`vehicles`** — metadata armada, kapasitas, transmisi, tanpa harga.
  Tidak ada kolom harga di database.
- **`vehicle_availability`** — tabel pivot `(vehicle_id, city_id)`.
  Mengubah ketersediaan otomatis memicu revalidasi halaman kota dan
  kendaraan terkait.
- **`services`** — katalog layanan (antar-jemput bandara, perjalanan
  harian, dll.).
- **Terjemahan** — setiap entitas punya tabel `*_translations` dengan
  satu baris per locale (`id`, `en`). Editor memperbarui tabel ini untuk
  salinan lokal yang tidak butuh prosa panjang.

Setiap penulisan memicu trigger Postgres yang melakukan POST ke
`/api/revalidate`, jadi perubahan tayang dalam hitungan detik. Verifikasi
melalui log Vercel functions.

## Konten naratif (MDX, alur PR)

Prosa panjang (panduan kota, cerita kendaraan, penjelasan layanan,
profil negara, artikel blog) disimpan sebagai MDX:

```
content/
  cities/{id,en}/{slug}.mdx
  countries/{id,en}/{slug}.mdx
  vehicles/{id,en}/{slug}.mdx
  services/{id,en}/{slug}.mdx
  blog/{id,en}/{slug}.mdx
```

### Persyaratan frontmatter

Setiap berkas MDX wajib mendeklarasikan:

- `chauffeurOnly: true` (literal `true`, divalidasi zod)
- `locale: id` atau `locale: en` (harus cocok dengan direktori)
- `slug: <slug>` (harus cocok dengan nama berkas)
- `title`, `description`, `lastUpdated`, plus field wajib per entitas
  (mis. `landmarks: [...]` untuk kota; minimal 3 entri)
- `faqs: [...]` minimal 3 entri

### Komponen MDX yang diizinkan

Hanya komponen berikut yang dirender di dalam body MDX:

- `Callout`, `Tip`, `Faq`, `Landmark`, `Testimonial`, `TripIdea`,
  `VehicleCard`, `InternalLink`

Komponen lain dibuang saat rendering. Pemeriksa skema MDX menolak
`import` di dalam berkas.

### Ambang jumlah kata

- Intro kota dan negara: 150–600 kata (R5.x)
- Intro layanan dan kendaraan: 150–600 kata
- Artikel blog: minimal 600 kata

### Alur tinjauan PR

1. Buat branch dari `main`, sunting MDX, commit, push.
2. Buka PR. Workflow `Content Checks` menjalankan enam lint otomatis:
   - `pnpm check:mdx` (zod frontmatter)
   - `pnpm check:chauffeur-marker`
   - `pnpm check:chauffeur-phrase`
   - `pnpm check:forbidden-phrases`
   - `pnpm check:uniqueness` (analisis tumpang tindih)
   - `pnpm check:non-goal-leak`
3. Vercel melampirkan preview deployment supaya peninjau bisa membaca
   halaman dalam konteks.
4. Merge setelah CI hijau dan disetujui peninjau.

## Pratinjau lokal

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm check:mdx    # validasi frontmatter saja
pnpm check:all    # jalankan seluruh lint
```

Setelah merge ke `main`, produksi rebuild otomatis dan halaman terdampak
direvalidasi.
