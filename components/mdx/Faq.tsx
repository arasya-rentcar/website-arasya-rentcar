"use client";

import * as React from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

/**
 * MDX <FAQ /> — allowlisted narrative component (R23.3, design §4.4).
 *
 * Two authoring shapes are accepted so MDX stays terse:
 *
 *   Single-item form (most common in city/service MDX):
 *     <FAQ q="…?" a="…" />
 *
 *   Batch form (for a bundled FAQ section):
 *     <FAQ items={[{ q: "…?", a: "…" }, { q: "…?", a: "…" }]} />
 *
 * Uses shadcn `Accordion` underneath, which is a Radix client component,
 * so this module opts in to `"use client"`. Accessibility (aria-expanded,
 * aria-controls, roving focus) comes from Radix for free — we only add
 * sensible typography classes on top.
 *
 * Plaintext answers are rendered verbatim; if MDX authors need rich
 * formatting they can pass React children through `<FAQ>`...`</FAQ>`
 * with the `q` prop driving the question label.
 */
export interface FaqItem {
  q: string;
  a: React.ReactNode;
}

export type FaqProps =
  | {
      items: FaqItem[];
      q?: never;
      a?: never;
      children?: never;
      className?: string;
    }
  | {
      items?: never;
      q: string;
      a?: React.ReactNode;
      children?: React.ReactNode;
      className?: string;
    };

export function Faq(props: FaqProps): React.ReactElement | null {
  const entries: FaqItem[] = React.useMemo(() => {
    if ("items" in props && props.items) {
      return props.items;
    }
    const question = props.q;
    if (!question) return [];
    const answer = props.a ?? props.children ?? null;
    return [{ q: question, a: answer }];
  }, [props]);

  if (entries.length === 0) return null;

  return (
    <Accordion
      type="single"
      collapsible
      className={cn(
        "my-6 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 shadow-sm",
        props.className,
      )}
    >
      {entries.map((entry, idx) => (
        <AccordionItem
          key={`${idx}-${entry.q}`}
          value={`faq-${idx}`}
          className="last:border-b-0"
        >
          <AccordionTrigger className="text-left text-base font-semibold tracking-tight">
            {entry.q}
          </AccordionTrigger>
          <AccordionContent className="text-sm leading-relaxed text-[var(--muted-foreground)]">
            {entry.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default Faq;
