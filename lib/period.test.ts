import { describe, expect, it } from "vitest";

import {
  canGoNext,
  formatDayMonth,
  formatPeriodLabel,
  getPeriodRange,
  isDateString,
  isPeriodMode,
  normalizeAnchor,
  periodHref,
  resolvePeriod,
  shiftPeriod,
  todayInAppZone,
} from "./period";

// Reference dates used below:
//   2026-08-17 Mon   2026-08-19 Wed   2026-08-16 Sun
//   2026-06-29 Mon (its week spans into July)

describe("getPeriodRange: week", () => {
  it("runs Monday to Sunday around a midweek date", () => {
    expect(getPeriodRange("week", "2026-08-19")).toEqual({
      start: "2026-08-17",
      end: "2026-08-23",
    });
  });

  it("treats Sunday as the end of its week, not the start", () => {
    expect(getPeriodRange("week", "2026-08-16")).toEqual({
      start: "2026-08-10",
      end: "2026-08-16",
    });
  });

  it("leaves a Monday anchor where it is", () => {
    expect(getPeriodRange("week", "2026-08-17")).toEqual({
      start: "2026-08-17",
      end: "2026-08-23",
    });
  });

  it("spans a month boundary", () => {
    expect(getPeriodRange("week", "2026-06-30")).toEqual({
      start: "2026-06-29",
      end: "2026-07-05",
    });
  });
});

describe("getPeriodRange: month", () => {
  it("covers the first to the last day", () => {
    expect(getPeriodRange("month", "2026-08-19")).toEqual({
      start: "2026-08-01",
      end: "2026-08-31",
    });
  });

  it("handles February in a leap year and a common year", () => {
    expect(getPeriodRange("month", "2028-02-10").end).toBe("2028-02-29");
    expect(getPeriodRange("month", "2026-02-10").end).toBe("2026-02-28");
  });

  it("handles a 30-day month", () => {
    expect(getPeriodRange("month", "2026-04-15").end).toBe("2026-04-30");
  });
});

describe("getPeriodRange: year", () => {
  it("covers January to December", () => {
    expect(getPeriodRange("year", "2026-08-19")).toEqual({
      start: "2026-01-01",
      end: "2026-12-31",
    });
  });
});

describe("shiftPeriod", () => {
  it("steps weeks", () => {
    expect(shiftPeriod("week", "2026-08-19", 1)).toBe("2026-08-24");
    expect(shiftPeriod("week", "2026-08-19", -1)).toBe("2026-08-10");
  });

  it("steps months across a year boundary", () => {
    expect(shiftPeriod("month", "2026-12-15", 1)).toBe("2027-01-01");
    expect(shiftPeriod("month", "2026-01-15", -1)).toBe("2025-12-01");
  });

  it("does not overflow when the next month is shorter", () => {
    // 31 Jan + 1 month must be 1 Mar only if you do it wrong.
    expect(shiftPeriod("month", "2026-01-31", 1)).toBe("2026-02-01");
  });

  it("steps years", () => {
    expect(shiftPeriod("year", "2026-08-19", 1)).toBe("2027-01-01");
    expect(shiftPeriod("year", "2026-08-19", -2)).toBe("2024-01-01");
  });
});

describe("normalizeAnchor", () => {
  it("snaps an anchor to the start of its period", () => {
    expect(normalizeAnchor("week", "2026-08-19")).toBe("2026-08-17");
    expect(normalizeAnchor("month", "2026-08-19")).toBe("2026-08-01");
    expect(normalizeAnchor("year", "2026-08-19")).toBe("2026-01-01");
  });
});

describe("canGoNext", () => {
  it("blocks a period that has not started yet", () => {
    // Next month starts 2026-09-01, which is after today.
    expect(canGoNext("month", "2026-08-19", "2026-08-19")).toBe(false);
  });

  it("allows stepping forward into a period that has started", () => {
    expect(canGoNext("month", "2026-07-15", "2026-08-19")).toBe(true);
  });

  it("allows the step on the exact day the next period begins", () => {
    expect(canGoNext("month", "2026-07-15", "2026-08-01")).toBe(true);
  });

  it("applies to weeks and years too", () => {
    expect(canGoNext("week", "2026-08-19", "2026-08-19")).toBe(false);
    expect(canGoNext("week", "2026-08-10", "2026-08-19")).toBe(true);
    expect(canGoNext("year", "2026-08-19", "2026-08-19")).toBe(false);
    expect(canGoNext("year", "2025-08-19", "2026-08-19")).toBe(true);
  });
});

