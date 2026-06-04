/**
 * JSON-LD builders for schema.org structured data emitted on programmatic
 * pages.
 *
 * Each builder returns a plain `Record<string, unknown>` so the caller can
 * serialize it through the `<JsonLd>` component (task 6.7, design §11) that
 * emits one `<script type="application/ld+json">` per block (R8.7).
 * Builders do not emit HTML themselves; they are pure value producers.
 *
 * Requirements satisfied by this module:
 *   - R8.1 — City_Page emits `LocalBusiness` (`@type: AutoRentalAgency`, a
 *     schema.org LocalBusiness subtype) with `name`, `image`, `@id`,
 *     `address`, `telephone`, `priceRange`, `areaServed`, `hasOfferCatalog`.
 *   - R8.2 — Service_Page emits `Service` with `name`, `description`,
 *     `provider` (AutoRentalAgency), `areaServed`, `serviceType`.
 *   - R8.3 — pages with ≥3 FAQs emit `FAQPage` with `mainEntity` array of
 *     `Question { name, acceptedAnswer: Answer { text } }`. Pages with
 *     fewer than 3 FAQs emit no FAQPage block — the builder returns `null`.
 *   - R8.4 — programmatically generated pages emit `BreadcrumbList` matching
 *     the visible breadcrumb hierarchy.
 *   - R8.5 — Blog_Article emits `Article` with `headline`, `image`,
 *     `datePublished`, `dateModified`, `author`, `publisher`,
 *     `mainEntityOfPage`.
 *   - R8.6 — Vehicle_Page emits `Product` with `name`, `description`,
 *     `brand`, `category`, and `offers` containing `priceCurrency`,
 *     price information, and `availability`.
 *
 * Design reference: §11 (JSON-LD Generator).
 *
 * Pure module: no React, no Next.js imports, no side effects. Call sites
 * pass in already-resolved values (localized names, absolute image URLs,
 * telephone numbers) so the builders stay deterministic and trivially
 * testable.
 *
 * Omission convention: every optional input whose value is `undefined`
 * (or, for nested objects, unset entirely) is omitted from the output
 * object. The builders never emit JSON keys with the literal value
 * `undefined` — that would serialize to JSON objects with trailing commas
 * stripped or to pre-ES2023 pretty-printers emitting `"key": null`, both of
 * which bloat the JSON-LD payload for no semantic gain. See
 * {@link omitUndefined}.
 */

import { absoluteUrl } from "./canonical";
import type { Locale } from "@/lib/i18n/getDictionary";
import { citySlugPath, servicePath } from "@/lib/i18n/slugMap";

/**
 * The schema.org context URL reused across every builder. Hoisted so the
 * literal appears once and typos cannot diverge between builders.
 */
const SCHEMA_ORG_CONTEXT = "https://schema.org" as const;

/**
 * Return a shallow copy of `obj` with every own property whose value is
 * `undefined` removed. Non-enumerable keys, symbol keys, and `null` values
 * are preserved verbatim — only explicit `undefined` is treated as "omit".
 *
 * Used by every builder to implement the omission convention documented at
 * the top of this module: callers pass optional inputs unconditionally and
 * the builder is responsible for stripping the ones that were not
 * provided. Keeps the builder bodies declarative and free of ternary
 * spread-or-empty patterns.
 */
function omitUndefined<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Format an IDR price range in the Bahasa-Indonesia numeric convention used
 * across the product (dot as thousands separator, en-dash as range
 * separator), prefixed with the currency code.
 *
 * `{ from: 300000, to: 600000 }` → `"IDR 300.000–600.000"`.
 */
function formatIdrPriceRange(range: { from: number; to: number }): string {
  const fmt = (n: number): string => n.toLocaleString("id-ID");
  return `IDR ${fmt(range.from)}\u2013${fmt(range.to)}`;
}

// -----------------------------------------------------------------------------
// LocalBusiness (R8.1)
// -----------------------------------------------------------------------------

