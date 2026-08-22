import { CategoryBreakdown } from "@/app/(app)/category-breakdown";
import { ViewToggle } from "@/app/(app)/view-toggle";
import { Alert } from "@/components/alert";
import { ButtonLink } from "@/components/button";
import { Card, SectionLabel } from "@/components/card";
import { HeroPanel } from "@/components/hero-panel";
import { IconPlus } from "@/components/icons";
import { Balance, Figure } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { PeriodSwitcher } from "@/components/period-switcher";
import { TransactionRow } from "@/components/transaction-row";
import { resolveView, type DashboardView } from "@/lib/dashboard-view";
import { formatPeriodLabel, periodHref, resolvePeriod, todayInAppZone } from "@/lib/period";
import { firstParam } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/server";

/** Five is what summarises the period without becoming the list. */
const RECENT_LIMIT = 5;

const BREAKDOWN_TITLES: Record<DashboardView, string> = {
  expense: "Where it went",
  income: "Where it came from",
};

/**
 * Dashboard.
 *
 * Balance for the selected period in the hero, income and expenses beneath it,
 * then the category breakdown for whichever direction the toggle is on, then the
 * five most recent entries.
 *
 * Everything is scoped to the selected period, including "recent" — a dashboard
 * that reports a ₹0.00 balance for last March while listing yesterday's coffee
 * would be lying about which numbers belong together.
 *
 * Three round trips, all independent, so they go out together rather than in
 * sequence. Both aggregates run in Postgres: a year-long period is two small
 * result sets over the wire instead of every transaction in it, and both functions
 * are `security invoker`, so RLS picks the rows they're allowed to sum.
 */
