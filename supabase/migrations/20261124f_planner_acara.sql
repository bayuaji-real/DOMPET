-- Planner acara (lamaran, nikah, dll). Semua tabel hanya bisa dilihat/diubah pemiliknya.
create table if not exists public.planner_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  event_type text not null default 'nikah' check (event_type in ('lamaran','nikah','lainnya')),
  event_date date,
  total_budget bigint not null default 0 check (total_budget >= 0 and total_budget <= 100000000000),
  partner_a text check (char_length(partner_a) <= 60),
  partner_b text check (char_length(partner_b) <= 60),
  goal_id uuid,
  created_at timestamptz not null default now()
);
create table if not exists public.planner_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_id uuid not null references public.planner_events(id) on delete cascade,
  kind text not null check (kind in ('vendor','seserahan','lainnya')),
  name text not null check (char_length(name) between 1 and 80),
  planned_cost bigint not null default 0 check (planned_cost >= 0 and planned_cost <= 100000000000),
  side text not null default 'umum' check (side in ('pria','wanita','umum')),
  status text not null default 'belum' check (status in ('belum','proses','selesai','tinjau','booking','lunas')),
  needed_date date,
  contact text check (char_length(contact) <= 120),
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create table if not exists public.planner_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_id uuid not null references public.planner_events(id) on delete cascade,
  item_id uuid references public.planner_items(id) on delete cascade,
  amount bigint not null check (amount > 0 and amount <= 100000000000),
  paid_at date not null default current_date,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);
create table if not exists public.planner_guests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_id uuid not null references public.planner_events(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  category text check (char_length(category) <= 40),
  side text not null default 'umum' check (side in ('pria','wanita','umum')),
  address text check (char_length(address) <= 200),
  pax integer not null default 1 check (pax between 1 and 50),
  attendance text not null default 'belum' check (attendance in ('belum','hadir','tidak')),
  created_at timestamptz not null default now()
);
create table if not exists public.planner_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_id uuid not null references public.planner_events(id) on delete cascade,
  kind text not null check (kind in ('dokumen','jadwal')),
  title text not null check (char_length(title) between 1 and 100),
  side text not null default 'umum' check (side in ('pria','wanita','umum')),
  due_date date,
  note text check (char_length(note) <= 300),
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists planner_events_user on public.planner_events (user_id);
alter table public.planner_events enable row level security;
drop policy if exists "Acara: lihat milik sendiri" on public.planner_events;
drop policy if exists "Acara: tambah milik sendiri" on public.planner_events;
drop policy if exists "Acara: ubah milik sendiri" on public.planner_events;
drop policy if exists "Acara: hapus milik sendiri" on public.planner_events;
create policy "Acara: lihat milik sendiri" on public.planner_events for select to authenticated using (auth.uid() = user_id);
create policy "Acara: tambah milik sendiri" on public.planner_events for insert to authenticated with check (auth.uid() = user_id);
create policy "Acara: ubah milik sendiri" on public.planner_events for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Acara: hapus milik sendiri" on public.planner_events for delete to authenticated using (auth.uid() = user_id);
revoke all on public.planner_events from anon;
create index if not exists planner_items_user on public.planner_items (user_id);
alter table public.planner_items enable row level security;
drop policy if exists "Item planner: lihat milik sendiri" on public.planner_items;
drop policy if exists "Item planner: tambah milik sendiri" on public.planner_items;
drop policy if exists "Item planner: ubah milik sendiri" on public.planner_items;
drop policy if exists "Item planner: hapus milik sendiri" on public.planner_items;
create policy "Item planner: lihat milik sendiri" on public.planner_items for select to authenticated using (auth.uid() = user_id);
create policy "Item planner: tambah milik sendiri" on public.planner_items for insert to authenticated with check (auth.uid() = user_id);
create policy "Item planner: ubah milik sendiri" on public.planner_items for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Item planner: hapus milik sendiri" on public.planner_items for delete to authenticated using (auth.uid() = user_id);
revoke all on public.planner_items from anon;
create index if not exists planner_payments_user on public.planner_payments (user_id);
alter table public.planner_payments enable row level security;
drop policy if exists "Pembayaran planner: lihat milik sendiri" on public.planner_payments;
drop policy if exists "Pembayaran planner: tambah milik sendiri" on public.planner_payments;
drop policy if exists "Pembayaran planner: ubah milik sendiri" on public.planner_payments;
drop policy if exists "Pembayaran planner: hapus milik sendiri" on public.planner_payments;
create policy "Pembayaran planner: lihat milik sendiri" on public.planner_payments for select to authenticated using (auth.uid() = user_id);
create policy "Pembayaran planner: tambah milik sendiri" on public.planner_payments for insert to authenticated with check (auth.uid() = user_id);
create policy "Pembayaran planner: ubah milik sendiri" on public.planner_payments for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Pembayaran planner: hapus milik sendiri" on public.planner_payments for delete to authenticated using (auth.uid() = user_id);
revoke all on public.planner_payments from anon;
create index if not exists planner_guests_user on public.planner_guests (user_id);
alter table public.planner_guests enable row level security;
drop policy if exists "Tamu planner: lihat milik sendiri" on public.planner_guests;
drop policy if exists "Tamu planner: tambah milik sendiri" on public.planner_guests;
drop policy if exists "Tamu planner: ubah milik sendiri" on public.planner_guests;
drop policy if exists "Tamu planner: hapus milik sendiri" on public.planner_guests;
create policy "Tamu planner: lihat milik sendiri" on public.planner_guests for select to authenticated using (auth.uid() = user_id);
create policy "Tamu planner: tambah milik sendiri" on public.planner_guests for insert to authenticated with check (auth.uid() = user_id);
create policy "Tamu planner: ubah milik sendiri" on public.planner_guests for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Tamu planner: hapus milik sendiri" on public.planner_guests for delete to authenticated using (auth.uid() = user_id);
revoke all on public.planner_guests from anon;
create index if not exists planner_todos_user on public.planner_todos (user_id);
alter table public.planner_todos enable row level security;
drop policy if exists "Tugas planner: lihat milik sendiri" on public.planner_todos;
drop policy if exists "Tugas planner: tambah milik sendiri" on public.planner_todos;
drop policy if exists "Tugas planner: ubah milik sendiri" on public.planner_todos;
drop policy if exists "Tugas planner: hapus milik sendiri" on public.planner_todos;
create policy "Tugas planner: lihat milik sendiri" on public.planner_todos for select to authenticated using (auth.uid() = user_id);
create policy "Tugas planner: tambah milik sendiri" on public.planner_todos for insert to authenticated with check (auth.uid() = user_id);
create policy "Tugas planner: ubah milik sendiri" on public.planner_todos for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Tugas planner: hapus milik sendiri" on public.planner_todos for delete to authenticated using (auth.uid() = user_id);
revoke all on public.planner_todos from anon;
create index if not exists planner_items_event on public.planner_items (event_id);
create index if not exists planner_payments_event on public.planner_payments (event_id);
create index if not exists planner_payments_item on public.planner_payments (item_id);
create index if not exists planner_guests_event on public.planner_guests (event_id);
create index if not exists planner_todos_event on public.planner_todos (event_id);
