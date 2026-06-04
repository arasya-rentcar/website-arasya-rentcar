#!/usr/bin/env node
/**
 * scripts/dev-snapshot.ts
 *
 * Generate a structured-content snapshot from the seed data without
 * touching Supabase. Used for local dev (`pnpm dev`) and CI smoke
 * builds when no real database is reachable.
 *
 * The output mirrors `scripts/content-snapshot.ts` but reads from
 * inline TypeScript fixtures derived from `supabase/seed.sql` instead
 * of a live Postgres connection. Re-run whenever the seed changes.
 *
 * Usage:
 *   pnpm dev:snapshot
 *   pnpm exec tsx scripts/dev-snapshot.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");
const CACHE_DIR = resolve(PROJECT_ROOT, ".next", "cache");
const SNAPSHOT_PATH = resolve(CACHE_DIR, "content-snapshot.json");

// -----------------------------------------------------------------------------
// UUID anchors (mirror supabase/seed.sql)
// -----------------------------------------------------------------------------

const CITY_BOGOR = "11111111-1111-4111-8111-111111111111";
const CITY_JAKARTA = "11111111-1111-4111-8111-222222222222";
const CITY_BANDUNG = "11111111-1111-4111-8111-333333333333";
const CITY_PURWAKARTA = "11111111-1111-4111-8111-444444444444";

const COUNTRY_SINGAPORE = "22222222-2222-4222-8222-111111111111";

const VEHICLE_INNOVA = "33333333-3333-4333-8333-111111111111";
const VEHICLE_HIACE = "33333333-3333-4333-8333-222222222222";

const SERVICE_CORPORATE = "44444444-4444-4444-8444-111111111111";
const SERVICE_AIRPORT = "44444444-4444-4444-8444-222222222222";

const AIRPORT_CGK = "55555555-5555-4555-8555-111111111111";
const AIRPORT_HLP = "55555555-5555-4555-8555-222222222222";
const AIRPORT_BDO = "55555555-5555-4555-8555-333333333333";

// -----------------------------------------------------------------------------
// Snapshot data
// -----------------------------------------------------------------------------

const snapshot = {
  cities: [
    {
      id: CITY_BOGOR,
      slug: "bogor",
      parent_region: "Jawa Barat",
      country_code: "ID",
      latitude: -6.595,
      longitude: 106.8167,
      coverage_state: "launched",
      allow_index: true,
      featured_order: 1,
      launch_priority: 100,
      pricing_hint_from: 350000,
      pricing_hint_to: 700000,
      chauffeur_only: true,
      active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: CITY_JAKARTA,
      slug: "jakarta",
      parent_region: "DKI Jakarta",
      country_code: "ID",
      latitude: -6.2088,
      longitude: 106.8456,
      coverage_state: "launched",
      allow_index: true,
      featured_order: 2,
      launch_priority: 90,
      pricing_hint_from: 400000,
      pricing_hint_to: 900000,
      chauffeur_only: true,
      active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: CITY_BANDUNG,
      slug: "bandung",
      parent_region: "Jawa Barat",
      country_code: "ID",
      latitude: -6.9175,
      longitude: 107.6191,
      coverage_state: "launched",
      allow_index: true,
      featured_order: 3,
      launch_priority: 80,
      pricing_hint_from: 400000,
      pricing_hint_to: 800000,
      chauffeur_only: true,
      active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: CITY_PURWAKARTA,
      slug: "purwakarta",
      parent_region: "Jawa Barat",
      country_code: "ID",
      latitude: -6.5569,
      longitude: 107.4434,
      coverage_state: "coverable",
      allow_index: false,
      featured_order: null,
      launch_priority: 10,
      pricing_hint_from: 350000,
      pricing_hint_to: 700000,
      chauffeur_only: true,
      active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],

  cityTranslations: [
    {
      city_id: CITY_BOGOR,
      locale: "id",
      display_name: "Bogor",
      short_blurb:
        "Kota hujan dengan udara sejuk, dekat Jakarta — ideal untuk getaway akhir pekan bersama sopir.",
    },
    {
      city_id: CITY_BOGOR,
      locale: "en",
      display_name: "Bogor",
      short_blurb:
        "Cool hill town just outside Jakarta — great for a chauffeured weekend escape.",
    },
    {
      city_id: CITY_JAKARTA,
      locale: "id",
      display_name: "Jakarta",
      short_blurb:
        "Ibu kota yang sibuk; sopir kami tahu jalan tikus dan jadwal ganjil-genap.",
    },
    {
      city_id: CITY_JAKARTA,
      locale: "en",
      display_name: "Jakarta",
      short_blurb:
        "Indonesia's busy capital — our chauffeurs know the shortcuts and odd-even schedule.",
    },
    {
      city_id: CITY_BANDUNG,
      locale: "id",
      display_name: "Bandung",
      short_blurb:
        "Kota sejuk di dataran tinggi Priangan, pusat kuliner dan factory outlet.",
    },
    {
      city_id: CITY_BANDUNG,
      locale: "en",
      display_name: "Bandung",
      short_blurb:
        "Highland city known for its cool weather, food scene, and factory outlets.",
    },
    {
      city_id: CITY_PURWAKARTA,
      locale: "id",
      display_name: "Purwakarta",
      short_blurb:
        "Jalur Bandung–Jakarta; armada dengan sopir tersedia atas permintaan.",
    },
    {
      city_id: CITY_PURWAKARTA,
      locale: "en",
      display_name: "Purwakarta",
      short_blurb:
        "On the Jakarta–Bandung corridor; chauffeur cars available by request.",
    },
  ],

  countries: [
    {
      id: COUNTRY_SINGAPORE,
      slug: "singapore",
      country_code: "SG",
      chauffeur_only: true,
      active: true,
      allow_index: true,
      featured_order: 1,
      launch_priority: 50,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],

  countryTranslations: [
    {
      country_id: COUNTRY_SINGAPORE,
      locale: "id",
      display_name: "Singapura",
    },
    {
      country_id: COUNTRY_SINGAPORE,
      locale: "en",
      display_name: "Singapore",
    },
  ],

  vehicles: [
    {
      id: VEHICLE_INNOVA,
      slug: "innova",
      seats: 7,
      luggage: 4,
      chauffeur_only: true,
      active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: VEHICLE_HIACE,
      slug: "hiace",
      seats: 14,
      luggage: 8,
      chauffeur_only: true,
      active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],

  vehicleTranslations: [
    {
      vehicle_id: VEHICLE_INNOVA,
      locale: "id",
      display_name: "Toyota Innova Reborn",
    },
    {
      vehicle_id: VEHICLE_INNOVA,
      locale: "en",
      display_name: "Toyota Innova Reborn",
    },
    {
      vehicle_id: VEHICLE_HIACE,
      locale: "id",
      display_name: "Toyota Hiace Premio",
    },
    {
      vehicle_id: VEHICLE_HIACE,
      locale: "en",
      display_name: "Toyota Hiace Premio",
    },
  ],

  services: [
    {
      id: SERVICE_CORPORATE,
      slug: "corporate",
      chauffeur_only: true,
      active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: SERVICE_AIRPORT,
      slug: "airport-transfer",
      chauffeur_only: true,
      active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],

  serviceTranslations: [
    {
      service_id: SERVICE_CORPORATE,
      locale: "id",
      display_name: "Sewa Mobil Korporat dengan Supir",
    },
    {
      service_id: SERVICE_CORPORATE,
      locale: "en",
      display_name: "Corporate Chauffeur Service",
    },
    {
      service_id: SERVICE_AIRPORT,
      locale: "id",
      display_name: "Antar Jemput Bandara dengan Sopir",
    },
    {
      service_id: SERVICE_AIRPORT,
      locale: "en",
      display_name: "Airport Transfer with Chauffeur",
    },
  ],

  airports: [
    {
      id: AIRPORT_CGK,
      code: "CGK",
      city_id: CITY_JAKARTA,
      name: "Soekarno–Hatta International Airport",
    },
    {
      id: AIRPORT_HLP,
      code: "HLP",
      city_id: CITY_JAKARTA,
      name: "Halim Perdanakusuma International Airport",
    },
    {
      id: AIRPORT_BDO,
      code: "BDO",
      city_id: CITY_BANDUNG,
      name: "Husein Sastranegara International Airport",
    },
  ],

  cityVehicles: [
    { city_id: CITY_BOGOR, vehicle_id: VEHICLE_INNOVA },
    { city_id: CITY_BOGOR, vehicle_id: VEHICLE_HIACE },
    { city_id: CITY_JAKARTA, vehicle_id: VEHICLE_INNOVA },
    { city_id: CITY_JAKARTA, vehicle_id: VEHICLE_HIACE },
    { city_id: CITY_BANDUNG, vehicle_id: VEHICLE_INNOVA },
    { city_id: CITY_BANDUNG, vehicle_id: VEHICLE_HIACE },
  ],

  cityAirports: [
    { city_id: CITY_JAKARTA, airport_id: AIRPORT_CGK },
    { city_id: CITY_JAKARTA, airport_id: AIRPORT_HLP },
    { city_id: CITY_BANDUNG, airport_id: AIRPORT_BDO },
    { city_id: CITY_BOGOR, airport_id: AIRPORT_CGK },
  ],

  cityRelated: [
    { city_id: CITY_BOGOR, related_city_id: CITY_JAKARTA, rank: 1 },
    { city_id: CITY_BOGOR, related_city_id: CITY_BANDUNG, rank: 2 },
    { city_id: CITY_BOGOR, related_city_id: CITY_PURWAKARTA, rank: 3 },
    { city_id: CITY_JAKARTA, related_city_id: CITY_BOGOR, rank: 1 },
    { city_id: CITY_JAKARTA, related_city_id: CITY_BANDUNG, rank: 2 },
    { city_id: CITY_BANDUNG, related_city_id: CITY_JAKARTA, rank: 1 },
    { city_id: CITY_BANDUNG, related_city_id: CITY_BOGOR, rank: 2 },
    { city_id: CITY_BANDUNG, related_city_id: CITY_PURWAKARTA, rank: 3 },
    { city_id: CITY_PURWAKARTA, related_city_id: CITY_BANDUNG, rank: 1 },
    { city_id: CITY_PURWAKARTA, related_city_id: CITY_JAKARTA, rank: 2 },
  ],

  cityAliases: [
    {
      alias_slug: "jakarta-pusat",
      canonical_city_id: CITY_JAKARTA,
    },
    {
      alias_slug: "bandoeng",
      canonical_city_id: CITY_BANDUNG,
    },
  ],

  generatedAt: new Date().toISOString(),
};

// -----------------------------------------------------------------------------
// Write
// -----------------------------------------------------------------------------

mkdirSync(CACHE_DIR, { recursive: true });
writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), "utf8");

const tableSummary = (
  [
    "cities",
    "cityTranslations",
    "countries",
    "countryTranslations",
    "vehicles",
    "vehicleTranslations",
    "services",
    "serviceTranslations",
    "airports",
    "cityVehicles",
    "cityAirports",
    "cityRelated",
    "cityAliases",
  ] as const
)
  .map((k) => {
    const arr = snapshot[k];
    if (!Array.isArray(arr)) return `${k}=?`;
    return `${k}=${arr.length}`;
  })
  .join(", ");

console.log(`[dev-snapshot] wrote ${SNAPSHOT_PATH}`);
console.log(`[dev-snapshot] ${tableSummary}`);
process.exit(0);
