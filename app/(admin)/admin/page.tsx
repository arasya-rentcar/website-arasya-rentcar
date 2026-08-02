import Link from 'next/link';
import { Badge } from '@/design-system';
import { requireAdmin } from '@/lib/admin';
import { listDrafts, listLocations, listPosts } from '@/lib/cms';
import { AdminShell } from './AdminShell';

// Session-scoped and always current. An admin page that could be served from a
// cache would be an admin page that could be served to the wrong person.
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Konten · Content Studio' };

/**
 * The list view — Content Studio's home.
 *
 * Deliberately one page rather than a dashboard plus separate collection pages.
 * There are six landing pages and three articles; a navigation tree to reach
 * nine items would be more structure than content. What the owner needs on
 * arrival is which entries exist, which are live, and which have edits waiting
 * — so those are the three things a row carries.
 */
export default async function AdminHome() {
  const { supabase, user } = await requireAdmin();

  const [locations, posts, drafts] = await Promise.all([
    listLocations(supabase),
    listPosts(supabase),
    listDrafts(supabase),
  ]);

  const pending = new Set(drafts.map((d) => `${d.entity}:${d.entity_id}`));

  return (
    <AdminShell email={user.email} active="konten">
      <h1 className="cs-h1">Konten</h1>
      <p className="cs-lede">
        {locations.length} halaman kota · {posts.length} artikel
        {pending.size > 0 && <> · <strong>{pending.size} entri punya editan belum diterbitkan</strong></>}
      </p>

      <section className="cs-section">
        <h2 className="cs-h2">Halaman kota</h2>
        <ul className="cs-list">
          {locations.map((l) => (
            <li key={l.key}>
              <Link href={`/admin/lokasi/${l.key}`} className="cs-row">
                <span className="cs-row-main">
                  <span className="cs-row-title">
                    {l.name}
                    {pending.has(`location:${l.key}`) && (
                      // A dot, plus text for anyone who cannot see it. Colour
                      // alone would carry the entire meaning otherwise.
                      <span className="cs-dot" title="Ada editan belum diterbitkan">
                        <span className="cs-sr">Ada editan belum diterbitkan</span>
                      </span>
                    )}
                  </span>
                  <span className="cs-row-sub">/{l.slug}</span>
                </span>
                <span className="cs-row-meta">
                  {l.slugEn ? (
                    <Badge tone="info" variant="subtle">EN</Badge>
                  ) : (
                    <Badge tone="neutral" variant="subtle">ID saja</Badge>
                  )}
                  <Badge tone={l.status === 'published' ? 'success' : 'warning'} variant="subtle">
                    {l.status === 'published' ? 'Terbit' : 'Draf'}
                  </Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="cs-section">
        <h2 className="cs-h2">Artikel</h2>
        <ul className="cs-list">
          {posts.map((p) => (
            <li key={p.key}>
              <Link href={`/admin/artikel/${p.key}`} className="cs-row">
                <span className="cs-row-main">
                  <span className="cs-row-title">
                    {p.title}
                    {pending.has(`post:${p.key}`) && (
                      <span className="cs-dot" title="Ada editan belum diterbitkan">
                        <span className="cs-sr">Ada editan belum diterbitkan</span>
                      </span>
                    )}
                  </span>
                  <span className="cs-row-sub">/{p.slug}</span>
                </span>
                <span className="cs-row-meta">
                  {p.slugEn ? (
                    <Badge tone="info" variant="subtle">EN</Badge>
                  ) : (
                    <Badge tone="neutral" variant="subtle">ID saja</Badge>
                  )}
                  <Badge tone={p.status === 'published' ? 'success' : 'warning'} variant="subtle">
                    {p.status === 'published' ? 'Terbit' : 'Draf'}
                  </Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </AdminShell>
  );
}
