/**
 * MDX frontmatter Zod schemas per narrative entity.
 *
 * This module is the single source of truth for validating YAML-ish
 * frontmatter extracted from `content/{cities|countries|vehicles|services|articles}/{locale}/{slug}.mdx`.
 * The MDX loader (task 4.5) imports these schemas, runs `.parse` on every
 * frontmatter block at build time, and surfaces validation failures as
 * build errors per R5.12 / R23.4.
 *
 * Requirements enforced here:
 * - R5.3  Launched City MDX frontmatter (slug, locale, SEO, hero, chauffeurOnly,
 *         landmarks ≥3, popularDestinations ≥3, FAQs ≥3, optional testimonial).
 *         Note: the 150–600 word intro body is validated elsewhere (task 4.9
 *         word-count extractor + task 12.2 uniqueness analyzer); this module
 *         only validates the frontmatter, not the MDX body.
 * - R6.2  Country frontmatter has ≥3 `useCases` and ≥3 `faqs`.
 * - R6.3  Vehicle frontmatter states `seats`, `luggage`, ≥2 `useCases`,
 *         and ≥2 `recommendedTripTypes`.
 * - R6.4  Service frontmatter has ≥3 `benefits` and ≥3 `faqs`.
 * - R8.5  Article frontmatter has `author` and `publishedAt` (ISO 8601).
 * - R20   `chauffeurOnly: true` is enforced on every entity via `baseFm`.
 * - R23.2 Every MDX file declares `slug`, `locale`, `seoTitle`,
 *         `seoDescription`, `heroHeadline`, `heroSubheadline`,
 *         `chauffeurOnly: true`, `updatedAt` (ISO 8601).
 *
 * Design reference: §4.2 (frontmatter schema).
 *
 * Pure module: no I/O, no filesystem access, no Next.js imports. The only
 * runtime dependency is `zod`.
 */

import { z } from "zod";

// --- Shared value shapes ----------------------------------------------------

/** `slug` format shared with Requirement 3 criterion 4 (kebab-case, max 80 chars). */
const slugString = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(80);

/** FAQ item — a non-empty question and non-empty answer. */
const faqItem = z.object({ q: z.string(), a: z.string() });

/** Short quote-and-author block used by city/country testimonials. */
const testimonial = z.object({ quote: z.string(), author: z.string() });

/** Title-and-body block used by city itinerary ideas and country use cases. */
const titleBodyItem = z.object({ title: z.string(), body: z.string() });

// --- Base frontmatter (R23.2) -----------------------------------------------

/**
 * Required frontmatter fields shared by every MDX entity.
 *
 * Matches design §4.2 verbatim. All entity-specific schemas extend this.
 * The `chauffeurOnly: z.literal(true)` literal is what enforces R20 across
 * every city, country, vehicle, service, and article.
 */
export const baseFm = z.object({
  slug: slugString,
  locale: z.enum(["id", "en"]),
  seoTitle: z.string().min(30).max(65),
  seoDescription: z.string().min(70).max(160),
  heroHeadline: z.string().min(4).max(90),
  heroSubheadline: z.string().min(10).max(180),
  chauffeurOnly: z.literal(true),
  updatedAt: z.string().datetime(),
});

// --- City (R5.3, R6.1) ------------------------------------------------------

/**
 * Launched City frontmatter (R5.3).
 *
 * Matches design §4.2 verbatim. Word-count bounds on the intro body
 * (150–600 words) are enforced by the uniqueness analyzer (task 12.2), not
 * here — this schema only governs the frontmatter block.
 */
export const cityFm = baseFm.extend({
  landmarks: z
    .array(z.object({ name: z.string(), note: z.string().optional() }))
    .min(3)
    .max(20),
  tourismHighlights: z.array(z.string()).max(10).optional(),
  itineraryIdeas: z.array(titleBodyItem).max(5).optional(),
  localTips: z.array(z.string()).max(10).optional(),
  popularDestinations: z.array(z.string()).min(3).max(50),
  faqs: z.array(faqItem).min(3).max(20),
  testimonial: testimonial.optional(),
});

// --- Country (R6.2) ---------------------------------------------------------

/**
 * Active Country frontmatter (R6.2).
 *
 * Requires at least three country-level use cases and three country-specific
 * FAQs. `supportedCities` is an optional hint used by the Country template
 * (design §7, `CountryTemplate` → supportedCities section); the authoritative
 * list of supported cities lives in the Structured_Content_Store join tables.
 */
export const countryFm = baseFm.extend({
  useCases: z.array(titleBodyItem).min(3).max(10),
  faqs: z.array(faqItem).min(3).max(20),
  testimonial: testimonial.optional(),
  supportedCities: z.array(slugString).max(50).optional(),
});

