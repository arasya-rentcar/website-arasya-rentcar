import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/design-system';
import { requireAdmin } from '@/lib/admin';
import { getStagedPost, getStagedSite, listLocations, listPosts } from '@/lib/cms';
import { AdminShell } from '../../AdminShell';
import { PostForm } from './PostForm';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return { title: `${key} · Content Studio` };
}

/** Editor for one article. Keyed by `key` for the same reason locations are. */
export default async function PostEditor({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { supabase, user } = await requireAdmin();

  const [staged, siteStaged, locations, posts] = await Promise.all([
    getStagedPost(supabase, key),
    getStagedSite(supabase),
    listLocations(supabase),
    listPosts(supabase),
  ]);

  if (!staged) notFound();

  // Slug uniqueness spans locations *and* posts: they share one URL space, so a
  // post slugged `sewa-mobil-bogor` would collide with the landing page even
  // though the two live in different tables.
  const otherSlugs = [
    ...locations.map((l) => l.slug),
    ...posts.filter((p) => p.key !== key).map((p) => p.slug),
  ];
  const otherSlugsEn = [
    ...locations.map((l) => l.slugEn),
    ...posts.filter((p) => p.key !== key).map((p) => p.slugEn),
  ].filter((s): s is string => Boolean(s));

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    siteStaged.merged.settings.siteUrl ||
    ''
  ).replace(/\/$/, '');

  return (
    <AdminShell email={user.email}>
      <Link href="/admin" className="cs-back">
        ← Semua konten
      </Link>

      <h1 className="cs-h1">
        {staged.merged.title}{' '}
        <Badge tone={staged.live.status === 'published' ? 'success' : 'warning'} variant="subtle">
          {staged.live.status === 'published' ? 'Terbit' : 'Draf'}
        </Badge>
      </h1>
      <p className="cs-lede">
        {staged.draft ? (
          <>
            Menampilkan editan yang belum diterbitkan, tersimpan{' '}
            {new Date(staged.draft.updated_at).toLocaleString('id-ID')}. Artikel yang tayang belum
            berubah.
          </>
        ) : (
          <>Menampilkan versi yang sedang tayang.</>
        )}
      </p>

      <PostForm
        initial={staged.merged}
        locations={locations}
        posts={posts}
        otherSlugs={otherSlugs}
        otherSlugsEn={otherSlugsEn}
        hasDraft={Boolean(staged.draft)}
        siteUrl={siteUrl}
      />
    </AdminShell>
  );
}
