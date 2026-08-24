"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUp } from "@/app/actions/auth";
import { Alert } from "@/components/alert";
import { SubmitButton } from "@/components/button";
import { TextField } from "@/components/text-field";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/validation/profile";

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, undefined);

  // Confirmation email sent: there is nothing left to fill in, so the form is
  // replaced rather than left sitting there inviting a second submission.
  if (state?.notice) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success">{state.notice}</Alert>
        <p className="text-ink-2 text-center text-sm">
          Confirmed already?{" "}
          <Link
            href="/login"
            className="text-ink focus-ring rounded-sm underline underline-offset-2"
          >
            Sign in
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <TextField
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
        autoFocus
        defaultValue={state?.values?.email}
        errors={state?.fieldErrors?.email}
      />

      <TextField
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        errors={state?.fieldErrors?.password}
      />

      {/*
       * The typo guard. Without it a mistyped password produces an account that
       * confirms by email and then refuses every sign-in, and with no reset flow
       * the only way out is deleting the row — so the second box is cheaper than
       * the failure it prevents.
       *
       * No `defaultValue`, here or above: `AuthFormState.values` carries the email
       * and the display name only, so nothing typed into either password box can
       * round-trip through a Server Action's response. Both clear on a rejected
       * submit, which costs a retype and is the right trade.
       *
       * `new-password` on both, per the HTML spec — it's what tells a password
       * manager these are two halves of one new credential rather than a login.
       */}
      <TextField
        label="Confirm password"
        name="confirmPassword"
        type="password"
        required
        autoComplete="new-password"
        errors={state?.fieldErrors?.confirmPassword}
      />

      <TextField
        label="Display name"
        name="displayName"
        autoComplete="name"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        placeholder="What should we call you?"
        defaultValue={state?.values?.displayName}
        errors={state?.fieldErrors?.displayName}
      />

      <SubmitButton pending={pending} pendingLabel="Creating account…" className="w-full">
        Create account
      </SubmitButton>

      <p className="text-ink-2 text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-ink focus-ring rounded-sm underline underline-offset-2">
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}
