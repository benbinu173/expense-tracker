import { Card } from "@/components/card";

/**
 * Loading skeleton for every screen inside the app shell.
 *
 * Worth knowing why this is at the group level and not per route. Layouts don't
 * re-render on a soft navigation between siblings, so on every move between the
 * four screens `(app)/layout.tsx` is already on the client and this fallback shows
 * while the page's own queries run. On a hard load it doesn't show at all: the
 * layout reads `cookies()`, and `loading.md` is explicit that runtime data access
 * in a layout blocks navigation rather than falling back. That's fine — a hard
 * load has no previous page to sit on.
 *
 * The shape is deliberately generic: a title block and one divided list, which is
 * plausible for the dashboard's recent rows, the transaction list and both category
 * lists. A tailored skeleton per route would be six files of markup to shave a few
 * hundred milliseconds off a query that runs in single-digit ones.
 *
 * `animate-pulse` is the one looping animation in the app, against the "nothing
 * loops" rule in CLAUDE.md, and it earns the exception on the rule's own terms: that
 * rule is about an infinite `background-position` repainting a full-width panel for
 * the life of the tab. This animates `opacity`, which the compositor handles without
 * a repaint, and the element is unmounted the moment the page arrives — it cannot
 * outlive the wait. The loop is also the meaning here: a static grey block reads as
 * broken content, a pulsing one reads as work in progress. Under
 * `prefers-reduced-motion` the global block collapses it to a single 0.01ms
 * iteration, which lands on `opacity: 1` and leaves a still skeleton.
 *
 * One outer element, so `stagger-children` on `main` treats this as a single child
 * and `animate-pulse` sits on an inner layer. Putting it on the direct child would
 * collide with `.stagger-children > *` — same specificity, both setting the
 * `animation` shorthand, so one of the two would be silently dropped.
 */
export default function AppLoading() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Loading…</span>

      <div aria-hidden className="flex animate-pulse flex-col gap-6">
        {/* Stands in for `PageHeader` — title, its gradient underscore, description. */}
        <div className="flex flex-col gap-2">
          <div className="bg-sunken h-8 w-44 rounded-md" />
          <div className="bg-sunken h-0.5 w-9 rounded-full" />
          <div className="bg-sunken h-3.5 w-full max-w-xs rounded-sm" />
        </div>

        <Card padded={false}>
          <div className="divide-rule divide-y">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5">
                {/* The same column rhythm as `TransactionRow`: fixed date, flexible
                 * middle, right-aligned amount. Matching it is what stops the real
                 * rows jumping sideways when they replace this. */}
                <div className="bg-sunken h-3.5 w-14 shrink-0 rounded-sm" />
                <div className="bg-sunken h-3.5 min-w-0 flex-1 rounded-sm" />
                <div className="bg-sunken h-3.5 w-16 shrink-0 rounded-sm" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
