import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/design-system';
import { requireAdmin } from '@/lib/admin';
import { getStagedLocation, getStagedSite, listLocations } from '@/lib/cms';
import { AdminShell } from '../../AdminShell';
import { LocationForm } from './LocationForm';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return { title: `${key} · Content Studio` };
}

/**
 * Editor for one landing page.
 *
 * Keyed by `key`, not by slug. The slug is editable here — routing the editor
 * by the thing being edited would change the editor's own URL the moment it is
 * saved, and a bookmark would break every time a page was renamed. `key` is the
 * stable identity the schema was built around, which is also why `posts.city_key`
 * references it.
 */
export default async function LocationEditor({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { supabase, user } = await requireAdmin();

  const [staged, siteStaged, all] = await Promise.all([
    getStagedLocation(supabase, key),
    getStagedSite(supabase),
    listLocations(supabase),
  ]);

  if (!staged) notFound();

  // Uniqueness is checked against everything else, so an entry keeping its own
  // slug never reports a collision with itself.
  const otherSlugs = all.filter((l) => l.key !== key).map((l) => l.slug);
  const otherSlugsEn = all
    .filter((l) => l.key !== key)
    .map((l) => l.slugEn)
    .filter((s): s is string => Boolean(s));

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    siteStaged.merged.settings.siteUrl ||
    ''
  ).replace(/\/$/, '');

  return (
    <AdminShell email={user.email} active="konten">
      <Link href="/admin" className="cs-back">
        ← Semua konten
      </Link>

      <h1 className="cs-h1">
        {staged.merged.name}{' '}
        <Badge tone={staged.live.status === 'published' ? 'success' : 'warning'} variant="subtle">
          {staged.live.status === 'published' ? 'Terbit' : 'Draf'}
        </Badge>
      </h1>
      <p className="cs-lede">
        {staged.draft ? (
          <>
            Menampilkan editan yang belum diterbitkan, tersimpan{' '}
            {new Date(staged.draft.updated_at).toLocaleString('id-ID')}. Halaman yang tayang belum
            berubah.
          </>
        ) : (
          <>Menampilkan versi yang sedang tayang.</>
        )}
      </p>

      <LocationForm
        initial={staged.merged}
        site={siteStaged.merged}
        otherSlugs={otherSlugs}
        otherSlugsEn={otherSlugsEn}
        hasDraft={Boolean(staged.draft)}
        siteUrl={siteUrl}
      />
    </AdminShell>
  );
}
