import * as React from "react";
import { MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * MDX <Landmark /> — allowlisted narrative component (R23.3, design §4.4).
 *
 * Used by city MDX (Bogor, Jakarta, Bandung, …) to call out a local
 * point-of-interest with an optional short note — e.g.:
 *
 *   <Landmark name="Kebun Raya Bogor" note="Historic botanical garden" />
 *
 * Renders a small card-like row with a MapPin icon and a two-line layout.
 * Server-safe (no state). Uses shadcn semantic variables (`--card`,
 * `--border`, `--muted-foreground`) so dark-mode carries through.
 */
export interface LandmarkProps {
  name: string;
  note?: string;
  className?: string;
}

export function Landmark({
  name,
  note,
  className,
}: LandmarkProps): React.ReactElement {
  return (
    <figure
      className={cn(
        "my-3 flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm",
        className,
      )}
    >
      <MapPin
        aria-hidden
        className="mt-0.5 size-5 shrink-0 text-[var(--color-primary-600)]"
      />
      <figcaption className="flex-1">
        <p className="text-sm font-semibold tracking-tight text-[var(--card-foreground)]">
          {name}
        </p>
        {note ? (
          <p className="mt-0.5 text-sm leading-snug text-[var(--muted-foreground)]">
            {note}
          </p>
        ) : null}
      </figcaption>
    </figure>
  );
}

export default Landmark;
