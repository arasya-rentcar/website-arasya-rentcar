import Link from 'next/link';
import { signOut } from './actions';

/**
 * Chrome for every signed-in Content Studio page.
 *
 * Kept out of the route group's layout deliberately: `/admin/login` shares the
 * document (fonts, tokens, background) but must not show a topbar with a sign
 * out button, and a layout would have no way to opt out. One component that
 * authenticated pages wrap themselves in is the smaller mechanism.
 */

const SECTIONS = [
  { id: 'konten', href: '/admin', label: 'Konten' },
  { id: 'situs', href: '/admin/situs', label: 'Situs & Global' },
] as const;

export type AdminSection = (typeof SECTIONS)[number]['id'];

export function AdminShell({
  email,
  active,
  children,
}: {
  email: string | null;
  /** Which section is current. Marked with `aria-current`, not colour alone. */
  active?: AdminSection;
  children: React.ReactNode;
}) {
  return (
    <div className="cs-shell">
      <header className="cs-topbar">
        <Link href="/admin" className="cs-brand">
          Content Studio <span>Arasya Rent Car</span>
        </Link>

        <nav className="cs-nav" aria-label="Bagian">
          {SECTIONS.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              className="cs-nav-link"
              aria-current={active === s.id ? 'page' : undefined}
            >
              {s.label}
            </Link>
          ))}
        </nav>

        <div className="cs-topbar-end">
          {email && <span title="Akun yang sedang masuk">{email}</span>}
          <form action={signOut}>
            <button type="submit" className="cs-signout">
              Keluar
            </button>
          </form>
        </div>
      </header>
      <main className="cs-main" id="konten">
        {children}
      </main>
    </div>
  );
}
