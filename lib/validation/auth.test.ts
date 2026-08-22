import { describe, expect, it } from "vitest";

import * as z from "zod";

import { loginSchema, PASSWORD_MIN_LENGTH, signupSchema } from "./auth";

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

const validSignup = { email: "me@example.com", password: "correct-horse", displayName: "Me" };

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
    expect(signupErrors({ ...validSignup, password: "short" }).password).toEqual([
      `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
    ]);
    // 72 is bcrypt's cutoff: anything longer would be silently truncated.
    expect(signupSchema.safeParse({ ...validSignup, password: "a".repeat(72) }).success).toBe(true);
    expect(signupErrors({ ...validSignup, password: "a".repeat(73) }).password).toEqual([
      "Use 72 characters or fewer.",
    ]);
  });

  it("rejects an over-long display name", () => {
    expect(signupErrors({ ...validSignup, displayName: "a".repeat(61) }).displayName).toEqual([
      "Display name must be 60 characters or fewer.",
    ]);
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
