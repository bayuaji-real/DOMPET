-- Riwayat chat dan memori Ruby. Pak Slamet (Database), 26 Nov 2026 (SETUJU Owner #1).
-- Riwayat mentah hanya untuk tampilan; ke AI hanya dikirim memori ringkas + pesan terakhir.
-- Rollback: drop table public.ruby_messages, public.ruby_threads, public.ruby_memory cascade;

create table if not exists public.ruby_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mode text not null check (mode in ('savings', 'advisor', 'plan')),
  title text check (title is null or char_length(title) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ruby_threads_user_mode on public.ruby_threads (user_id, mode, updated_at desc);

create table if not exists public.ruby_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ruby_threads(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'model')),
  text text not null check (char_length(text) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists ruby_messages_thread_time on public.ruby_messages (thread_id, created_at);
create index if not exists ruby_messages_user_time on public.ruby_messages (user_id, created_at desc);

-- Satu baris memori per pengguna. facts = daftar {key, value, said_at}; hanya yang diucapkan pengguna.
create table if not exists public.ruby_memory (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  summary text not null default '' check (char_length(summary) <= 2000),
  facts jsonb not null default '[]'::jsonb check (jsonb_typeof(facts) = 'array' and jsonb_array_length(facts) <= 50),
  summarized_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.ruby_threads enable row level security;
alter table public.ruby_messages enable row level security;
alter table public.ruby_memory enable row level security;

create policy "Thread milik sendiri: lihat" on public.ruby_threads for select to authenticated using (auth.uid() = user_id);
create policy "Thread milik sendiri: tambah" on public.ruby_threads for insert to authenticated with check (auth.uid() = user_id);
create policy "Thread milik sendiri: ubah" on public.ruby_threads for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Thread milik sendiri: hapus" on public.ruby_threads for delete to authenticated using (auth.uid() = user_id);

-- Pesan hanya boleh masuk ke thread milik sendiri. Tidak ada update (riwayat tidak bisa diedit).
create policy "Pesan milik sendiri: lihat" on public.ruby_messages for select to authenticated using (auth.uid() = user_id);
create policy "Pesan milik sendiri: tambah" on public.ruby_messages for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.ruby_threads t where t.id = thread_id and t.user_id = auth.uid()));
create policy "Pesan milik sendiri: hapus" on public.ruby_messages for delete to authenticated using (auth.uid() = user_id);

create policy "Memori milik sendiri: lihat" on public.ruby_memory for select to authenticated using (auth.uid() = user_id);
create policy "Memori milik sendiri: tambah" on public.ruby_memory for insert to authenticated with check (auth.uid() = user_id);
create policy "Memori milik sendiri: ubah" on public.ruby_memory for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Memori milik sendiri: hapus" on public.ruby_memory for delete to authenticated using (auth.uid() = user_id);

-- Hak tabel: anon tidak boleh menyentuh sama sekali.
revoke all on public.ruby_threads, public.ruby_messages, public.ruby_memory from anon, public;
grant select, insert, update, delete on public.ruby_threads to authenticated;
grant select, insert, delete on public.ruby_messages to authenticated;
grant select, insert, update, delete on public.ruby_memory to authenticated;
