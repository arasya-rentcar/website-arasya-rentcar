# pSEO Handoff — Arasya City Landing Pages

## Architecture
- `CityLanding.dc.html` — one template, all sections driven by city data.
- `cities.js` — the registry. **One entry = one page.** Adding a city requires zero template changes.
- Reference pattern: Traveloka car-rental city/region pages (one indexable URL per locality).

## Generating pages (engineering)
Render **static HTML per city** (Next.js `generateStaticParams` / Astro `getStaticPaths` over the registry). Do not ship a client-rendered SPA — Ads Quality Score and indexing both depend on server-rendered HTML.

Per page, emit in `<head>`:
- `<title>` = `metaTitle`, `<meta name="description">` = `metaDescription`
- `<link rel="canonical" href="https://arasyarentcar.com/{slug}">`
- Open Graph: `og:title`, `og:description`, `og:url`, `og:image` (city photo)
- JSON-LD `@graph`: `AutoRental` (name, legalName PT. Ayomi Raya, address, telephone, `areaServed` from registry) + `FAQPage` (mirror the visible FAQ exactly)
- `<html lang="id">`
- Referensi hidup: `shared.js applySeo()` sudah meng-emit semuanya di pratinjau (canonical, OG/Twitter, AutoRental + BreadcrumbList + FAQPage, `priceRange` dari armada) — samakan output produksi dengannya. Domain diambil dari `site.settings.siteUrl`.

## URL scheme
`https://arasyarentcar.com/{slug}` → `/sewa-mobil-bogor`, `/sewa-mobil-yogyakarta`, `/sewa-mobil-bangkok`. Plus fixed routes: `/travel` (charter drop-off, bilingual `/en/travel/`), `/sewa-mobil` (hub), `/blog`.
- `sitemap.xml` generated from the registry (+ fixed routes above).
- hreflang: not needed while everything is `id`. If English pages ship later: `id` + `en` alternates per city.

## Internal linking (required for pSEO)
- The template footer already renders "Kota Layanan Lain" links from the registry. In the preview they swap the city in place; in production replace the onClick with real navigation — the `href="/{slug}"` is already correct.
- `/sewa-mobil` hub page: `../city-hub/CityHub.dc.html` — renders every registry entry grouped Indonesia/Luar Negeri with `href="/{slug}"` cards, plus ItemList + AutoRental JSON-LD. Render it once as a static page; it is the crawl entry point for all city pages. (Preview cards deep-link via `?city={key}` — the landing templates read that param.)
- Without cross-links, deep city pages won't be crawled or ranked.

## Same layout on 30+ pages — is it safe?
Yes. Google evaluates **content** uniqueness, not template uniqueness (Traveloka/Airbnb run thousands of city pages on one layout). What triggers doorway-page filters is identical *copy* with only the city name swapped. Defenses built into this template:
- Unique `editorial`, `destinations`, and `routes` copy per entry (schema-enforced).
- Optional modules vary page structure: the Rute Antarkota section only renders when `routes` exists; `faqExtra` varies FAQ length per city.
- Routes rows target long-tail queries ("sewa mobil bogor ke bandung").

## 8 layout (3 city · 3 region · 2 country)
Satu folder, tiga template + varian layout — assign per entri lewat `template` + `variant` di `cities.js`; override sementara via prop `variant` (Tweaks).
- CityLanding.dc.html — `navy` (hero foto gelap; Bogor), `terang` (hero terang + foto kartu, tarif tampil dulu, destinasi list; Bangkok), `editorial` (Mengenal kota langsung setelah hero).
- RegionLanding.dc.html — `peta` (chip wilayah layanan di hero; Yogyakarta), `rute` (rute antarkota tampil dulu), `wisata` (destinasi tampil dulu; Bali).
- CountryLanding.dc.html — `concierge` (hero terpusat; Thailand), `direktori` (direktori kota tampil dulu; Malaysia). Tanpa grid armada — kelas unit generik + direktori kota.
Rotasi untuk 30+ kota: variasikan variant antar kota bertetangga; konten unik tetap syarat utama (layout sama tidak dipenalti Google).
Catatan produksi: galeri (`image-slot`) & peta Google adalah embed; testimoni di `shared.js` adalah PLACEHOLDER — ganti dengan ulasan asli.

## Content quality rules
- Every entry MUST have unique `editorial` + `destinations` copy (already enforced by schema). Never clone paragraphs across cities — thin/doorway-page risk.
- Keyword in `h1` and `metaTitle` matches the ad group per city ("sewa mobil {kota}").
- `pageType: 'region'` entries (Yogyakarta) cover the whole province in copy; `'city'` entries stay local.

## Google Ads notes
- One ad group per city → landing URL = that city's page (message match → Quality Score).
- Track conversions: WhatsApp click (sticky bar, hero, fleet rows) + quote-form submit via GTM.
- Keep LCP < 2.5s: static HTML, self-hosted fonts, no blocking JS.
- Pass through UTM/gclid params onto WA links — implemented in `shared.js campaignTag()` (sessionStorage `arasya-campaign`, suffix `[Src: …]` pada pesan WA); port 1:1.

