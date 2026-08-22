"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signIn } from "@/app/actions/auth";
import { Alert } from "@/components/alert";
import { SubmitButton } from "@/components/button";
import { TextField } from "@/components/text-field";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, undefined);

  // The browser's own `required` / `type=email` checks give instant feedback;
  // the Zod parse in the action is what actually decides.
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
        autoComplete="current-password"
        errors={state?.fieldErrors?.password}
      />

      <SubmitButton pending={pending} pendingLabel="Signing in…" className="w-full">
        Sign in
      </SubmitButton>

      <p className="text-ink-2 text-center text-sm">
        No account yet?{" "}
        <Link
          href="/signup"
          className="text-ink focus-ring rounded-sm underline underline-offset-2"
        >
          Create one
        </Link>
        .
      </p>
    </form>
  );
}
