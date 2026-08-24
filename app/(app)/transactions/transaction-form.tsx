"use client";

import { useActionState, useState } from "react";

import type { TransactionAction } from "@/app/actions/transactions";
import { Alert } from "@/components/alert";
import { ButtonLink, SubmitButton } from "@/components/button";
import { SelectField } from "@/components/select-field";
import { TextField } from "@/components/text-field";
import { NOTE_MAX_LENGTH, type TransactionType } from "@/lib/validation/transactions";

type Category = { id: string; name: string; type: TransactionType };

/** Pre-fill for the edit form. Strings, because they go straight into inputs. */
export type TransactionFormValues = {
  type: TransactionType;
  amount: string;
  occurredOn: string;
  categoryId: string;
  note: string;
};

type TransactionFormProps = {
  categories: Category[];
  /** From `todayInAppZone()` — the default date, and the latest one allowed. */
  today: string;
  /**
   * The bound Server Action. Create passes `createTransaction.bind(null, period)`;
   * edit binds the row id too, which keeps it out of the form where it would be
   * tamperable.
   */
  action: TransactionAction;
  /** Where Cancel goes — the list, on the period the user came from. */
  cancelHref: string;
  /** Absent for a new transaction. */
  initial?: TransactionFormValues;
  submitLabel: string;
  pendingLabel: string;
};

/**
 * Expense first: it's the overwhelmingly common case, so it's the default and the
 * left-hand segment. Income is the deliberate choice.
 */
const TYPE_ORDER = ["expense", "income"] as const;

/*
 * The one place a money colour is the *right* colour for a control: this segment
 * is choosing a direction, so tinting it green or red is the meaning, not decoration.
 * The border and the weight change carry it too, for anyone who can't see the tint.
 */
const TYPE_STYLES: Record<TransactionType, string> = {
  expense: "bg-expense/10 text-expense border-expense/40",
  income: "bg-income/10 text-income border-income/40",
};

export function TransactionForm({
  categories,
  today,
  action,
  cancelHref,
  initial,
  submitLabel,
  pendingLabel,
}: TransactionFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");

  // Categories are per-direction: an expense category is invalid for income, and
  // the composite FK would reject it. Filter client-side — there are a handful.
  const available = categories.filter((category) => category.type === type);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <fieldset>
        <legend className="text-ink mb-1.5 text-sm font-medium">Type</legend>
        <div className="bg-sunken border-rule grid grid-cols-2 gap-1 rounded-md border p-1">
          {TYPE_ORDER.map((candidate) => {
            const selected = candidate === type;

            return (
              <label
                key={candidate}
                className={`focus-ring-within ease-out-quart flex min-h-10 cursor-pointer items-center justify-center rounded-sm border text-sm font-medium capitalize transition-[background-color,border-color,color,box-shadow] duration-150 pointer-coarse:min-h-11 ${
                  selected
                    ? `${TYPE_STYLES[candidate]} shadow-card`
                    : "text-ink-2 hover:text-ink hover:bg-raised/60 border-transparent"
                }`}
              >
                {/* A real radio, visually hidden: keyboard, form data, and a11y for free. */}
                <input
                  type="radio"
                  name="type"
                  value={candidate}
                  checked={selected}
                  onChange={() => setType(candidate)}
                  className="sr-only"
                />
                {candidate}
              </label>
            );
          })}
        </div>
        {state?.fieldErrors?.type && (
          <p className="text-expense mt-1.5 text-sm">{state.fieldErrors.type.join(" ")}</p>
        )}
      </fieldset>

      <TextField
        label="Amount"
        name="amount"
        type="text"
        inputMode="decimal"
        required
        autoFocus
        figure
        size="lg"
        prefix="₹"
        placeholder="0.00"
        defaultValue={state?.values?.amount ?? initial?.amount}
        errors={state?.fieldErrors?.amount}
      />

      {/* `max` lets the native picker block future dates; Zod is what enforces it. */}
      <TextField
        label="Date"
        name="occurredOn"
        type="date"
        required
        max={today}
        defaultValue={state?.values?.occurredOn ?? initial?.occurredOn ?? today}
        errors={state?.fieldErrors?.occurredOn}
      />

      {/*
       * Remounts when the type flips, which clears a now-invalid selection —
       * cheaper and more obvious than syncing the value in an effect.
       */}
      <SelectField
        key={type}
        label="Category"
        name="categoryId"
        required
        placeholder="Choose a category"
        options={available.map((category) => ({ value: category.id, label: category.name }))}
        defaultValue={state?.values?.categoryId ?? initial?.categoryId}
        errors={state?.fieldErrors?.categoryId}
        emptyHint={`You have no ${type} categories yet. Add one first.`}
      />

      <TextField
        label="Note"
        name="note"
        maxLength={NOTE_MAX_LENGTH}
        placeholder="What was it for?"
        defaultValue={state?.values?.note ?? initial?.note}
        errors={state?.fieldErrors?.note}
      />

      <div className="flex flex-wrap gap-3 pt-1">
        <SubmitButton pending={pending} pendingLabel={pendingLabel}>
          {submitLabel}
        </SubmitButton>
        <ButtonLink href={cancelHref} variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
