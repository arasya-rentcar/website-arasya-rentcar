# Content editing workflow

Arasya Rentcar separates content into two layers. Each layer has its own
editing surface and review path.

## Two-layer model

| Layer            | Where it lives                                            | Edit via            | Review path        |
| ---------------- | --------------------------------------------------------- | ------------------- | ------------------ |
| Structured       | Supabase Postgres (cities, countries, vehicles, services) | Supabase Studio     | Direct write       |
| Narrative (MDX)  | `content/{entity}/{locale}/{slug}.mdx`                    | Git PR              | `Content Checks` CI |

## Structured content (Supabase Studio)

Operational metadata lives in Supabase. Edit it through the Studio
dashboard for the project.

- **`cities`** — `slug`, `coverage_state` (`launched` | `coverable`),
  `chauffeur_only` (always `true`), `allow_index`, geo fields.
  Cities marked `launched` render with `index, follow`. Cities marked
  `coverable` render with `noindex` per the `CoverageTemplate` robots
  policy.
- **`countries`** — same shape as cities for international coverage pages.
- **`vehicles`** — fleet metadata, capacity, transmission, currency-free.
  No prices in the database.
- **`vehicle_availability`** — pivot table keyed on `(vehicle_id, city_id)`.
  Toggling availability automatically triggers revalidation of the
  affected city and vehicle pages.
- **`services`** — service catalog (airport transfer, day trip, etc.).
- **Translations** — every entity has a `*_translations` table with one
  row per locale (`id`, `en`). Editors update these for localized copy
  that does not need long-form prose.

Every write fires a Postgres trigger that posts to `/api/revalidate`,
so changes go live within seconds. Confirm by watching the Vercel
function logs.

## Narrative content (MDX, PR workflow)

Long-form prose (city guides, vehicle stories, service explainers,
country overviews, blog articles) lives in MDX:

```
content/
  cities/{id,en}/{slug}.mdx
  countries/{id,en}/{slug}.mdx
  vehicles/{id,en}/{slug}.mdx
  services/{id,en}/{slug}.mdx
  blog/{id,en}/{slug}.mdx
```

### Frontmatter requirements

Every MDX file must declare:

- `chauffeurOnly: true` (literal `true`, validated by zod)
- `locale: id` or `locale: en` (must match the directory)
- `slug: <slug>` (must match the filename)
- `title`, `description`, `lastUpdated`, plus per-entity required fields
  (e.g., `landmarks: [...]` for cities; minimum 3 entries)
- `faqs: [...]` with at least 3 entries

### Allowlisted MDX components

Only these components render inside MDX bodies:

- `Callout`, `Tip`, `Faq`, `Landmark`, `Testimonial`, `TripIdea`,
  `VehicleCard`, `InternalLink`

Anything else is stripped at render time. The MDX schema check rejects
imports.

### Word count thresholds

- City and country intros: 150–600 words (R5.x)
- Service and vehicle intros: 150–600 words
- Blog articles: minimum 600 words

### PR review workflow

1. Branch from `main`, edit the MDX, commit, push.
2. Open a PR. The `Content Checks` workflow runs six lints automatically:
   - `pnpm check:mdx` (frontmatter zod)
   - `pnpm check:chauffeur-marker`
   - `pnpm check:chauffeur-phrase`
   - `pnpm check:forbidden-phrases`
   - `pnpm check:uniqueness` (overlap analyzer)
   - `pnpm check:non-goal-leak`
3. Vercel attaches a preview deployment so reviewers can read the page
   in context.
4. Merge after green checks plus reviewer approval.

## Local preview

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm check:mdx    # validate frontmatter only
pnpm check:all    # run the full lint suite
```

After merging to `main`, production rebuilds automatically and revalidates
affected pages.
