"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUp } from "@/app/actions/auth";
import { Alert } from "@/components/alert";
import { SubmitButton } from "@/components/button";
import { TextField } from "@/components/text-field";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";

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

      <TextField
        label="Display name"
        name="displayName"
        autoComplete="name"
        maxLength={60}
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
