import type { MetadataRoute } from 'next';
import { getLocations, getPosts, getSite } from '@/lib/data';
import { hasEnLocation, hasEnPost, localeUrl } from '@/lib/localize';
import { official } from '@/lib/shared';

// Content comes from the database, but the HTML is prerendered — and Next reuses
// prerendered output from .next/cache (which Vercel restores between deploys)
// when the source has not changed. Without a revalidate window a content edit
// plus a redeploy can keep serving the previous build's copy indefinitely.
// Phase 3's publish hook revalidates on demand; this bounds the worst case.
export const revalidate = 3600;


/**
 * Generated from published rows at build time, mirroring `dlSitemapFile()` in
 * the Content Studio prototype: homepage, /sewa-mobil, /travel, /blog, then
 * every location and post slug.
 *
 * English URLs appear only for entries that actually have EN content, and each
 * entry advertises its alternates — a sitemap that lists a page which 404s, or
 * claims an alternate that doesn't exist, is worse than omitting it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [locations, posts, site] = await Promise.all([getLocations(), getPosts(), getSite()]);
  const base = official(site).siteUrl;
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [];

  // Home, hub, and travel are fully translated. The blog is not — it joins /en/
  // only once articles have English content, so listing it before then would
  // point crawlers at a route that does not exist.
  const anyEnPost = posts.some(hasEnPost);
  const fixed: { path: string; en: boolean }[] = [
    { path: '', en: true },
    { path: 'sewa-mobil', en: true },
    { path: 'travel', en: true },
    { path: 'blog', en: anyEnPost },
  ];

  for (const { path, en } of fixed) {
    const languages: Record<string, string> = { id: localeUrl(base, 'id', path) };
    if (en) languages.en = localeUrl(base, 'en', path);

    entries.push({
      url: localeUrl(base, 'id', path),
      lastModified: now,
      changeFrequency: path === '' ? 'weekly' : 'monthly',
      priority: path === '' ? 1 : 0.8,
      alternates: { languages },
    });
    if (en) {
      entries.push({
        url: localeUrl(base, 'en', path),
        lastModified: now,
        changeFrequency: path === '' ? 'weekly' : 'monthly',
        priority: path === '' ? 0.9 : 0.7,
        alternates: { languages },
      });
    }
  }

  for (const l of locations) {
    const en = hasEnLocation(l);
    const languages: Record<string, string> = { id: localeUrl(base, 'id', l.slug) };
    if (en) languages.en = localeUrl(base, 'en', l.slugEn as string);

    entries.push({
      url: localeUrl(base, 'id', l.slug),
      lastModified: new Date(l.updatedAt),
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: { languages },
    });
    if (en) {
      entries.push({
        url: localeUrl(base, 'en', l.slugEn as string),
        lastModified: new Date(l.updatedAt),
        changeFrequency: 'monthly',
        priority: 0.8,
        alternates: { languages },
      });
    }
  }

  for (const p of posts) {
    const en = hasEnPost(p);
    const languages: Record<string, string> = { id: localeUrl(base, 'id', p.slug) };
    if (en) languages.en = localeUrl(base, 'en', p.slugEn as string);

    entries.push({
      url: localeUrl(base, 'id', p.slug),
      lastModified: new Date(p.dateModified || p.updatedAt),
      changeFrequency: 'yearly',
      priority: 0.6,
      alternates: { languages },
    });
    if (en) {
      entries.push({
        url: localeUrl(base, 'en', p.slugEn as string),
        lastModified: new Date(p.dateModified || p.updatedAt),
        changeFrequency: 'yearly',
        priority: 0.5,
        alternates: { languages },
      });
    }
  }

  return entries;
}
