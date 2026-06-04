/**
 * Structured Service loader.
 *
 * Reads `services` + `service_translations` from the snapshot (task 4.2)
 * and maps to {@link Service} / {@link ServiceTranslation}. Inactive
 * services are excluded from listings.
 *
 * Requirements: R17.4, R17.5.
 * Design: §5.1, §5.2.
 */

import { getSnapshot } from "./snapshot";
import { isRecord, readBool, readEnum, readStr } from "./row-readers";
import type { Locale, Service, ServiceTranslation } from "./types";

const LOCALES: readonly Locale[] = ["id", "en"];

function mapServiceRow(row: unknown): Service | null {
  const id = readStr(row, "id");
  const slug = readStr(row, "slug");
  if (id === null) {
    console.warn("[content] malformed services row: missing id");
    return null;
  }
  if (slug === null) {
    console.warn(`[content] malformed services row ${id}: missing slug`);
    return null;
  }
  return {
    id,
    slug,
    active: readBool(row, "active", true),
  };
}

function mapServiceTranslationRow(
  row: unknown,
): (ServiceTranslation & { serviceId: string }) | null {
  const serviceId = readStr(row, "service_id");
  const locale = readEnum<Locale>(row, "locale", LOCALES);
  const displayName = readStr(row, "display_name");
  if (serviceId === null) {
    console.warn("[content] malformed service_translations row: missing service_id");
    return null;
  }
  if (locale === null) {
    console.warn(
      `[content] malformed service_translations row ${serviceId}: invalid locale`,
    );
    return null;
  }
  if (displayName === null) {
    console.warn(
      `[content] malformed service_translations row ${serviceId}/${locale}: missing display_name`,
    );
    return null;
  }
  return { serviceId, locale, displayName };
}

function buildServiceTranslationIndex(): Map<string, ServiceTranslation> {
  const snapshot = getSnapshot();
  const index = new Map<string, ServiceTranslation>();
  for (const row of snapshot.serviceTranslations) {
    const mapped = mapServiceTranslationRow(row);
    if (mapped === null) continue;
    index.set(`${mapped.serviceId}\u0000${mapped.locale}`, {
      locale: mapped.locale,
      displayName: mapped.displayName,
    });
  }
  return index;
}

/** Return every active Service joined to its translation for `locale`. */
export function listServices(locale: Locale): (Service & ServiceTranslation)[] {
  const snapshot = getSnapshot();
  const translations = buildServiceTranslationIndex();

  const out: (Service & ServiceTranslation)[] = [];
  for (const row of snapshot.services) {
    const service = mapServiceRow(row);
    if (service === null) continue;
    if (!service.active) continue;
    const translation = translations.get(`${service.id}\u0000${locale}`);
    if (translation === undefined) {
      console.warn(
        `[content] services/${service.slug} missing ${locale} translation; skipped in listServices`,
      );
      continue;
    }
    out.push({ ...service, ...translation });
  }
  out.sort((a, b) => a.slug.localeCompare(b.slug));
  return out;
}

/**
 * Lookup a service by slug + locale. Returns null if the service is
 * missing, inactive, or has no translation in `locale`.
 */
export function getServiceBySlug(
  slug: string,
  locale: Locale,
): (Service & ServiceTranslation) | null {
  const snapshot = getSnapshot();
  for (const row of snapshot.services) {
    if (!isRecord(row)) continue;
    if (row["slug"] !== slug) continue;
    const service = mapServiceRow(row);
    if (service === null) return null;
    if (!service.active) return null;

    const translations = buildServiceTranslationIndex();
    const translation = translations.get(`${service.id}\u0000${locale}`);
    if (translation === undefined) return null;
    return { ...service, ...translation };
  }
  return null;
}
