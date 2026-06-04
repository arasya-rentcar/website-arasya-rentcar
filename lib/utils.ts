import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine class names using clsx + tailwind-merge.
 *
 * Standard shadcn/ui helper: use this for any component that composes
 * variant classes with user-supplied `className` props so Tailwind
 * conflicts (e.g. `px-4` vs `px-6`) are deduped with the last one winning.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
