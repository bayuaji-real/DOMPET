-- Pusat Bantuan: laporan bug dan usul fitur dari pengguna.
-- Pengguna hanya bisa menambah dan melihat laporan miliknya sendiri. Tidak ada ubah/hapus dari aplikasi.
create table if not exists public.help_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('bug', 'usul')),
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 5 and 2000),
  page text check (page is null or char_length(page) <= 200),
  status text not null default 'baru' check (status in ('baru', 'dibaca', 'dikerjakan', 'selesai')),
  created_at timestamptz not null default now()
);

create index if not exists help_reports_user_created_idx on public.help_reports (user_id, created_at desc);

alter table public.help_reports enable row level security;

drop policy if exists help_reports_select_own on public.help_reports;
create policy help_reports_select_own on public.help_reports
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists help_reports_insert_own on public.help_reports;
create policy help_reports_insert_own on public.help_reports
  for insert to authenticated with check (user_id = (select auth.uid()) and status = 'baru');

revoke all on public.help_reports from anon;
revoke update, delete on public.help_reports from authenticated;