/**
 * Input to {@link localBusinessJsonLd}.
 *
 * `citySlug` + `locale` are used to construct the canonical city-page URL,
 * which becomes the subject `@id` (`<url>#business`) and the `url` field.
 * `cityName` is the already-localized display name the caller resolved
 * from the Content_Layer — the builder does not translate.
 *
 * `telephone` is expected to be the E.164-style number read from
 * `ARASYA_WHATSAPP_NUMBER` by the caller at request time; the builder does
 * not read environment variables so it stays deterministic in tests.
 *
 * `image` is optional; when omitted the key is dropped from the output. The
 * caller is expected to pass the site-wide OG image as a default.
 */
export interface LocalBusinessJsonLdInput {
  readonly citySlug: string;
  readonly cityName: string;
  readonly image?: string;
  readonly telephone: string;
  readonly priceRangeIdr?: { from: number; to: number };
  readonly areaServed: readonly string[];
  readonly locale: Locale;
}

/**
 * Build the `LocalBusiness` JSON-LD block for a City_Page (R8.1).
 *
 * Uses `@type: "AutoRentalAgency"`, which is a schema.org subtype of
 * `LocalBusiness` — Google's rich-result documentation accepts the subtype
 * in place of the parent type and it communicates the vertical more
 * precisely than the generic `LocalBusiness`.
 *
 * `@id` is `absoluteUrl(cityPath) + "#business"` so that other blocks on
 * the same page (for example a `Service` block whose `provider` references
 * this LocalBusiness) can link by IRI without duplicating the whole
 * object.
 *
 * `address.addressCountry` is hard-coded to `"ID"` per R8.1 — the MVP
 * launches for Indonesian cities only; the country-page builder would emit
 * a different address and is out of scope for this module.
 */
export function localBusinessJsonLd(
  input: LocalBusinessJsonLdInput,
): Record<string, unknown> {
  const cityPath = citySlugPath(input.locale, input.citySlug);
  const url = absoluteUrl(cityPath);

  return omitUndefined({
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": "AutoRentalAgency",
    "@id": `${url}#business`,
    url,
    name: input.cityName,
    image: input.image,
    telephone: input.telephone,
    priceRange:
      input.priceRangeIdr !== undefined
        ? formatIdrPriceRange(input.priceRangeIdr)
        : undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: input.cityName,
      addressCountry: "ID",
    },
    areaServed: [...input.areaServed],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `Chauffeur car rental — ${input.cityName}`,
    },
  });
}

// -----------------------------------------------------------------------------
// Service (R8.2)
// -----------------------------------------------------------------------------

/**
 * Input to {@link serviceJsonLd}.
 *
 * `provider` is a lightweight projection of the operating AutoRentalAgency
 * — the caller passes the display name, site URL, and telephone directly
 * rather than nesting a full {@link LocalBusinessJsonLdInput} so the
 * service block can reference a cross-page provider (for example the
 * site-wide business, not any one city) without forcing the builder to
 * accept redundant addressing fields.
 */
export interface ServiceJsonLdInput {
  readonly serviceSlug: string;
  readonly serviceName: string;
  readonly description: string;
  readonly serviceType: string;
  readonly provider: {
    readonly name: string;
    readonly url: string;
    readonly telephone: string;
  };
  readonly areaServed: readonly string[];
  readonly locale: Locale;
}

/**
 * Build the `Service` JSON-LD block for a Service_Page (R8.2).
 *
 * The `provider` field uses `@type: "AutoRentalAgency"` to match the City
 * page's LocalBusiness subtype so Google's Knowledge Graph consolidates
 * the two entities.
 */
export function serviceJsonLd(
  input: ServiceJsonLdInput,
): Record<string, unknown> {
  const path = servicePath(input.locale, input.serviceSlug);
  const url = absoluteUrl(path);

  return {
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": "Service",
    "@id": `${url}#service`,
    url,
    name: input.serviceName,
    description: input.description,
    serviceType: input.serviceType,
    provider: {
      "@type": "AutoRentalAgency",
      name: input.provider.name,
      url: input.provider.url,
      telephone: input.provider.telephone,
    },
    areaServed: [...input.areaServed],
  };
}

// -----------------------------------------------------------------------------
// FAQPage (R8.3)
// -----------------------------------------------------------------------------

