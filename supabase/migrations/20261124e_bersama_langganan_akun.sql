-- Dompet Bersama (grup patungan), permintaan berlangganan, hapus akun. Pak Slamet (Database).
-- Tidak menyentuh tabel transaksi/dompet pengguna.

create table if not exists public.shared_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists public.shared_members (
  group_id uuid not null references public.shared_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create table if not exists public.shared_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.shared_groups(id) on delete cascade,
  paid_by uuid not null references auth.users(id) on delete cascade,
  amount bigint not null check (amount > 0 and amount <= 100000000000),
  note text not null check (char_length(note) between 1 and 80),
  split_among uuid[] not null check (cardinality(split_among) between 1 and 30),
  date date not null default current_date,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.shared_payments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.shared_groups(id) on delete cascade,
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  amount bigint not null check (amount > 0 and amount <= 100000000000),
  date date not null default current_date,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);
create index if not exists shared_members_user on public.shared_members(user_id);
create index if not exists shared_expenses_group on public.shared_expenses(group_id);
create index if not exists shared_payments_group on public.shared_payments(group_id);

create or replace function public.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shared_members where group_id = gid and user_id = auth.uid());
$$;
revoke all on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;

alter table public.shared_groups enable row level security;
alter table public.shared_members enable row level security;
alter table public.shared_expenses enable row level security;
alter table public.shared_payments enable row level security;

create policy shared_groups_select on public.shared_groups for select to authenticated using (public.is_group_member(id));
create policy shared_groups_update on public.shared_groups for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy shared_groups_delete on public.shared_groups for delete to authenticated using (owner_id = auth.uid());
create policy shared_members_select on public.shared_members for select to authenticated using (public.is_group_member(group_id));
create policy shared_members_leave on public.shared_members for delete to authenticated using (user_id = auth.uid());
create policy shared_expenses_select on public.shared_expenses for select to authenticated using (public.is_group_member(group_id));
create policy shared_expenses_insert on public.shared_expenses for insert to authenticated with check (
  created_by = auth.uid() and public.is_group_member(group_id)
  and exists (select 1 from public.shared_members m where m.group_id = shared_expenses.group_id and m.user_id = shared_expenses.paid_by)
  and not exists (select 1 from unnest(split_among) u where not exists (select 1 from public.shared_members m2 where m2.group_id = shared_expenses.group_id and m2.user_id = u)));
create policy shared_expenses_delete on public.shared_expenses for delete to authenticated using (created_by = auth.uid());
create policy shared_payments_select on public.shared_payments for select to authenticated using (public.is_group_member(group_id));
create policy shared_payments_insert on public.shared_payments for insert to authenticated with check (
  created_by = auth.uid() and public.is_group_member(group_id)
  and exists (select 1 from public.shared_members m where m.group_id = shared_payments.group_id and m.user_id = shared_payments.from_user)
  and exists (select 1 from public.shared_members m where m.group_id = shared_payments.group_id and m.user_id = shared_payments.to_user));
create policy shared_payments_delete on public.shared_payments for delete to authenticated using (created_by = auth.uid());

-- Pembuatan dan gabung grup hanya lewat fungsi (kode undangan 8 karakter).
create or replace function public.create_shared_group(p_name text, p_display text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); gid uuid; code text; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if uid is null then raise exception 'BELUM_LOGIN'; end if;
  if (select count(*) from public.shared_groups where owner_id = uid) >= 10 then raise exception 'GRUP_TERLALU_BANYAK'; end if;
  loop
    code := '';
    for i in 1..8 loop code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.shared_groups where invite_code = code);
  end loop;
  insert into public.shared_groups (name, owner_id, invite_code) values (trim(p_name), uid, code) returning id into gid;
  insert into public.shared_members (group_id, user_id, display_name) values (gid, uid, trim(p_display));
  return jsonb_build_object('id', gid, 'invite_code', code);
end $$;

create or replace function public.join_shared_group(p_code text, p_display text) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.shared_groups%rowtype;
begin
  if uid is null then raise exception 'BELUM_LOGIN'; end if;
  select * into g from public.shared_groups where invite_code = upper(trim(p_code));
  if not found then raise exception 'KODE_TIDAK_DITEMUKAN'; end if;
  if (select count(*) from public.shared_members where group_id = g.id) >= 30 then raise exception 'GRUP_PENUH'; end if;
  insert into public.shared_members (group_id, user_id, display_name) values (g.id, uid, trim(p_display)) on conflict do nothing;
  return g.id;
end $$;
revoke all on function public.create_shared_group(text, text), public.join_shared_group(text, text) from public, anon;
grant execute on function public.create_shared_group(text, text), public.join_shared_group(text, text) to authenticated;

-- Permintaan berlangganan (sampai ada pembayaran otomatis). Owner mengaktifkan paket lewat SQL.
create table if not exists public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan text not null check (plan in ('premium','pro')),
  note text check (note is null or char_length(note) <= 300),
  status text not null default 'baru' check (status in ('baru','diproses','aktif','ditolak')),
  created_at timestamptz not null default now()
);
alter table public.subscription_requests enable row level security;
create policy sub_req_select on public.subscription_requests for select to authenticated using (user_id = auth.uid());
create policy sub_req_insert on public.subscription_requests for insert to authenticated with check (user_id = auth.uid() and status = 'baru');
revoke update, delete on public.subscription_requests from anon, authenticated;

-- Hapus akun sendiri beserta semua datanya (semua tabel memakai ON DELETE CASCADE).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'BELUM_LOGIN'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
