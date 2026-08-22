# Personal Finance Tracker — v1 Spec

## 1. Purpose

A private, single-user-per-account web app for logging income and expenses and seeing
where the money went. One person, one account, one currency (INR). No collaboration,
no automation, no bank connections — you type transactions in, the app tells you your
balance and your top spending categories for a chosen week, month, or year.

Success for v1: a user can sign up, log a week of real transactions in under a minute
each, and answer "what did I spend on food this month, and am I net positive?" in two
clicks.

## 2. Functional requirements

### 2.1 Auth

1. Sign up with email + password. Sign in, sign out.
2. On signup, the user automatically gets a profile row and a default set of categories.
3. All app routes except `/login` and `/signup` require a session; unauthenticated
   visitors are redirected to `/login`.
4. A user can only ever read or write their own rows (enforced in the database, not
   just in the UI).

### 2.2 Transactions

5. Create a transaction with: **type** (income or expense), **amount**, **date**,
   **category**, and an **optional note**.
6. Amount must be > 0. The type carries the sign — amounts are never stored negative.
7. The category picker only offers categories matching the selected type (no logging
   "Salary" as an expense).
8. Date defaults to today and cannot be in the future.
9. Note is optional, max 200 characters.
10. List transactions for the selected period, newest first, showing date, category,
    note, and signed amount (green for income, red for expense).
11. Edit any field of an existing transaction.
12. Delete a transaction, with a confirmation step.

### 2.3 Periods and balance

13. A period selector with three modes: **week**, **month**, **year**.
14. Periods are calendar-based, not rolling: week = Monday–Sunday, month = 1st to last
    day, year = Jan 1–Dec 31.
15. Previous / next controls step the anchor date one period at a time. "Next" is
    disabled once the period would start after today.
16. The selected period is held in the URL (`?period=month&anchor=2026-08-01`) so
    refreshing or sharing a link keeps the view.
17. For the selected period, show: total income, total expenses, and balance
    (income − expenses). Negative balances are visually distinct.

### 2.4 Dashboard

18. Dashboard is the default route `/` and uses the same period selector.
19. A toggle switches between an **income view** and an **expense view**.
20. For the active view and period, show the total plus a per-category breakdown chart
    with amount and percentage of total.
21. Show the period's most recent transactions (max 5) with a link to the full list.
22. Empty state when the period has no data for the active view — a prompt to add a
    transaction, not a blank chart.

### 2.5 Categories

23. Seeded on signup:
    - **Income**: Salary, Freelance, Interest, Gift, Other
    - **Expense**: Food, Groceries, Rent, Transport, Utilities, Health, Shopping,
      Entertainment, Other
24. A user can add, rename, and delete their own categories.
25. Each category belongs to exactly one type (income or expense).
26. Category names are unique per user per type.
27. A category in use by any transaction cannot be deleted; the UI says so and offers
    renaming instead.

### 2.6 Account / profile

28. `/account` shows email (read-only), display name (editable), and account created
    date.
29. Change password from the same page.
30. Sign out from the same page.

## 3. Data model

Three tables plus Supabase's built-in `auth.users`. Money is stored as an integer
number of **paise** (1 ₹ = 100 paise) — never a float.

### `profiles`

| column         | type          | notes                                   |
| -------------- | ------------- | --------------------------------------- |
| `id`           | `uuid` PK     | FK → `auth.users(id)` on delete cascade |
| `display_name` | `text`        | nullable                                |
| `created_at`   | `timestamptz` | default `now()`                         |

Email is not duplicated here — it lives in `auth.users`.

### `categories`

| column       | type               | notes                                   |
| ------------ | ------------------ | --------------------------------------- |
| `id`         | `uuid` PK          | default `gen_random_uuid()`             |
| `user_id`    | `uuid`             | FK → `auth.users(id)` on delete cascade |
| `name`       | `text`             | not null, 1–40 chars                    |
| `type`       | `transaction_type` | not null enum, `'income' \| 'expense'`  |
| `created_at` | `timestamptz`      | default `now()`                         |

- `unique (user_id, type, lower(name))` — case-insensitive, so "Food" and "food" cannot
  both exist and split one category into two rows in the breakdown.
- `unique (user_id, id, type)` — redundant on its own, but needed as the target of the
  composite FK below.

