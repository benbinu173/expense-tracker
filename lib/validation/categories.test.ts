import { describe, expect, it } from "vitest";

import * as z from "zod";

import { CATEGORY_NAME_MAX_LENGTH, categorySchema } from "./categories";

function nameErrors(input: unknown) {
  const result = categorySchema.safeParse(input);
  if (result.success) throw new Error("expected the input to be rejected");
  return z.flattenError(result.error).fieldErrors.name;
}

describe("categorySchema", () => {
  it("trims the name", () => {
    expect(categorySchema.parse({ name: "  Groceries  " }).name).toBe("Groceries");
  });

  it("rejects a blank name, however it's blank", () => {
    const message = ["Give the category a name."];
    expect(nameErrors({ name: "" })).toEqual(message);
    expect(nameErrors({ name: "   " })).toEqual(message);
    // A missing field must not leak Zod's "expected string, received undefined".
    expect(nameErrors({})).toEqual(message);
  });

  it("measures length after trimming, not before", () => {
    const longest = "a".repeat(CATEGORY_NAME_MAX_LENGTH);
    expect(categorySchema.safeParse({ name: longest }).success).toBe(true);
    // Padded to over the limit, but only 40 characters of actual name — the DB's
    // own check is `char_length(trim(name))`, so the two have to agree.
    expect(categorySchema.parse({ name: `   ${longest}   ` }).name).toBe(longest);
    expect(nameErrors({ name: `${longest}a` })).toEqual([
      `Keep the name to ${CATEGORY_NAME_MAX_LENGTH} characters or fewer.`,
    ]);
  });

  it("leaves case alone, because case-only renames are real renames", () => {
    // Uniqueness is `lower(name)` in Postgres, but what's stored is what was typed.
    expect(categorySchema.parse({ name: "FOOD" }).name).toBe("FOOD");
  });
});
