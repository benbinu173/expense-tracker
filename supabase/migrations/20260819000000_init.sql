-- Personal finance tracker — initial schema.
--
-- Applying this by hand in the Supabase SQL Editor is fine. If you later adopt
-- the Supabase CLI, tell it this version is already applied so it doesn't try
-- to run it a second time:
--   npx supabase migration repair --status applied 20260819000000

-- ---------------------------------------------------------------------------
-- Shared domain
-- ---------------------------------------------------------------------------

-- An enum rather than text + check: the domain is closed by definition, and
-- Supabase's type generator turns it into a real 'income' | 'expense' union on
-- the TypeScript side.
create type public.transaction_type as enum ('income', 'expense');

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(trim(display_name)) between 1 and 60),
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per user. Email is NOT duplicated here — it lives in auth.users.';

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select using (id = (select auth.uid()));

create policy profiles_insert_own on public.profiles
  for insert with check (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- No delete policy: deleting an account is out of scope for v1.

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  type public.transaction_type not null,
  created_at timestamptz not null default now(),

  -- Referenced by the composite FK on transactions below. Redundant as a key on
  -- its own (id is already the PK), but an FK can only target a unique key, and
  -- this is what lets one constraint prove ownership AND type agreement.
  constraint categories_user_id_type_key unique (user_id, id, type)
);

-- Case-insensitive uniqueness, so "Food" and "food" can't coexist and turn the
-- category breakdown into two rows for the same thing.
create unique index categories_user_type_name_key
  on public.categories (user_id, type, lower(name));

create index categories_user_type_idx on public.categories (user_id, type);

alter table public.categories enable row level security;

create policy categories_select_own on public.categories
  for select using (user_id = (select auth.uid()));

create policy categories_insert_own on public.categories
  for insert with check (user_id = (select auth.uid()));

create policy categories_update_own on public.categories
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy categories_delete_own on public.categories
  for delete using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.transaction_type not null,

  -- Integer paise (1 rupee = 100 paise). Never a float, never numeric.
  -- Always positive: direction comes from `type`, not from the sign.
  amount_paise bigint not null check (amount_paise > 0),

  -- Date only, no time, no timezone.
  occurred_on date not null,

  category_id uuid not null,
  note text check (note is null or char_length(trim(note)) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One constraint doing three jobs: the category exists, it belongs to the
  -- same user, and its type matches this transaction's type. ON DELETE RESTRICT
  -- is also what blocks deleting a category that is still in use.
  constraint transactions_category_fkey
    foreign key (user_id, category_id, type)
    references public.categories (user_id, id, type)
    on delete restrict
);

comment on column public.transactions.amount_paise is
  'Integer paise, always > 0. Direction is carried by `type`.';

-- "No future dates" is enforced in Zod, not here: a CHECK constraint cannot
-- call current_date (not immutable), and the database runs in UTC while the
-- user does not — so a DB-side check would reject a legitimate "today" for the
-- first 5.5 hours of every IST day.

create index transactions_user_date_idx
  on public.transactions (user_id, occurred_on desc);

create index transactions_user_type_date_idx
  on public.transactions (user_id, type, occurred_on);

-- Supports the FK's RESTRICT check when a category delete is attempted.
create index transactions_user_category_type_idx
  on public.transactions (user_id, category_id, type);

alter table public.transactions enable row level security;

create policy transactions_select_own on public.transactions
  for select using (user_id = (select auth.uid()));

create policy transactions_insert_own on public.transactions
  for insert with check (user_id = (select auth.uid()));

create policy transactions_update_own on public.transactions
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy transactions_delete_own on public.transactions
  for delete using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New user bootstrap: profile row + default categories
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  );

  insert into public.categories (user_id, name, type)
  select new.id, seed.name, seed.type::public.transaction_type
  from (
    values
      ('Salary', 'income'),
      ('Freelance', 'income'),
      ('Interest', 'income'),
      ('Gift', 'income'),
      ('Other', 'income'),
      ('Food', 'expense'),
      ('Groceries', 'expense'),
      ('Rent', 'expense'),
      ('Transport', 'expense'),
      ('Utilities', 'expense'),
      ('Health', 'expense'),
      ('Shopping', 'expense'),
      ('Entertainment', 'expense'),
      ('Other', 'expense')
  ) as seed (name, type);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

-- Supabase's default privileges usually cover this, but being explicit keeps
-- the intent readable. RLS above is what actually restricts rows; `anon` is
-- deliberately not granted anything.
grant select, insert, update, delete
  on table public.profiles, public.categories, public.transactions
  to authenticated;
