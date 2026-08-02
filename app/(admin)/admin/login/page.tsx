import { Card, CardBody } from '@/design-system';
import { safeNext } from '@/lib/admin';
import { supabaseEnv } from '@/lib/supabase/config';
import { LoginForm } from './LoginForm';
import { signOut } from '../actions';

// Reads cookies and query params, and must never be captured in a build
// artifact — the whole point is that it reflects the current session.
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Masuk · Content Studio' };

/**
 * Sign-in for Content Studio.
 *
 * Reachable while signed out (the middleware exempts it) and while signed in
 * but not allowlisted, which is the `forbidden` branch below: that account has
 * a valid session and no permissions, so the only useful thing this page can
 * offer is a way to sign out of it.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const forbidden = params.error === 'forbidden';
  const env = supabaseEnv();

  return (
    <main className="cs-login">
      <Card className="cs-login-card">
        <CardBody>
          <h1 className="cs-login-title">Content Studio</h1>
          <p className="cs-login-sub">
            Arasya Rent Car · pengelolaan konten situs.
            <br />
            Akses terbatas pada akun yang terdaftar.
          </p>

          {!env.configured ? (
            // Names the variables rather than saying "configuration error". The
            // deployment that hit this served a perfectly healthy public site
            // from the snapshot fallback, so there was nothing else pointing at
            // the cause.
            <div className="cs-alert cs-alert-error" role="alert">
              <strong>Content Studio belum terhubung ke database.</strong>
              <p style={{ margin: '8px 0 0' }}>
                Variabel berikut belum diset pada deployment ini:
              </p>
              <ul style={{ margin: '8px 0 0', paddingLeft: '1.2em' }}>
                {env.missing.map((name) => (
                  <li key={name}>
                    <code>{name}</code>
                  </li>
                ))}
              </ul>
              <p style={{ margin: '8px 0 0' }}>
                Isi di Vercel → Settings → Environment Variables, lalu redeploy. Halaman publik
                tetap tampil normal tanpa ini karena membaca snapshot registry, jadi situs yang
                terlihat sehat bukan tanda database sudah tersambung.
              </p>
            </div>
          ) : forbidden ? (
            <>
              <p className="cs-alert cs-alert-error" role="alert">
                Akun Anda sudah masuk, tetapi tidak terdaftar sebagai admin.
                Hubungi pemilik situs, atau keluar untuk mencoba akun lain.
              </p>
              <form action={signOut} className="cs-form">
                <button type="submit" className="cs-signout">
                  Keluar dari akun ini
                </button>
              </form>
            </>
          ) : (
            <LoginForm next={next} />
          )}
        </CardBody>
      </Card>
    </main>
  );
}
