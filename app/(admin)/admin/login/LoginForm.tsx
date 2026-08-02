'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, TextField } from '@/design-system';
import { signIn, type SignInState } from '../actions';

/**
 * Separate from the submit handler so it can read `useFormStatus()`, which only
 * reports on the nearest ancestor <form>. Keeping it in the parent would give
 * `pending` that never changes.
 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" fullWidth loading={pending}>
      {pending ? 'Memeriksa…' : 'Masuk'}
    </Button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<SignInState, FormData>(signIn, {});

  return (
    <form action={formAction} className="cs-form">
      {state.error && (
        // role="alert" because this appears after the page has loaded, usually
        // while focus sits in the password field. Without it the only signal
        // that the attempt failed is visual.
        <p className="cs-alert cs-alert-error" role="alert">
          {state.error}
        </p>
      )}

      <input type="hidden" name="next" value={next} />

      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        required
        autoFocus
      />
      <TextField
        label="Kata sandi"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      <SubmitButton />
    </form>
  );
}
