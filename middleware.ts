import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseEnv } from '@/lib/supabase/config';

/**
 * Session refresh + the redirect half of the /admin gate.
 *
 * Two things this is, and one thing it is emphatically not:
 *
 *  - It REFRESHES the session. Supabase access tokens are short-lived; without
 *    something writing the rotated cookie back on each request, Content Studio
 *    logs itself out mid-edit. Server Components cannot set cookies, which is
 *    what `createServerSupabase`'s swallowed `catch` refers to — this is the
 *    "instead" that comment names.
 *
 *  - It REDIRECTS anonymous requests to the login form, so an admin URL shows a
 *    sign-in page rather than an error.
 *
 *  - It is NOT the security boundary, and nothing may depend on it as one.
 *    Middleware runs before the route and is the wrong layer to trust: it has
 *    been bypassable through header spoofing (CVE-2025-29927), it cannot see
 *    what a route actually queries, and it runs on the edge with a copy of the
 *    session rather than the database's own view of who is an admin. The real
 *    checks are `requireAdmin()` in every admin route and, underneath that, the
 *    RLS policies keyed on `is_admin()`. Delete this file and Content Studio
 *    would get uglier, not less safe.
 *
 * Scoped to /admin by the matcher below. Running it site-wide would put an auth
 * round-trip in front of statically served landing pages for no benefit.
 */

const LOGIN = '/admin/login';

export async function middleware(request: NextRequest) {
  const { url, key, configured } = supabaseEnv();
  const { pathname } = request.nextUrl;

  // No database configured. Send everything to the login page, which explains
  // which variables are missing.
  //
  // The first version of this returned `next()` and let the route deal with it.
  // On the deployment that actually hit this, the route threw inside
  // `createServerSupabase()` and /admin served a bare 500 with no Location
  // header — while every public page rendered perfectly from the snapshot
  // fallback, so nothing suggested the database had never been connected. The
  // failure has to name itself.
  // `url`/`key` are tested alongside `configured` so TypeScript narrows them for
  // the client below; `configured` alone is a boolean it cannot reason about.
  if (!configured || !url || !key) {
    if (pathname === LOGIN) return NextResponse.next();
    const to = request.nextUrl.clone();
    to.pathname = LOGIN;
    to.search = '';
    to.searchParams.set('error', 'unconfigured');
    return NextResponse.redirect(to);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Both copies matter: `request` so anything reading cookies later in
        // this same pass sees the refreshed token, `response` so the browser
        // actually keeps it.
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser(), not getSession(): the latter trusts the cookie as-is, while this
  // revalidates the JWT against the auth server. For a gate, that difference is
  // the whole point.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = pathname === LOGIN;

  if (!user && !isLogin) {
    const to = request.nextUrl.clone();
    to.pathname = LOGIN;
    to.search = '';
    // Where to land after signing in. Read back through `safeNext()`, which
    // only honours in-app admin paths — an unchecked value here would turn the
    // login form into an open redirect.
    to.searchParams.set('next', pathname);
    return NextResponse.redirect(to);
  }

  // Signed in already — skip the form. Except when the login page is showing an
  // error, which is how an authenticated-but-not-allowlisted user gets here:
  // `requireAdmin()` bounces them back with `?error=forbidden`, and sending
  // them to /admin again would bounce them straight back for an infinite
  // round trip. With the error preserved, the page can explain and offer a way
  // out instead.
  if (user && isLogin && !request.nextUrl.searchParams.has('error')) {
    const to = request.nextUrl.clone();
    to.pathname = '/admin';
    to.search = '';
    return NextResponse.redirect(to);
  }

  return response;
}

export const config = {
  // `:path*` matches zero or more segments, so this covers bare /admin too.
  matcher: ['/admin/:path*'],
};
