import * as z from "zod";

/**
 * Profile validation — the display name, shared by the signup form and the
 * account page.
 *
 * It lives here rather than in `auth.ts` because the display name is a `profiles`
 * row, not a credential. Signup imports it so that one definition backs both
 * screens: the field is optional in the same way and capped at the same length in
 * both places, which is the only way the two can't drift.
 */

/** Mirrors the DB's `check (char_length(trim(display_name)) between 1 and 60)`. */
export const DISPLAY_NAME_MAX_LENGTH = 60;

/**
 * Optional: blank means "no display name", not an error.
 *
 * The preprocess step is what makes clearing the field work. Blank collapses to
 * `undefined`, and the action maps that to SQL `NULL` — it must not write `''`,
 * because an empty string trims to zero characters and the check constraint
 * demands at least one. So the two ways of having no name are `NULL` and nothing
 * else; `''` is a value the column rejects outright.
 *
 * Trimming before the length check also means "  Ada  " is a three-character name
 * rather than a seven-character one, and nothing lands in the database padded.
 */
export const displayNameSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z
    .string()
    .max(DISPLAY_NAME_MAX_LENGTH, {
      error: `Display name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
    })
    .optional(),
);

export const profileSchema = z.object({ displayName: displayNameSchema });

export type ProfileInput = z.infer<typeof profileSchema>;
