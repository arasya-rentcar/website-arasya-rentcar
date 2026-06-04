import * as React from "react";
import { Info, CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * MDX <Callout /> — allowlisted narrative component (R23.3, design §4.4).
 *
 * Authors insert `<Callout variant="info" title="…">body</Callout>` into
 * city / country / vehicle / service / article MDX to flag a short piece
 * of info, a success tip, a warning, or a danger note.
 *
 * Styling is deliberately conservative: a `border-l-4` accent plus a
 * soft tinted background. Colors bind to the design tokens declared in
 * `app/globals.css` (`--color-primary-500`, `--color-success-500`,
 * `--color-warning-500`, `--color-danger-500`) via Tailwind utilities
 * so dark-mode and shadcn semantic rebinds flow through automatically.
 *
 * Server-safe: no state, no event handlers, no `"use client"`.
 */
export type CalloutVariant = "info" | "success" | "warning" | "danger";

export interface CalloutProps {
  variant?: CalloutVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<
  CalloutVariant,
  {
    border: string;
    bg: string;
    iconColor: string;
    Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
    role: "note" | "status" | "alert";
    label: string;
  }
> = {
  info: {
    border: "border-l-[var(--color-primary-500)]",
    bg: "bg-[var(--color-primary-50)]",
    iconColor: "text-[var(--color-primary-700)]",
    Icon: Info,
    role: "note",
    label: "Info",
  },
  success: {
    border: "border-l-[var(--color-success-500)]",
    bg: "bg-[var(--color-success-50)]",
    iconColor: "text-[var(--color-success-700)]",
    Icon: CheckCircle2,
    role: "status",
    label: "Success",
  },
  warning: {
    border: "border-l-[var(--color-warning-500)]",
    bg: "bg-[var(--color-warning-50)]",
    iconColor: "text-[var(--color-warning-700)]",
    Icon: AlertTriangle,
    role: "status",
    label: "Warning",
  },
  danger: {
    border: "border-l-[var(--color-danger-500)]",
    bg: "bg-[var(--color-danger-50)]",
    iconColor: "text-[var(--color-danger-700)]",
    Icon: AlertOctagon,
    role: "alert",
    label: "Danger",
  },
};

export function Callout({
  variant = "info",
  title,
  children,
  className,
}: CalloutProps): React.ReactElement {
  const spec = VARIANT_STYLES[variant];
  const Icon = spec.Icon;

  return (
    <aside
      role={spec.role}
      aria-label={title ?? spec.label}
      className={cn(
        "my-6 flex gap-3 rounded-lg border border-l-4 border-[var(--border)] p-4 shadow-sm",
        spec.border,
        spec.bg,
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn("mt-0.5 size-5 shrink-0", spec.iconColor)}
      />
      <div className="flex-1 text-sm leading-relaxed text-[var(--foreground)]">
        {title ? (
          <p className="mb-1 font-semibold tracking-tight">{title}</p>
        ) : null}
        <div className="[&>p]:m-0 [&>p+p]:mt-2">{children}</div>
      </div>
    </aside>
  );
}

export default Callout;
