import type { Metadata } from 'next';
import { ArasyaProvider } from '@/design-system';
import { NavAutoClose } from '@/components/layout/NavAutoClose';
import { ALLOW_INDEXING } from '@/lib/indexing';
import type { Locale } from '@/types';

/**
 * The document shell, shared by both locale root layouts.
 *
 * There are two root layouts — `app/(id)` and `app/(en)` — because `<html lang>`
 * belongs to the document and a single root layout can only declare one. Every
 * English page was served as `lang="id"`, so a screen reader pronounced English
 * copy with Indonesian phonetics and browser translation offered to translate a
 * page that was already in the reader's language.
 *
 * Route groups are the App Router's answer to that: the parenthesised segment
 * never appears in a URL, so `/en/…` is unchanged. The documented trade is that
 * navigating between two root layouts is a full page load rather than a client
 * transition — which for a deliberate change of language is the right cost, and
 * only happens on the ID|EN pill.
 *
 * Everything else about the two is identical, so it lives here rather than being
 * copied into both and drifting.
 */
export const rootMetadata: Metadata = {
  // Per-page metadata (title, description, canonical, OG) is emitted by each
  // route's generateMetadata, matching the prototype's applySeo() output.
  title: 'Arasya Rent Car',
  // Inherited by every route unless one overrides it. `follow` stays on so a
  // staging crawl still discovers the structure without indexing any of it.
  ...(ALLOW_INDEXING ? {} : { robots: { index: false, follow: true } }),
};

export function RootShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <html lang={locale}>
      <body>
        <ArasyaProvider>{children}</ArasyaProvider>
        {/* Mounted once here rather than by each screen. Four of the six mounted
            it and the two blog screens did not, so the burger added to the blog
            header never closed on a link click. A behaviour that belongs to the
            header should not be something every page has to remember. */}
        <NavAutoClose />
      </body>
    </html>
  );
}
