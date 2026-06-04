import Link from "next/link";

import ResponsiveImage from "@/components/ui/ResponsiveImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  catalogCategoryLabel,
  catalogDisplayName,
  catalogKey,
  VEHICLE_CATALOG,
  type CatalogVehicle,
  type VehicleCategory,
} from "@/lib/content/vehicles-catalog";
import type { Locale } from "@/lib/i18n/getDictionary";
import { vehicleSlugPath } from "@/lib/i18n/slugMap";

/**
 * Responsive grid that renders every entry in the static
 * {@link VEHICLE_CATALOG}.
 *
 * Server Component — no client bundle. The grid is grouped by
 * {@link VehicleCategory} so MPVs, Premium, and Vans appear under their
 * own heading; this matches how Indonesian rental shoppers think about
 * vehicle classes.
 *
 * Responsiveness:
 *
 *   - Phones (<640px)   1 column
 *   - Tablets (640+)    2 columns
 *   - Laptops (1024+)   3 columns
 *   - Desktops (1280+)  4 columns
 *
 * Each card uses an explicit `aspect-[4/3]` photo well with `object-contain`
 * so the supplied studio shots never crop or distort regardless of viewport.
 *
 * Cards whose catalog entry maps to a Structured_Content_Store row
 * (`dbSlug !== null`) link to the vehicle-detail page; the rest expose a
 * "WhatsApp inquiry" CTA so the operator never sends a visitor to a 404.
 */

/** Placeholder admin WhatsApp target — same convention used elsewhere. */
const WHATSAPP_PLACEHOLDER_DIGITS = "628123456789";

/**
 * Build an inquiry `wa.me` URL for a single catalog entry. Mirrors the
 * shape produced by `buildGenericWaUrl` so a future swap to the live
 * helper only changes one constant.
 */
function buildInquiryHref(vehicle: CatalogVehicle, locale: Locale): string {
  const message =
    locale === "id"
      ? `Halo Admin Arasya, saya tertarik menyewa ${vehicle.displayNameId} dengan supir.`
      : `Hello Arasya Admin, I'd like to rent the ${vehicle.displayNameEn} with a chauffeur.`;
  const params = new URLSearchParams({ text: message });
  return `https://wa.me/${WHATSAPP_PLACEHOLDER_DIGITS}?${params.toString()}`;
}

interface CategorySectionProps {
  readonly heading: string;
  readonly vehicles: readonly CatalogVehicle[];
  readonly locale: Locale;
  readonly seatsLabel: string;
  readonly luggageLabel: string;
  readonly viewLabel: string;
  readonly inquiryLabel: string;
}

function CategorySection({
  heading,
  vehicles,
  locale,
  seatsLabel,
  luggageLabel,
  viewLabel,
  inquiryLabel,
}: CategorySectionProps): React.JSX.Element | null {
  if (vehicles.length === 0) return null;
  return (
    <section aria-labelledby={`fleet-${slugifyHeading(heading)}`}>
      <h2
        id={`fleet-${slugifyHeading(heading)}`}
        className="mb-6 text-2xl font-bold tracking-tight md:text-3xl"
      >
        {heading}
      </h2>
      <ul
        role="list"
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {vehicles.map((vehicle) => {
          const key = catalogKey(vehicle);
          const displayName = catalogDisplayName(vehicle, locale);
          const detailHref =
            vehicle.dbSlug === null
              ? null
              : vehicleSlugPath(locale, vehicle.dbSlug);
          const inquiryHref = buildInquiryHref(vehicle, locale);
          const ratioLabel = `${vehicle.seats} ${seatsLabel} · ${vehicle.luggage} ${luggageLabel}`;

          return (
            <li key={key} className="h-full">
              <Card className="flex h-full flex-col overflow-hidden">
                {/*
                 * 4:3 photo well — `aspect-[4/3]` reserves layout space
                 * and `object-contain` keeps the studio shot intact on
                 * every breakpoint. A neutral background fills the
                 * letterbox area for transparent PNG borders.
                 */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--muted)]">
                  <ResponsiveImage
                    src={vehicle.image}
                    alt={`${displayName} — sewa dengan supir profesional`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    className="object-contain p-3"
                  />
                  {vehicle.variant === null ? null : (
                    <Badge
                      variant="secondary"
                      className="absolute right-3 top-3 shadow-sm"
                    >
                      {vehicle.variant}
                    </Badge>
                  )}
                </div>

                <CardHeader className="gap-1">
                  <CardTitle className="text-lg leading-snug">
                    {displayName}
                  </CardTitle>
                  <CardDescription>{ratioLabel}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {locale === "id"
                      ? "Termasuk supir profesional, BBM, dan perawatan."
                      : "Includes professional chauffeur, fuel, and maintenance."}
                  </p>
                </CardContent>

                <CardFooter className="flex flex-col gap-2 sm:flex-row">
                  {detailHref === null ? (
                    <Button asChild className="w-full sm:flex-1">
                      <a
                        href={inquiryHref}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {inquiryLabel}
                      </a>
                    </Button>
                  ) : (
                    <>
                      <Button asChild className="w-full sm:flex-1">
                        <Link href={detailHref}>{viewLabel}</Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className="w-full sm:flex-1"
                      >
                        <a
                          href={inquiryHref}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {inquiryLabel}
                        </a>
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function slugifyHeading(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface VehicleCatalogGridProps {
  readonly locale: Locale;
}

export default function VehicleCatalogGrid({
  locale,
}: VehicleCatalogGridProps): React.JSX.Element {
  const isId = locale === "id";
  const seatsLabel = isId ? "kursi" : "seats";
  const luggageLabel = isId ? "bagasi" : "bags";
  const viewLabel = isId ? "Lihat detail" : "See details";
  const inquiryLabel = isId ? "Tanya via WhatsApp" : "Ask on WhatsApp";

  // Group catalog by category, preserving the catalog order within each group.
  const groups: Record<VehicleCategory, CatalogVehicle[]> = {
    mpv: [],
    premium: [],
    van: [],
  };
  for (const vehicle of VEHICLE_CATALOG) {
    groups[vehicle.category].push(vehicle);
  }

  return (
    <div className="flex flex-col gap-12">
      <CategorySection
        heading={catalogCategoryLabel("mpv", locale)}
        vehicles={groups.mpv}
        locale={locale}
        seatsLabel={seatsLabel}
        luggageLabel={luggageLabel}
        viewLabel={viewLabel}
        inquiryLabel={inquiryLabel}
      />
      <CategorySection
        heading={catalogCategoryLabel("premium", locale)}
        vehicles={groups.premium}
        locale={locale}
        seatsLabel={seatsLabel}
        luggageLabel={luggageLabel}
        viewLabel={viewLabel}
        inquiryLabel={inquiryLabel}
      />
      <CategorySection
        heading={catalogCategoryLabel("van", locale)}
        vehicles={groups.van}
        locale={locale}
        seatsLabel={seatsLabel}
        luggageLabel={luggageLabel}
        viewLabel={viewLabel}
        inquiryLabel={inquiryLabel}
      />
    </div>
  );
}
