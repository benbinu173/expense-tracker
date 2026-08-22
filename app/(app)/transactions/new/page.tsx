import type { Metadata } from "next";

import { createTransaction } from "@/app/actions/transactions";
import { Alert } from "@/components/alert";
import { ButtonLink } from "@/components/button";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { periodHref, resolvePeriod, todayInAppZone } from "@/lib/period";
import { firstParam } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/server";

import { TransactionForm } from "../transaction-form";

export const metadata: Metadata = { title: "Add transaction" };

/**
 * Both directions' categories are fetched here and filtered in the form, so
 * flipping income/expense doesn't cost a round trip. RLS scopes the select to the
 * session's own rows — there's deliberately no `user_id` filter.
 *
 * The period rides along in the URL so saving returns to the list the user was
 * looking at, not whatever the current month happens to be.
 */
export default async function NewTransactionPage({ searchParams }: PageProps<"/transactions/new">) {
  const params = await searchParams;
  const period = { period: firstParam(params.period), anchor: firstParam(params.anchor) };
  const today = todayInAppZone();
  const { mode, anchor } = resolvePeriod(period, today);
  const cancelHref = periodHref("/transactions", mode, anchor);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, type")
    .order("name", { ascending: true });

  const categories = data ?? [];

  return (
    <>
      <PageHeader title="Add transaction" description="Amounts in rupees. Dates can't be future." />

      <Card className="max-w-lg">
        {error ? (
          <Alert tone="error">
            Couldn&rsquo;t load your categories, so there&rsquo;s nothing to file this under. Reload
            and try again.
          </Alert>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <Alert>You need at least one category before you can record anything.</Alert>
            <ButtonLink href="/categories" variant="secondary">
              Go to categories
            </ButtonLink>
          </div>
        ) : (
          <TransactionForm
            categories={categories}
            today={today}
            action={createTransaction.bind(null, period)}
            cancelHref={cancelHref}
            submitLabel="Save transaction"
            pendingLabel="Saving…"
          />
        )}
      </Card>
    </>
  );
}
