import { Card, CardBody } from '@/design-system';
import { safeNext } from '@/lib/admin';
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

          {forbidden ? (
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
