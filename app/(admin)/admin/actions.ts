'use server';

import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { safeNext } from '@/lib/admin';

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
    // Deliberately does not distinguish "no such account" from "wrong
    // password". Sign-up is disabled, so the set of valid emails is small and
    // guessable — a distinguishing message would confirm which of the owner's
    // addresses is the live one.
    return { error: 'Email atau kata sandi salah.' };
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
