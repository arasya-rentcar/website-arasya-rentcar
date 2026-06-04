/**
 * City alias loader.
 *
 * Reads `city_aliases` from the snapshot (task 4.2) and resolves an
 * inbound alias slug to a canonical city slug. Returns null when the
 * alias is unknown or when the referenced canonical city is `inactive`
 * / missing — so a 301 handler can safely treat null as "404 instead of
 * redirect".
 *
 * Requirements: R17.4, R17.5.
 * Design: §5.1, §5.2, §8 (city alias dispatch).
 */

import { getSnapshot } from "./snapshot";
import { readEnum, readStr } from "./row-readers";
import type { CityCoverageState } from "./types";

const PUBLIC_COVERAGE_STATES: readonly CityCoverageState[] = ["launched", "coverable"];
const ALL_COVERAGE_STATES: readonly CityCoverageState[] = [
  "launched",
  "coverable",
  "inactive",
];

/**
 * Resolve an alias slug to its canonical city slug.
 *
 * Returns `null` when:
 *   - the alias row is missing from the snapshot, or
 *   - the alias's `canonical_city_id` does not match any row in `cities`,
 *     or
 *   - the canonical city's `coverage_state` is `inactive` (an inactive
 *     city should not be reachable even via a redirect).
 */
export function getCityAlias(aliasSlug: string): { canonicalSlug: string } | null {
  const snapshot = getSnapshot();

  let canonicalCityId: string | null = null;
  for (const row of snapshot.cityAliases) {
    if (readStr(row, "alias_slug") !== aliasSlug) continue;
    canonicalCityId = readStr(row, "canonical_city_id");
    break;
  }
  if (canonicalCityId === null) return null;

  for (const row of snapshot.cities) {
    if (readStr(row, "id") !== canonicalCityId) continue;
    const coverageState = readEnum<CityCoverageState>(
      row,
      "coverage_state",
      ALL_COVERAGE_STATES,
    );
    if (coverageState === null) return null;
    if (!PUBLIC_COVERAGE_STATES.includes(coverageState)) return null;
    const slug = readStr(row, "slug");
    if (slug === null) return null;
    return { canonicalSlug: slug };
  }
  return null;
}