// --- Vehicle (R6.3) ---------------------------------------------------------

/**
 * Active Vehicle frontmatter (R6.3).
 *
 * Passenger capacity (`seats`) is bounded 1–30 to align with the booking
 * form's passenger validation (R10.8). `luggage` is an integer count of
 * standard bags and may be zero. At least two `useCases` and two
 * `recommendedTripTypes` are required per R6.3. Vehicle FAQs are optional;
 * when present they follow the same `{ q, a }` shape as city FAQs.
 */
export const vehicleFm = baseFm.extend({
  seats: z.number().int().min(1).max(30),
  luggage: z.number().int().min(0),
  useCases: z.array(z.string()).min(2).max(10),
  recommendedTripTypes: z.array(z.string()).min(2).max(10),
  faqs: z.array(faqItem).max(20).optional(),
});

// --- Service (R6.4) ---------------------------------------------------------

/**
 * Active Service frontmatter (R6.4).
 *
 * Requires at least three service-specific benefits and three
 * service-specific FAQs.
 */
export const serviceFm = baseFm.extend({
  benefits: z.array(z.string()).min(3).max(10),
  faqs: z.array(faqItem).min(3).max(20),
});

// --- Article (R8.5) ---------------------------------------------------------

/**
 * Blog Article frontmatter (R8.5).
 *
 * `author` and `publishedAt` are required inputs to the `Article` JSON-LD
 * block emitted on every Blog_Article page. `publishedAt` mirrors `updatedAt`
 * in `baseFm` by using an ISO 8601 datetime string so the JSON-LD builder
 * can pass the value through directly. `relatedArticles` is an optional slug
 * list consumed by the Blog_Article template's "related articles" section.
 */
export const articleFm = baseFm.extend({
  author: z.string().min(1).max(80),
  publishedAt: z.string().datetime(),
  tags: z.array(z.string()).max(10).optional(),
  relatedArticles: z.array(slugString).max(5).optional(),
});

// --- Entity-kind dispatch ---------------------------------------------------

/**
 * Map of entity kind → frontmatter schema.
 *
 * Declared `as const` so the inferred map type preserves each schema's
 * concrete shape — this is what lets {@link FrontmatterFor} and
 * {@link getFrontmatterSchema} return precise per-kind types rather than
 * a collapsed union.
 */
export const entityFrontmatterSchemas = {
  city: cityFm,
  country: countryFm,
  vehicle: vehicleFm,
  service: serviceFm,
  article: articleFm,
} as const;

/** Supported narrative entity kinds (R23.1). */
export type EntityKind = keyof typeof entityFrontmatterSchemas;

/** Inferred frontmatter type for a given entity kind. */
export type FrontmatterFor<K extends EntityKind> = z.infer<
  (typeof entityFrontmatterSchemas)[K]
>;

// --- Inferred type aliases --------------------------------------------------

export type BaseFrontmatter = z.infer<typeof baseFm>;
export type CityFrontmatter = z.infer<typeof cityFm>;
export type CountryFrontmatter = z.infer<typeof countryFm>;
export type VehicleFrontmatter = z.infer<typeof vehicleFm>;
export type ServiceFrontmatter = z.infer<typeof serviceFm>;
export type ArticleFrontmatter = z.infer<typeof articleFm>;

// --- Helpers ----------------------------------------------------------------

/**
 * Return the Zod schema for a given entity kind.
 *
 * The return type is `(typeof entityFrontmatterSchemas)[K]`, which preserves
 * the concrete per-kind schema (not a collapsed union), so callers get the
 * narrowed inferred type when they chain `.parse` / `.safeParse` themselves.
 */
export function getFrontmatterSchema<K extends EntityKind>(
  kind: K,
): (typeof entityFrontmatterSchemas)[K] {
  return entityFrontmatterSchemas[kind];
}

/**
 * Parse and validate an unknown frontmatter value against the schema for a
 * given entity kind. Throws a `ZodError` on invalid input — the MDX loader
 * (task 4.5) catches this and surfaces the failure as a build error per
 * R5.12 / R23.4.
 *
 * Internal note: we assert the return type via `as FrontmatterFor<K>` because
 * TypeScript cannot track the generic parameter through the indexed schema's
 * `parse` return. The runtime value is already validated by Zod, so the cast
 * is sound.
 */
export function parseFrontmatter<K extends EntityKind>(
  kind: K,
  value: unknown,
): FrontmatterFor<K> {
  const schema = entityFrontmatterSchemas[kind];
  return schema.parse(value) as FrontmatterFor<K>;
}
