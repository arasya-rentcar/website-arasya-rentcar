/**
 * Shared data-resolver for the Service_Page route (task 7.13).
 *
 * `app/[locale]/layanan/[service]/page.tsx` and its English mirror
 * `app/[locale]/services/[service]/page.tsx` both render the same
 * `ServiceTemplate`; the twin routes keep the URL shape R3.2 / R3.3
 * demands while sharing a single Content_Layer call chain. This helper
 * encapsulates that chain so both route files can stay thin — mirroring
 * the pattern established for cities, countries, and vehicles.
 *
 * Requirements:
 * - R5.8   — a Service_Page is generated per active Service.
 * - R9.x   — template props alignment (see `ServiceTemplate`): the
 *            Service_Page expects narrative fields plus a caller-prepared
 *            list of cities offering the service.
 * - R17.4  — pages depend only on the Content_Layer public API.
 * - R17.7  — only the loader modules touch Supabase / MDX directly.
 *
 * Design: §9 (Service_Page), §18 (i18n routing).
 *
 * Pure server-side module. No network I/O, no Supabase access of its own.
 */

import {
  getCities,
  getService,
  type CitySummary,
  type Locale,
  type ServiceWithNarrative,
} from "@/lib/content";
import { getDictionary, type Dictionary } from "@/lib/i18n/getDictionary";

export interface ServicePageData {
  readonly service: ServiceWithNarrative;
  readonly serviceCities: CitySummary[];
  readonly dict: Dictionary;
}

/**
 * R9.x upper bound on the service-cities section. The template applies
 * the same cap defensively; enforcing it here as well keeps the array
 * the route hands off pre-capped so the template never sees an oversized
 * input in development builds.
 */
const SERVICE_CITIES_MAX = 12;

/**
 * Resolve every feeder the Service_Page template needs for `{slug}` in
 * `{locale}`, or `null` when the service does not exist / has no
 * translation in that locale / is inactive. Route handlers should surface
 * `null` as a `notFound()` (R3.5 — 404 in the locale of the path prefix).
 *
 * Service-cities derivation (MVP):
 *   The structured store does not yet carry a `city_services` join table;
 *   until that lands, the MVP assumes every active Service is offered in
 *   every launched city. We start from the launched-cities cohort and
 *   project each entry down to the `CitySummary` shape the template
 *   consumes, capped at {@link SERVICE_CITIES_MAX} to honour the R9.x
 *   upper bound.
 *
 * TODO(phase 8+): once the `city_services` join exists, swap the naive
 * "every launched city" assumption for a real membership check so
 * service-specific availability maps the way city_vehicles does for the
 * Vehicle_Page.
 */
export async function resolveServicePageData(
  locale: Locale,
  slug: string,
): Promise<ServicePageData | null> {
  const service = await getService(slug, locale);
  if (service === null) {
    return null;
  }
  // R5.8: Service_Page generation is limited to active services. `getService`
  // already excludes inactive rows at the structured-loader layer, so
  // reaching here implies `service.active === true`. Belt-and-suspenders.
  if (!service.active) {
    return null;
  }

  const [cities, dict] = await Promise.all([
    getCities(locale, { coverage: ["launched"] }),
    getDictionary(locale),
  ]);

  const serviceCities: CitySummary[] = cities
    .slice(0, SERVICE_CITIES_MAX)
    .map((city) => ({
      id: city.id,
      slug: city.slug,
      parentRegion: city.parentRegion,
      countryCode: city.countryCode,
      lat: city.lat,
      lng: city.lng,
      coverageState: city.coverageState,
      allowIndex: city.allowIndex,
      featuredOrder: city.featuredOrder,
      launchPriority: city.launchPriority,
      pricingHint: city.pricingHint,
      displayName: city.displayName,
    }));

  return { service, serviceCities, dict };
}
