/**
 * Money handling for the whole app.
 *
 * Everything is integer **paise** (1 rupee = 100 paise). No floats, no
 * `numeric` columns, no `parseFloat(x) * 100` — that last one is why this file
 * exists at all: `Number("0.29") * 100` is 28.999999999999996.
 *
 * Amounts are always positive. Direction comes from a transaction's `type`.
 */

export const PAISE_PER_RUPEE = 100;

/** ~₹100 crore. A typo guard, not a product limit. */
export const MAX_PAISE = 100_000_000_000;

export type AmountParseResult = { ok: true; paise: number } | { ok: false; error: string };

/** Digits, optionally followed by 1–2 decimal places. */
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * Turns whatever the user typed into integer paise.
 *
 * Returns a result object rather than throwing so Zod can surface `error`
 * as a field-level message (see the transaction schema).
 */
export function parseAmountToPaise(input: string): AmountParseResult {
  // Tolerate what people actually type or paste: "₹1,234.50", " 1234.5 ".
  const cleaned = input.replace(/[₹,\s]/g, "");

  if (cleaned === "") {
    return { ok: false, error: "Enter an amount." };
  }
  if (cleaned.startsWith("-")) {
    return {
      ok: false,
      error: "Amount must be positive — income or expense sets the direction.",
    };
  }
  if (!AMOUNT_PATTERN.test(cleaned)) {
    return { ok: false, error: "Use digits with up to 2 decimal places, like 1234.50." };
  }

  const dot = cleaned.indexOf(".");
  const whole = dot === -1 ? cleaned : cleaned.slice(0, dot);
  const fraction = dot === -1 ? "" : cleaned.slice(dot + 1);

  // Integer arithmetic only.
  const paise = Number(whole) * PAISE_PER_RUPEE + Number(fraction.padEnd(2, "0"));

  if (paise <= 0) {
    return { ok: false, error: "Amount must be greater than zero." };
  }
  if (paise > MAX_PAISE) {
    return { ok: false, error: "That amount is too large." };
  }

  return { ok: true, paise };
}

const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `123450` → `"₹1,234.50"`. Handles negatives, for balances. */
export function formatPaise(paise: number): string {
  return rupeeFormatter.format(paise / PAISE_PER_RUPEE);
}

/**
 * `formatSignedPaise(45000, "expense")` → `"− ₹450.00"`.
 *
 * The explicit sign is required: colour alone must never be the only signal of
 * direction (SPEC.md, accessibility).
 */
export function formatSignedPaise(paise: number, direction: "income" | "expense"): string {
  const sign = direction === "income" ? "+" : "−"; // U+2212 MINUS SIGN
  return `${sign} ${formatPaise(paise)}`;
}

/** `123450` → `"1234.50"`, for pre-filling an edit form's amount input. */
export function paiseToInputValue(paise: number): string {
  const rupees = Math.trunc(paise / PAISE_PER_RUPEE);
  const remainder = Math.abs(paise % PAISE_PER_RUPEE);
  return `${rupees}.${String(remainder).padStart(2, "0")}`;
}