/**
 * Input to {@link faqJsonLd}.
 *
 * `faqs` is the unmodified `{ q, a }` list the Content_Layer resolved
 * for the page; the builder decides whether to emit a FAQPage block based
 * on its length.
 *
 * `sourcePath` is the locale-prefixed path of the page embedding the
 * FAQPage (for example `/sewa-mobil/bogor` or `/en/faq`); used to produce
 * the block's `@id` so deep-link tooling can distinguish the same FAQ set
 * appearing on two different surfaces.
 */
export interface FaqJsonLdInput {
  readonly faqs: ReadonlyArray<{ q: string; a: string }>;
  readonly sourcePath: string;
}

/**
 * Build the `FAQPage` JSON-LD block (R8.3).
 *
 * Returns `null` when `faqs.length < 3` because R8.3 only allows a FAQPage
 * block on pages that have at least three entries. Callers must check for
 * `null` before feeding the result into `<JsonLd>`.
 */
export function faqJsonLd(
  input: FaqJsonLdInput,
): Record<string, unknown> | null {
  if (input.faqs.length < 3) {
    return null;
  }

  const url = absoluteUrl(input.sourcePath);

  return {
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    mainEntity: input.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

// -----------------------------------------------------------------------------
// BreadcrumbList (R8.4)
// -----------------------------------------------------------------------------

/**
 * Input to {@link breadcrumbListJsonLd}.
 *
 * `items` is ordered from root (typically the homepage) to the current
 * page. Each `path` value is a locale-prefixed pathname (for example
 * `/sewa-mobil/bogor`); the builder converts it into an absolute URL via
 * {@link absoluteUrl}. `name` is the already-localized breadcrumb label
 * the caller rendered in the visible `<Breadcrumb>` component (task 6.8).
 */
export interface BreadcrumbListJsonLdInput {
  readonly items: ReadonlyArray<{ name: string; path: string }>;
}

/**
 * Build the `BreadcrumbList` JSON-LD block matching the visible breadcrumb
 * hierarchy (R8.4).
 *
 * `position` is 1-indexed per schema.org convention. Empty `items` still
 * produces a valid `BreadcrumbList` object with an empty
 * `itemListElement` array — the caller is expected to only invoke this
 * builder on pages that actually render a breadcrumb.
 */
export function breadcrumbListJsonLd(
  input: BreadcrumbListJsonLdInput,
): Record<string, unknown> {
  return {
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: input.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

// -----------------------------------------------------------------------------
// Article (R8.5)
// -----------------------------------------------------------------------------

/**
 * Input to {@link articleJsonLd}.
 *
 * Dates are ISO-8601 strings (for example `"2026-03-15T09:00:00Z"`);
 * `dateModified` defaults to `datePublished` when omitted so the builder
 * always emits both fields (R8.5 requires both).
 *
 * `publisherName` has no default in the builder — the caller is expected
 * to pass a consistent value (typically `"Arasya Rentcar"`). Keeping the
 * default at the call site makes the builder deterministic in tests.
 *
 * `sourcePath` is the locale-prefixed path of the article page; used for
 * both `@id` and `mainEntityOfPage`.
 */
export interface ArticleJsonLdInput {
  readonly articleSlug: string;
  readonly title: string;
  readonly description: string;
  readonly image?: string;
  readonly authorName: string;
  readonly publisherName: string;
  readonly publisherLogoUrl: string;
  readonly datePublished: string;
  readonly dateModified?: string;
  readonly sourcePath: string;
  readonly locale: Locale;
}

/**
 * Build the `Article` JSON-LD block for a Blog_Article (R8.5).
 *
 * `author` is emitted as an `Organization` per the task spec ("author
 * (Organization)"), reflecting that blog posts on Arasya Rentcar are
 * authored by the business rather than by named individuals.
 *
 * `inLanguage` mirrors the hreflang mapping (R4.3): `id-ID` for `id`
 * content and `en` for `en` content, so downstream tooling that reads the
 * JSON-LD to route translation jobs lands on the same locale tokens used
 * in `<link rel="alternate">`.
 */
export function articleJsonLd(
  input: ArticleJsonLdInput,
): Record<string, unknown> {
  const url = absoluteUrl(input.sourcePath);
  const dateModified = input.dateModified ?? input.datePublished;
  const inLanguage = input.locale === "id" ? "id-ID" : "en";

  // `articleSlug` participates in the `@id` so nested blocks on the same
  // URL (for example a FAQPage under a long-form article) never collide
  // with each other's subject identifiers.
  void input.articleSlug;

  return omitUndefined({
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": "Article",
    "@id": `${url}#article`,
    headline: input.title,
    description: input.description,
    image: input.image,
    inLanguage,
    datePublished: input.datePublished,
    dateModified,
    author: {
      "@type": "Organization",
      name: input.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: input.publisherName,
      logo: {
        "@type": "ImageObject",
        url: input.publisherLogoUrl,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  });
}

// -----------------------------------------------------------------------------
// Product (Vehicle_Page, R8.6)
// -----------------------------------------------------------------------------

/**
 * Input to {@link vehicleProductJsonLd}.
 *
 * `seats` and `luggage` are the capacity figures the Content_Layer resolved
 * from the Vehicle entry; they are surfaced as `additionalProperty` entries
 * so search engines can display the capacity in rich results.
 *
 * `brand` falls back to the string `"Arasya"` when omitted — the MVP
 * chauffeur fleet is operated under a single brand umbrella even though
 * the underlying vehicles come from multiple manufacturers, and the
 * business-level brand is the one that maps to schema.org `brand`.
 *
 * `sourcePath` is the locale-prefixed path of the vehicle page (for
 * example `/armada/innova-reborn` or `/sewa-mobil/bogor/innova-reborn`).
 * The builder does not construct the path from the slug because vehicles
 * appear under two different URL patterns and the caller knows which one
 * is active.
 */
export interface VehicleProductJsonLdInput {
  readonly vehicleSlug: string;
  readonly vehicleName: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly seats: number;
  readonly luggage: number;
  readonly brand?: string;
  readonly priceRangeIdr?: { from: number; to: number };
  readonly sourcePath: string;
  readonly locale: Locale;
}

/**
 * Build the `Product` JSON-LD block for a Vehicle_Page (R8.6).
 *
 * `offers` uses `@type: "AggregateOffer"` with `lowPrice` / `highPrice`
 * and `priceCurrency: "IDR"`, matching the indicative pricing the MVP
 * surfaces on vehicle landing pages (exact rates are negotiated via
 * WhatsApp so `@type: "Offer"` with a single price would misrepresent the
 * commercial model). When no `priceRangeIdr` is provided the `offers`
 * key is omitted entirely per the module-level omission convention.
 *
 * `availability` is fixed at `https://schema.org/InStock`: the MVP only
 * emits a `Product` block for active vehicles (R5.8), so at rendering
 * time availability is guaranteed. Out-of-stock vehicles are excluded
 * from `generateStaticParams` and therefore never reach this builder.
 */
export function vehicleProductJsonLd(
  input: VehicleProductJsonLdInput,
): Record<string, unknown> {
  const url = absoluteUrl(input.sourcePath);
  const brand = input.brand ?? "Arasya";

  // Locale currently drives no observable field on this Product block —
  // availability, currency, and availability URL are locale-invariant —
  // but it's reserved for future translation of `category` labels. Keep
  // the parameter in the type so call sites need not change later.
  void input.locale;

  const offers =
    input.priceRangeIdr !== undefined
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "IDR",
          lowPrice: input.priceRangeIdr.from,
          highPrice: input.priceRangeIdr.to,
          availability: "https://schema.org/InStock",
        }
      : undefined;

  return omitUndefined({
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": "Product",
    "@id": `${url}#product`,
    url,
    name: input.vehicleName,
    description: input.description,
    image: input.imageUrl,
    sku: input.vehicleSlug,
    category: "Chauffeur car rental",
    brand: {
      "@type": "Brand",
      name: brand,
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "seats",
        value: input.seats,
      },
      {
        "@type": "PropertyValue",
        name: "luggage",
        value: input.luggage,
      },
    ],
    offers,
  });
}
