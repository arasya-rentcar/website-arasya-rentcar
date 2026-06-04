# Chauffeur-Only Policy

## Why this matters

Arasya Rentcar is a chauffeur-only car rental service. Every booking
confirms with a professional driver included. This is not a self-drive
rental, a leasing arrangement, or a rent-to-own service. The codebase
defends this positioning across multiple layers:

## Layered enforcement

### 1. Database CHECK constraint (R20.3)

`supabase/migrations/0002_init_structured_content.sql` adds a column-level
`chauffeur_only boolean not null default true CHECK (chauffeur_only = true)`
to every customer-facing entity table (cities, countries, vehicles, services).
A row that tries to flip the value to `false` is rejected at insert/update.

### 2. MDX frontmatter zod (R20.3)

Every narrative MDX file declares `chauffeurOnly: true` in frontmatter. The
schema in `lib/content/narrative/schema.ts` uses `z.literal(true)` so any
other value fails validation at build time and at the standalone CI check
(`scripts/check-mdx.ts`, task 12.5).

### 3. Build-time marker validator (R20.5)

`scripts/check-chauffeur-marker.ts` (task 12.6) runs as a CI step that
walks both the MDX corpus and the structured content snapshot and confirms
every entity carries `chauffeurOnly: true`.

### 4. Phrase presence check (R1.6)

`scripts/check-chauffeur-phrase.ts` (task 12.3) confirms every page
template references `dict.common.chauffeurOnlyPhrase` (the phrase "sewa
mobil dengan supir" / "chauffeur car rental"). Templates that legitimately
delegate the phrase to MDX bodies (StaticTemplate, BlogArticleTemplate)
are documented exemptions.

### 5. Forbidden-phrase lint (R20.1, R20.2)

`scripts/lint-forbidden-phrases.ts` (task 12.1) rejects any MDX or
dictionary copy containing self-drive, leasing, or rent-to-own terms —
even in a denial form ("we don't offer self-drive"). The brand should
never name the alternative.

### 6. Non-goal leak detector (R2.3–R2.9)

`scripts/check-non-goal-leak.ts` (task 12.7) scans the codebase for
identifiers that would indicate forbidden capabilities are being added
(payment gateways, customer accounts, driver-facing apps, etc.).

## How to extend the policy

When adding a new entity type, the operator MUST:

1. Add a `chauffeur_only` column with the CHECK constraint to the new table.
2. Add the entity's frontmatter schema with `chauffeurOnly: z.literal(true)`.
3. Add the entity to `REQUIRED_SNAPSHOT_KEYS` in
   `scripts/check-chauffeur-marker.ts` so the validator covers it.
4. Confirm the new template references `dict.common.chauffeurOnlyPhrase`,
   or add it to the EXEMPT_TEMPLATES set in
   `scripts/check-chauffeur-phrase.ts` with a justification.

## Brand voice

Internal and external copy should describe Arasya Rentcar in chauffeur-only
terms. Phrases like "rental services" must be qualified ("rental services
with a professional chauffeur"). The marketing brief lives at
`design.md §1`; the lint suite is the executable enforcement.
