import { describe, expect, it } from "vitest";

import { percentShares } from "./percent";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

describe("percentShares", () => {
  it("sums to exactly 100 where naive rounding would not", () => {
    // The case that motivates the whole module: three equal thirds floor to
    // 33/33/33, and a reader adding the column up finds 99.
    const shares = percentShares([1000, 1000, 1000]);

    expect(sum(shares)).toBe(100);
    expect(shares).toEqual([34, 33, 33]);
  });

  it("sums to 100 across a spread of real-looking period totals", () => {
    const cases = [
      [617500],
      [450000, 120000, 47500],
      [1, 1, 1, 1, 1, 1, 1],
      [99999, 1],
      [7, 11, 13, 17, 19, 23, 29, 31],
      [1_000_000, 3, 3, 3],
    ];

    for (const values of cases) {
      expect(sum(percentShares(values))).toBe(100);
    }
  });

  it("gives a single category the whole 100", () => {
    expect(percentShares([617500])).toEqual([100]);
  });

  it("never moves a share more than one point from its true value", () => {
    // Largest remainder's actual guarantee, and the reason to prefer it over
    // dumping the leftover on the biggest row.
    const values = [523, 4471, 88, 9012, 137];
    const total = sum(values);
    const shares = percentShares(values);

    shares.forEach((share, index) => {
      const exact = ((values[index] ?? 0) * 100) / total;

      expect(Math.abs(share - exact)).toBeLessThan(1);
    });
  });

  it("leaves shares alone when they already add up", () => {
    // No leftover to distribute here, and the method must not invent one.
    expect(percentShares([100, 200, 300, 400])).toEqual([10, 20, 30, 40]);
  });

  it("gives the leftover point to the largest remainder, not the largest value", () => {
    // 1/3 and 2/3 floor to 33 and 66; the spare point belongs to the .67.
    expect(percentShares([1, 2])).toEqual([33, 67]);

    // The case that actually separates "largest remainder" from "biggest row
    // absorbs the rounding": ₹10 against two 7-paise rows. The leader is 98.62%
    // and the tiddlers are 0.69% each, so *both* spare points go to the small
    // rows and the leader stays at 98 — which is the honest answer, since 99
    // would overstate it by more.
    expect(percentShares([1000, 7, 7])).toEqual([98, 1, 1]);
  });

  it("is stable for ties — equal values keep their input order", () => {
    // Two categories with the same total must not swap percentages between
    // renders, so the extra point goes to the earlier index every time.
    expect(percentShares([50, 50, 50])).toEqual([34, 33, 33]);
    expect(percentShares([50, 50, 50])).toEqual(percentShares([50, 50, 50]));
  });

  it("returns zeroes rather than NaN when there is nothing to divide", () => {
    // `0 / 0` is the failure this guards. The caller's empty state handles the
    // display; what matters here is that no share is NaN or Infinity.
    expect(percentShares([])).toEqual([]);
    expect(percentShares([0, 0])).toEqual([0, 0]);
    expect(percentShares([-100, 50])).toEqual([0, 0]);
  });

  it("returns one share per value", () => {
    expect(percentShares([1, 2, 3, 4, 5])).toHaveLength(5);
  });
});