### `transactions`

| column         | type               | notes                                        |
| -------------- | ------------------ | -------------------------------------------- |
| `id`           | `uuid` PK          | default `gen_random_uuid()`                  |
| `user_id`      | `uuid`             | FK → `auth.users(id)` on delete cascade      |
| `type`         | `transaction_type` | not null enum, `'income' \| 'expense'`       |
| `amount_paise` | `bigint`           | not null, `check (amount_paise > 0)`         |
| `occurred_on`  | `date`             | not null — date only, no time, no timezone   |
| `category_id`  | `uuid`             | not null                                     |
| `note`         | `text`             | nullable, `check (char_length(note) <= 200)` |
| `created_at`   | `timestamptz`      | default `now()`                              |
| `updated_at`   | `timestamptz`      | default `now()`, touched on update           |

`transaction_type` is a Postgres enum rather than `text` + a check constraint: the domain
is closed by definition, and Supabase's type generator turns an enum into a real
`'income' | 'expense'` TypeScript union instead of a bare `string`.

- `foreign key (user_id, category_id, type) references categories (user_id, id, type)
on delete restrict` — a single constraint that guarantees the category exists, is
  owned by the same user, and matches the transaction's type. This is why requirement
  27 (no deleting an in-use category) is enforced by the database, not by app logic.
- Index on `(user_id, occurred_on desc)` for the list view.
- Index on `(user_id, type, occurred_on)` for the dashboard aggregates.
- Index on `(user_id, category_id, type)` so the `RESTRICT` check on category delete
  doesn't scan the table.

Requirement 8's "no future dates" is **not** a database check: a `CHECK` constraint can't
call `current_date` (not immutable), and Postgres runs in UTC while the user doesn't — a
DB-side check would reject a legitimate "today" for the first 5½ hours of every IST day.
It is enforced in Zod against the app timezone instead.

### Row level security

RLS enabled on all three tables. `profiles` policies match on `id = auth.uid()`;
`categories` and `transactions` match on `user_id = auth.uid()`, for all of
select / insert / update / delete. `user_id` is always taken from the session on the
server, never from the client payload.

### Signup trigger

A trigger on `auth.users` insert creates the `profiles` row and inserts the default
categories from requirement 23.

## 4. Non-functional requirements

### Validation

- One Zod schema per entity, shared by the client form and the Server Action. The
  server-side parse is authoritative; client validation is only for fast feedback.
- Amount input accepts a decimal string (`"1234.50"`), is converted to integer paise by
  a single tested helper, and rejects more than 2 decimal places, zero, and negatives.
- Rejected submissions return field-level errors and preserve what the user typed.
- Database constraints mirror the Zod rules so bad data can't arrive by another path.

### Responsiveness

- Mobile-first, usable down to 375px wide; single column below `md`, two-column
  dashboard above it.
- Tap targets at least 44px; the transaction form is reachable in one tap from any page.
- The chart and the transaction list must not cause horizontal scroll on mobile — long
  category names and notes truncate with ellipsis.

### Other

- **Accessibility**: labelled inputs, visible focus rings, colour never the only signal
  (income/expense also differ by `+`/`−` prefix), chart values available as text.
- **Performance**: period aggregates computed in Postgres, not by pulling all rows into
  the client.
- **Errors**: every async action has a loading state and a visible failure message —
  never a silent no-op.
- **Money display**: `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`
  through one shared formatter.
- **Timezone**: "today" is resolved in one fixed zone, `Asia/Kolkata`, on both server and
  client, so period boundaries never disagree between the two. Single-timezone is a v1
  assumption, held in one constant (`APP_TIME_ZONE` in `lib/period.ts`).

## 5. Explicitly out of scope for v1

Bank sync or statement import, multi-currency, budget goals and alerts, multi-user
sharing or household accounts, recurring transactions, attachments/receipts, CSV
export, native apps.

Dark mode **was** on this list and has been moved in scope. It follows
`prefers-color-scheme` only — there is no in-app toggle, so no theme cookie and no
provider. The cost is a token layer in `app/globals.css` that would have been
built anyway; the reason for moving it is that retrofitting a theme after a dozen
screens have hardcoded colours is far more expensive than defining two palettes up
front.
