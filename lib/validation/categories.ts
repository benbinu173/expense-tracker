import * as z from "zod";

/**
 * Validation for the categories page — shared by the add and rename forms and the
 * Server Actions that actually decide.
 *
 * There is no `type` field. Which list you typed into decides it, so the type
 * arrives as a bound action argument instead of a form input: nothing for the user
 * to choose, nothing to get wrong, and nothing to validate.
 */

/** Mirrors the DB's `check (char_length(trim(name)) between 1 and 40)`. */
export const CATEGORY_NAME_MAX_LENGTH = 40;

/**
 * Named because it's needed twice. A schema-level `error` answers the issues the
 * type itself raises — a missing field, a non-string — and a check's own `error`
 * answers that check; neither inherits from the other. So the blank shapes `{}`
 * and `{ name: "" }` have to be handled separately, or one of them surfaces Zod
 * internals ("expected string, received undefined" / "Too small: expected string
 * to have >=1 characters") as a field error, under an input the user can already
 * see is empty.
 */
const BLANK_NAME = "Give the category a name.";

export const categorySchema = z.object({
  /**
   * `.trim()` runs before the length checks, so "  Food  " is a four-character
   * name rather than an eight-character one, and nothing lands in the database
   * padded.
   *
   * Uniqueness is deliberately not here. It's case-insensitive and scoped per
   * type, which only `categories_user_type_name_key` can answer — the actions
   * turn its 23505 into a field error rather than pre-checking with a select,
   * which would be a race and an extra round trip.
   */
  name: z
    .string({ error: BLANK_NAME })
    .trim()
    .min(1, { error: BLANK_NAME })
    .max(CATEGORY_NAME_MAX_LENGTH, {
      error: `Keep the name to ${CATEGORY_NAME_MAX_LENGTH} characters or fewer.`,
    }),
});

export type CategoryInput = z.infer<typeof categorySchema>;
