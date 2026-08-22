"use client";

import { useActionState, useRef } from "react";

import type { DeleteState } from "@/app/actions/transactions";
import { Alert } from "@/components/alert";
import { buttonClass, SubmitButton } from "@/components/button";
import { TransactionRow, type TransactionRowData } from "@/components/transaction-row";

type DeleteTransactionProps = {
  /** `deleteTransaction.bind(null, id)`. */
  action: (state: DeleteState | undefined, formData: FormData) => Promise<DeleteState>;
  /** Shown in the confirmation, so you can check what you're about to destroy. */
  row: Omit<TransactionRowData, "id">;
};

/**
 * Delete, behind a confirmation.
 *
 * A native `<dialog>` opened with `showModal()`: focus trapping, Esc-to-close, an
 * inert background and the `::backdrop` pseudo-element all come from the platform.
 * The alternative was a component library, for one dialog.
 *
 * There is no undo, so the confirmation renders the actual row rather than asking
 * "are you sure?" — that question gives you nothing to check the decision against.
 */
export function DeleteTransaction({ action, row }: DeleteTransactionProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className={buttonClass("danger", "sm")}
      >
        Delete transaction
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="delete-title"
        // `m-auto` restores the centring that a `margin: 0` reset removes.
        // `dialog-enter` owns the scale-and-fade and the backdrop's colour — the
        // backdrop is black rather than `--ink`, which inverts in dark mode.
        className="bg-raised border-rule shadow-pop dialog-enter m-auto w-[min(25rem,calc(100vw-2rem))] rounded-xl border p-5"
        // A click whose target is the dialog itself landed on the backdrop.
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 id="delete-title" className="font-display text-xl leading-tight">
              Delete this transaction?
            </h2>
            <p className="text-ink-2 text-sm">This can&rsquo;t be undone.</p>
          </div>

          <div className="bg-sunken border-rule rounded-md border">
            <TransactionRow {...row} />
          </div>

          {state?.error && <Alert tone="error">{state.error}</Alert>}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className={buttonClass("secondary", "sm")}
            >
              Keep it
            </button>
            <form action={formAction}>
              <SubmitButton variant="danger" size="sm" pending={pending} pendingLabel="Deleting…">
                Delete
              </SubmitButton>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
