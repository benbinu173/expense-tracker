# CLAUDE.md — Personal Finance Tracker

@AGENTS.md

Read this before touching code. Full requirements live in [SPEC.md](SPEC.md); this file
is the working agreement.

Solo project. Prefer the small, obvious solution over the extensible one.

## Stack

- **Next.js 16.3** (App Router, Turbopack by default) + **TypeScript** (strict) +
  **Tailwind CSS 4**
- **React 19.2**
- **Supabase** — Postgres + Auth (email/password), security enforced by RLS
- **No charting dependency.** Recharts was in the original stack list and turned out not to
  be needed — the one chart in the app is a ranked bar breakdown, which is two divs and a
  percentage. See step 12 below for the reasoning. Don't add one back without a form that
  genuinely needs it.
- **Zod** — validation, shared client/server
- **Vercel** — hosting
- No component library, no state management library, no ORM in v1.

Data access pattern: **reads in Server Components, writes in Server Actions**, both via
`@supabase/ssr`. Client components are for interactivity only (period switcher, form
state, chart) — they do not query the database.

## Next.js 16 — things that changed

Next 16 is newer than most model training data. Before using an unfamiliar API, read the
docs bundled in `node_modules/next/dist/docs/` rather than working from memory.

- **`middleware.ts` is now `proxy.ts`** at the project root, exporting a function named
  `proxy`. Node.js runtime only — no edge. Supabase session refresh goes here.
- **Proxy is not an auth boundary.** It refreshes the session cookie and does optimistic
  redirects only. Every protected route still verifies the user server-side; RLS is the
  real boundary.
- **Request APIs are async** — `await cookies()`, `await headers()`, and `await` both
  `params` and `searchParams` in pages.
- **After a mutation, call `refresh()` from `next/cache`.** Our reads are per-user and
  dynamic (they touch cookies), so there is no tagged cache to bust — `refresh()` updates
  the client router, which is what we actually want. `revalidatePath` is still available
  but unnecessary here; `revalidateTag` now requires a second `cacheLife` argument.
- **`LayoutProps<"/">` / `PageProps<"/route">`** are generated global types — use them
  instead of hand-writing props for pages and layouts.
- `next lint` is gone; the lint script calls `eslint` directly with flat config.

## Data model

`auth.users` (Supabase) + three tables:

- **`profiles`** — `id` (PK, FK→auth.users), `display_name`, `created_at`
- **`categories`** — `id`, `user_id`, `name`, `type` (`'income'|'expense'`), `created_at`
  - `unique (user_id, type, name)`, `unique (user_id, id, type)`
- **`transactions`** — `id`, `user_id`, `type` (`'income'|'expense'`), `amount_paise`
  (`bigint`, `> 0`), `occurred_on` (`date`), `category_id`, `note` (≤200 chars),
  `created_at`, `updated_at`
  - `FK (user_id, category_id, type) → categories (user_id, id, type) ON DELETE RESTRICT`

One `transactions` table for both directions — `type` is the discriminator. There is no
separate income table.

That composite FK is doing real work: it enforces category ownership _and_ type match in
one constraint, and it's what blocks deleting a category that's still in use. Don't
replace it with app-level checks.

## Design system — "Aurora"

