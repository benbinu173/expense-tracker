"use client";

import { useActionState, useId, useState } from "react";

import type { CategoryAction, DeleteCategoryAction } from "@/app/actions/categories";
import { Alert } from "@/components/alert";
import { buttonClass, SubmitButton } from "@/components/button";
import { CategoryDot } from "@/components/category-dot";
import { TextField } from "@/components/text-field";
import { CATEGORY_NAME_MAX_LENGTH } from "@/lib/validation/categories";

type CategoryRowProps = {
  name: string;
  /** How many of this user's transactions reference it. 0 means safe to delete. */
  usageCount: number;
  /** `renameCategory.bind(null, { id, type })`. */
  renameAction: CategoryAction;
  /** `deleteCategory.bind(null, id)`. */
  deleteAction: DeleteCategoryAction;
};

/**
 * One category, with rename and delete folded into the row.
 *
 * No separate edit route, unlike a transaction: a category is a name, so a whole
 * screen for one field would be a navigation for nothing. But the row still shows
 * a single control rather than two — Rename and Delete side by side in a list is
 * how you delete "Rent" while meaning to rename it. Opening the editor is the
 * step that makes the destructive option deliberate.
 *
 * That's also why there's no confirmation dialog here, unlike transaction delete:
 * the FK's `on delete restrict` means a category you're *able* to delete has no
 * transactions attached, so nothing but the label is lost and re-adding it costs
 * one line of typing. A dialog would be friction guarding nothing.
 *
 * The editor closes by remount, not by an effect. A successful rename changes the
 * `name` prop, the list keys each row on `id:name`, and React discards this whole
 * subtree — `editing` goes back to false with no state to synchronise. Closing it
 * from a `useEffect` is what `react-hooks/set-state-in-effect` exists to stop, and
 * the remount is the answer React's own docs give.
 */
export function CategoryRow({ name, usageCount, renameAction, deleteAction }: CategoryRowProps) {
  const [editing, setEditing] = useState(false);
  const [renameState, renameFormAction, renamePending] = useActionState(renameAction, undefined);
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteAction, undefined);

  // Unique per row: the rename field is rendered once per category, and duplicate
  // ids would aim every label at the first input on the page.
  const fieldId = useId();

  if (!editing) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-2 sm:px-5">
        <CategoryDot name={name} />
        <span className="min-w-0 flex-1 truncate text-sm">{name}</span>

        {/*
         * Rendered only when it's non-zero, so the number means "in use" and its
         * absence means "unused, safe to delete" — a column of zeroes would say
         * the same thing with more noise. Mono for the same reason amounts are:
         * the digits line up down the column.
         */}
        {usageCount > 0 && (
          <span className="text-ink-3 figure text-xs">
            {usageCount}
            <span className="sr-only"> transactions</span>
          </span>
        )}

        <button
          type="button"
          onClick={() => setEditing(true)}
          className={buttonClass("ghost", "sm")}
        >
          Edit
          {/* Nine "Edit" buttons need distinguishing when read out of context. */}
          <span className="sr-only"> {name}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-sunken flex flex-col gap-3 px-4 py-3 sm:px-5">
      <div className="flex items-center gap-2.5">
        <CategoryDot name={name} />
        <span className="text-ink-3 min-w-0 flex-1 truncate text-xs">Editing {name}</span>
      </div>

      {/* Two sibling forms, not nested: an HTML form can't contain another one. */}
      <form action={renameFormAction} className="flex flex-col gap-3">
        {renameState?.error && <Alert tone="error">{renameState.error}</Alert>}

        <TextField
          label="New name"
          name="name"
          id={fieldId}
          required
          autoFocus
          maxLength={CATEGORY_NAME_MAX_LENGTH}
          defaultValue={renameState?.values?.name ?? name}
          errors={renameState?.fieldErrors?.name}
        />

        <div className="flex flex-wrap gap-2">
          <SubmitButton size="sm" pending={renamePending} pendingLabel="Saving…">
            Save
          </SubmitButton>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className={buttonClass("secondary", "sm")}
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="border-rule flex flex-col gap-2 border-t pt-3">
        {usageCount > 0 ? (
          /*
           * SPEC.md §2.5 requirement 27: say why it can't go, and point at
           * renaming instead. Stated before the click rather than after it — the
           * count is already on the page, so there's no reason to make you press
           * a button to find out it doesn't work. The action still handles 23503
           * for the case where a transaction lands here after this render.
           */
          <p className="text-ink-2 text-sm">
            Used by {usageCount} transaction{usageCount === 1 ? "" : "s"}, so it can&rsquo;t be
            deleted. Renaming it relabels all of them.
          </p>
        ) : (
          <>
            {deleteState?.error && <Alert tone="error">{deleteState.error}</Alert>}
            <form action={deleteFormAction}>
              <SubmitButton
                variant="danger"
                size="sm"
                pending={deletePending}
                pendingLabel="Deleting…"
              >
                Delete
                <span className="sr-only"> {name}</span>
              </SubmitButton>
            </form>
            <p className="text-ink-3 text-sm">No transactions use it, so nothing is lost.</p>
          </>
        )}
      </div>
    </div>
  );
}
