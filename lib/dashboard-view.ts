import { periodHref, type PeriodMode } from "./period";
import { TRANSACTION_TYPES, type TransactionType } from "./validation/transactions";

/**
 * Which direction the dashboard's breakdown is showing.
 *
 * The same two values as a transaction's `type`, and deliberately the same type
 * rather than a parallel one — the view is passed straight to `category_totals`
 * as its `txn_type` argument, so any widening here would be a lie at the call
 * site.
 */
export type DashboardView = TransactionType;

/**
 * Expenses, because that's the question a spending tracker is opened to answer.
 * Income for most people is one or two categories and needs no breakdown.
 */
export const DEFAULT_VIEW: DashboardView = "expense";

export function isDashboardView(value: unknown): value is DashboardView {
  return typeof value === "string" && (TRANSACTION_TYPES as readonly string[]).includes(value);
}

/**
 * Falls back rather than throwing, the same contract as `resolvePeriod` — a
 * hand-edited `?view=` in the URL shows the default dashboard, not an error page.
 */
export function resolveView(value: unknown): DashboardView {
  return isDashboardView(value) ? value : DEFAULT_VIEW;
}

/**
 * The dashboard's own URL, period and view together.
 *
 * Built on `periodHref` rather than beside it: that function stays the only place
 * the `?period=&anchor=` pair is assembled, so a change to the period URL shape
 * can't leave the dashboard behind. This only appends its one extra parameter.
 */
export function dashboardHref(mode: PeriodMode, anchor: string, view: DashboardView): string {
  return `${periodHref("/", mode, anchor)}&view=${view}`;
}
