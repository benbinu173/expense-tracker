import { describe, expect, it } from "vitest";

import { CATEGORY_COLOR_COUNT, categoryColorIndex, categoryFillClass } from "./category-color";

// The names the signup trigger seeds, which is what most accounts will show.
const SEEDED = [
  "Food",
  "Groceries",
  "Rent",
  "Transport",
  "Utilities",
  "Health",
  "Shopping",
  "Entertainment",
  "Salary",
  "Freelance",
  "Interest",
  "Gifts",
];

describe("categoryColorIndex", () => {
  it("stays inside the palette", () => {
    for (const name of SEEDED) {
      const index = categoryColorIndex(name);

      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(CATEGORY_COLOR_COUNT);
      expect(Number.isInteger(index)).toBe(true);
    }
  });

  it("is stable — the same name always gets the same hue", () => {
    // Not a tautology: this is the property the whole approach rests on, since
    // the colour is recomputed on every render rather than stored.
    expect(categoryColorIndex("Groceries")).toBe(categoryColorIndex("Groceries"));
  });

  it("ignores casing and surrounding whitespace", () => {
    expect(categoryColorIndex("Food")).toBe(categoryColorIndex("food"));
    expect(categoryColorIndex("Food")).toBe(categoryColorIndex("  FOOD  "));
  });

  it("spreads real category names across the palette", () => {
    // A hash that returned a constant would pass every test above. This is the
    // one that would catch it: twelve names should not land on two hues.
    const used = new Set(SEEDED.map(categoryColorIndex));

    expect(used.size).toBeGreaterThanOrEqual(5);
  });

  it("separates names that differ only in their last character", () => {
    // The reason the hash folds its high bits down before the modulo — without
    // it, a late-differing suffix barely moves the low three bits.
    const indexes = new Set(["Bill 1", "Bill 2", "Bill 3", "Bill 4"].map(categoryColorIndex));

    expect(indexes.size).toBeGreaterThan(1);
  });

  it("handles an empty name without throwing", () => {
    expect(categoryColorIndex("")).toBeGreaterThanOrEqual(0);
    expect(categoryColorIndex("   ")).toBeLessThan(CATEGORY_COLOR_COUNT);
  });
});

describe("categoryFillClass", () => {
  it("returns a literal Tailwind class the scanner can see", () => {
    expect(categoryFillClass("Rent")).toMatch(/^bg-cat-[1-8]$/);
  });

  it("gives the dot and the breakdown bar the same hue", () => {
    // The reason the helper is named for the fill and not the dot: step 12's bar
    // and the row's dot both call this, and a category reading violet in the list
    // and amber in the chart would break the identity the hash exists to provide.
    expect(categoryFillClass("Groceries")).toBe(`bg-cat-${categoryColorIndex("Groceries") + 1}`);
  });
});