A violet→indigo→teal brand spine over cool paper, with one saturated surface per
screen carrying that screen's headline figure. Colourful, but the colour is
organised: every hue has exactly one job and the jobs don't overlap. All tokens live
in `app/globals.css`; nothing is defined per-component, and no file outside it
contains a colour literal (the two `themeColor` strings in `app/layout.tsx` are the
unavoidable exception — `Viewport` metadata can't read a custom property).

**Colour discipline**

- **`--income` and `--expense` are the only _semantic_ colours.** Everything else is
  chrome or identity. A primary button is brand violet, never green, because a green
  "Save" reads as income. The one control allowed a money colour is the type toggle
  in `transaction-form.tsx` — it's choosing a direction, so the tint _is_ the meaning.
- **Sign, not colour, is the primary signal of direction.** The explicit `+`/`−` in
  `components/money.tsx` is load-bearing, not decoration. Never render an amount with
  a bare `formatPaise()` in JSX — use `Figure`, `Amount`, or `Balance`.
- **Five brand tokens, one job each.** `--brand` is a surface only; `--accent` is
  brand-as-text (focus rings, links, anything small that must stay legible);
  `--brand-soft` is the tint; `--brand-fg` is the only colour allowed on `--brand`;
  `--brand-ink` is the reverse — brand as text on a white surface. Keeping them
  separate is what stops "the purple" being used where it fails contrast.
- **`--cat-1…8` are identity, not meaning.** Assigned by name via
  `categoryFillClass` in `lib/category-color.ts`, so a category is the same colour on
  every screen and in the dashboard breakdown. Their hues deliberately avoid the red
  and green bands, so a dot can never be read as a direction. The eight class names
  are written out as literals in that file, because Tailwind's scanner can't see
  `bg-cat-${i}`. Two consumers: `components/category-dot.tsx` and the breakdown's
  bars. **These are not a chart palette** — measured, several adjacent pairs fall
  under the separation a reader needs, badly so under simulated CVD (numbers in the
  step-12 notes). That's fine, because nothing asks you to read a value off the
  colour: the name is always beside the dot, and the breakdown encodes with bar
  length. Don't put hue in charge of information here without re-stepping the tokens,
  and re-stepping them changes a colour on every screen.
- **Contrast is computed, not eyeballed.** Every ratio in globals.css is a real
  measurement. Text clears 4.5:1, non-text graphics 3:1. The tight ones are
  `--ink-3` and the teal end of `--gradient-hero`. **If a value fails, the surface
  moves — not the text**: that's why the hero's teal stop is `#0f766e` and not a
  brighter one, and why all hero text is full white with hierarchy from size and
  tracking (a `white/70` label measures 3.5:1 there and fails).
- **Dark mode follows `prefers-color-scheme`**, no toggle. Raw values sit on `:root`
  and get remapped by `@theme inline` — `inline` is what lets one set of utilities
  serve both themes. Add a new colour as a pair or it'll be invisible in one theme.
  `--brand-ink` is the deliberate exception: its surface is white in both themes, so
  its value must not flip.

**Surfaces**

`paper` (page) → `raised` (card) → `sunken` (inset), with `surface-hero` above all
three. Hairline `border-rule` over nested boxes; radii are 5/8/12/16px.

- **`surface-hero` is one per screen.** Two gradient panels and neither is the
  headline. It's owned by `components/hero-panel.tsx`, which sets the white text for
  its children so no call site has to remember.
- **`surface-aurora`** is the fixed page backdrop, applied once per route group
  layout. It needs `isolate` on its wrapper: without a stacking context, `-z-10`
  resolves against the root and the glow paints behind `body`'s own background.
- `surface-spine` is the hero gradient at rule scale — the underscore under a page
  title. Its own token because a 2px rule can take brighter stops than a surface
  holding white text.

**Motion**

Tokens live in a **second, non-`inline` `@theme` block** with nested `@keyframes` —
the shape Tailwind itself uses. Non-inline is required: it emits the easings as real
custom properties, which is what lets an `--animate-*` value reference
`var(--ease-out-quart)`. Under `inline` they'd be substituted away.

- Six keyframes: `fade-in`, `fade-rise`, `pop-in`, `sheen`, `drift`, `shake`.
  Tailwind tree-shakes `--animate-*`, so one only appears in the output once
  something references it.
- **Entrances are declared once, not per page.** `stagger-children` on `main` in
  `app/(app)/layout.tsx` choreographs every screen; `stagger-rows` does lists. Both
  cap the delay (4th child, 8th row) so a year-long period doesn't animate for
  seconds.
- **Nothing loops.** `drift` and `sheen` are one-shot settles on arrival. An
  infinite `background-position` animation isn't compositor-driven and would repaint
  a full-width panel every frame for the life of the tab.
- **Don't put an `animate-*` class on a direct child of a staggered container.**
  `.stagger-children > *` and `.animate-x` both set the `animation` shorthand at
  equal specificity, so the winner is whichever Tailwind emits last — and either way
  one of the two animations is silently lost. `hero-panel.tsx` is the worked example:
  its gradient and its sweep both live on inner layers, so the panel still gets the
  page's fade-up and neither depends on rule order.
- Dialogs use `dialog-enter` — `@starting-style` plus an `allow-discrete` transition
  behaviour, because a keyframe can't animate through `display: none`. Enter only:
  animating the close leaves the panel on screen after you've committed to deleting a
  row, which reads as the click not landing.
- Every keyframe animates _from_ an offset _to_ the natural state, so the
  reduced-motion block can just collapse durations. Hover transforms are the
  exception and are cancelled by name (`.lift:hover`) — a blanket `transform: none`
  would break every `-translate-x-1/2` used for centring.

**Type, focus, shell**

- **Three type roles.** Display serif (Instrument Serif) for the one headline figure
  per screen and page titles; Geist for all UI; Geist Mono for every amount in a
  list or table. Mono is load-bearing — equal-width digits make amounts right-align
  into a true column and stop them jittering on change.
- Focus is `focus-ring` / `focus-ring-inset` / `focus-ring-within` — all
  `:focus-visible`, so a mouse click doesn't leave a ring behind. Don't reach for
  `focus:ring-*`. Only `focus-ring-within` carries a `box-shadow` halo; on a card or
  button that would wipe out `shadow-card`, which is why the other two stay
  outline-only.
- **Active and selected states are carried three ways, never by colour alone** —
  `aria-current`, a tint, and a shape change (the rail's bar, the tab indicator, the
  segment's underline).
- Shared shell: `components/app-nav.tsx` defines navigation once and renders it as a
  rail from `md` up and a bottom tab bar below. Four destinations, nothing behind a
  hamburger. Pages compose `PageHeader` + `Card` + `EmptyState`, or `HeroPanel` for
  the one figure that matters.
- Icons are hand-rolled in `components/icons.tsx` — six glyphs isn't worth a
  dependency. They're decorative (`aria-hidden`); an icon-only control needs its own
  `aria-label`.

## Conventions

**Money**

- Store and compute in integer **paise** (1 ₹ = 100 paise). Never a float, never a
  `numeric` column, never `parseFloat(x) * 100` (`0.29 * 100 === 28.999999999999996`).
- Two helpers in `lib/money.ts` and nowhere else: `parseAmountToPaise(input: string)`
  (string parse, not float math) and `formatPaise(paise: number)` using
  `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
- Amounts are always positive. Sign is derived from `type` at render time.
  Balance = `sum(income) − sum(expense)`.
- `amount_paise` is `bigint` in Postgres but arrives as a TS `number`. That's safe
  and deliberate: `MAX_PAISE` is 1e11, three orders of magnitude below
  `Number.MAX_SAFE_INTEGER`. If that cap ever rises past 2^53, this becomes a
  precision bug and the column has to be read as a string.

**Dates and periods**

- `occurred_on` is a `date` column handled as a `'YYYY-MM-DD'` string end to end. Never
  round-trip it through `new Date()` without an explicit local-time construction —
  `new Date('2026-08-01')` parses as UTC midnight and shifts a day in some timezones.
- Periods are calendar-based: week = Mon–Sun, month = 1st–last, year = Jan–Dec.
- "Today" always comes from `todayInAppZone()`, never `new Date()` in a component. The app
  pins one timezone, `APP_TIME_ZONE = 'Asia/Kolkata'`, so server and client agree on which
  day it is. Change that single constant if the user moves.
- All period math lives in `lib/period.ts` and is unit tested. Pages call `resolvePeriod()`
  with raw search params — it validates and falls back rather than throwing. No inline
  date arithmetic in components.
- Period state lives in the URL (`?period=month&anchor=YYYY-MM-DD`), read via
  `searchParams` in Server Components. Not in React state, not in a context.

**Security**

- `user_id` always comes from the server session (`supabase.auth.getUser()`), never from
  a form field or client argument.
- Env vars are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the
  new `sb_publishable_…` format, not a legacy JWT anon key), read and validated once in
  `lib/env.ts`. Publishable keys are designed to ship to the browser.
- No secret or `service_role` key anywhere in this codebase. RLS does the enforcement.
- Every new table gets RLS enabled and policies in the same migration that creates it.
- Session refresh lives in `proxy.ts` and must keep calling `supabase.auth.getUser()` —
  `getSession()` does not revalidate the token, so swapping it breaks refresh silently.

**Server Actions**

- One file per entity: `app/actions/transactions.ts`, `app/actions/categories.ts`.
- Every action: `'use server'` → auth check → Zod parse → mutate → `refresh()`.
- Return `{ error: string }` or field errors; never throw at the user.
- Pending state in forms comes from `useActionState`, not a hand-rolled `useState`.
- **Row ids and redirect targets are bound arguments, not form fields.** Pages call
  `updateTransaction.bind(null, { id, period })`; Next encrypts the bound value, so it
  isn't editable in the DOM. RLS is still what makes it safe — the binding just removes a
  pointless attack surface.
- **An action that redirects rebuilds the path from validated inputs.** Never
  `redirect(someBoundString)` — that's an open redirect waiting to happen. The bound value
  is raw period params; `backToList()` runs them back through `resolvePeriod()` and
  `periodHref()`, so the destination is always our own literal path with a normalised
  query.
- **`update` and `delete` end with `.select("id")`.** Without it a write that RLS filtered
  out returns no error and no rows, which is indistinguishable from success. An empty array
  is how "not yours, or already gone" is detected.

**TypeScript / files**

- No `any`, no non-null `!` to silence the compiler. DB types are generated into
  `lib/database.types.ts` via the Supabase CLI — regenerate after every migration, don't
  hand-edit.
- kebab-case filenames. Route-specific components colocate in the route folder; shared
  ones go in `components/`. A component shared by sibling routes sits in their nearest
  common route folder — `app/(app)/transactions/transaction-form.tsx` serves both `new/`
  and `[id]/edit/`.
- Params that exist only to hold a position in a fixed signature are named `_like_this`;
  the ESLint config's `argsIgnorePattern` makes that convention enforced rather than
  accidentally tolerated.
- Two route groups: `app/(app)/` is everything behind a session — its layout calls
  `getUser()` and redirects — and `app/(auth)/` is login and signup. Groups don't affect
  URLs, so a new protected page is just a folder under `(app)/`, and it's protected by
  default. `refresh()` is Server-Action-only in Next 16; it throws in a Route Handler.
- Server-only Supabase client in `lib/supabase/server.ts`, browser client in
  `lib/supabase/client.ts`. Don't import the server one into a client component.
- After adding a route, `npx next typegen` regenerates `PageProps<"/new/route">`. `tsc`
  fails on the new path until you do.

**Scope discipline**

- Don't add a dependency without asking first.
- Don't build anything from the out-of-scope list in [SPEC.md](SPEC.md) §5, even if it's
  "just five lines" — that includes recurring transactions, budgets, CSV export, and
  multi-currency.
- SQL changes go in a numbered migration file under `supabase/migrations/`. No edits made
  only in the Supabase dashboard.

## Build order

Work top to bottom. Each step should end with the app running.

**Status:** steps 1–12 done. Scaffold + tooling; Supabase clients and `proxy.ts`; auth
(signup, login, logout, redirects); `lib/money.ts` + `lib/period.ts`; add, list, edit and
delete transactions; the period balance summary; the categories page; the dashboard —
93 passing tests.
Step 3 is complete — the migration is applied and verified (tables exist, RLS refuses
anonymous writes), `lib/database.types.ts` is generated, and the `Database` generic is
wired into both Supabase clients, so `.from(...)` queries are typed and allowed.

The design system and app shell are built (see the section above) and every existing
screen is on it. Step 9's period selector was done early as
`components/period-switcher.tsx` — it's pure URL-driven links, so it needed no data.

**The design system was replaced between steps 9 and 10**, on request: the monochrome
"Ledger" palette became "Aurora" (colour + a motion system), with no new dependencies. It
was a token-layer change by design — `app/globals.css` is most of the diff, and every
component only changed to _consume_ new tokens. Three files were added: `lib/category-color.ts`
(+ 7 tests), `components/category-dot.tsx`, and `components/hero-panel.tsx`.

The dashboard's hero panel holds `<Balance surface="hero">` as of step 10, with income and
expenses in a pair of cards below it. On a period with nothing in it the hero still shows
the real `₹0.00` — a genuine zero, not a placeholder — plus a sentence and the CTA, written
for white text rather than reusing `<EmptyState>`, which is ink-on-paper and would be
illegible on the gradient.

Steps 6 + 7 shipped together on purpose: step 6 alone would redirect to a list that still
said "No transactions in this period", which reads as data loss. `/transactions/new` holds
the form, `/transactions` the period-filtered list, and both the dashboard and the list
now carry an "Add transaction" CTA.

Two things that increment settled, worth not re-deriving:

- **The composite-FK embed types correctly.** `select("…, category:categories(name)")` on
  `transactions` infers as `{ name: string }` — a plain object, not an array and not
  nullable — even though the generated `Relationships` entry says `isOneToOne: false`.
  postgrest-js reads the cardinality from which table holds the FK columns. So no cast, no
  second query, no `.returns<T>()`.
- **`components/transaction-row.tsx` is shared, not colocated,** because the dashboard
  shows the five most recent transactions and they have to match the list exactly. It takes
  plain props, not a database row, so the caller can get the category name however it likes.

Step 8 put edit and delete on one screen, `/transactions/[id]/edit`, and its decisions are
also worth not re-deriving:

- **A row is a link, not a row of buttons.** At 375px the date, category, note and amount
  already fill the line — two icon targets either crowd the amount or wrap it. So the whole
  row navigates to the edit screen, and delete lives there behind a native `<dialog>`. One
  dialog per page instead of one per row, and the confirmation shows the real
  `TransactionRow` so you can see what you're about to lose.
- **`periodHref` is the only place the period URL is built.** Every link out of the
  dashboard, the list and the forms carries `?period=…&anchor=…`, and each write action
  re-resolves those params before redirecting. Editing a July row while browsing July has
  to land back on July; dropping the user on the current month, where the change isn't
  visible, reads as data loss the same way step 6 alone would have.
- **`transaction-form.tsx` serves both create and edit.** It takes an `action`, a
  `cancelHref`, labels, and an optional `initial` — no `mode` flag and no branching inside.
  Field defaults are `state?.values?.x ?? initial?.x`, so a failed submit keeps what was
  typed rather than reverting to the stored row.
- **The edit page rejects a malformed id itself.** `z.uuid()` before the query, because
  Postgres raises `22P02` on a bad uuid and that surfaces as an error card rather than a
  missing page. A well-formed id that isn't yours is `notFound()` too — RLS makes "not
  yours" and "doesn't exist" the same answer, which is the behaviour we want.

`/account` still renders read-only fields and gets its real content in step 13.

Step 10 aggregated the period totals in Postgres, and four of its findings came up again in
step 12 — the category breakdown's `category_totals` function is built to all four:

- **PostgREST's aggregate syntax is disabled on this project.**
  `select("type, amount_paise.sum()")` answers `PGRST123`, "Use of aggregate functions is
  not allowed" — that's Supabase's default, and it's a project setting rather than
  something SQL can turn on. So every aggregate goes through a function called with
  `supabase.rpc(...)`; that's why the category breakdown has one of its own in
  `20260821000000_category_totals.sql`.
- **An aggregating function must stay `security invoker`** — the default, written out in
  `20260820000000_period_totals.sql` because it is the security. The function runs as the
  caller, so the `transactions` RLS policy decides which rows it may sum; the `definer`
  variant would total every user's money into one balance. For the same reason it takes no
  `user_id` argument. Verified: with a JWT `sub` for the owning user it returns the real
  figures, with any other `sub` it returns `0 / 0`.
- **Revoking `anon` needs `anon` named.** Supabase's default privileges add an explicit
  `anon=X/` ACL entry to every new function in `public`, so `revoke … from public` is a
  no-op — the first run of that migration proved it. The `anon` role has to appear in the
  revoke itself before an anonymous request is actually refused.
- **`npx supabase db query --linked --project-ref … -f file.sql` applies a migration**
  over the Management API using the CLI's stored login, with no database password. That's
  how step 10's migration was applied and verified, and it beats the dashboard SQL editor
  because the result comes back where the rest of the check can see it. It also means the
  numbered file under `supabase/migrations/` and the live schema can't drift apart.

Two smaller step-10 calls: the income/expenses pair **stacks below `sm`** rather than
sitting two-up at every width — a tile is ~130px of inner width at 375px and a year's
`₹12,00,000.00` is ~140px of tabular mono, and shrinking the figure to fit would drop the
dashboard's second-most-important pair to body-text size. And the hero's negative balance
gets **a sentence, not a colour** ("Expenses exceeded income this period"): red on the
violet gradient is well under AA, so the `−` carries it and the sentence is the redundant
channel.

Step 11 made `/categories` writable, and its decisions are worth not re-deriving:

- **It needed no migration.** Column aggregates are disabled (see step 10), but an
  _embedded resource's_ `count()` is a different code path and is allowed:
  `select("id, name, type, transactions(count)")` returns the per-category usage count in
  the same round trip as the list. Verified rather than assumed — anonymous requests prove
  that both `amount_paise.sum()` (`PGRST123`) and an unresolvable embed (`PGRST200`) fail
  at _parse_ time, before RLS filtering, so a `200` for the count means the syntax is
  genuinely permitted. It goes through RLS like any embed, and it types as
  `{ count: number }[]` with the array access correctly nullable — so `[0]?.count ?? 0`,
  no cast.
- **The type is never a form field.** There's one add form per list, so which box you
  typed into decides the type, and it's bound into all three actions. Rename deliberately
  can't change `type`: every transaction filed under the category would have to move with
  it, the composite FK would refuse, and the honest UI for "this is really an expense" is
  a new category.
- **The delete restriction is stated before the click, and enforced after it.** The count
  is on the page, so an in-use category shows "Used by N transactions… Renaming it
  relabels all of them" instead of a button that fails. The `23503` handler stays as the
  backstop for the race where a transaction lands between render and click. Confirmed
  against the live DB: a case-different duplicate raises `23505`, deleting an in-use
  category raises `23503`.
- **A category row has no confirmation dialog, unlike a transaction.** The FK's `restrict`
  means a category you're _able_ to delete has no transactions attached, so nothing but
  the label is lost. Delete does sit one level in — inside the row's editor, not beside
  Rename in the list — because "delete Rent while meaning to rename it" is the failure
  worth preventing.
- **Editors close by remount, not by an effect.** `react-hooks/set-state-in-effect` is on
  and it's right: the list keys each row `id:name`, so a successful rename discards the
  subtree and `editing` resets with nothing to synchronise. The add form uses the same
  trick with the created row's id, because changing `defaultValue` alone will not clear an
  input that already has a value. The one case a remount can't cover is renaming
  something to the name it already has — no prop changes — so the action reports that as a
  field error rather than succeeding silently.
- `components/text-field.tsx` gained an optional `id` (defaulting to `name`). The rename
  field renders once per row, and without it every label pointed at the first input.
- **A Zod `error` does not inherit down the chain.** `z.string({ error })` answers only
  what the type itself raises (missing field, non-string); `.min(1)` with no `error` of its
  own falls through to the locale default, not to the schema's. So a required text field
  needs the message in both places or one of the two blank shapes — `{}` and `{ name: "" }`
  — surfaces "Too small: expected string to have >=1 characters" as a field error, under an
  input the user can already see is empty. `lib/validation/categories.ts` names the string
  once and passes it twice. Tested both ways in `lib/validation/categories.test.ts`.

That also closed the step-10 dead end: `/transactions/new` still tells a user with no
categories to "Go to categories", and that page can now actually create one, so the
message needed no change.

Step 12 finished the dashboard. Its decisions are the ones most likely to be re-litigated,
so they're written down:

- **`category_totals` is applied and verified**, in
  `supabase/migrations/20260821000000_category_totals.sql`, and `lib/database.types.ts` is
  regenerated. Probed against the live database: `prosecdef = f`, `anon` absent from the
  ACL, an anonymous call refused with `insufficient_privilege`, the owner's own rows
  returned, a stranger's JWT `sub` seeing nothing — and, the one that matters,
  `sum(category_totals) = period_totals.expense_paise` (617500 = 617500), which is what
  rules out the join dropping or double-counting rows. The join can't lose rows to RLS
  because the composite FK guarantees a visible transaction's category is visible too.
- **There is no charting dependency, and the stack list changed to say so.** The breakdown
  is one categorical series with a dozen rows at most and every value printed as text, so
  the form that fits is a ranked bar — a `bg-sunken` track holding a `bg-cat-N` fill whose
  width is a percentage. Recharts would have added ~90KB of client JavaScript, forced the
  breakdown into a client component (breaking "reads in Server Components"), and had to be
  argued into rendering the same right-aligned mono figures as every other list. The whole
  chart is `app/(app)/category-breakdown.tsx` and it is a Server Component.
- **Length is the encoding; hue is not.** Measured with the dataviz palette validator, the
  `--cat-*` values fail as a _chart_ palette in both themes — in light mode `cat-1`↔`cat-2`
  is ΔE 7.7 for normal vision against a floor of 15 and ΔE 2.8 simulating protanopia, and
  the worst all-pairs distance is `cat-7`↔`cat-4` at ΔE 1.5 deutan; dark mode is worse
  (ΔE 5.6 normal, 1.2 deutan, worst pair 0.9, and all eight sit outside the dark lightness
  band). **That is the palette doing its documented job, not a defect** — the tokens are
  identity and a dot always has a name beside it. Re-stepping eight values to serve one
  chart would change a colour on twelve screens. So the chart encodes with bar length,
  labels every row with both its amount and its percentage, and lets hue do only the thing
  it's good at: matching the bar to that category's dot elsewhere. **Two categories can
  still land on the same hue** (the hash collides by design) — in this chart that costs
  nothing, because nothing is being read off the colour.
- **Bars are scaled to the displayed percentage, not the exact fraction**, so a bar's length
  and the number beside it can never disagree. They're flat on the left and rounded on the
  right: every row's track starts at the same x, so the flat end reads as a shared baseline.
  The width is an inline `style` because Tailwind can only emit class names it can see, and
  `max(0.375rem, N%)` floors the smallest bar at one bar-height — a category rounding to 0%
  draws a dot rather than nothing.
- **`lib/percent.ts` does largest-remainder rounding.** Per-row `Math.round` prints 33/33/33
  for three equal thirds, and since `category_id` is `not null` these rows are a genuine
  partition of the period total — a column summing to 99 reads as a lost transaction. The
  helper hands the leftover points to the biggest fractional parts, tie-broken by index so
  two equal categories don't swap percentages between renders.
- **The view lives in the URL, like the period.** `?view=income|expense` in
  `lib/dashboard-view.ts`, with `resolveView` falling back rather than throwing (same
  contract as `resolvePeriod`) and `dashboardHref` built _on_ `periodHref` so that function
  stays the only place the period pair is assembled. `DashboardView` is an alias of
  `TransactionType`, not a parallel type — the value is passed straight to `category_totals`
  as `txn_type`, so widening it would be a lie at the call site.
- **The toggle is outside the breakdown card, at a tighter gap than the page's.** It scopes
  that one card, and a control _inside_ a card silently changes what the card is showing.
  Toggle and card are wrapped in one div so they're a single `stagger-children` child. It
  gets the money-colour exception for the same reason `transaction-form.tsx`'s type toggle
  does — it's choosing a direction — and it's `min-h-11`, the 44px SPEC asks for, unlike the
  form's `min-h-10` (step 14).
- **"Recent" is period-scoped, and the rows are inert.** Five most recent _within the
  selected period_: a dashboard reporting ₹0.00 for last March while listing yesterday's
  coffee would be lying about which numbers belong together. The rows reuse
  `TransactionRow` with no `href`, which is what that prop's `undefined` case was built for
  — "View all" is the way through to the editable list.
- **Three queries, one `Promise.all`, three separate error scopes.** A failed
  `period_totals` replaces the page (the hero can't render without it); a failed
  `category_totals` or recent-list query puts an `Alert` inside its own card instead of
  taking down the whole dashboard. On a period with nothing in it both new cards are dropped
  entirely — the hero already carries that empty state, and three restatements of "nothing
  here" is worse than one.
- `categoryDotClass` became **`categoryFillClass`** (and `DOT_CLASSES` → `FILL_CLASSES`),
  because the bar and the dot both need it and a function named for the dot returning the
  bar's class would be a lie.
- `app/dev/page.tsx` gained a **temporary** breakdown preview against fixed figures — the
  only way to look at the chart without a session, covering the rounds-to-0% row, the
  three-equal-thirds case, and the empty state. It goes with the rest of that page at step
  14, along with its import of `app/(app)/category-breakdown.tsx`.

Regenerate DB types after every migration:

```
npx supabase gen types typescript --project-id uoretcvxovwtdtpiyboo > lib/database.types.ts
```

Email confirmation still reads **on** in the Supabase project (`mailer_autoconfirm:
false`) as of 19 Aug 2026, despite an attempt to disable it — the dashboard change likely
wasn't saved. So signup returns no session and the user must click an emailed link. The
signup action handles both settings either way, and `app/auth/confirm/route.ts` accepts
both the `?code=` and `?token_hash=&type=` link shapes. The signed-in happy path has not
been exercised end to end yet — every protected route is confirmed to 307 to `/login` when
anonymous, but nothing past the login form has been driven by a real session.

1. **Scaffold** — `create-next-app` (TS, Tailwind, App Router), ESLint + Prettier,
   strict `tsconfig`, base layout shell.
2. **Supabase wiring** — project, `.env.local` (+ `.env.example`), `@supabase/ssr`
   server/browser clients, session refresh in `proxy.ts`.
3. **Schema migration** — the three tables, constraints, indexes, RLS policies, and the
   signup trigger that seeds `profiles` + default categories. Generate DB types.
4. **Auth** — signup, login, logout, protected-route redirects.
5. **Core utils** — `lib/money.ts` and `lib/period.ts` with unit tests. Do this before
   any feature that uses them.
6. **Add transaction** — form (type, amount, date, category, note) + Server Action with
   Zod validation.
7. **Transaction list** — period-filtered, newest first, signed and coloured amounts.
8. **Edit + delete** — row actions, delete confirmation.
9. **Period selector** — week/month/year modes, prev/next navigation, URL-driven, "next"
   disabled past today.
10. **Balance summary** — income / expenses / balance for the selected period, aggregated
    in Postgres.
11. **Categories page** — add, rename, delete; surface the in-use delete restriction as a
    clear message.
12. **Dashboard** — income/expense toggle, total, category breakdown with percentages, 5
    most recent transactions, empty states.
13. **Account page** — display name, email, created date, change password, sign out.
14. **Polish pass** — loading and error states, mobile layout down to 375px,
    accessibility (labels, focus, non-colour signals). Delete `app/dev/` — the
    utils sandbox from step 5.
15. **Deploy** — Vercel, env vars, verify auth redirect URLs against the production
    domain.
