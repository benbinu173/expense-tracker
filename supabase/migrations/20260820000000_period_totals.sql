-- Period totals for the balance summary.
--
-- Applying this by hand in the Supabase SQL Editor is fine. If you later adopt
-- the Supabase CLI, tell it this version is already applied so it doesn't try
-- to run it a second time:
--   npx supabase migration repair --status applied 20260820000000

-- ---------------------------------------------------------------------------
-- period_totals
-- ---------------------------------------------------------------------------

-- Total income and total expenses for one calendar period, in one round trip.
--
-- Why a function rather than a query: PostgREST's aggregate syntax
-- (`select=type,amount_paise.sum()`) is disabled on this project — it answers
-- PGRST123, "Use of aggregate functions is not allowed" — and even enabled it
-- would return one row per `type` present, so an empty period and a
-- expense-only period would each need reshaping on the client. This returns a
-- single row with both figures whether or not either exists.
--
-- `security invoker` is the default, and is written out because it is doing the
-- security work: the function runs as the caller, so the `transactions` RLS
-- policy (`user_id = auth.uid()`) decides which rows it is allowed to see
-- before the aggregate ever runs. A `security definer` version of this would
-- happily sum every user's money into one balance.
--
-- For the same reason there is no `user_id` argument. Whose rows these are is
-- the session's answer, never the caller's.
create or replace function public.period_totals(period_start date, period_end date)
returns table (income_paise bigint, expense_paise bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  -- `sum()` over no rows is null, and an empty period has to read ₹0.00 rather
  -- than "no data" — the zero is a real answer.
  --
  -- The `::bigint` casts are not cosmetic: `sum(bigint)` is `numeric` in
  -- Postgres, and the cast is what keeps the generated TypeScript type a
  -- `number` matching `amount_paise`. Safe for the same reason that column is:
  -- MAX_PAISE is 1e11, so reaching 2^53 takes roughly ninety thousand
  -- maximum-size transactions inside a single period.
  select
    coalesce(
      sum(t.amount_paise) filter (where t.type = 'income'::public.transaction_type),
      0
    )::bigint,
    coalesce(
      sum(t.amount_paise) filter (where t.type = 'expense'::public.transaction_type),
      0
    )::bigint
  from public.transactions as t
  -- Both bounds are inclusive, matching `lib/period.ts`'s `PeriodRange`.
  where t.occurred_on between period_start and period_end;
$$;

comment on function public.period_totals(date, date) is
  'Income and expense totals in paise for an inclusive date range, for the calling user only (RLS).';

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

-- A new function arrives callable by anonymous requests, from two directions:
-- Postgres grants `execute` to the implicit `public` role, and Supabase's
-- default privileges for schema `public` add an explicit grant to `anon`
-- alongside `authenticated` and `service_role`. RLS makes that harmless — an
-- anonymous caller filters to zero rows and gets 0/0 back — but the init
-- migration's rule stands: `anon` is deliberately granted nothing.
--
-- Both have to be named. Revoking from `public` alone leaves the `anon=X/`
-- entry in place, which is what the first run of this migration proved.
revoke all on function public.period_totals(date, date) from public, anon;

grant execute on function public.period_totals(date, date) to authenticated;
