'use client';

import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { useWaHref } from '@/lib/campaign';

interface WaLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** wa.me href built at render time by `shared.waHref()`. */
  href: string;
  children: ReactNode;
}

/**
 * WhatsApp anchor that appends the campaign `[Src: …]` suffix after hydration.
 *
 * The href is baked into the static HTML without the suffix, so every visitor
 * gets the same cacheable page; `useWaHref()` rewrites the `text` query param
 * in the browser once utm/gclid/fbclid are known. Without JS the link still
 * works — it just lacks attribution, which is the right trade.
 */
export function WaLink({ href, children, ...rest }: WaLinkProps) {
  const withTag = useWaHref();
  return (
    <a href={withTag(href)} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}
