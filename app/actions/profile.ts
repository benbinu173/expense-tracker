"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation/profile";

/**
 * Profile writes — the display name, and nothing else.
 *
 * The row is addressed by `id = auth.uid()` through RLS rather than by an id from
 * the client, so there is no target to bind: the session *is* the target. Email
 * isn't here, and neither is the password — those live in `auth.users` and go
 * through `app/actions/auth.ts`.
 *
 * `profiles.display_name` is the single source of truth for the name. Signup also
 * puts it in `auth.users.raw_user_meta_data` via `options.data`, but only as the
 * parameter the seed trigger reads; nothing renders that copy, and this action
 * deliberately doesn't update it. Keeping the name in the table is what puts it
 * behind `check (char_length(trim(display_name)) between 1 and 60)` — user
 * metadata is unconstrained JSON, so storing it there would move a documented
 * limit's enforcement out of Postgres and into TypeScript.
 */

export type ProfileFormState = {
  /** Keyed to match the form input names. */
  fieldErrors?: Partial<Record<"displayName", string[]>>;
  /** Whole-form failure. */
  error?: string;
  /** Echoed back so a rejected submission doesn't wipe what was typed. */
  values?: { displayName?: string };
  /**
   * Set only when the write landed, holding the value actually stored — trimmed,
   * or `null` for "no display name". The form names it in the confirmation, so
   * the message stays true even after you start typing something else into the
   * field: it reports what happened rather than claiming what's there now.
   */
  saved?: { displayName: string | null };
};

/**
 * 23514 is `profiles_display_name_check`. It should be unreachable — the schema
 * turns every blank shape into `undefined` and this action maps that to NULL —
 * but if it ever fires, the honest place to say so is under the field.
 */
const CHECK_VIOLATION = "23514";

export async function updateDisplayName(
  _prevState: ProfileFormState | undefined,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const raw = formData.get("displayName");
  const displayName = typeof raw === "string" ? raw : "";
  const parsed = profileSchema.safeParse({ displayName });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: { displayName } };
  }

  /*
   * `?? null` is the part that matters. The schema collapses every empty shape to
   * `undefined`, and clearing the field has to write SQL NULL — `''` trims to zero
   * characters and the check constraint rejects it, so an empty string would turn
   * "remove my display name" into a 23514.
   *
   * `select("id")` is what makes the outcome legible: without it, an update RLS
   * filtered out returns no error and no rows, which is indistinguishable from
   * success.
   */
  const stored = parsed.data.displayName ?? null;
  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: stored })
    .eq("id", user.id)
    .select("id");

  if (error) {
    if (error.code === CHECK_VIOLATION) {
      return {
        fieldErrors: { displayName: ["That name isn't something we can store. Try another."] },
        values: { displayName },
      };
    }

    return { error: "Couldn't save your display name. Try again.", values: { displayName } };
  }

  /*
   * No row came back, so the profile row is missing — the signup trigger is the
   * only thing that creates it, and nothing in the app deletes it. Worth its own
   * message rather than a generic failure, because retrying will not fix it.
   */
  if (data.length === 0) {
    return { error: "Your profile record is missing, so there's nothing to update." };
  }

  // Refreshes the shell as well as this page: the sidebar rail renders the name
  // right beside the form, and a stale one there reads as the save not landing.
  refresh();
  return { saved: { displayName: stored } };
}
