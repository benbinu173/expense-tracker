import type { Metadata } from "next";

import { Alert } from "@/components/alert";
import { ButtonLink } from "@/components/button";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { IconPlus } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { PeriodSwitcher } from "@/components/period-switcher";
import { TransactionRow } from "@/components/transaction-row";
import { resolvePeriod, periodHref, todayInAppZone } from "@/lib/period";
import { firstParam } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Transactions" };

/**
 * The ledger for the selected period.
 *
 * Filtering happens in Postgres against the resolved range — `occurred_on` is a
 * `date`, and both ends of the range are `'YYYY-MM-DD'`, so `gte`/`lte` compare
 * as calendar days with no timezone in play.
 */
export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const params = await searchParams;
  const today = todayInAppZone();
  const { mode, anchor, range } = resolvePeriod(
    { period: firstParam(params.period), anchor: firstParam(params.anchor) },
    today,
  );

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id, type, amount_paise, occurred_on, note, category:categories(name)")
    .gte("occurred_on", range.start)
    .lte("occurred_on", range.end)
    // Newest day first; within a day, the most recently entered first.
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  const rows = data ?? [];
  // Every link out of this page carries the period back with it, so saving,
  // deleting or cancelling returns to the list you were actually reading.
  const addHref = periodHref("/transactions/new", mode, anchor);

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Everything you've recorded, newest first. Tap a row to edit it."
        action={
          <ButtonLink href={addHref} size="sm">
            <IconPlus className="size-4 shrink-0" />
            Add transaction
          </ButtonLink>
        }
      />

      <PeriodSwitcher mode={mode} anchor={anchor} today={today} basePath="/transactions" />

      {error ? (
        <Alert tone="error">Couldn&rsquo;t load your transactions. Reload and try again.</Alert>
      ) : (
        <Card padded={false}>
          {rows.length === 0 ? (
            <EmptyState
              title="No transactions in this period"
              description="Try a wider period, or record one to get started."
              action={
                <ButtonLink href={addHref} size="sm" variant="secondary">
                  Add transaction
                </ButtonLink>
              }
            />
          ) : (
            <>
              <ul className="divide-rule stagger-rows divide-y">
                {rows.map((row) => (
                  <li key={row.id}>
                    <TransactionRow
                      type={row.type}
                      amountPaise={row.amount_paise}
                      occurredOn={row.occurred_on}
                      categoryName={row.category.name}
                      note={row.note}
                      href={periodHref(`/transactions/${row.id}/edit`, mode, anchor)}
                    />
                  </li>
                ))}
              </ul>

              {/* A ledger tells you how many lines it has. */}
              <p className="border-rule text-ink-3 border-t px-4 py-2.5 text-[13px] sm:px-5">
                {rows.length} {rows.length === 1 ? "entry" : "entries"}
              </p>
            </>
          )}
        </Card>
      )}
    </>
  );
}
