"use client";

import { useActionState } from "react";

import { updateDisplayName } from "@/app/actions/profile";
import { Alert } from "@/components/alert";
import { SubmitButton } from "@/components/button";
import { TextField } from "@/components/text-field";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/validation/profile";

type DisplayNameFormProps = {
  /** The stored name, or `null` for an account that has never set one. */
  current: string | null;
};

/**
 * The display name, editable in place.
 *
 * It's the only field on this page that isn't a credential, so it gets a plain
 * one-field form rather than the ceremony the password gets. Optional by design:
 * clearing it and saving is a legitimate action, which is why the button says
 * "Save" and not "Update" — there's nothing to update to.
 *
 * No key on the `<form>`, unlike the password form: after a save the input holds
 * the value you just typed, which is the value that's now stored. Nothing needs
 * clearing, and remounting would only replace it with the same string.
 */
export function DisplayNameForm({ current }: DisplayNameFormProps) {
  const [state, action, pending] = useActionState(updateDisplayName, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      {/*
       * The confirmation names the value that was written, so it stays true if you
       * carry on typing afterwards — it's a record of what happened, not a claim
       * about what's in the box right now.
       */}
      {state?.saved && (
        <Alert tone="success">
          {state.saved.displayName
            ? `Saved as ${state.saved.displayName}.`
            : "Display name removed."}
        </Alert>
      )}

      <TextField
        label="Display name"
        name="displayName"
        autoComplete="name"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        placeholder="What should we call you?"
        hint="Shown in the sidebar. Leave it empty to go by your email address."
        defaultValue={state?.values?.displayName ?? current ?? ""}
        errors={state?.fieldErrors?.displayName}
      />

      <SubmitButton pending={pending} pendingLabel="Saving…" className="self-start">
        Save
      </SubmitButton>
    </form>
  );
}
