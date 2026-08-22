import * as z from "zod";

/**
 * Auth form validation, shared by the login and signup Server Actions.
 *
 * Rules live here rather than inline so the messages stay consistent and the
 * database's own constraints have an obvious counterpart (`profiles.display_name`
 * is `check (char_length(trim(display_name)) between 1 and 60)`).
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

/** Optional: blank means "no display name yet", not an error. */
const displayName = z.preprocess(
  (value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().max(60, { error: "Display name must be 60 characters or fewer." }).optional(),
);

export const loginSchema = z.object({
  email,
  // No length rule here on purpose — the password already exists, and telling
  // someone their real password is "too short" at the login screen is nonsense.
  password: z.string().min(1, { error: "Enter your password." }),
});

export const signupSchema = z.object({
  email,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, {
      error: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
    })
    .max(PASSWORD_MAX_LENGTH, {
      error: `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`,
    }),
  displayName,
});

export const passwordChangeSchema = z.object({
  password: signupSchema.shape.password,
});
