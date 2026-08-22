import { CategoryDot } from "@/components/category-dot";
import { EmptyState } from "@/components/empty-state";
import { Figure } from "@/components/money";
import { categoryFillClass } from "@/lib/category-color";
import type { DashboardView } from "@/lib/dashboard-view";
import { percentShares } from "@/lib/percent";

/**
 * Where the period's money went, by category.
 *
 * **Why bars in CSS and not a charting library.** The form this data wants is a
 * ranked bar chart: one categorical series, magnitude, a dozen rows at most. Every
 * value is printed as text beside its bar, so the bar carries comparison, not
 * measurement — and a horizontal bar whose length is a percentage of its track is
 * two divs. Recharts would add ~90KB of client JavaScript, force this into a
 * client component, and have to be fought into rendering the same right-aligned
 * mono figures the rest of the app uses. It was in the original stack list; it
 * turned out not to be needed, which is the better outcome.
 *
 * **Why length and not hue.** The `--cat-*` palette is identity, not meaning
 * (see `lib/category-color.ts`) — its hues are chosen to be recognisable beside a
 * name, and measured as a *chart* palette several adjacent pairs fall under the
 * separation a reader needs to tell them apart, worse under simulated CVD and
 * worse again in dark mode. That's the palette doing its documented job, not a
 * defect, and re-stepping eight tokens to fix a chart would change a colour on
 * every screen in the app. So this chart encodes with length, labels every value
 * twice, and lets hue do only what it already does well: match the bar to the dot
 * on the same category's rows elsewhere.
 */
type CategoryBreakdownProps = {
  /** From `category_totals`, already ordered largest first by the query. */
  rows: readonly { category_id: string; category_name: string; total_paise: number }[];
  view: DashboardView;
  /** Rendered in place of the list when the query itself failed. */
  action?: React.ReactNode;
};

const EMPTY_COPY: Record<DashboardView, { title: string; description: string }> = {
  expense: {
    title: "No spending in this period",
    description: "Nothing went out. Switch to Income to see what came in.",
  },
  income: {
    title: "No income in this period",
    description: "Nothing came in. Switch to Expenses to see where it went.",
  },
};

export function CategoryBreakdown({ rows, view, action }: CategoryBreakdownProps) {
  if (rows.length === 0) {
    const copy = EMPTY_COPY[view];

    return <EmptyState title={copy.title} description={copy.description} action={action} />;
  }

  /*
   * Largest remainder, so the column adds up to 100 (see `lib/percent.ts`). It has
   * to: `category_id` is `not null`, so these rows are a genuine partition of the
   * period's total for this direction, and a column of percentages that summed to
   * 99 would read as a missing transaction.
   */
  const shares = percentShares(rows.map((row) => row.total_paise));

  return (
    <ul className="stagger-rows divide-rule divide-y">
      {rows.map((row, index) => {
        const share = shares[index] ?? 0;

        return (
          <li key={row.category_id} className="px-4 py-3 sm:px-5">
            <div className="flex items-baseline gap-2 sm:gap-3">
              <CategoryDot name={row.category_name} className="translate-y-[-1px]" />
              <p className="text-ink min-w-0 flex-1 truncate text-sm font-medium">
                {row.category_name}
              </p>
              {/*
               * `Figure`, not `Amount`: the toggle and the card title already say
               * which direction this is, so a `+`/`−` on every row would be noise.
               * Text wears ink tokens — never the bar's colour, which is a light
               * categorical hue and illegible as type.
               */}
              <Figure paise={row.total_paise} className="text-ink shrink-0 text-sm" />
              <span className="figure text-ink-3 w-9 shrink-0 text-right text-[13px]">
                {share}%
              </span>
            </div>

            {/*
             * The bar is scaled to the *displayed* percentage rather than the exact
             * fraction, so its length and the number beside it can never disagree.
             *
             * `aria-hidden` because it restates the two figures above it; a screen
             * reader gets the amount and the share as text and needs no third copy.
             *
             * Flat on the left, rounded on the right: every row's track starts at
             * the same x, so the flat end reads as a shared baseline the bars grow
             * from. A pill track would round the short bars into lens shapes and
             * cost length at the end that carries the value.
             *
             * The width has to be an inline style — Tailwind can only emit class
             * names it can see in the source, and a computed percentage isn't one.
             * The `max()` floor is one bar-height, so a category rounding to 0%
             * still draws a dot instead of nothing at all.
             */}
            <div
              aria-hidden
              className="bg-sunken mt-2 ml-4 h-1.5 overflow-hidden rounded-r-full sm:ml-5"
            >
              <div
                className={`${categoryFillClass(row.category_name)} h-full rounded-r-full`}
                style={{ width: `max(0.375rem, ${share}%)` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
