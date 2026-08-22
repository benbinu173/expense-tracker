/**
 * Calendar period maths for the week / month / year filters.
 *
 * Two rules make this safe:
 *
 * 1. Dates are `'YYYY-MM-DD'` strings at the boundaries, and UTC-based `Date`
 *    objects only internally. A UTC `Date` is used purely as a calendar
 *    calculator — no DST, no local-midnight surprises. Never call
 *    `new Date('2026-08-01')` elsewhere and expect a local date.
 * 2. "Today" is resolved in one fixed zone, {@link APP_TIME_ZONE}, so the
 *    server and the browser always agree on which day it is. v1 is single
 *    currency and single timezone; change this one constant if that changes.
 */

export const APP_TIME_ZONE = "Asia/Kolkata";

export type PeriodMode = "week" | "month" | "year";

export const PERIOD_MODES = ["week", "month", "year"] as const;

/** Inclusive range; both ends are `'YYYY-MM-DD'`. */
export type PeriodRange = { start: string; end: string };

export type ResolvedPeriod = {
  mode: PeriodMode;
  /** Always normalised to the first day of the period. */
  anchor: string;
  range: PeriodRange;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isPeriodMode(value: unknown): value is PeriodMode {
  return typeof value === "string" && (PERIOD_MODES as readonly string[]).includes(value);
}

export function isDateString(value: unknown): value is string {
  return typeof value === "string" && toUtcDate(value) !== null;
}

/**
 * `'YYYY-MM-DD'` → UTC `Date`, or `null` if it isn't a real calendar date.
 * Rejects overflow such as `2026-02-30`, which `Date.UTC` would silently roll
 * forward into March.
 */
function toUtcDate(date: string): Date | null {
  if (!DATE_PATTERN.test(date)) return null;

  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));

  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }
  return utc;
}

function fromUtcDate(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function requireDate(date: string): Date {
  const parsed = toUtcDate(date);
  if (parsed === null) {
    throw new Error(`Not a valid 'YYYY-MM-DD' date: ${date}`);
  }
  return parsed;
}

/**
 * Today's date in {@link APP_TIME_ZONE}. Takes `now` so tests can pin it.
 */
export function todayInAppZone(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const value = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

/**
 * The calendar period containing `anchor`. Weeks run Monday–Sunday.
 * Throws on an invalid anchor — validate with {@link isDateString} first, or
 * use {@link resolvePeriod}, which handles untrusted input.
 */
export function getPeriodRange(mode: PeriodMode, anchor: string): PeriodRange {
  const date = requireDate(anchor);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  switch (mode) {
    case "week": {
      // getUTCDay(): 0 = Sunday. Shift so Monday is 0.
      const daysSinceMonday = (date.getUTCDay() + 6) % 7;
      const start = addDays(date, -daysSinceMonday);
      return { start: fromUtcDate(start), end: fromUtcDate(addDays(start, 6)) };
    }
    case "month": {
      // Day 0 of the next month is the last day of this one.
      const start = new Date(Date.UTC(year, month, 1));
      const end = new Date(Date.UTC(year, month + 1, 0));
      return { start: fromUtcDate(start), end: fromUtcDate(end) };
    }
    case "year": {
      const start = new Date(Date.UTC(year, 0, 1));
      const end = new Date(Date.UTC(year, 11, 31));
      return { start: fromUtcDate(start), end: fromUtcDate(end) };
    }
  }
}

/**
 * Steps the anchor whole periods forward (`steps > 0`) or back, returning the
 * first day of the period landed on.
 */
export function shiftPeriod(mode: PeriodMode, anchor: string, steps: number): string {
  const start = requireDate(getPeriodRange(mode, anchor).start);
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();

  switch (mode) {
    case "week":
      return fromUtcDate(addDays(start, 7 * steps));
    case "month":
      return fromUtcDate(new Date(Date.UTC(year, month + steps, 1)));
    case "year":
      return fromUtcDate(new Date(Date.UTC(year + steps, 0, 1)));
  }
}

/** First day of the period containing `anchor`. */
export function normalizeAnchor(mode: PeriodMode, anchor: string): string {
  return getPeriodRange(mode, anchor).start;
}

/**
 * Whether "next period" is allowed: false once the next period would start
 * after today. ISO date strings compare lexicographically, so `<=` is a valid
 * chronological test.
 */
export function canGoNext(mode: PeriodMode, anchor: string, today: string): boolean {
  return shiftPeriod(mode, anchor, 1) <= today;
}

/**
 * Turns untrusted URL search params into a usable period, falling back to the
 * current month when anything is missing or malformed.
 */
export function resolvePeriod(
  params: { period?: string | undefined; anchor?: string | undefined },
  today: string = todayInAppZone(),
): ResolvedPeriod {
  const mode = isPeriodMode(params.period) ? params.period : "month";
  const requested = isDateString(params.anchor) ? params.anchor : today;
  const anchor = normalizeAnchor(mode, requested);

  return { mode, anchor, range: getPeriodRange(mode, anchor) };
}

const monthYearFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});
const dayMonthFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
const dayFormat = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric" });
const dayMonthYearFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * Row label for a single date: "19 Aug".
 *
 * Lives here because it needs the same UTC-based parse as everything else — a
 * bare `new Date('2026-08-19')` in a component would render the 18th for anyone
 * west of Greenwich.
 */
export function formatDayMonth(date: string): string {
  return dayMonthFormat.format(requireDate(date));
}

/**
 * URL for any page that reads the period off its search params.
 *
 * The one place this string is built. Pages, the period switcher, and the
 * post-write redirect in `app/actions/transactions.ts` all go through here, so
 * the param names can't drift apart. `mode` is a union and `anchor` comes out of
 * {@link resolvePeriod} normalised, so there is nothing to escape.
 */
export function periodHref(basePath: string, mode: PeriodMode, anchor: string): string {
  return `${basePath}?period=${mode}&anchor=${anchor}`;
}

/** Human label for the period selector: "August 2026", "17–23 Aug 2026", "2026". */
export function formatPeriodLabel(mode: PeriodMode, anchor: string): string {
  const range = getPeriodRange(mode, anchor);
  const start = requireDate(range.start);

  switch (mode) {
    case "week": {
      const end = requireDate(range.end);
      const sameMonth = start.getUTCMonth() === end.getUTCMonth();
      const left = sameMonth ? dayFormat.format(start) : dayMonthFormat.format(start);
      return `${left}–${dayMonthYearFormat.format(end)}`;
    }
    case "month":
      return monthYearFormat.format(start);
    case "year":
      return String(start.getUTCFullYear());
  }
}
