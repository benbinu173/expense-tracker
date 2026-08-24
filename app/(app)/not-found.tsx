import { ButtonLink } from "@/components/button";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";

/**
 * 404 for a `notFound()` thrown inside the app shell.
 *
 * Before this file existed, `notFound()` in `transactions/[id]/edit/page.tsx` fell
 * all the way through to Next's built-in 404 — a bare page with no nav, no wordmark
 * and no way back, which reads as the app having crashed rather than as a link
 * pointing at nothing.
 *
 * `(app)/not-found.tsx` is the nearest boundary to every page in the group, so it
 * catches them all while rendering inside the shell. Unmatched URLs are a different
 * path entirely — those are resolved at the routing level and get `app/not-found.tsx`.
 *
 * A Server Component, and it takes no props: `not-found.tsx` is never told what was
 * missing. So the copy has to cover every reason the edit page raises it — a
 * malformed id, a deleted row, and a row belonging to someone else, which RLS makes
 * indistinguishable from the second on purpose.
 */
export default function AppNotFound() {
  return (
    <>
      <PageHeader title="Not found" description="We couldn't find what that link points at." />

      <Card>
        <div className="flex flex-col gap-4">
          <p className="text-ink-2 text-sm">
            It may have been deleted, or the address may be slightly wrong. Nothing else is
            affected.
          </p>

          {/*
           * A convenience, not the only exit — the rail and the tab bar are both still
           * on screen. It points at the dashboard rather than the transaction list
           * because this boundary covers the whole group, not one route.
           */}
          <ButtonLink href="/" className="self-start">
            Go to dashboard
          </ButtonLink>
        </div>
      </Card>
    </>
  );
}
