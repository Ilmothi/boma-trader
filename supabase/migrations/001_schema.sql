-- ============================================================
-- Boma Trader — schema + RLS
-- Review this before running it in the Supabase SQL editor.
-- Every row is scoped to the authenticated user via user_id = auth.uid().
-- ============================================================

-- BATCHES: one lot of goats bought together from a market
create table if not exists public.batches (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  market        text,
  purchase_date date not null,
  head_count    integer not null check (head_count > 0),
  cost_per_head numeric not null default 0 check (cost_per_head >= 0),
  target_months integer not null default 12,
  created_at    timestamptz not null default now()
);

-- SALES: a sale event against a batch (partial or full)
create table if not exists public.sales (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  batch_id   uuid not null references public.batches(id) on delete cascade,
  date       date not null,
  count      integer not null check (count > 0),
  total      numeric not null default 0 check (total >= 0),
  buyer      text,
  created_at timestamptz not null default now()
);

-- DEATHS: a mortality event against a batch
create table if not exists public.deaths (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  batch_id   uuid not null references public.batches(id) on delete cascade,
  date       date not null,
  count      integer not null check (count > 0),
  cause      text,
  created_at timestamptz not null default now()
);

-- EXPENSES: general (whole herd) or tied to a specific batch
create table if not exists public.expenses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  amount     numeric not null check (amount > 0),
  category   text not null,
  scope      text not null default 'general' check (scope in ('general','batch')),
  batch_id   uuid references public.batches(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

-- SETTINGS: per-user config (Nairobi target)
create table if not exists public.settings (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  nairobi_target integer not null default 125
);

-- Helpful indexes
create index if not exists idx_batches_user on public.batches(user_id);
create index if not exists idx_sales_batch  on public.sales(batch_id);
create index if not exists idx_deaths_batch on public.deaths(batch_id);
create index if not exists idx_expenses_user on public.expenses(user_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.batches  enable row level security;
alter table public.sales    enable row level security;
alter table public.deaths   enable row level security;
alter table public.expenses enable row level security;
alter table public.settings enable row level security;

-- One policy set per table: a user may only touch their own rows.
create policy "own batches"  on public.batches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sales"    on public.sales
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own deaths"   on public.deaths
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own expenses" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own settings" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
