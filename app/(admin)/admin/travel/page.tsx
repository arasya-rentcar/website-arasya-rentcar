import { requireAdmin } from '@/lib/admin';
import { getStagedTravel } from '@/lib/cms';
import { AdminShell } from '../AdminShell';
import { TravelForm } from './TravelForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Rute & Tarif · Content Studio' };

export default async function TravelPage() {
  const { supabase, user } = await requireAdmin();
  const staged = await getStagedTravel(supabase);

  return (
    <AdminShell email={user.email} active="travel">
      <h1 className="cs-h1">Rute &amp; Tarif</h1>
      <p className="cs-lede">
        {staged.draft ? (
          <>
            Menampilkan editan yang belum diterbitkan, tersimpan{' '}
            {new Date(staged.draft.updated_at).toLocaleString('id-ID')}.
          </>
        ) : (
          <>Pengecek tarif di halaman /travel: unit, kota asal, dan harga per rute.</>
        )}
      </p>

      <TravelForm initial={staged.merged} hasDraft={Boolean(staged.draft)} />
    </AdminShell>
  );
}
