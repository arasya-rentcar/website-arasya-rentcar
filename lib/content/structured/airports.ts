/**
 * Airport loader.
 *
 * Reads `airports` from the snapshot (task 4.2). {@link listAirports} joins
 * each airport to its parent city's slug; {@link listAirportsForCity}
 * filters by city slug. Airports are always exposed (no `active` flag).
 *
 * Requirements: R17.4, R17.5.
 * Design: §5.1, §5.2.
 */

import { getSnapshot } from "./snapshot";
import { readStr } from "./row-readers";
import type { Airport, AirportSummary } from "./types";

function mapAirportRow(row: unknown): Airport | null {
  const id = readStr(row, "id");
  const code = readStr(row, "code");
  const cityId = readStr(row, "city_id");
  const name = readStr(row, "name");
  if (id === null) {
    console.warn("[content] malformed airports row: missing id");
    return null;
  }
  if (code === null) {
    console.warn(`[content] malformed airports row ${id}: missing code`);
    return null;
  }
  if (cityId === null) {
    console.warn(`[content] malformed airports row ${code}: missing city_id`);
    return null;
  }
  if (name === null) {
    console.warn(`[content] malformed airports row ${code}: missing name`);
    return null;
  }
  return { id, code, cityId, name };
}

function buildCitySlugIndex(): Map<string, string> {
  const snapshot = getSnapshot();
  const index = new Map<string, string>();
  for (const row of snapshot.cities) {
    const id = readStr(row, "id");
    const slug = readStr(row, "slug");
    if (id === null || slug === null) continue;
    index.set(id, slug);
  }
  return index;
}

/**
 * Return every airport with its parent city's slug resolved. `citySlug`
 * is `null` when the parent `cities` row is missing from the snapshot
 * (which indicates upstream data drift, not a user-visible concern).
 */
export function listAirports(): AirportSummary[] {
  const snapshot = getSnapshot();
  const citySlugById = buildCitySlugIndex();

  const out: AirportSummary[] = [];
  for (const row of snapshot.airports) {
    const airport = mapAirportRow(row);
    if (airport === null) continue;
    out.push({ ...airport, citySlug: citySlugById.get(airport.cityId) ?? null });
  }
  out.sort((a, b) => a.code.localeCompare(b.code));
  return out;
}

/** Return the airports whose parent city has the given `citySlug`. */
export function listAirportsForCity(citySlug: string): Airport[] {
  const snapshot = getSnapshot();

  // Resolve slug → cityId up front.
  let cityId: string | null = null;
  for (const row of snapshot.cities) {
    if (readStr(row, "slug") === citySlug) {
      cityId = readStr(row, "id");
      break;
    }
  }
  if (cityId === null) return [];

  const out: Airport[] = [];
  // Airports carry their own `city_id` column, so we can skip the
  // `city_airports` join for the direct case. We still consult
  // `city_airports` so that alias-style attachments (an airport bound to
  // more than one city) are honoured.
  const airportsById = new Map<string, Airport>();
  for (const row of snapshot.airports) {
    const airport = mapAirportRow(row);
    if (airport === null) continue;
    airportsById.set(airport.id, airport);
    if (airport.cityId === cityId) out.push(airport);
  }

  const seen = new Set(out.map((a) => a.id));
  for (const row of snapshot.cityAirports) {
    if (readStr(row, "city_id") !== cityId) continue;
    const airportId = readStr(row, "airport_id");
    if (airportId === null) continue;
    if (seen.has(airportId)) continue;
    const airport = airportsById.get(airportId);
    if (airport === undefined) continue;
    seen.add(airportId);
    out.push(airport);
  }

  out.sort((a, b) => a.code.localeCompare(b.code));
  return out;
}
