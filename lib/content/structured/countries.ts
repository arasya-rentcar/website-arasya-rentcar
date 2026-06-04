/**
 * Structured Country loader.
 *
 * Reads `countries` + `country_translations` from the snapshot
 * (task 4.2) and maps to {@link Country} / {@link CountryTranslation}.
 * Countries whose `active` flag is false are excluded from public listings.
 *
 * Requirements: R17.4 (public loader surface), R17.5 (pure + typed).
 * Design: §5.1, §5.2.
 */

import { getSnapshot } from "./snapshot";
import { isRecord, readBool, readEnum, readStr } from "./row-readers";
import type { Country, CountryTranslation, Locale } from "./types";

const LOCALES: readonly Locale[] = ["id", "en"];

function mapCountryRow(row: unknown): Country | null {
  const id = readStr(row, "id");
  const slug = readStr(row, "slug");
  const countryCode = readStr(row, "country_code");
  if (id === null) {
    console.warn("[content] malformed countries row: missing id");
    return null;
  }
  if (slug === null) {
    console.warn(`[content] malformed countries row ${id}: missing slug`);
    return null;
  }
  if (countryCode === null) {
    console.warn(`[content] malformed countries row ${slug}: missing country_code`);
    return null;
  }
  return {
    id,
    slug,
    countryCode,
    active: readBool(row, "active", true),
  };
}

function mapCountryTranslationRow(
  row: unknown,
): (CountryTranslation & { countryId: string }) | null {
  const countryId = readStr(row, "country_id");
  const locale = readEnum<Locale>(row, "locale", LOCALES);
  const displayName = readStr(row, "display_name");
  if (countryId === null) {
    console.warn("[content] malformed country_translations row: missing country_id");
    return null;
  }
  if (locale === null) {
    console.warn(
      `[content] malformed country_translations row ${countryId}: invalid locale`,
    );
    return null;
  }
  if (displayName === null) {
    console.warn(
      `[content] malformed country_translations row ${countryId}/${locale}: missing display_name`,
    );
    return null;
  }
  return { countryId, locale, displayName };
}

function buildCountryTranslationIndex(): Map<string, CountryTranslation> {
  const snapshot = getSnapshot();
  const index = new Map<string, CountryTranslation>();
  for (const row of snapshot.countryTranslations) {
    const mapped = mapCountryTranslationRow(row);
    if (mapped === null) continue;
    index.set(`${mapped.countryId}\u0000${mapped.locale}`, {
      locale: mapped.locale,
      displayName: mapped.displayName,
    });
  }
  return index;
}

/** Return every active Country joined to its translation for `locale`. */
export function listCountries(locale: Locale): (Country & CountryTranslation)[] {
  const snapshot = getSnapshot();
  const translations = buildCountryTranslationIndex();

  const out: (Country & CountryTranslation)[] = [];
  for (const row of snapshot.countries) {
    const country = mapCountryRow(row);
    if (country === null) continue;
    if (!country.active) continue;
    const translation = translations.get(`${country.id}\u0000${locale}`);
    if (translation === undefined) {
      console.warn(
        `[content] countries/${country.slug} missing ${locale} translation; skipped in listCountries`,
      );
      continue;
    }
    out.push({ ...country, ...translation });
  }
  out.sort((a, b) => a.slug.localeCompare(b.slug));
  return out;
}

/**
 * Lookup a country by slug + locale. Returns null if the country is
 * missing, inactive, or has no translation in `locale`.
 */
export function getCountryBySlug(
  slug: string,
  locale: Locale,
): (Country & CountryTranslation) | null {
  const snapshot = getSnapshot();
  for (const row of snapshot.countries) {
    if (!isRecord(row)) continue;
    if (row["slug"] !== slug) continue;
    const country = mapCountryRow(row);
    if (country === null) return null;
    if (!country.active) return null;

    const translations = buildCountryTranslationIndex();
    const translation = translations.get(`${country.id}\u0000${locale}`);
    if (translation === undefined) return null;
    return { ...country, ...translation };
  }
  return null;
}
