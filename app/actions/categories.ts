"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validation/categories";
import type { TransactionType } from "@/lib/validation/transactions";

/**
 * Category writes.
 *
 * `user_id` comes from the session, never from the form. The row id and the type
 * are bound action arguments — Next encrypts those, so unlike a hidden input they
 * aren't editable in the DOM. RLS is still what makes it safe; the binding just
 * removes a pointless attack surface.
 *
 * None of these redirect. The categories page is where you already are, so they
 * `refresh()` and return, and each form reports its own outcome in place.
 */

type CategoryField = "name";

export type CategoryFormState = {
  /** Keyed to match the form input names. */
  fieldErrors?: Partial<Record<CategoryField, string[]>>;
  /** Whole-form failure. */
  error?: string;
  /** Echoed back so a rejected submission doesn't wipe what was typed. */
  values?: Partial<Record<CategoryField, string>>;
  /**
   * The affected row's id, set only when the write landed.
   *
   * The add form keys its `<form>` on it, so a changing id remounts the input and
   * clears it. Rename doesn't need it — its editor closes because the list remounts
   * the row on a changed name — but returning it keeps the two actions honest about
   * having succeeded.
   */
  savedId?: string;
};

/** What the add and rename forms accept, once their target is bound. */
export type CategoryAction = (
  state: CategoryFormState | undefined,
  formData: FormData,
) => Promise<CategoryFormState>;

export type DeleteCategoryState = { error?: string };

export type DeleteCategoryAction = (
  state: DeleteCategoryState | undefined,
  formData: FormData,
) => Promise<DeleteCategoryState>;

/**
 * Which row, which type's list it lives in, and what it's called right now.
 *
 * `type` shapes the duplicate-name message; `currentName` is what makes a no-op
 * rename detectable. Both are bound rather than posted.
 */
export type CategoryTarget = { id: string; type: TransactionType; currentName: string };

/**
 * 23505 is `categories_user_type_name_key`, the unique index on
 * `(user_id, type, lower(name))`. Case-insensitive, so "food" collides with an
 * existing "Food" — which is the point: two spellings of one category would split
 * it into two rows in step 12's breakdown.
 */
const UNIQUE_VIOLATION = "23505";

/**
 * 23503 here is the transactions FK firing its `on delete restrict`. It is the
 * whole enforcement of "a category in use can't be deleted" (SPEC.md §2.5) — there
 * is no app-level count check standing in for it.
 */
const FOREIGN_KEY_VIOLATION = "23503";

/** Both types begin with a vowel, so one article covers them. */
function duplicateName(type: TransactionType): string[] {
  return [`You already have an ${type} category with that name.`];
}

/** `FormData.get` returns `string | File | null`; the schema wants a string. */
function readForm(formData: FormData) {
  const value = formData.get("name");
  return { name: typeof value === "string" ? value : "" };
}

export async function createCategory(
  type: TransactionType,
  _prevState: CategoryFormState | undefined,
  formData: FormData,
): Promise<CategoryFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const values = readForm(formData);
  const parsed = categorySchema.safeParse(values);

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, name: parsed.data.name, type })
    .select("id")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { fieldErrors: { name: duplicateName(type) }, values };
    }

    return { error: "Couldn't add that category. Try again.", values };
  }

  refresh();
  return { savedId: data.id };
}

export async function renameCategory(
  target: CategoryTarget,
  _prevState: CategoryFormState | undefined,
  formData: FormData,
): Promise<CategoryFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const values = readForm(formData);
  const parsed = categorySchema.safeParse(values);

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  /*
   * A rename to the name it already has has to be reported, because nothing else
   * would report it. The row's editor closes when its `name` prop changes, so an
   * unchanged name means an unchanged prop, and a silent success would leave the
   * editor sitting open with no acknowledgement — which reads as a failed save.
   *
   * Compared exactly, so a case-only fix ("food" → "Food") is still a real rename.
   * That one is safe against the `lower(name)` unique index: a row can't collide
   * with itself.
   */
  if (parsed.data.name === target.currentName) {
    return { fieldErrors: { name: ["That's already its name."] }, values };
  }

  /*
   * `type` is deliberately not in the update. Changing it would orphan every
   * transaction filed under this category — the composite FK would refuse, and
   * the honest UI for "this is really an expense" is a new category, not a
   * silent re-type. Rename changes the label; it never changes the direction.
   *
   * `select("id")` is what makes the outcome legible: without it an update RLS
   * filtered out returns no error and no rows, indistinguishable from success.
   */
  const { data, error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name })
    .eq("id", target.id)
    .select("id");

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { fieldErrors: { name: duplicateName(target.type) }, values };
    }

    return { error: "Couldn't rename that category. Try again.", values };
  }

  if (data.length === 0) {
    return { error: "That category no longer exists.", values };
  }

  refresh();
  return { savedId: target.id };
}

export async function deleteCategory(
  id: string,
  _prevState: DeleteCategoryState | undefined,
  _formData: FormData,
): Promise<DeleteCategoryState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase.from("categories").delete().eq("id", id).select("id");

  if (error) {
    /*
     * The page already hides Delete for a category it knows is in use, so this
     * is the race: a transaction filed against it in another tab since this page
     * rendered. The count isn't in the error, hence no number in the message.
     */
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return {
        error:
          "This category is now in use by a transaction, so it can't be deleted. Rename it instead.",
      };
    }

    return { error: "Couldn't delete that category. Try again." };
  }

  // Already gone, or never ours. Either way there's nothing left to delete.
  if (data.length === 0) {
    return { error: "That category no longer exists." };
  }

  refresh();
  return {};
}
