import type { Metadata } from "next";
import { notFound } from "next/navigation";
import * as z from "zod";

import { deleteTransaction, updateTransaction } from "@/app/actions/transactions";
import { Alert } from "@/components/alert";
import { Card, SectionLabel } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { paiseToInputValue } from "@/lib/money";
import { periodHref, resolvePeriod, todayInAppZone } from "@/lib/period";
import { firstParam } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/server";

import { TransactionForm } from "../../transaction-form";
import { DeleteTransaction } from "./delete-transaction";

export const metadata: Metadata = { title: "Edit transaction" };

/**
 * Edit one transaction, and delete it.
 *
 * `category_id` is selected alongside the embedded category name: the form's
 * select needs the id, the delete confirmation needs the name.
 */
export default async function EditTransactionPage({
  params,
  searchParams,
}: PageProps<"/transactions/[id]/edit">) {
  const [{ id }, rawParams] = await Promise.all([params, searchParams]);

  // Postgres rejects a malformed uuid with a 22P02 rather than an empty result,
  // so screen it here and let a junk URL 404 like any other missing page.
  if (!z.uuid().safeParse(id).success) notFound();

  const period = { period: firstParam(rawParams.period), anchor: firstParam(rawParams.anchor) };
  const today = todayInAppZone();
  const { mode, anchor } = resolvePeriod(period, today);
  const cancelHref = periodHref("/transactions", mode, anchor);

  const supabase = await createClient();
  const [transaction, categories] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, type, amount_paise, occurred_on, category_id, note, category:categories(name)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("id, name, type").order("name", { ascending: true }),
  ]);

  // Both reads feed the form, so either failing leaves nothing worth rendering.
  if (transaction.error || categories.error) {
    return (
      <>
        <PageHeader title="Edit transaction" />
        <Alert tone="error">Couldn&rsquo;t load that transaction. Reload and try again.</Alert>
      </>
    );
  }

  // RLS makes "not yours" indistinguishable from "doesn't exist", which is the
  // right answer to give either way.
  if (!transaction.data) notFound();

  const row = transaction.data;
  const target = { id, period };

  return (
    <>
      <PageHeader title="Edit transaction" description="Changes take effect immediately." />

      <Card className="max-w-lg">
        <TransactionForm
          categories={categories.data}
          today={today}
          action={updateTransaction.bind(null, target)}
          cancelHref={cancelHref}
          initial={{
            type: row.type,
            amount: paiseToInputValue(row.amount_paise),
            occurredOn: row.occurred_on,
            categoryId: row.category_id,
            note: row.note ?? "",
          }}
          submitLabel="Save changes"
          pendingLabel="Saving…"
        />
      </Card>

      <Card className="max-w-lg">
        <div className="flex flex-col items-start gap-3">
          <SectionLabel>Delete</SectionLabel>
          <p className="text-ink-2 text-sm">
            Removing this transaction takes it out of every balance and breakdown.
          </p>
          <DeleteTransaction
            action={deleteTransaction.bind(null, target)}
            row={{
              type: row.type,
              amountPaise: row.amount_paise,
              occurredOn: row.occurred_on,
              categoryName: row.category.name,
              note: row.note,
            }}
          />
        </div>
      </Card>
    </>
  );
}
