-- Catatan pemakaian AI (Gemini) untuk evaluasi 2-4 minggu. Pak Slamet (Database).
create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  feature text not null check (feature in ('tabungan', 'konsultasi')),
  model text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cost_idr numeric(14,4) not null default 0 check (cost_idr >= 0),
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_logs_user_day on public.ai_usage_logs (user_id, created_at desc);
alter table public.ai_usage_logs enable row level security;
create policy "Pengguna melihat catatan AI miliknya" on public.ai_usage_logs
  for select to authenticated using (auth.uid() = user_id);
create policy "Pengguna menambah catatan AI miliknya" on public.ai_usage_logs
  for insert to authenticated with check (auth.uid() = user_id);
-- Tidak ada policy update/delete: catatan tidak bisa diubah dari aplikasi.
