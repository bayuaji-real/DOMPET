-- Bagikan planner ke pasangan lewat kode undangan. Anggota boleh melihat dan mengisi, hanya pemilik yang boleh menghapus planner.
alter table public.planner_events add column if not exists invite_code text unique;
create table if not exists public.planner_members (
  event_id uuid not null references public.planner_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index if not exists planner_members_user on public.planner_members (user_id);
alter table public.planner_members enable row level security;
revoke all on public.planner_members from anon, authenticated;
grant select, delete on public.planner_members to authenticated;

create or replace function public.planner_is_owner(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.planner_events where id = eid and user_id = auth.uid());
$$;
create or replace function public.planner_can_access(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.planner_events where id = eid and user_id = auth.uid())
      or exists (select 1 from public.planner_members where event_id = eid and user_id = auth.uid());
$$;
revoke all on function public.planner_is_owner(uuid), public.planner_can_access(uuid) from public, anon;
grant execute on function public.planner_is_owner(uuid), public.planner_can_access(uuid) to authenticated;

drop policy if exists planner_members_select on public.planner_members;
drop policy if exists planner_members_delete on public.planner_members;
create policy planner_members_select on public.planner_members for select to authenticated using (user_id = auth.uid() or public.planner_is_owner(event_id));
create policy planner_members_delete on public.planner_members for delete to authenticated using (user_id = auth.uid() or public.planner_is_owner(event_id));

-- Acara: pemilik dan anggota boleh melihat/ubah; hanya pemilik menghapus.
drop policy if exists "Acara: lihat milik sendiri" on public.planner_events;
drop policy if exists "Acara: ubah milik sendiri" on public.planner_events;
create policy "Acara: lihat milik sendiri atau bersama" on public.planner_events for select to authenticated using (user_id = auth.uid() or public.planner_can_access(id));
create policy "Acara: ubah milik sendiri atau bersama" on public.planner_events for update to authenticated using (user_id = auth.uid() or public.planner_can_access(id)) with check (public.planner_can_access(id) and user_id = (select e.user_id from public.planner_events e where e.id = planner_events.id));

do $$
declare t text; lbl text;
begin
  for t, lbl in select * from (values ('planner_items','Item planner'),('planner_payments','Pembayaran planner'),('planner_guests','Tamu planner'),('planner_todos','Tugas planner')) v(a,b) loop
    execute format('drop policy if exists %I on public.%I', lbl||': lihat milik sendiri', t);
    execute format('drop policy if exists %I on public.%I', lbl||': tambah milik sendiri', t);
    execute format('drop policy if exists %I on public.%I', lbl||': ubah milik sendiri', t);
    execute format('drop policy if exists %I on public.%I', lbl||': hapus milik sendiri', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.planner_can_access(event_id))', lbl||': lihat bersama', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (auth.uid() = user_id and public.planner_can_access(event_id))', lbl||': tambah bersama', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.planner_can_access(event_id)) with check (public.planner_can_access(event_id))', lbl||': ubah bersama', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.planner_can_access(event_id))', lbl||': hapus bersama', t);
  end loop;
end $$;

create or replace function public.planner_create_invite(p_event uuid) returns text
language plpgsql security definer set search_path = public as $$
declare code text; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if auth.uid() is null then raise exception 'BELUM_LOGIN'; end if;
  if not public.planner_is_owner(p_event) then raise exception 'BUKAN_PEMILIK'; end if;
  select invite_code into code from public.planner_events where id = p_event;
  if code is not null then return code; end if;
  loop
    code := '';
    for i in 1..8 loop code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.planner_events where invite_code = code);
  end loop;
  update public.planner_events set invite_code = code where id = p_event;
  return code;
end $$;

create or replace function public.planner_join(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare e public.planner_events%rowtype;
begin
  if auth.uid() is null then raise exception 'BELUM_LOGIN'; end if;
  select * into e from public.planner_events where invite_code = upper(trim(p_code));
  if not found then raise exception 'KODE_TIDAK_DITEMUKAN'; end if;
  if (select count(*) from public.planner_members where event_id = e.id) >= 5 then raise exception 'ANGGOTA_PENUH'; end if;
  if e.user_id <> auth.uid() then insert into public.planner_members (event_id, user_id) values (e.id, auth.uid()) on conflict do nothing; end if;
  return e.id;
end $$;

create or replace function public.planner_reset_invite(p_event uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.planner_is_owner(p_event) then raise exception 'BUKAN_PEMILIK'; end if;
  update public.planner_events set invite_code = null where id = p_event;
end $$;
revoke all on function public.planner_create_invite(uuid), public.planner_join(text), public.planner_reset_invite(uuid) from public, anon;
grant execute on function public.planner_create_invite(uuid), public.planner_join(text), public.planner_reset_invite(uuid) to authenticated;
