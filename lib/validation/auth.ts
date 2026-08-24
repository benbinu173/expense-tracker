import * as z from "zod";

import { displayNameSchema } from "./profile";

/**
 * Auth form validation, shared by the login, signup and change-password Server
 * Actions.
 *
 * Rules live here rather than inline so the messages stay consistent and the
 * database's own constraints have an obvious counterpart. The display name is the
 * one field that isn't a credential, so it's imported from `profile.ts` rather
 * than defined twice — it's a `profiles` column, and signup is only the first
 * place it gets set.
 */

/** Supabase's own floor is 6 characters; we ask for 8. */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * bcrypt ignores anything past 72 bytes, so a longer password would silently
 * be equivalent to its first 72 characters. Reject instead of pretending.
 */
const PASSWORD_MAX_LENGTH = 72;

/** Normalise before validating: `" Me@Example.COM "` is a valid address. */
const email = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : ""),
  z.email({ error: "Enter a valid email address." }),
);

/**
 * The rule for a password being *set* — at signup, and again when it's changed.
 * Named once so the two screens can't drift into asking for different things.
 */
const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, {
    error: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
  })
  .max(PASSWORD_MAX_LENGTH, {
    error: `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`,
  });

export const loginSchema = z.object({
  email,
  // No length rule here on purpose — the password already exists, and telling
  // someone their real password is "too short" at the login screen is nonsense.
  password: z.string().min(1, { error: "Enter your password." }),
});

/**
 * The second password box on the signup form. Its only job is to catch a typo in
 * the first one, and that is worth a whole field because the failure is silent
 * and terminal: `signUp` happily creates the account against whatever was typed,
 * the confirmation email arrives and works, and the first sign-in then fails with
 * `invalid_credentials` on a password nobody knows. There is no reset flow in the
 * app, so the account is unrecoverable — the only fix is deleting the row.
 *
 * Message named once and passed twice, the same trap `categories.ts` documents: a
 * schema-level `error` answers only what the type itself raises, so `.min(1)` with
 * no `error` of its own would fall through to the locale default and surface
 * "Too small: expected string to have >=1 characters" under an empty box.
 */
const BLANK_PASSWORD_CONFIRMATION = "Re-enter your password to confirm it.";

const passwordConfirmation = z
  .string({ error: BLANK_PASSWORD_CONFIRMATION })
  .min(1, { error: BLANK_PASSWORD_CONFIRMATION });

export const signupSchema = z
  .object({
    email,
    password: newPassword,
    confirmPassword: passwordConfirmation,
    displayName: displayNameSchema,
  })
  /*
   * The mismatch check. It stands down while the second box is empty, for the
   * reason `passwordChangeSchema` documents below — Zod 4 runs an object's
   * refinements even when a field inside it already failed, so a blank
   * confirmation would otherwise collect both messages and `TextField` would join
   * them into "Re-enter your password to confirm it. Both passwords must match."
   * Asking `passwordConfirmation` itself keeps that condition in one place rather
   * than restating "is it blank" here.
   *
   * It deliberately does *not* stand down when `password` fails its own length
   * rule: those two messages land on different fields, so each box still shows
   * exactly one instruction. Reported against `confirmPassword`, because the first
   * box holds the password the user meant and the second is the one to correct.
   */
  .refine(
    (data) =>
      !passwordConfirmation.safeParse(data.confirmPassword).success ||
      data.password === data.confirmPassword,
    {
      error: "Both passwords must match.",
      path: ["confirmPassword"],
    },
  );

/**
 * Changing the password from `/account`.
 *
 * `currentPassword` gets no length rule, for `loginSchema`'s reason: it's an
 * existing password, so a complaint about its length would be both wrong and
 * useless. It is not decoration — the action verifies it against Supabase before
 * writing, so a live session alone can't lock the owner out of their own account.
 *
 * Its message is named once and passed twice, the same trap `categories.ts`
 * documents: a schema-level `error` answers only what the type raises (missing
 * field, non-string) and `.min(1)` falls through to the locale default, so
 * `{ password }` with no `currentPassword` at all would otherwise surface
 * "Invalid input: expected string, received undefined" as a field error.
 */
const BLANK_CURRENT_PASSWORD = "Enter your current password.";

export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string({ error: BLANK_CURRENT_PASSWORD })
      .min(1, { error: BLANK_CURRENT_PASSWORD }),
    password: newPassword,
  })
  /*
   * "New password same as old", caught here rather than left to Supabase's
   * `same_password` — that code only comes back when the project has password
   * reuse prevention switched on, so doing it in the schema makes the behaviour
   * ours and costs no round trip. Reported against `password`, because that's the
   * field the user has to change.
   *
   * Zod 4 runs an object's refinements even when a field inside it already failed,
   * so this has to stand down when the new password is invalid on its own terms.
   * Without the guard, "abc" typed into both boxes returns two messages, and
   * `TextField` joins them into "Use at least 8 characters. That's already your
   * password." — two instructions where one is enough. Re-using `newPassword` to
   * ask the question keeps the length window defined in exactly one place.
   */
  .refine(
    (data) =>
      !newPassword.safeParse(data.password).success || data.password !== data.currentPassword,
    {
      error: "That's already your password. Pick a different one.",
      path: ["password"],
    },
  );