describe("isDateString", () => {
  it("accepts real calendar dates", () => {
    expect(isDateString("2026-08-19")).toBe(true);
    expect(isDateString("2028-02-29")).toBe(true);
  });

  it("rejects dates that do not exist", () => {
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("2026-13-01")).toBe(false);
    expect(isDateString("2026-00-10")).toBe(false);
    expect(isDateString("2026-04-31")).toBe(false);
  });

  it("rejects anything not in YYYY-MM-DD form", () => {
    expect(isDateString("26-01-01")).toBe(false);
    expect(isDateString("2026-1-1")).toBe(false);
    expect(isDateString("19/08/2026")).toBe(false);
    expect(isDateString("")).toBe(false);
    expect(isDateString(undefined)).toBe(false);
    expect(isDateString(20260819)).toBe(false);
  });

  it("rejects two-digit years that Date.UTC would remap to the 1900s", () => {
    expect(isDateString("0050-01-01")).toBe(false);
  });
});

describe("isPeriodMode", () => {
  it("accepts the three modes and nothing else", () => {
    expect(isPeriodMode("week")).toBe(true);
    expect(isPeriodMode("month")).toBe(true);
    expect(isPeriodMode("year")).toBe(true);
    expect(isPeriodMode("decade")).toBe(false);
    expect(isPeriodMode(undefined)).toBe(false);
  });
});

describe("todayInAppZone", () => {
  it("uses the app timezone, not UTC", () => {
    // 19:30 UTC is already 01:00 the next day in IST.
    expect(todayInAppZone(new Date("2026-08-19T19:30:00Z"))).toBe("2026-08-20");
  });

  it("stays on the same day just before the IST rollover", () => {
    // 18:29 UTC is 23:59 IST.
    expect(todayInAppZone(new Date("2026-08-19T18:29:00Z"))).toBe("2026-08-19");
  });
});

describe("resolvePeriod", () => {
  it("defaults to the month containing today", () => {
    expect(resolvePeriod({}, "2026-08-19")).toEqual({
      mode: "month",
      anchor: "2026-08-01",
      range: { start: "2026-08-01", end: "2026-08-31" },
    });
  });

  it("normalises a valid anchor to the period start", () => {
    expect(resolvePeriod({ period: "week", anchor: "2026-08-19" }, "2026-08-19")).toEqual({
      mode: "week",
      anchor: "2026-08-17",
      range: { start: "2026-08-17", end: "2026-08-23" },
    });
  });

  it("falls back instead of throwing on untrusted junk", () => {
    expect(resolvePeriod({ period: "decade", anchor: "nonsense" }, "2026-08-19")).toEqual({
      mode: "month",
      anchor: "2026-08-01",
      range: { start: "2026-08-01", end: "2026-08-31" },
    });
    expect(resolvePeriod({ period: "week", anchor: "2026-02-30" }, "2026-08-19").anchor).toBe(
      "2026-08-17",
    );
  });
});

describe("formatPeriodLabel", () => {
  it("labels a month and a year", () => {
    expect(formatPeriodLabel("month", "2026-08-19")).toBe("August 2026");
    expect(formatPeriodLabel("year", "2026-08-19")).toBe("2026");
  });

  it("labels a week, collapsing a repeated month", () => {
    expect(formatPeriodLabel("week", "2026-08-19")).toBe("17–23 Aug 2026");
  });

  it("keeps both months when a week spans two", () => {
    expect(formatPeriodLabel("week", "2026-06-30")).toBe("29 Jun–5 Jul 2026");
  });
});

describe("periodHref", () => {
  it("builds the URL every period-aware page and link uses", () => {
    expect(periodHref("/transactions", "week", "2026-08-17")).toBe(
      "/transactions?period=week&anchor=2026-08-17",
    );
    expect(periodHref("/", "year", "2026-01-01")).toBe("/?period=year&anchor=2026-01-01");
  });

  it("round-trips through resolvePeriod unchanged", () => {
    // What the post-write redirect relies on: the link a page emits resolves back
    // to the same period, so saving lands you where you started.
    const { mode, anchor } = resolvePeriod({ period: "week", anchor: "2026-08-19" }, "2026-08-19");
    expect(periodHref("/transactions", mode, anchor)).toBe(
      "/transactions?period=week&anchor=2026-08-17",
    );
    expect(resolvePeriod({ period: mode, anchor }, "2026-08-19")).toEqual({
      mode: "week",
      anchor: "2026-08-17",
      range: { start: "2026-08-17", end: "2026-08-23" },
    });
  });
});

describe("formatDayMonth", () => {
  it("labels a transaction date without a year", () => {
    expect(formatDayMonth("2026-08-19")).toBe("19 Aug");
    expect(formatDayMonth("2026-01-01")).toBe("1 Jan");
  });

  it("does not shift the day for dates near midnight UTC", () => {
    // The trap this guards: `new Date('2026-03-01')` is UTC midnight, which is
    // 28 Feb in any negative-offset zone.
    expect(formatDayMonth("2026-03-01")).toBe("1 Mar");
    expect(formatDayMonth("2026-12-31")).toBe("31 Dec");
  });

  it("throws on a date that isn't real, rather than rolling it forward", () => {
    expect(() => formatDayMonth("2026-02-30")).toThrow();
  });
});