export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  // One clock read per request, shared by the resolver and the switcher.
  const today = todayInAppZone();
  const { mode, anchor, range } = resolvePeriod(
    { period: firstParam(params.period), anchor: firstParam(params.anchor) },
    today,
  );
  const view = resolveView(firstParam(params.view));

  const supabase = await createClient();
  const [totals, breakdown, recent] = await Promise.all([
    // Exactly one row, always: an aggregate with no `group by` returns one even
    // when it summed nothing, so `.single()` can't come up empty.
    supabase.rpc("period_totals", { period_start: range.start, period_end: range.end }).single(),
    supabase.rpc("category_totals", {
      period_start: range.start,
      period_end: range.end,
      txn_type: view,
    }),
    supabase
      .from("transactions")
      .select("id, type, amount_paise, occurred_on, note, category:categories(name)")
      .gte("occurred_on", range.start)
      .lte("occurred_on", range.end)
      // Same ordering as the list page, so "recent" means the same thing on both.
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT),
  ]);

  const income = totals.data?.income_paise ?? 0;
  const expense = totals.data?.expense_paise ?? 0;
  const balance = income - expense;

  // `amount_paise > 0` is a check constraint, so two zeroes can only mean the
  // period holds no transactions — not that they happened to cancel out.
  const empty = income === 0 && expense === 0;

  const addHref = periodHref("/transactions/new", mode, anchor);
  const listHref = periodHref("/transactions", mode, anchor);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Income, spending, and where it went over the period you pick."
        action={
          <ButtonLink href={addHref} size="sm">
            <IconPlus className="size-4 shrink-0" />
            Add transaction
          </ButtonLink>
        }
      />

      <PeriodSwitcher mode={mode} anchor={anchor} today={today} basePath="/" />

      {totals.error ? (
        <Alert tone="error">
          Couldn&rsquo;t load this period&rsquo;s totals. Reload and try again.
        </Alert>
      ) : (
        <>
          <HeroPanel label={`Balance · ${formatPeriodLabel(mode, anchor)}`}>
            <Balance paise={balance} surface="hero" className="block" />

            {empty ? (
              <>
                <p className="mt-3 max-w-sm text-sm">
                  Nothing recorded in this period yet. Log income and expenses and this becomes your
                  balance, with a category breakdown and your latest activity below.
                </p>
                <ButtonLink href={addHref} size="sm" variant="inverse" className="mt-5">
                  <IconPlus className="size-4 shrink-0" />
                  Add transaction
                </ButtonLink>
              </>
            ) : (
              /*
               * The negative case gets a sentence, because on this surface it
               * can't get a colour: `--expense` red over the violet gradient is
               * well under AA, and the rule for the hero is that the stop moves
               * before the text does — but there's no stop to move for a figure
               * that's only sometimes red. `Balance` leans on the leading `−`,
               * which was always the primary channel (SPEC.md accessibility);
               * this is the redundant second one, and it survives being read
               * aloud.
               */
              balance < 0 && <p className="mt-3 text-sm">Expenses exceeded income this period.</p>
            )}
          </HeroPanel>

          {/*
           * Two-up from `sm`, stacked below it. Side by side is the better read —
           * these two numbers exist to be compared — but at 375px a tile is only
           * about 130px of inner width, and a year's income at `₹12,00,000.00` is
           * ~140px of tabular mono. Shrinking the figure to fit would make the
           * dashboard's second-most-important pair the same size as body text, so
           * the layout gives way instead.
           */}
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <TotalTile label="Income" paise={income} direction="income" />
            <TotalTile label="Expenses" paise={expense} direction="expense" />
          </div>

          {/*
           * Both blocks are dropped entirely on an untouched period. The hero above
           * already carries that empty state, with the sentence and the CTA — a
           * breakdown reading "no spending" and a list reading "no transactions"
           * under it would be the same news three times.
           */}
          {!empty && (
            <>
              {/*
               * The toggle scopes the breakdown and nothing else, so it sits
               * *outside* the card at a tighter gap than the page's own `gap-6` —
               * close enough to read as attached, and not inside the card, where a
               * control changes what the card is showing without saying so.
               *
               * One staggered child, not two: `stagger-children` in the layout
               * animates direct children of `main`, and this wrapper is the child.
               */}
              <div className="flex flex-col gap-3">
                <ViewToggle mode={mode} anchor={anchor} view={view} />

                <Card
                  padded={false}
                  title={BREAKDOWN_TITLES[view]}
                  action={
                    breakdown.error ? undefined : (
                      /* The denominator the percentages are of, stated so the
                       * reader doesn't have to match the card against a tile. */
                      <p className="text-ink text-sm">
                        <span className="sr-only">Total: </span>
                        <Figure paise={view === "income" ? income : expense} />
                      </p>
                    )
                  }
                >
                  {breakdown.error ? (
                    <div className="p-4 sm:p-5">
                      <Alert tone="error">
                        Couldn&rsquo;t load the category breakdown. Reload and try again.
                      </Alert>
                    </div>
                  ) : (
                    <CategoryBreakdown
                      rows={breakdown.data ?? []}
                      view={view}
                      action={
                        <ButtonLink href={addHref} size="sm" variant="secondary">
                          Add transaction
                        </ButtonLink>
                      }
                    />
                  )}
                </Card>
              </div>

              <Card
                padded={false}
                title="Recent activity"
                action={
                  <ButtonLink href={listHref} size="sm" variant="ghost">
                    View all
                  </ButtonLink>
                }
              >
                {recent.error ? (
                  <div className="p-4 sm:p-5">
                    <Alert tone="error">
                      Couldn&rsquo;t load your recent activity. Reload and try again.
                    </Alert>
                  </div>
                ) : (
                  /*
                   * Rows are inert here — no `href`. A row is the edit affordance on
                   * the list, where the whole screen is about editing; on the
                   * dashboard it's a summary, and "View all" is the way through.
                   */
                  <ul className="divide-rule stagger-rows divide-y">
                    {(recent.data ?? []).map((row) => (
                      <li key={row.id}>
                        <TransactionRow
                          type={row.type}
                          amountPaise={row.amount_paise}
                          occurredOn={row.occurred_on}
                          categoryName={row.category.name}
                          note={row.note}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </>
  );
}

/**
 * One half of the income/expenses pair.
 *
 * `Figure` rather than `Amount`, which is what `Figure` exists for: the label
 * already says which direction this is, so a `+` in front of a total called
 * "Income" is noise. The money colour is the redundant second channel — and one
 * of the few places in the app where colour is allowed to carry meaning.
 *
 * No dot beside the label. `CategoryDot` is already this app's dot and it means
 * identity, not direction; borrowing the shape here would blur both.
 */
function TotalTile({
  label,
  paise,
  direction,
}: {
  label: string;
  paise: number;
  direction: "income" | "expense";
}) {
  return (
    <Card>
      <SectionLabel>{label}</SectionLabel>
      <Figure
        paise={paise}
        className={`mt-1.5 block text-xl sm:text-2xl ${
          direction === "income" ? "text-income" : "text-expense"
        }`}
      />
    </Card>
  );
}
