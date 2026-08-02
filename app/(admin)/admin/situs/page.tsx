import { requireAdmin } from '@/lib/admin';
import { getStagedSite } from '@/lib/cms';
import { AdminShell } from '../AdminShell';
import { SiteForm } from './SiteForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Situs & Global · Content Studio' };

/**
 * The settings every page reads.
 *
 * One screen rather than several, because these fields are edited together and
 * rarely: a phone number changes at the same time as the panel that lists it,
 * and a bank account at the same time as the FAQ that quotes it. Splitting them
 * across tabs would add navigation to a page visited a few times a year.
 */
export default async function SiteSettingsPage() {
  const { supabase, user } = await requireAdmin();
  const staged = await getStagedSite(supabase);

  return (
    <AdminShell email={user.email} active="situs">
      <h1 className="cs-h1">Situs &amp; Global</h1>
      <p className="cs-lede">
        {staged.draft ? (
          <>
            Menampilkan editan yang belum diterbitkan, tersimpan{' '}
            {new Date(staged.draft.updated_at).toLocaleString('id-ID')}.
          </>
        ) : (
          <>Kontak, rekening, alamat, layanan, testimoni, dan kartu kepercayaan.</>
        )}
      </p>

      <SiteForm initial={staged.merged} hasDraft={Boolean(staged.draft)} />
    </AdminShell>
  );
}
