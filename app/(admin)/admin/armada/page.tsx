import { requireAdmin } from '@/lib/admin';
import { getStagedSite } from '@/lib/cms';
import { AdminShell } from '../AdminShell';
import { FleetForm } from './FleetForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Armada & Galeri · Content Studio' };

export default async function FleetPage() {
  const { supabase, user } = await requireAdmin();
  const staged = await getStagedSite(supabase);

  return (
    <AdminShell email={user.email} active="armada">
      <h1 className="cs-h1">Armada &amp; Galeri</h1>
      <p className="cs-lede">
        {staged.draft ? (
          <>
            Menampilkan editan yang belum diterbitkan, tersimpan{' '}
            {new Date(staged.draft.updated_at).toLocaleString('id-ID')}.
          </>
        ) : (
          <>Unit dan tarif, kelas unit untuk halaman luar negeri, dan foto galeri.</>
        )}
      </p>

      <FleetForm initial={staged.merged} hasDraft={Boolean(staged.draft)} />
    </AdminShell>
  );
}
