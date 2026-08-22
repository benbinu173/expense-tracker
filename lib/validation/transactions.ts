import * as z from "zod";

import { parseAmountToPaise } from "@/lib/money";
import { isDateString } from "@/lib/period";

/**
 * Validation for the add/edit transaction form. Shared by the client form's
 * expectations and the Server Action that actually decides.
 */

export const NOTE_MAX_LENGTH = 200;

export const TRANSACTION_TYPES = ["income", "expense"] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/** Blank optional text means "not provided", not "empty string". */
function blankToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

/**
 * `today` is a parameter rather than a `todayInAppZone()` call inside the schema
 * so tests can pin it. The caller is expected to pass `todayInAppZone()`.
 *
 * Why "no future dates" lives here and not in a DB `CHECK`: the constraint would
 * be evaluated against the server's clock in UTC, which disagrees with the app's
 * zone for several hours a day — see SPEC.md.
 */
export function makeTransactionSchema(today: string) {
  return z.object({
    type: z.enum(TRANSACTION_TYPES, { error: "Choose income or expense." }),

    /**
     * Parses to integer paise. The string parse lives in `lib/money.ts` — never
     * `parseFloat(x) * 100` — and its message is surfaced as the field error.
     */
    amount: z.string().transform((value, ctx) => {
      const result = parseAmountToPaise(value);
      if (!result.ok) {
        ctx.addIssue({ code: "custom", message: result.error });
        return z.NEVER;
      }
      return result.paise;
    }),

    /**
     * One `superRefine` rather than two chained `.refine()`s on purpose: chained
     * refinements both run, so "2026-99-99" would report an invalid date *and*
     * a future date at the same time.
     */
    occurredOn: z.string().superRefine((value, ctx) => {
      if (!isDateString(value)) {
        ctx.addIssue({ code: "custom", message: "Pick a valid date." });
        return;
      }
      // ISO dates compare lexicographically, so this is a real chronological test.
      if (value > today) {
        ctx.addIssue({ code: "custom", message: "That date hasn't happened yet." });
      }
    }),

    categoryId: z.uuid({ error: "Choose a category." }),

    /**
     * `.trim()` runs before `.max()`, so a pasted note with trailing whitespace
     * isn't rejected for length it doesn't really have — and nothing lands in the
     * database padded.
     */
    note: z.preprocess(
      blankToUndefined,
      z
        .string()
        .trim()
        .max(NOTE_MAX_LENGTH, { error: `Keep the note to ${NOTE_MAX_LENGTH} characters or fewer.` })
        .optional(),
    ),
  });
}

export type TransactionInput = z.infer<ReturnType<typeof makeTransactionSchema>>;
