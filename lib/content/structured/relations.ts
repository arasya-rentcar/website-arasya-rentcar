/**
 * City-related loader.
 *
 * Reads `city_related` from the snapshot (task 4.2), joins it to
 * `cities` + `city_translations`, and returns the ranked list of
 * "related cities" to render under a City page's "Related Cities"
 * section. Inactive cities and cities missing the requested locale
 * translation are filtered out silently.
 *
 * Ordering: by `city_related.rank` ascending. Ties are broken by slug
 * to keep the output deterministic across builds.
 *
 * Requirements: R17.4, R17.5.
 * Design: §5.1, §5.2.
 */

import { getSnapshot } from "./snapshot";
import { readEnum, readInt, readStr } from "./row-readers";
import type { CityCoverageState, Locale } from "./types";

const PUBLIC_COVERAGE_STATES: readonly CityCoverageState[] = ["launched", "coverable"];
const ALL_COVERAGE_STATES: readonly CityCoverageState[] = [
  "launched",
  "coverable",
  "inactive",
];
const LOCALES: readonly Locale[] = ["id", "en"];

interface CityMeta {
  id: string;
  slug: string;
  coverageState: CityCoverageState;
}

function buildCityMetaIndex(): {
  byId: Map<string, CityMeta>;
  idFromSlug: Map<string, string>;
} {
  const snapshot = getSnapshot();
  const byId = new Map<string, CityMeta>();
  const idFromSlug = new Map<string, string>();
  for (const row of snapshot.cities) {
    const id = readStr(row, "id");
    const slug = readStr(row, "slug");
    const coverageState = readEnum<CityCoverageState>(
      row,
      "coverage_state",
      ALL_COVERAGE_STATES,
    );
    if (id === null || slug === null || coverageState === null) continue;
    byId.set(id, { id, slug, coverageState });
    idFromSlug.set(slug, id);
  }
  return { byId, idFromSlug };
}

function buildCityTranslationIndex(locale: Locale): Map<string, string> {
  const snapshot = getSnapshot();
  const index = new Map<string, string>();
  for (const row of snapshot.cityTranslations) {
    if (readEnum<Locale>(row, "locale", LOCALES) !== locale) continue;
    const cityId = readStr(row, "city_id");
    const displayName = readStr(row, "display_name");
    if (cityId === null || displayName === null) continue;
    index.set(cityId, displayName);
  }
  return index;
}

/**
 * Return the ranked list of related cities for `citySlug` in `locale`.
 * Rows whose target city is inactive or missing a translation in `locale`
 * are filtered out. Empty array when the source city is unknown or has no
 * `city_related` rows.
 */
export function listRelatedCitySlugs(
  citySlug: string,
  locale: Locale,
): { slug: string; displayName: string }[] {
  const snapshot = getSnapshot();
  const { byId, idFromSlug } = buildCityMetaIndex();
  const sourceCityId = idFromSlug.get(citySlug);
  if (sourceCityId === undefined) return [];

  const translations = buildCityTranslationIndex(locale);

  interface Candidate {
    rank: number;
    slug: string;
    displayName: string;
  }

  const candidates: Candidate[] = [];
  for (const row of snapshot.cityRelated) {
    if (readStr(row, "city_id") !== sourceCityId) continue;
    const relatedCityId = readStr(row, "related_city_id");
    if (relatedCityId === null) continue;

    const meta = byId.get(relatedCityId);
    if (meta === undefined) continue;
    if (!PUBLIC_COVERAGE_STATES.includes(meta.coverageState)) continue;

    const displayName = translations.get(relatedCityId);
    if (displayName === undefined) continue;

    candidates.push({
      rank: readInt(row, "rank") ?? 0,
      slug: meta.slug,
      displayName,
    });
  }

  candidates.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.slug.localeCompare(b.slug);
  });

  return candidates.map(({ slug, displayName }) => ({ slug, displayName }));
}
