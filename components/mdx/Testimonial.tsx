import * as React from "react";
import { Quote } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * MDX <Testimonial /> — allowlisted narrative component (R23.3, design §4.4).
 *
 * Pull-quote style testimonial with optional author role (e.g. company,
 * trip type). Uses semantic `<blockquote>` + `<figcaption>` so the
 * attribution is correctly associated with the quote for assistive tech.
 *
 *   <Testimonial
 *     quote="Driver was punctual and the Innova was spotless."
 *     author="Andi R."
 *     role="Corporate client, Jakarta"
 *   />
 *
 * Server-safe — no client boundary needed.
 */
export interface TestimonialProps {
  quote: string;
  author: string;
  role?: string;
  className?: string;
}

export function Testimonial({
  quote,
  author,
  role,
  className,
}: TestimonialProps): React.ReactElement {
  return (
    <figure
      className={cn(
        "my-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm",
        className,
      )}
    >
      <Quote
        aria-hidden
        className="mb-3 size-5 text-[var(--color-accent-500)]"
      />
      <blockquote className="m-0 text-base leading-relaxed text-[var(--card-foreground)]">
        <p className="m-0 italic">{`\u201C${quote}\u201D`}</p>
      </blockquote>
      <figcaption className="mt-3 text-sm text-[var(--muted-foreground)]">
        <span className="font-semibold text-[var(--foreground)]">{author}</span>
        {role ? <span className="ms-1">· {role}</span> : null}
      </figcaption>
    </figure>
  );
}

export default Testimonial;
