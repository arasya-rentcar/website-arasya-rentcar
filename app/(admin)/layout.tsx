import type { Metadata } from 'next';
import { ArasyaProvider } from '@/design-system';
import '../globals.css';
import './admin.css';

/**
 * Third root layout, alongside `(id)` and `(en)`.
 *
 * Content Studio is a different document, not a page of the marketing site, and
 * the route-group split lets it say so: no landing chrome, no `landing.css`, no
 * GSAP reveal machinery, no analytics bridge, no WhatsApp FAB. `globals.css` is
 * still imported because that is where the design tokens, the font faces, the
 * focus-visible rings and the reduced-motion rules live — the parts that are
 * about the design system rather than about landing pages.
 *
 * `lang="id"` unconditionally: the operator interface is Indonesian. The site's
 * ID/EN split is about who is reading the marketing pages, and Content Studio
 * has exactly one audience.
 */
export const metadata: Metadata = {
  title: 'Content Studio · Arasya',
  // Unconditional, unlike the public pages' ALLOW_INDEXING-dependent rule. An
  // authenticated route should never be indexable on any deployment, and
  // `noindex, nofollow` here also keeps the login form itself out of results —
  // robots.txt disallows /admin, but a linked URL can still be indexed without
  // being crawled, and a meta tag cannot.
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <ArasyaProvider>{children}</ArasyaProvider>
      </body>
    </html>
  );
}
