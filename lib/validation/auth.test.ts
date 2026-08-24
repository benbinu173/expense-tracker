import { describe, expect, it } from "vitest";

import * as z from "zod";

import { loginSchema, PASSWORD_MIN_LENGTH, passwordChangeSchema, signupSchema } from "./auth";

// One helper per schema: a union of the two collapses the `fieldErrors` shape
// and loses the per-field keys.
function signupErrors(input: unknown) {
  const result = signupSchema.safeParse(input);
  if (result.success) throw new Error("expected the input to be rejected");
  return z.flattenError(result.error).fieldErrors;
}

function loginErrors(input: unknown) {
  const result = loginSchema.safeParse(input);
  if (result.success) throw new Error("expected the input to be rejected");
  return z.flattenError(result.error).fieldErrors;
}

function passwordChangeErrors(input: unknown) {
  const result = passwordChangeSchema.safeParse(input);
  if (result.success) throw new Error("expected the input to be rejected");
  return z.flattenError(result.error).fieldErrors;
}

const validSignup = {
  email: "me@example.com",
  password: "correct-horse",
  confirmPassword: "correct-horse",
  displayName: "Me",
};

describe("signupSchema", () => {
  it("normalises the email", () => {
    const result = signupSchema.parse({ ...validSignup, email: "  Me@Example.COM " });
    expect(result.email).toBe("me@example.com");
  });

  it("trims the display name and treats blank as absent", () => {
    expect(signupSchema.parse({ ...validSignup, displayName: "  Ada  " }).displayName).toBe("Ada");
    expect(signupSchema.parse({ ...validSignup, displayName: "   " }).displayName).toBeUndefined();
    expect(signupSchema.parse({ ...validSignup, displayName: "" }).displayName).toBeUndefined();
  });

  it("rejects a bad email with a readable message", () => {
    expect(signupErrors({ ...validSignup, email: "nope" }).email).toEqual([
      "Enter a valid email address.",
    ]);
    // A missing field must not leak Zod's "expected string, received undefined".
    expect(signupErrors({ password: validSignup.password }).email).toEqual([
      "Enter a valid email address.",
    ]);
  });

  it("enforces the password length window", () => {
    // Both boxes move together, or the mismatch check answers instead of the
    // length rule and the test stops measuring what it names.
    const both = (password: string) => ({ ...validSignup, password, confirmPassword: password });

    expect(signupErrors(both("short")).password).toEqual([
      `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
    ]);
    // 72 is bcrypt's cutoff: anything longer would be silently truncated.
    expect(signupSchema.safeParse(both("a".repeat(72))).success).toBe(true);
    expect(signupErrors(both("a".repeat(73))).password).toEqual(["Use 72 characters or fewer."]);
  });

  it("rejects an over-long display name", () => {
    expect(signupErrors({ ...validSignup, displayName: "a".repeat(61) }).displayName).toEqual([
      "Display name must be 60 characters or fewer.",
    ]);
  });

  it("rejects a mistyped confirmation, against the second box only", () => {
    // The whole point of the field: a typo here is otherwise silent, and the
    // account it creates confirms by email and then refuses every sign-in.
    const fieldErrors = signupErrors({ ...validSignup, confirmPassword: "correct-hoarse" });

    expect(fieldErrors.confirmPassword).toEqual(["Both passwords must match."]);
    // Not on `password` — the first box holds what the user meant.
    expect(fieldErrors.password).toBeUndefined();
  });

  it("requires the confirmation, and reads the same blank or missing", () => {
    expect(signupErrors({ ...validSignup, confirmPassword: "" }).confirmPassword).toEqual([
      "Re-enter your password to confirm it.",
    ]);
    // Missing entirely must not leak "expected string, received undefined".
    const { confirmPassword: _omitted, ...withoutConfirmation } = validSignup;
    expect(signupErrors(withoutConfirmation).confirmPassword).toEqual([
      "Re-enter your password to confirm it.",
    ]);
  });

  it("does not also call an empty confirmation a mismatch", () => {
    // Zod 4 runs an object's refinements even when a field inside it failed, so
    // both rules would fire on a blank second box and `TextField` would join them
    // into "Re-enter your password to confirm it. Both passwords must match."
    // The refine stands down while the confirmation is invalid on its own terms.
    expect(signupErrors({ ...validSignup, confirmPassword: "" }).confirmPassword).toHaveLength(1);
  });

  it("reports a too-short password once, and still catches a mismatch beside it", () => {
    // The mismatch check deliberately does *not* stand down for a short password:
    // the two messages land on different fields, so each box shows one instruction.
    const fieldErrors = signupErrors({
      ...validSignup,
      password: "short",
      confirmPassword: "shore",
    });

    expect(fieldErrors.password).toEqual([`Use at least ${PASSWORD_MIN_LENGTH} characters.`]);
    expect(fieldErrors.confirmPassword).toEqual(["Both passwords must match."]);
  });

  it("accepts a short password typed identically into both boxes", () => {
    // Only `password`'s length rule should speak here, not the mismatch check.
    expect(
      signupErrors({ ...validSignup, password: "short", confirmPassword: "short" }).confirmPassword,
    ).toBeUndefined();
  });
});

describe("loginSchema", () => {
  it("accepts a short password — it already exists", () => {
    expect(loginSchema.safeParse({ email: "me@example.com", password: "abc" }).success).toBe(true);
  });

  it("still requires both fields", () => {
    expect(loginErrors({ email: "me@example.com", password: "" }).password).toEqual([
      "Enter your password.",
    ]);
  });
});

describe("passwordChangeSchema", () => {
  const valid = { currentPassword: "old-one-here", password: "brand-new-one" };

  it("accepts a change to a different password", () => {
    expect(passwordChangeSchema.safeParse(valid).success).toBe(true);
  });

  it("holds the new password to the same window as signup", () => {
    // Same rule object backs both, so this is the test that would fail if the two
    // ever stopped sharing it.
    expect(passwordChangeErrors({ ...valid, password: "short" }).password).toEqual([
      `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
    ]);
    expect(passwordChangeErrors({ ...valid, password: "a".repeat(73) }).password).toEqual([
      "Use 72 characters or fewer.",
    ]);
  });

  it("does not hold the current password to any length", () => {
    // It's whatever the account already has, which may predate our 8-char floor.
    // Complaining about its length would be both wrong and unactionable.
    expect(passwordChangeSchema.safeParse({ ...valid, currentPassword: "abc" }).success).toBe(true);
  });

  it("requires the current password to be present", () => {
    expect(passwordChangeErrors({ ...valid, currentPassword: "" }).currentPassword).toEqual([
      "Enter your current password.",
    ]);
    // Missing entirely must read the same as blank, not "expected string".
    expect(passwordChangeErrors({ password: valid.password }).currentPassword).toEqual([
      "Enter your current password.",
    ]);
  });

  it("rejects a new password identical to the current one", () => {
    // Caught here rather than by Supabase's `same_password`, which only comes
    // back when the project has reuse prevention on. Reported against `password`,
    // because that's the field the user has to change.
    const same = { currentPassword: "same-password", password: "same-password" };
    const fieldErrors = passwordChangeErrors(same);

    expect(fieldErrors.password).toEqual(["That's already your password. Pick a different one."]);
    expect(fieldErrors.currentPassword).toBeUndefined();
  });

  it("reports a too-short new password without also calling it a reuse", () => {
    // Zod 4 runs an object's refinements even when a field inside it failed, so
    // both rules would fire on `{ currentPassword: "abc", password: "abc" }` and
    // `TextField` would join them into two instructions. The refine stands down
    // while the new password is invalid on its own terms.
    expect(passwordChangeErrors({ currentPassword: "abc", password: "abc" }).password).toEqual([
      `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
    ]);
  });
});
