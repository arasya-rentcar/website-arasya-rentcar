import * as React from "react";
import Link from "next/link";
import { Users, Luggage } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * MDX <VehicleCard /> — allowlisted narrative component (R23.3, design §4.4).
 *
 * Small vehicle pitch used inline in city/service/article MDX to
 * cross-link to the armada / fleet detail page:
 *
 *   <VehicleCard
 *     slug="innova"
 *     name="Toyota Innova"
 *     seats={7}
 *     luggage={4}
 *     locale="id"
 *   />
 *
 * The `locale` prop is accepted explicitly for now so the component
 * stays server-safe and free of context wiring. A later task (7.x)
 * can wrap this with a locale-aware helper that injects `locale` from
 * the route segment, at which point the prop can become optional.
 *
 * Target URL: `/armada/{slug}` for `id`, `/en/fleet/{slug}` for `en`.
 * This matches the route layout in design §9 and the slugMap in
 * `lib/i18n/slugMap.ts`.
 */
export type VehicleCardLocale = "id" | "en";

export interface VehicleCardProps {
  slug: string;
  name: string;
  seats: number;
  luggage: number;
  locale: VehicleCardLocale;
  className?: string;
}

function buildVehicleHref(slug: string, locale: VehicleCardLocale): string {
  if (locale === "en") return `/en/fleet/${slug}`;
  return `/armada/${slug}`;
}

export function VehicleCard({
  slug,
  name,
  seats,
  luggage,
  locale,
  className,
}: VehicleCardProps): React.ReactElement {
  const href = buildVehicleHref(slug, locale);

  return (
    <Link
      href={href}
      className={cn(
        "my-4 flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition-colors hover:border-[var(--color-primary-400)] hover:bg-[var(--color-primary-50)] focus-visible:outline-2 focus-visible:outline-[var(--ring)]",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold tracking-tight text-[var(--card-foreground)]">
          {name}
        </p>
        <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted-foreground)]">
          <div className="flex items-center gap-1">
            <Users aria-hidden className="size-4" />
            <dt className="sr-only">Seats</dt>
            <dd>{seats} seats</dd>
          </div>
          <div className="flex items-center gap-1">
            <Luggage aria-hidden className="size-4" />
            <dt className="sr-only">Luggage</dt>
            <dd>{luggage} bags</dd>
          </div>
        </dl>
      </div>
      <span
        aria-hidden
        className="text-sm font-medium text-[var(--color-primary-600)]"
      >
        →
      </span>
    </Link>
  );
}

export default VehicleCard;
