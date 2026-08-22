-- Per-category totals for the dashboard breakdown (step 12).
--
-- Applied with the CLI over the Management API:
--   npx supabase db query --linked --project-ref <ref> -f supabase/migrations/20260821000000_category_totals.sql

-- ---------------------------------------------------------------------------
-- category_totals
-- ---------------------------------------------------------------------------

-- One row per category that has at least one transaction of `txn_type` inside
-- the period, largest first.
--
-- Why a function, again: PostgREST's column aggregates are disabled on this
-- project (PGRST123), so `amount_paise.sum()` grouped by category isn't
-- available. Step 11's `transactions(count)` embed works because an *embedded
-- resource's* count is a different code path — but there is no embed syntax for
-- a sum, so this is a function like `period_totals`. Pulling the period's rows
-- into the client and reducing them there is the thing SPEC.md § Performance
-- rules out.
--
-- `security invoker` is the default and is written out because it is the
-- security: the function runs as the caller, so the RLS policies on *both*
-- tables decide what it may see before the aggregate runs. A `security definer`
-- version would break every user's spending into one chart. For the same reason
-- there is no `user_id` argument — whose rows these are is the session's answer.
--
-- The join can't lose rows to RLS. Both policies are `user_id = auth.uid()`, and
-- the composite FK `(user_id, category_id, type)` guarantees a transaction's
-- category belongs to the same user — so any transaction the caller can see has
-- a category the caller can see.
create or replace function public.category_totals(
  period_start date,
  period_end date,
  txn_type public.transaction_type
)
returns table (category_id uuid, category_name text, total_paise bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  -- Every column reference is qualified on purpose: the OUT parameter names
  -- above are in scope in this body, and `category_id` is also a column of
  -- `transactions`, so an unqualified reference would be ambiguous.
  --
  -- `::bigint` for the same reason as `period_totals`: `sum(bigint)` is
  -- `numeric` in Postgres, and the cast is what keeps the generated TypeScript
  -- type a `number` matching `amount_paise`.
  select
    c.id,
    c.name,
    sum(t.amount_paise)::bigint
  from public.transactions as t
  join public.categories as c on c.id = t.category_id
  where t.type = txn_type
    -- Both bounds inclusive, matching `lib/period.ts`'s `PeriodRange`.
    and t.occurred_on between period_start and period_end
  group by c.id, c.name
  -- Descending by total is the order the breakdown reads in, so it's settled
  -- here rather than in TypeScript. `c.name` breaks ties, which keeps the list
  -- stable across reloads instead of letting Postgres pick.
  order by sum(t.amount_paise) desc, c.name asc;
$$;

comment on function public.category_totals(date, date, public.transaction_type) is
  'Per-category totals in paise for one direction over an inclusive date range, for the calling user only (RLS). Largest first.';

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

-- `anon` has to be named alongside `public`: Supabase's default privileges for
-- schema `public` add an explicit `anon=X/` ACL entry to every new function, so
-- revoking from `public` alone leaves it callable. See the note in
-- `20260820000000_period_totals.sql` — the first run of that migration is what
-- proved it.
revoke all on function public.category_totals(date, date, public.transaction_type) from public, anon;

grant execute on function public.category_totals(date, date, public.transaction_type) to authenticated;
