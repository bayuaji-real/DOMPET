-- Batas pengeluaran harian/mingguan/bulanan, boleh dibatasi ke kategori tertentu. Milik sendiri (RLS).
create table if not exists public.spend_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  period text not null check (period in ('harian','mingguan','bulanan')),
  amount bigint not null check (amount > 0 and amount <= 100000000000),
  category_ids uuid[] not null default '{}' check (cardinality(category_ids) <= 50),
  warn_pct integer not null default 80 check (warn_pct between 10 and 99),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists spend_limits_user on public.spend_limits (user_id);
alter table public.spend_limits enable row level security;
revoke all on public.spend_limits from anon;
create policy "Batas: lihat milik sendiri" on public.spend_limits for select to authenticated using (auth.uid() = user_id);
create policy "Batas: tambah milik sendiri" on public.spend_limits for insert to authenticated with check (auth.uid() = user_id);
create policy "Batas: ubah milik sendiri" on public.spend_limits for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Batas: hapus milik sendiri" on public.spend_limits for delete to authenticated using (auth.uid() = user_id);
