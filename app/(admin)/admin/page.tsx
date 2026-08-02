import { Card, CardBody } from '@/design-system';
import { requireAdmin } from '@/lib/admin';
import { AdminShell } from './AdminShell';

// Session-scoped and always current. An admin page that could be served from a
// cache would be an admin page that could be served to the wrong person.
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Beranda · Content Studio' };

/**
 * Content Studio dashboard.
 *
 * Currently a status board. The point of shipping it with the gate rather than
 * with the editors is that it exercises the whole chain end to end — session
 * cookie, allowlist check, RLS-scoped read — against real tables, so a broken
 * link in it fails here rather than inside a half-finished form.
 *
 * Note what the counts prove: these queries run through the *session* client,
 * whose policy is `is_admin()`, so seeing a draft row at all is evidence the
 * policy resolved. The public client cannot retrieve one — `verify:rls` asserts
 * that from the other side.
 */
export default async function AdminHome() {
  const { supabase, user } = await requireAdmin();

  const [locations, posts, drafts] = await Promise.all([
    supabase.from('locations').select('key, status'),
    supabase.from('posts').select('key, status'),
    supabase.from('content_drafts').select('entity, entity_id, updated_at'),
  ]);

  const locRows = (locations.data ?? []) as { key: string; status: string }[];
  const postRows = (posts.data ?? []) as { key: string; status: string }[];
  const draftRows = (drafts.data ?? []) as { entity: string; entity_id: string }[];

  const published = (rows: { status: string }[]) => rows.filter((r) => r.status === 'published').length;

  const stats = [
    {
      label: 'Halaman kota',
      value: locRows.length,
      note: `${published(locRows)} terbit · ${locRows.length - published(locRows)} draf`,
    },
    {
      label: 'Artikel blog',
      value: postRows.length,
      note: `${published(postRows)} terbit · ${postRows.length - published(postRows)} draf`,
    },
    {
      label: 'Editan tertunda',
      value: draftRows.length,
      note: draftRows.length ? 'Belum diterbitkan' : 'Semua sudah diterbitkan',
    },
  ];

  return (
    <AdminShell email={user.email}>
      <h1 className="cs-h1">Beranda</h1>
      <p className="cs-lede">
        Ringkasan konten situs. Editor per entri menyusul — untuk sekarang halaman ini
        memastikan sesi, daftar admin, dan akses database sudah berjalan.
      </p>

      <div className="cs-grid">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardBody>
              <p className="cs-stat-label">{s.label}</p>
              <div className="cs-stat-value">{s.value}</div>
              <p className="cs-stat-note">{s.note}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
