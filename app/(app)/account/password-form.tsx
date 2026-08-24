"use client";

import { useActionState } from "react";

import { changePassword } from "@/app/actions/auth";
import { Alert } from "@/components/alert";
import { SubmitButton } from "@/components/button";
import { TextField } from "@/components/text-field";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";

/**
 * Change password: current, then new.
 *
 * Asking for the current password is what stops a borrowed unlocked browser from
 * being turned into a permanent takeover — a live session alone can't rotate the
 * credential. The action verifies it against Supabase before writing, so it isn't
 * a formality, and a wrong guess spends the account's sign-in rate limit.
 *
 * Nothing typed here is ever echoed back: `PasswordFormState` has no `values`, so
 * a password never round-trips through a Server Action's response.
 */
export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);

  return (
    /*
     * Keyed on the number of successful changes, so a success remounts the subtree
     * and leaves both boxes empty. A new `defaultValue` would not do it — React
     * doesn't push one into an input that already has a value — and a password
     * left sitting in a field after the change has landed is the worst version of
     * that bug. A counter rather than a flag because two changes in one page load
     * both have to clear.
     */
    <form key={state?.changed ?? 0} action={action} className="flex flex-col gap-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.notice && <Alert tone="success">{state.notice}</Alert>}

      <TextField
        label="Current password"
        name="currentPassword"
        type="password"
        required
        autoComplete="current-password"
        errors={state?.fieldErrors?.currentPassword}
      />

      <TextField
        label="New password"
        name="password"
        type="password"
        required
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        errors={state?.fieldErrors?.password}
      />

      <SubmitButton pending={pending} pendingLabel="Changing…" className="self-start">
        Change password
      </SubmitButton>
    </form>
  );
}
