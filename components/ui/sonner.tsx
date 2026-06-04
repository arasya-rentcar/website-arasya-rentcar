"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Sonner toaster wrapper.
 *
 * This file only exports the wrapper component. Mounting `<Toaster />` in
 * `app/[locale]/layout.tsx` is owned by task 2.5 — do not add the mount
 * here.
 *
 * We bind shadcn semantic CSS variables to Sonner's internal style hooks
 * via inline CSS vars so toasts pick up the Arasya palette automatically
 * in light and dark mode.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
