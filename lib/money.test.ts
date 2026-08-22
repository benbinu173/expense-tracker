import { describe, expect, it } from "vitest";

import {
  formatPaise,
  formatSignedPaise,
  MAX_PAISE,
  paiseToInputValue,
  parseAmountToPaise,
} from "./money";

/** Parses, or fails the test with the parser's own message. */
function paise(input: string): number {
  const result = parseAmountToPaise(input);
  if (!result.ok) {
    throw new Error(`expected "${input}" to parse, got: ${result.error}`);
  }
  return result.paise;
}

function errorFor(input: string): string {
  const result = parseAmountToPaise(input);
  if (result.ok) {
    throw new Error(`expected "${input}" to be rejected, got ${result.paise} paise`);
  }
  return result.error;
}

describe("parseAmountToPaise", () => {
  it("parses whole rupees and decimals", () => {
    expect(paise("1234.50")).toBe(123450);
    expect(paise("5")).toBe(500);
    expect(paise("5.5")).toBe(550);
    expect(paise("5.05")).toBe(505);
    expect(paise("0.01")).toBe(1);
    expect(paise("0001.50")).toBe(150);
  });

  it("does not lose a paisa to float arithmetic", () => {
    // The whole reason this helper exists: 0.29 * 100 === 28.999999999999996
    expect(paise("0.29")).toBe(29);
    expect(paise("1.15")).toBe(115);
    expect(paise("8.29")).toBe(829);
    expect(paise("1234.56")).toBe(123456);
  });

  it("tolerates rupee signs, commas and surrounding space", () => {
    expect(paise("₹1,234.50")).toBe(123450);
    expect(paise("  1234.5  ")).toBe(123450);
    expect(paise("₹ 1,23,456")).toBe(12345600);
  });

  it("accepts the maximum but not a paisa more", () => {
    expect(paise("1000000000")).toBe(MAX_PAISE);
    expect(errorFor("1000000000.01")).toMatch(/too large/i);
  });

  it("rejects empty and non-numeric input", () => {
    expect(errorFor("")).toMatch(/enter an amount/i);
    expect(errorFor("   ")).toMatch(/enter an amount/i);
    expect(errorFor("abc")).toMatch(/digits/i);
    expect(errorFor("1..2")).toMatch(/digits/i);
    expect(errorFor("1.2.3")).toMatch(/digits/i);
  });

  it("rejects more than two decimal places", () => {
    expect(errorFor("1.234")).toMatch(/2 decimal places/i);
  });

  it("rejects zero and negatives", () => {
    expect(errorFor("0")).toMatch(/greater than zero/i);
    expect(errorFor("0.00")).toMatch(/greater than zero/i);
    // Negatives get their own message: direction comes from the type, not a sign.
    expect(errorFor("-5")).toMatch(/income or expense sets the direction/i);
  });
});

describe("formatPaise", () => {
  it("formats as Indian rupees with two decimals", () => {
    expect(formatPaise(123450)).toBe("₹1,234.50");
    expect(formatPaise(1)).toBe("₹0.01");
    expect(formatPaise(0)).toBe("₹0.00");
  });

  it("uses Indian digit grouping", () => {
    expect(formatPaise(1234567890)).toBe("₹1,23,45,678.90");
  });

  it("formats negatives, for balances", () => {
    expect(formatPaise(-45000)).toBe("-₹450.00");
  });
});

describe("formatSignedPaise", () => {
  it("prefixes an explicit sign so colour is never the only signal", () => {
    expect(formatSignedPaise(120000, "income")).toBe("+ ₹1,200.00");
    expect(formatSignedPaise(45000, "expense")).toBe("− ₹450.00");
  });
});

describe("paiseToInputValue", () => {
  it("renders a value an amount input can hold", () => {
    expect(paiseToInputValue(123450)).toBe("1234.50");
    expect(paiseToInputValue(500)).toBe("5.00");
    expect(paiseToInputValue(5)).toBe("0.05");
    expect(paiseToInputValue(29)).toBe("0.29");
  });

  it("round-trips through the parser", () => {
    for (const value of [1, 29, 500, 505, 123450, 1234567890]) {
      expect(paise(paiseToInputValue(value))).toBe(value);
    }
  });
});
