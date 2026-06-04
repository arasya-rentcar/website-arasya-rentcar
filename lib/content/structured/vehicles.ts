/**
 * Structured Vehicle loader.
 *
 * Reads `vehicles` + `vehicle_translations` from the snapshot (task 4.2)
 * and maps to {@link Vehicle} / {@link VehicleTranslation} /
 * {@link VehicleSummary}. Inactive vehicles are excluded from listings.
 *
 * Requirements: R17.4 (public loader surface), R17.5 (pure + typed).
 * Design: §5.1, §5.2.
 */

import { getSnapshot } from "./snapshot";
import {
  isRecord,
  readBool,
  readEnum,
  readInt,
  readStr,
} from "./row-readers";
import type {
  Locale,
  Vehicle,
  VehicleSummary,
  VehicleTranslation,
} from "./types";

const LOCALES: readonly Locale[] = ["id", "en"];

function mapVehicleRow(row: unknown): Vehicle | null {
  const id = readStr(row, "id");
  const slug = readStr(row, "slug");
  const seats = readInt(row, "seats");
  const luggage = readInt(row, "luggage");
  if (id === null) {
    console.warn("[content] malformed vehicles row: missing id");
    return null;
  }
  if (slug === null) {
    console.warn(`[content] malformed vehicles row ${id}: missing slug`);
    return null;
  }
  if (seats === null) {
    console.warn(`[content] malformed vehicles row ${slug}: missing seats`);
    return null;
  }
  if (luggage === null) {
    console.warn(`[content] malformed vehicles row ${slug}: missing luggage`);
    return null;
  }
  return {
    id,
    slug,
    seats,
    luggage,
    active: readBool(row, "active", true),
  };
}

function mapVehicleTranslationRow(
  row: unknown,
): (VehicleTranslation & { vehicleId: string }) | null {
  const vehicleId = readStr(row, "vehicle_id");
  const locale = readEnum<Locale>(row, "locale", LOCALES);
  const displayName = readStr(row, "display_name");
  if (vehicleId === null) {
    console.warn("[content] malformed vehicle_translations row: missing vehicle_id");
    return null;
  }
  if (locale === null) {
    console.warn(
      `[content] malformed vehicle_translations row ${vehicleId}: invalid locale`,
    );
    return null;
  }
  if (displayName === null) {
    console.warn(
      `[content] malformed vehicle_translations row ${vehicleId}/${locale}: missing display_name`,
    );
    return null;
  }
  return { vehicleId, locale, displayName };
}

function buildVehicleTranslationIndex(): Map<string, VehicleTranslation> {
  const snapshot = getSnapshot();
  const index = new Map<string, VehicleTranslation>();
  for (const row of snapshot.vehicleTranslations) {
    const mapped = mapVehicleTranslationRow(row);
    if (mapped === null) continue;
    index.set(`${mapped.vehicleId}\u0000${mapped.locale}`, {
      locale: mapped.locale,
      displayName: mapped.displayName,
    });
  }
  return index;
}

/** Return every active Vehicle joined to its translation for `locale`. */
export function listVehicles(locale: Locale): VehicleSummary[] {
  const snapshot = getSnapshot();
  const translations = buildVehicleTranslationIndex();

  const out: VehicleSummary[] = [];
  for (const row of snapshot.vehicles) {
    const vehicle = mapVehicleRow(row);
    if (vehicle === null) continue;
    if (!vehicle.active) continue;
    const translation = translations.get(`${vehicle.id}\u0000${locale}`);
    if (translation === undefined) {
      console.warn(
        `[content] vehicles/${vehicle.slug} missing ${locale} translation; skipped in listVehicles`,
      );
      continue;
    }
    out.push({ ...vehicle, displayName: translation.displayName });
  }
  out.sort((a, b) => a.slug.localeCompare(b.slug));
  return out;
}

/**
 * Lookup a vehicle by slug + locale. Returns null if the vehicle is
 * missing, inactive, or has no translation in `locale`.
 */
export function getVehicleBySlug(
  slug: string,
  locale: Locale,
): (Vehicle & VehicleTranslation) | null {
  const snapshot = getSnapshot();
  for (const row of snapshot.vehicles) {
    if (!isRecord(row)) continue;
    if (row["slug"] !== slug) continue;
    const vehicle = mapVehicleRow(row);
    if (vehicle === null) return null;
    if (!vehicle.active) return null;

    const translations = buildVehicleTranslationIndex();
    const translation = translations.get(`${vehicle.id}\u0000${locale}`);
    if (translation === undefined) return null;
    return { ...vehicle, ...translation };
  }
  return null;
}
