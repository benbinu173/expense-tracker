import type { Metadata } from "next";

import { createCategory, deleteCategory, renameCategory } from "@/app/actions/categories";
import { Alert } from "@/components/alert";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import type { TransactionType } from "@/lib/validation/transactions";

import { AddCategoryForm } from "./add-category-form";
import { CategoryRow } from "./category-row";

export const metadata: Metadata = { title: "Categories" };

type CategoryListItem = { id: string; name: string; usageCount: number };

/**
 * Categories — add, rename, delete.
 *
 * No `user_id` filter in the query on purpose: RLS scopes `select` to the
 * session's own rows, so adding one here would be redundant and would imply the
 * policy can't be trusted. The seed trigger created the first set at signup.
 *
 * `transactions(count)` is the interesting part. Column aggregates are disabled on
 * this project — `amount_paise.sum()` answers PGRST123, which is why step 10 needed
 * a SQL function — but an embedded resource's `count()` is a separate code path and
 * is allowed. Verified against the live API: the disabled syntax and an unresolvable
 * relationship both fail at parse time, before RLS filtering, so this returning 200
 * proves the count is genuinely permitted. It goes through RLS like any embed, so
 * each number is this user's own transactions and nobody else's.
 *
 * The counts are what let the page state the delete restriction up front instead of
 * making you press a button to discover it.
 */
export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, type, transactions(count)")
    .order("name", { ascending: true });

  const categories = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    // `[{ count: 0 }]` for an unused category, but `?? 0` covers an empty embed too.
    usageCount: row.transactions[0]?.count ?? 0,
  }));

  return (
    <>
      <PageHeader
        title="Categories"
        description="Every transaction belongs to one. Income and expense lists are kept separate."
      />

      {/*
       * On a failed read the page shows nothing but the message. Rendering the two
       * empty lists with their add forms would say "you have no categories", which
       * is a much worse lie than "reload".
       */}
      {error ? (
        <Alert tone="error">
          Couldn&rsquo;t load your categories. Reload the page &mdash; if it keeps happening, the
          database is unreachable.
        </Alert>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Expense first, matching the transaction form: it's the common case. */}
          <CategoryColumn
            type="expense"
            categories={categories.filter((category) => category.type === "expense")}
          />
          <CategoryColumn
            type="income"
            categories={categories.filter((category) => category.type === "income")}
          />
        </div>
      )}
    </>
  );
}

/**
 * One direction's list, with its add form in the footer.
 *
 * The type is bound into all three actions here rather than posted by any form, so
 * a category cannot be created into, or moved between, the wrong list.
 */
function CategoryColumn({
  type,
  categories,
}: {
  type: TransactionType;
  categories: CategoryListItem[];
}) {
  return (
    // `SectionLabel` uppercases the title, so the lowercase type reads correctly.
    <Card title={`${type} · ${categories.length}`} padded={false}>
      {categories.length > 0 && (
        <ul className="divide-rule stagger-rows divide-y">
          {categories.map((category) => (
            /*
             * Keyed on name as well as id, which is doing real work: a successful
             * rename changes the key, React discards the row, and its open editor
             * goes with it. That's the alternative to closing the editor from a
             * `useEffect`, which `react-hooks/set-state-in-effect` forbids. The
             * remount also re-runs the row's `stagger-rows` fade, so the renamed
             * row visibly acknowledges the change.
             */
            <li key={`${category.id}:${category.name}`}>
              <CategoryRow
                name={category.name}
                usageCount={category.usageCount}
                renameAction={renameCategory.bind(null, {
                  id: category.id,
                  type,
                  currentName: category.name,
                })}
                deleteAction={deleteCategory.bind(null, category.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {/*
       * No `<EmptyState>` for an empty list. The add form directly below it already
       * says what to do, and a full illustrated empty state above a form that's two
       * lines long would be the loudest thing on the page.
       *
       * The rule is conditional because the card's own title already carries a
       * bottom border — on an empty list the two would stack into one 2px line.
       */}
      <div className={`p-4 sm:p-5 ${categories.length > 0 ? "border-rule border-t" : ""}`}>
        <AddCategoryForm type={type} action={createCategory.bind(null, type)} />
      </div>
    </Card>
  );
}