## Known gaps / backlog
- Fleet + pricing is currently global (IDR). Bangkok needs per-city fleet + currency support in `FleetTable` — DS change, route through `/design-sync`.
- City photos: template is text-only today; add per-city hero image field when assets exist.
- Media produksi: foto armada diunggah ke **Supabase Storage** (mis. bucket `fleet/`); registry hanya menyimpan path/nama file. Unggahan di Content Studio adalah draf pratinjau (data URL di localStorage, key `imgData`/`imgLogoData`) dan otomatis dibuang saat ekspor `site.js`.
- `settings.bankAccounts[]` (bank, number, owner) menggantikan bankName/bankNumber/bankOwner — daftar rekening bisa ditambah/dihapus/diurut; indeks 0 = rekening utama (FAQ pembayaran). `shared.js` masih mengekspor field lama sebagai turunan indeks 0.
- Physical address in JSON-LD is the Bogor HQ on all pages (correct — one legal entity, `areaServed` differentiates).

## Blog (content SEO yang menopang pSEO)
- `templates/blog-post/posts.js` — registry artikel, CMS-shaped: satu entry = satu `/blog/{slug}`. Body = `sections[{heading, paragraphs[], list?[]}]` sehingga mudah dipetakan ke CMS apa pun.
- `templates/blog-post/BlogPost.dc.html` — halaman artikel: BlogPosting + BreadcrumbList JSON-LD, CTA WhatsApp ber-ref (`ref: blog-{slug}`), tautan internal ke halaman kota terkait (`cityKey`), artikel terkait (`related`), tanggal publish/update.
- `templates/blog-index/BlogIndex.dc.html` — indeks `/blog`: filter kategori, artikel pilihan, grid artikel, CTA + tautan semua kota; Blog + ItemList JSON-LD.
- Peran SEO: artikel menarget kata kunci informasional ("itinerari puncak", "sunrise borobudur") lalu mengalirkan otoritas + klik ke halaman kota komersial lewat tautan internal dua arah (artikel → kota; kota bisa menautkan artikel terkait). Google Ads juga menilai landing page yang didukung konten asli lebih tinggi (Quality Score).

## Global site registry (`city-landing/site.js`)
Seluruh data lintas-halaman kini terpusat di `site.js` (bukan hardcoded): `settings` (WA utama, nomor resmi, rekening bank, alamat + bagian JSON-LD, Instagram, embed peta), `fleet` + `fleetNotes` + `genericUnits` (armada & tarif), `services`, `testimonials`, `trustDefaults`. `shared.js` menurunkan seluruh export lamanya (OFFICIAL, fleet(), SERVICES, TESTIMONIALS, dst.) dari registry ini, dan semua template membaca via `shared.js` — satu perubahan di site.js mengubah seluruh halaman. Overlay draf localStorage `arasya-cms-site` berlaku seperti cities.js/posts.js. Di CMS produksi: koleksi ketiga "Site Settings" (singleton) + "Fleet" mengikuti skema site.js.

## Content Studio (editor konten dalam proyek desain)
`templates/content-studio/ContentStudio.dc.html` — CMS ringan untuk fase desain/review:
- Formulir untuk seluruh field `cities.js` (SEO, hero, editorial, destinasi, rute, FAQ), `posts.js` (identitas, SEO, sections, related), dan `site.js` (bagian "Situs & Global": pengaturan kontak/rekening/alamat, armada & tarif, layanan, testimoni, kartu kepercayaan), dengan penghitung karakter meta title/description. Ekspor "Unduh site.js" tersedia di toolbar.
- Draf tersimpan di `localStorage` browser (`arasya-cms-cities` / `arasya-cms-posts`); registry menerapkan overlay draf saat dimuat, sehingga semua pratinjau template (hub, kota, blog) langsung mengikuti draf. Blok overlay di akhir `cities.js`/`posts.js` adalah bagian dari mekanisme ini — jangan dibuang di preview, dan abaikan/di-strip saat build produksi.
- Halaman baru dibuat via Duplikat (kunci registri dapat diganti); ekspor "Unduh cities.js / posts.js" menghasilkan file registri utuh siap commit.
- Content Studio adalah alat pratinjau, bukan pengganti CMS produksi (lihat rekomendasi di bawah).

## Model konten CMS (rekomendasi)
Gunakan CMS ber-API (Sanity / Strapi / Contentlayer+MDX di repo). Dua koleksi:
1. **Location** — field mengikuti skema `cities.js`: name, slug, template(city|region|country), heroKicker, heroTitle, heroSubtitle, metaTitle, metaDescription, editorial[], destinations[], routes[], fleet(+harga per tier), faqExtra[], areaServed[], heroImage.
2. **Post** — field mengikuti `posts.js`: title, slug, category, excerpt, metaTitle, metaDescription, datePublished, dateModified, readMinutes, cityRef (relasi ke Location), sections[{heading, paragraphs[], list[]}], related[] (relasi antar Post), coverImage.
Build (Astro/Next SSG) menarik kedua koleksi → menghasilkan halaman statis + sitemap.xml otomatis. Konten baru = entri CMS baru + rebuild, tanpa menyentuh kode.

## Kualitas konten blog (aturan redaksi)
- Minimal 3 section per artikel, semua paragraf ditulis unik (jangan generate massal dengan template kalimat yang sama).
- Setiap artikel WAJIB menaut ke tepat 1 halaman kota (cityRef) + 2 artikel terkait — jaga struktur internal link.
- Perbarui `dateModified` saat konten direvisi; tampilkan "Diperbarui" di halaman (sinyal freshness).
