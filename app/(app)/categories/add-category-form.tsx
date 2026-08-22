"use client";

import { useActionState } from "react";

import type { CategoryAction } from "@/app/actions/categories";
import { Alert } from "@/components/alert";
import { SubmitButton } from "@/components/button";
import { IconPlus } from "@/components/icons";
import { TextField } from "@/components/text-field";
import { CATEGORY_NAME_MAX_LENGTH } from "@/lib/validation/categories";
import type { TransactionType } from "@/lib/validation/transactions";

type AddCategoryFormProps = {
  /** Which list this form sits under. Decides the new category's type. */
  type: TransactionType;
  /** `createCategory.bind(null, type)`. */
  action: CategoryAction;
};

/**
 * The add form at the foot of each list.
 *
 * One per direction, which is why there's no type control: the form you typed
 * into is the answer. Two fewer decisions than a single shared form with a
 * income/expense toggle, and the type can't disagree with the list it lands in.
 */
const PLACEHOLDER: Record<TransactionType, string> = {
  expense: "e.g. Subscriptions",
  income: "e.g. Bonus",
};

export function AddCategoryForm({ type, action }: AddCategoryFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    /*
     * Keyed on the id of the last category this form created, so a successful add
     * remounts the subtree and leaves an empty input behind. Changing
     * `defaultValue` alone would not: React doesn't push a new default into an
     * input that already has a value, so the name you just added would sit there
     * inviting a duplicate submit.
     *
     * The failure path is safe for the same reason it looks unsafe: the key falls
     * back to "new", which also remounts — but `defaultValue` is the echoed value
     * by then, so the input comes back holding what was typed.
     */
    <form key={state?.savedId ?? "new"} action={formAction} className="flex flex-col gap-3">
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <TextField
        label={`New ${type} category`}
        name="name"
        // Both forms are on one page and both post `name`, so the id has to differ.
        id={`new-${type}-category`}
        required
        maxLength={CATEGORY_NAME_MAX_LENGTH}
        placeholder={PLACEHOLDER[type]}
        defaultValue={state?.values?.name}
        errors={state?.fieldErrors?.name}
      />

      <SubmitButton size="sm" pending={pending} pendingLabel="Adding…" className="self-start">
        <IconPlus className="size-4 shrink-0" />
        Add
      </SubmitButton>
    </form>
  );
}
