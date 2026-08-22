import Link from "next/link";

import { dashboardHref, type DashboardView } from "@/lib/dashboard-view";
import type { PeriodMode } from "@/lib/period";

/**
 * Which direction the category breakdown is showing.
 *
 * A pair of `<Link>`s, not a client component: the view lives in the URL beside
 * the period, so there is nothing to hold in React state and no JavaScript needed
 * to flip it. Same reasoning as `components/period-switcher.tsx`.
 *
 * Route-colocated rather than in `components/`, because the dashboard is the only
 * screen with a direction to choose — the transactions list shows both at once.
 */
type ViewToggleProps = {
  mode: PeriodMode;
  anchor: string;
  view: DashboardView;
};

/** Expenses first: it's the default view, and the question the app is opened to answer. */
const VIEW_ORDER = ["expense", "income"] as const;

/**
 * The same nouns as the two summary tiles above. The breakdown decomposes one of
 * those exact figures, so using a synonym here ("Spending" against a tile labelled
 * "Expenses") would make the reader check whether they're the same number.
 */
const LABELS: Record<DashboardView, string> = {
  expense: "Expenses",
  income: "Income",
};

/*
 * The other place a money colour is the right colour for a control — the same
 * exception `transaction-form.tsx`'s type toggle gets, and for the same reason:
 * this segment is choosing a direction, so the tint *is* the meaning rather than
 * decoration. Everywhere else in the app green and red are reserved for amounts.
 *
 * Colour is not carrying it alone. `aria-current` is the machine-readable signal,
 * and the border and the raise are the two visible ones that survive not being
 * able to tell the tints apart.
 */
const SELECTED: Record<DashboardView, string> = {
  expense: "bg-expense/10 text-expense border-expense/40",
  income: "bg-income/10 text-income border-income/40",
};

export function ViewToggle({ mode, anchor, view }: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Breakdown direction"
      className="bg-sunken border-rule grid grid-cols-2 gap-1 rounded-md border p-1 sm:max-w-xs"
    >
      {VIEW_ORDER.map((candidate) => {
        const active = candidate === view;

        return (
          <Link
            key={candidate}
            href={dashboardHref(mode, anchor, candidate)}
            aria-current={active ? "true" : undefined}
            // 44px, the tap target SPEC.md asks for.
            className={`focus-ring ease-out-quart flex min-h-11 items-center justify-center rounded-sm border text-sm font-medium transition-[background-color,border-color,color,box-shadow] duration-150 ${
              active
                ? `${SELECTED[candidate]} shadow-card`
                : "text-ink-2 hover:text-ink hover:bg-raised/60 border-transparent"
            }`}
          >
            {LABELS[candidate]}
          </Link>
        );
      })}
    </div>
  );
}
