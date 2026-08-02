'use server';

import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { safeNext } from '@/lib/admin';
import { supabaseEnv } from '@/lib/supabase/config';

/**
 * Sign-in and sign-out for Content Studio.
 *
 * Server actions rather than a browser-side `signInWithPassword`, so the
 * password is posted to our own origin and the session cookie is written
 * server-side with the flags the SSR client sets (httpOnly, sameSite). A
 * browser-side sign-in would put the credential handling in a script that ships
 * to anyone who loads /admin/login.
 */

export interface SignInState {
  error?: string;
  /** Supabase project the attempt was made against. See the note below. */
  projectRef?: string;
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(String(formData.get('next') ?? '') || undefined);

  if (!email || !password) {
    return { error: 'Email dan kata sandi harus diisi.' };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    const ref = supabaseEnv().ref;

    // Two different failures wearing one message was costing real debugging
    // time: a rejected password and a database that cannot be reached both read
    // as "wrong password", so the obvious next step — check the password — is
    // the wrong one half the time.
    //
    // Only `invalid_credentials` stays vague, and deliberately: sign-up is
    // disabled, so the set of valid emails is small and guessable, and
    // separating "no such account" from "wrong password" would confirm which
    // address is live. Everything else is a configuration or transport problem,
    // where being specific costs nothing and saves the guessing.
    const credentialFailure = error?.code === 'invalid_credentials' || error?.status === 400;

    if (!credentialFailure) {
      return {
        error: `Tidak bisa memverifikasi ke database (${error?.status ?? '?'} ${error?.code ?? error?.message ?? 'tanpa keterangan'}).`,
        projectRef: ref ?? undefined,
      };
    }

    return {
      error: 'Email atau kata sandi salah.',
      projectRef: ref ?? undefined,
    };
  }

  // Authenticated is not authorised. Checking here — rather than letting
  // `requireAdmin()` catch it on the next page — means a non-allowlisted
  // account never holds a valid Content Studio session at all, not even for the
  // one redirect it would take to be turned away.
  const { data: allow } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (!allow) {
    await supabase.auth.signOut();
    return { error: 'Akun ini tidak terdaftar sebagai admin.' };
  }

  redirect(next);
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
