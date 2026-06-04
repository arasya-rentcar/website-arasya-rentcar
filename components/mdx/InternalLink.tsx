import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * MDX <InternalLink /> — allowlisted narrative component (R23.3, design §4.4).
 *
 * Typed wrapper over Next.js `<Link>` that enforces internal-only
 * navigation inside MDX bodies. External URLs are rejected fast so
 * authors cannot accidentally introduce off-site links through MDX,
 * and so the R23.3 allowlist cannot be used to exfiltrate traffic.
 *
 *   <InternalLink href="/armada/innova">Innova fleet</InternalLink>
 *
 * Rules enforced:
 *   - `href` must start with "/"
 *   - Must not contain "://" or a protocol
 *   - Must not be a `mailto:` or `tel:` URL (use native anchors for
 *     those; they don't belong in narrative prose)
 *
 * In dev, a violation throws so it surfaces immediately. In production
 * builds, the rule still throws during MDX compilation because narrative
 * loaders render every MDX file during build (§4.3).
 */
export interface InternalLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

function assertInternalHref(href: string): void {
  const h = href.trim();
  if (!h.startsWith("/")) {
    throw new Error(
      `InternalLink: href must start with "/" (got ${JSON.stringify(href)}). External URLs are not allowed in MDX bodies.`,
    );
  }
  if (h.startsWith("//")) {
    throw new Error(
      `InternalLink: protocol-relative href is not allowed (got ${JSON.stringify(href)}).`,
    );
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(h)) {
    throw new Error(
      `InternalLink: scheme-qualified href is not allowed (got ${JSON.stringify(href)}).`,
    );
  }
}

export function InternalLink({
  href,
  children,
  className,
  title,
}: InternalLinkProps): React.ReactElement {
  assertInternalHref(href);

  return (
    <Link
      href={href}
      title={title}
      className={cn(
        "font-medium text-[var(--color-primary-600)] underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-[var(--ring)]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export default InternalLink;
