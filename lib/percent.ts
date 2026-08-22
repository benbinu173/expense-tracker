/**
 * Percentage shares that add up to 100.
 *
 * The dashboard breakdown prints a percentage beside every category, and the
 * obvious `Math.round((v / total) * 100)` per row does not sum to 100 — three
 * equal thirds print as 33/33/33 and a reader who adds them up finds a missing
 * percent. Since the categories here are a genuine partition of the total (every
 * transaction has exactly one non-null `category_id`), a total that isn't 100
 * looks like the app lost a row.
 *
 * So: largest remainder. Floor every share, then hand the leftover percent to
 * whichever rows had the biggest fractional part. That is the standard
 * apportionment method, and it's the one that keeps each printed figure within a
 * percent of its true value.
 */

/** How many percentage points there are to distribute. */
const TOTAL = 100;

/**
 * Whole-number percentages of the sum, in the same order as `values`, summing to
 * exactly 100.
 *
 * Empty input, an all-zero input, or a negative sum all answer with a zero for
 * every entry rather than throwing: this feeds a render, and the caller's empty
 * state is what handles "nothing here". Amounts are always positive in this app,
 * so a negative sum can only mean a bug upstream — a chart of zeroes is a visible
 * failure, while a thrown error takes out the whole page.
 */
export function percentShares(values: readonly number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);

  if (total <= 0) return values.map(() => 0);

  const floors = values.map((value) => Math.floor((value * TOTAL) / total));

  // What's left after flooring — at most one point per row, so this loop can't
  // run longer than the list.
  let remaining = TOTAL - floors.reduce((sum, share) => sum + share, 0);

  // Rank by fractional part, largest first. The index is the tiebreaker, which
  // is what makes the output deterministic: two categories with the same amount
  // must not swap their percentages between renders. `sort` is stable in every
  // engine we target, but relying on that would be relying on the input order
  // surviving a comparator that returned 0 — cheaper to just say it.
  const byRemainder = values
    .map((value, index) => ({
      index,
      remainder: (value * TOTAL) % total,
    }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  const shares = [...floors];

  for (const { index } of byRemainder) {
    if (remaining <= 0) break;

    shares[index] = (shares[index] ?? 0) + 1;
    remaining -= 1;
  }

  return shares;
}
