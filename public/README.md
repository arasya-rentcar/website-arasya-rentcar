# `public/` — Static image assets

Files placed in this directory are served from the site root by Next.js.
A file at `public/cities/bogor/hero.jpg` is served at `/cities/bogor/hero.jpg`.

## Conventions

- Reference all raster images through `<ResponsiveImage>`
  (`components/ui/ResponsiveImage.tsx`). The wrapper enforces R16.4
  (explicit `width`/`height` + responsive `sizes` + AVIF/WebP) and
  R16.5 (LCP hero preload via `priority`).
- Use kebab-case filenames that match the slug in `supabase/seed.sql`
  (e.g. `bogor`, `innova`, `airport-transfer`) so filenames stay
  greppable from the structured store.
- Source files: `.jpg` for photography, `.png` for transparency,
  `.svg` for logos/icons. The Next.js optimizer emits AVIF/WebP
  variants automatically — see `next.config.mjs` `images.formats`.
- Recommended hero dimensions: 1600×900 (16:9). OG fallback: 1200×630.
- External hosts (Supabase Storage, S3, …) are NOT allowed yet —
  `next.config.mjs` has no `images.remotePatterns`. Add the host
  there before referencing remote URLs.

## Directory map

```
public/
  brand/        Logo, favicon, social icons
  cities/       Per-city heroes and landmark photos
  countries/    Per-country heroes
  vehicles/     Per-vehicle heroes and gallery
  services/     Per-service heroes
  airports/     Per-airport photos
  blog/         Per-article cover images
  og/           OG fallback images (used when /api/og fails)
```

Each subfolder has a `.gitkeep` placeholder. Delete the placeholder
the first time you commit a real asset to that folder.
