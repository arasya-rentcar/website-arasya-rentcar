import * as React from "react";
import { Lightbulb } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * MDX <Tip /> — allowlisted narrative component (R23.3, design §4.4).
 *
 * Lightweight one-liner used inline inside MDX prose for practical
 * micro-advice:
 *
 *   <Tip>Book a day ahead for airport pickups during long weekends.</Tip>
 *
 * Intentionally flatter than <Callout> so it reads like a margin note
 * rather than a boxed callout. Server-safe, no client boundary.
 */
export interface TipProps {
  children: React.ReactNode;
  className?: string;
}

export function Tip({ children, className }: TipProps): React.ReactElement {
  return (
    <p
      role="note"
      className={cn(
        "my-3 flex items-start gap-2 rounded-md border border-[var(--color-accent-200)] bg-[var(--color-accent-50)] px-3 py-2 text-sm leading-relaxed text-[var(--color-accent-900)]",
        className,
      )}
    >
      <Lightbulb
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-[var(--color-accent-600)]"
      />
      <span>
        <span className="mr-1 font-semibold">Tip:</span>
        {children}
      </span>
    </p>
  );
}

export default Tip;
