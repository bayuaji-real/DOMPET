-- Target Beli: rencana membeli barang (tunai atau cicilan). Terpisah dari target Tabungan.
create table if not exists public.purchase_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  price bigint not null check (price > 0),
  down_payment bigint not null default 0 check (down_payment >= 0),
  saved bigint not null default 0 check (saved >= 0),
  mode text not null default 'tunai' check (mode in ('tunai','cicilan')),
  months int check (months between 1 and 360),
  rate_pct numeric check (rate_pct between 0 and 100),
  target_date date,
  note text check (char_length(note) <= 300),
  status text not null default 'aktif' check (status in ('aktif','terbeli','batal')),
  created_at timestamptz not null default now(),
  check (down_payment <= price)
);
create index if not exists purchase_goals_user_idx on public.purchase_goals(user_id, status);
alter table public.purchase_goals enable row level security;
drop policy if exists "target beli milik sendiri" on public.purchase_goals;
create policy "target beli milik sendiri" on public.purchase_goals for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.purchase_goals from anon;
