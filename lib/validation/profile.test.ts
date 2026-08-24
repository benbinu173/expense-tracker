import { describe, expect, it } from "vitest";

import { DISPLAY_NAME_MAX_LENGTH, profileSchema } from "./profile";

/** Field errors keyed the way the Server Action returns them. */
function errors(input: unknown): Record<string, string[] | undefined> {
  const result = profileSchema.safeParse(input);
  if (result.success) return {};
  return result.error.flatten().fieldErrors;
}

function parse(displayName: unknown): string | undefined {
  return profileSchema.parse({ displayName }).displayName;
}

describe("profileSchema.displayName", () => {
  it("trims, so nothing lands in the database padded", () => {
    expect(parse("  Ada  ")).toBe("Ada");
  });

  it("treats every empty shape as no name at all", () => {
    // These three are the ways the field can arrive blank: never typed in, typed
    // and cleared, and typed as whitespace. All must collapse to `undefined`,
    // because that is what the action turns into SQL NULL.
    expect(parse(undefined)).toBeUndefined();
    expect(parse("")).toBeUndefined();
    expect(parse("   ")).toBeUndefined();
  });

  it("never yields an empty string", () => {
    // The one output the column will not accept: `''` trims to zero characters
    // and `check (char_length(trim(display_name)) between 1 and 60)` rejects it.
    // A schema that let `''` through would turn a cleared field into a 23514.
    for (const blank of [undefined, "", " ", "\t\n  "]) {
      expect(parse(blank)).not.toBe("");
    }
  });

  it("accepts a name at exactly the limit", () => {
    const name = "a".repeat(DISPLAY_NAME_MAX_LENGTH);

    expect(parse(name)).toBe(name);
  });

  it("rejects one character past the limit", () => {
    expect(errors({ displayName: "a".repeat(DISPLAY_NAME_MAX_LENGTH + 1) }).displayName).toEqual([
      `Display name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
    ]);
  });

  it("measures the trimmed length, not the typed one", () => {
    // 60 characters wrapped in spaces is a valid name, not an over-long one —
    // the DB checks `char_length(trim(...))`, so the schema has to agree.
    const padded = `  ${"a".repeat(DISPLAY_NAME_MAX_LENGTH)}  `;

    expect(errors({ displayName: padded }).displayName).toBeUndefined();
    expect(parse(padded)).toHaveLength(DISPLAY_NAME_MAX_LENGTH);
  });

  it("ignores a non-string without throwing", () => {
    // `FormData.get` can hand back a File. The action coerces first, but the
    // schema shouldn't be the thing that explodes if one gets through.
    expect(parse(42)).toBeUndefined();
    expect(parse(null)).toBeUndefined();
  });
});
