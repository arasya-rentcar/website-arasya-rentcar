import type { Metadata } from 'next';
import { ArasyaProvider } from '@/design-system';
import { NavAutoClose } from '@/components/layout/NavAutoClose';
import { ALLOW_INDEXING } from '@/lib/indexing';
import './globals.css';
import './landing.css';

export const metadata: Metadata = {
  // Per-page metadata (title, description, canonical, OG) is emitted by each
  // route's generateMetadata, matching the prototype's applySeo() output.
  title: 'Arasya Rent Car',
  // Inherited by every route unless one overrides it. `follow` stays on so a
  // staging crawl still discovers the structure without indexing any of it.
  ...(ALLOW_INDEXING ? {} : { robots: { index: false, follow: true } }),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // lang="id" is required by the SEO spec — the whole site is Indonesian.
  return (
    <html lang="id">
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
