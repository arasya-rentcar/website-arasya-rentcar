import * as React from "react";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * MDX <TripIdea /> — allowlisted narrative component (R23.3, design §4.4).
 *
 * City/country MDX uses this to propose an itinerary or use-case card:
 *
 *   <TripIdea title="Weekend escape from Jakarta">
 *     Route through Puncak to Kebun Raya Bogor and dinner in Sentul.
 *   </TripIdea>
 *
 * Presents as a soft card so a sequence of ideas reads like a menu.
 * Server-safe — no state, no client boundary.
 */
export interface TripIdeaProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function TripIdea({
  title,
  children,
  className,
}: TripIdeaProps): React.ReactElement {
  return (
    <section
      aria-label={title}
      className={cn(
        "my-5 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm",
        className,
      )}
    >
      <header className="mb-2 flex items-center gap-2">
        <Sparkles
          aria-hidden
          className="size-4 shrink-0 text-[var(--color-accent-500)]"
        />
        <h4 className="m-0 text-base font-semibold tracking-tight text-[var(--card-foreground)]">
          {title}
        </h4>
      </header>
      <div className="text-sm leading-relaxed text-[var(--muted-foreground)] [&>p]:m-0 [&>p+p]:mt-2">
        {children}
      </div>
    </section>
  );
}

export default TripIdea;
