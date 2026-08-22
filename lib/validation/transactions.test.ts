import { describe, expect, it } from "vitest";

import * as z from "zod";

import { makeTransactionSchema, NOTE_MAX_LENGTH } from "./transactions";

const TODAY = "2026-08-19";
const schema = makeTransactionSchema(TODAY);

const CATEGORY_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

const valid = {
  type: "expense",
  amount: "1234.50",
  occurredOn: "2026-08-18",
  categoryId: CATEGORY_ID,
  note: "Big Bazaar",
};

function errors(input: unknown) {
  const result = schema.safeParse(input);
  if (result.success) throw new Error("expected the input to be rejected");
  return z.flattenError(result.error).fieldErrors;
}

describe("makeTransactionSchema", () => {
  it("parses a valid transaction into integer paise", () => {
    const result = schema.parse(valid);
    expect(result.amount).toBe(123450);
    expect(result.type).toBe("expense");
    expect(result.occurredOn).toBe("2026-08-18");
    expect(result.note).toBe("Big Bazaar");
  });

  it("keeps the float trap out of the amount", () => {
    // Number("0.29") * 100 is 28.999999999999996.
    expect(schema.parse({ ...valid, amount: "0.29" }).amount).toBe(29);
    expect(schema.parse({ ...valid, amount: "8.29" }).amount).toBe(829);
  });

  it("accepts what people actually paste", () => {
    expect(schema.parse({ ...valid, amount: "₹1,234.50" }).amount).toBe(123450);
    expect(schema.parse({ ...valid, amount: " 1234.5 " }).amount).toBe(123450);
  });

  it("surfaces the money parser's own message", () => {
    expect(errors({ ...valid, amount: "-5" }).amount).toEqual([
      "Amount must be positive — income or expense sets the direction.",
    ]);
    expect(errors({ ...valid, amount: "1.234" }).amount).toEqual([
      "Use digits with up to 2 decimal places, like 1234.50.",
    ]);
    expect(errors({ ...valid, amount: "0" }).amount).toEqual(["Amount must be greater than zero."]);
    expect(errors({ ...valid, amount: "" }).amount).toEqual(["Enter an amount."]);
  });

  it("accepts today but not tomorrow", () => {
    expect(schema.safeParse({ ...valid, occurredOn: TODAY }).success).toBe(true);
    expect(errors({ ...valid, occurredOn: "2026-08-20" }).occurredOn).toEqual([
      "That date hasn't happened yet.",
    ]);
  });

  it("reports an unparseable date once, not twice", () => {
    // Chained .refine()s would report "invalid" and "in the future" together.
    expect(errors({ ...valid, occurredOn: "2026-02-30" }).occurredOn).toEqual([
      "Pick a valid date.",
    ]);
    expect(errors({ ...valid, occurredOn: "" }).occurredOn).toEqual(["Pick a valid date."]);
  });

  it("requires a real category id", () => {
    expect(errors({ ...valid, categoryId: "" }).categoryId).toEqual(["Choose a category."]);
    expect(errors({ ...valid, categoryId: "not-a-uuid" }).categoryId).toEqual([
      "Choose a category.",
    ]);
  });

  it("rejects a type outside the enum", () => {
    expect(errors({ ...valid, type: "transfer" }).type).toEqual(["Choose income or expense."]);
  });

  it("treats a blank note as absent and caps its length", () => {
    expect(schema.parse({ ...valid, note: "   " }).note).toBeUndefined();
    expect(schema.parse({ ...valid, note: undefined }).note).toBeUndefined();
    expect(schema.safeParse({ ...valid, note: "a".repeat(NOTE_MAX_LENGTH) }).success).toBe(true);
    expect(errors({ ...valid, note: "a".repeat(NOTE_MAX_LENGTH + 1) }).note).toEqual([
      `Keep the note to ${NOTE_MAX_LENGTH} characters or fewer.`,
    ]);
  });

  it("trims the note before measuring it", () => {
    expect(schema.parse({ ...valid, note: "  Weekly big shop  " }).note).toBe("Weekly big shop");
    // Padding is not length: this is 200 real characters plus whitespace.
    expect(schema.safeParse({ ...valid, note: ` ${"a".repeat(NOTE_MAX_LENGTH)} ` }).success).toBe(
      true,
    );
  });
});
