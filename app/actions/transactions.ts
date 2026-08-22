"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

import { periodHref, resolvePeriod, todayInAppZone } from "@/lib/period";
import { createClient } from "@/lib/supabase/server";
import { makeTransactionSchema } from "@/lib/validation/transactions";

/**
 * Transaction writes.
 *
 * `user_id` comes from the session, never from the form — a client that posts its
 * own `user_id` gets it ignored here and rejected by RLS regardless. On update and
 * delete the row id is a bound action argument rather than a form field, so it
 * isn't editable in the DOM either; RLS is still what makes it safe.
 */

type TransactionField = "type" | "amount" | "occurredOn" | "categoryId" | "note";

export type TransactionFormState = {
  /** Keyed to match the form input names. */
  fieldErrors?: Partial<Record<TransactionField, string[]>>;
  /** Whole-form failure. */
  error?: string;
  /** Echoed back so a rejected submission doesn't wipe what was typed. */
  values?: Partial<Record<TransactionField, string>>;
};

/** What `TransactionForm` accepts, once its target is bound. */
export type TransactionAction = (
  state: TransactionFormState | undefined,
  formData: FormData,
) => Promise<TransactionFormState>;

export type DeleteState = { error?: string };

/** Raw period params off a URL — validated here, not trusted. */
export type PeriodParams = { period?: string | undefined; anchor?: string | undefined };

/** Which row, and which period the user was looking at when they opened it. */
export type RowTarget = { id: string; period: PeriodParams };

/**
 * Where to land after a write: the list, still showing the period the user came
 * from. Editing a July transaction and being dropped on the current month looks
 * exactly like the edit failed.
 *
 * The params are re-resolved rather than taken as a ready-made path. `basePath` is
 * then always our own literal and the query is always normalised, so a bound
 * argument can't be turned into an open redirect.
 */
function backToList(params: PeriodParams): string {
  const { mode, anchor } = resolvePeriod(params);
  return periodHref("/transactions", mode, anchor);
}

/** `FormData.get` returns `string | File | null`; the schema wants a string. */
function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function readForm(formData: FormData) {
  return {
    type: field(formData, "type"),
    amount: field(formData, "amount"),
    occurredOn: field(formData, "occurredOn"),
    categoryId: field(formData, "categoryId"),
    note: field(formData, "note"),
  };
}

/**
 * 23503 is the composite FK on (user_id, category_id, type). It fires when the
 * category isn't yours or its type doesn't match the transaction's — one
 * constraint covering both, which is why there's no app-level ownership check
 * here. Either way the honest message is the same.
 */
const FOREIGN_KEY_VIOLATION = "23503";

const CATEGORY_MISMATCH = ["Pick a category that matches the type you chose."];

export async function createTransaction(
  period: PeriodParams,
  _prevState: TransactionFormState | undefined,
  formData: FormData,
): Promise<TransactionFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const values = readForm(formData);
  const parsed = makeTransactionSchema(todayInAppZone()).safeParse(values);

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: parsed.data.type,
    amount_paise: parsed.data.amount,
    occurred_on: parsed.data.occurredOn,
    category_id: parsed.data.categoryId,
    note: parsed.data.note ?? null,
  });

  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return { fieldErrors: { categoryId: CATEGORY_MISMATCH }, values };
    }

    return { error: "Couldn't save that transaction. Try again.", values };
  }

  refresh();
  redirect(backToList(period));
}

export async function updateTransaction(
  target: RowTarget,
  _prevState: TransactionFormState | undefined,
  formData: FormData,
): Promise<TransactionFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const values = readForm(formData);
  const parsed = makeTransactionSchema(todayInAppZone()).safeParse(values);

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  /*
   * `select("id")` is what makes the outcome legible. Without it an update that
   * RLS filtered out succeeds with no error and no rows — indistinguishable from
   * a real write. `updated_at` is left alone: the
   * `transactions_set_updated_at` trigger owns it.
   */
  const { data, error } = await supabase
    .from("transactions")
    .update({
      type: parsed.data.type,
      amount_paise: parsed.data.amount,
      occurred_on: parsed.data.occurredOn,
      category_id: parsed.data.categoryId,
      note: parsed.data.note ?? null,
    })
    .eq("id", target.id)
    .select("id");

  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return { fieldErrors: { categoryId: CATEGORY_MISMATCH }, values };
    }

    return { error: "Couldn't save your changes. Try again.", values };
  }

  if (data.length === 0) {
    return { error: "That transaction no longer exists.", values };
  }

  refresh();
  redirect(backToList(target.period));
}

export async function deleteTransaction(
  target: RowTarget,
  _prevState: DeleteState | undefined,
  _formData: FormData,
): Promise<DeleteState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", target.id)
    .select("id");

  if (error) {
    return { error: "Couldn't delete that transaction. Try again." };
  }

  // Already gone, or never ours. Either way there's nothing left to look at.
  if (data.length === 0) {
    return { error: "That transaction no longer exists." };
  }

  refresh();
  redirect(backToList(target.period));
}
