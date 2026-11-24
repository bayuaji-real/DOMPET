-- 24 Nov 2026 (Pak Harjo, Security + Mas Tarno, QA Backend). SETUJU Owner.
-- 1) RLS: auth.uid()/role()/jwt() dibungkus (select ...) supaya dihitung sekali per query, bukan per baris.
--    Artinya SAMA persis, hanya lebih cepat. Dikerjakan otomatis untuk semua policy di skema public.
-- 2) Indeks untuk foreign key yang belum punya indeks penutup.
-- 3) Kode undangan memakai angka acak kriptografis (gen_random_uuid), bukan random().
-- Rollback 1: policy lama ada di migrasi sebelumnya. Rollback 2: DROP INDEX idx_<tabel>_<fk>. Rollback 3: pakai fungsi lama di 20261124e dan 20261124i.

-- 1) RLS initplan
do $$
declare r record; q text; w text; stmt text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check from pg_policies
    where schemaname = 'public' and (qual ~ 'auth\.(uid|role|jwt)\(\)' or with_check ~ 'auth\.(uid|role|jwt)\(\)')
  loop
    q := case when r.qual is null then null else regexp_replace(r.qual, '(?<!SELECT )auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'g') end;
    w := case when r.with_check is null then null else regexp_replace(r.with_check, '(?<!SELECT )auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'g') end;
    if q is not distinct from r.qual and w is not distinct from r.with_check then continue; end if;
    stmt := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    if q is not null then stmt := stmt || format(' using (%s)', q); end if;
    if w is not null then stmt := stmt || format(' with check (%s)', w); end if;
    execute stmt;
  end loop;
end $$;

-- 2) Indeks foreign key
do $$
declare r record; cols text; idx text; n int;
begin
  for r in
    select c.conrelid, c.conname, c.conkey from pg_constraint c join pg_namespace ns on ns.oid = c.connamespace
    where c.contype = 'f' and ns.nspname = 'public'
  loop
    n := array_length(r.conkey, 1);
    if exists (select 1 from pg_index i where i.indrelid = r.conrelid and (i.indkey::int2[])[0:n-1] @> r.conkey) then continue; end if;
    select string_agg(quote_ident(a.attname), ', ' order by k.ord) into cols
      from unnest(r.conkey) with ordinality k(attnum, ord) join pg_attribute a on a.attrelid = r.conrelid and a.attnum = k.attnum;
    idx := left('idx_' || (select relname from pg_class where oid = r.conrelid) || '_' || r.conname, 63);
    execute format('create index if not exists %I on %s (%s)', idx, r.conrelid::regclass, cols);
  end loop;
end $$;

-- 3) Kode undangan acak kriptografis. Byte 0-5 dan 9-10 dari UUID v4 acak penuh; 256 dibagi 32 habis, jadi tanpa bias.
create or replace function public.gen_invite_code() returns text
language plpgsql volatile set search_path = public as $$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; b bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex'); code text := ''; p int;
begin
  foreach p in array array[0,1,2,3,4,5,9,10] loop code := code || substr(alphabet, 1 + (get_byte(b, p) % 32), 1); end loop;
  return code;
end $$;
revoke all on function public.gen_invite_code() from public, anon, authenticated;

create or replace function public.create_shared_group(p_name text, p_display text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); gid uuid; code text;
begin
  if uid is null then raise exception 'BELUM_LOGIN'; end if;
  if (select count(*) from public.shared_groups where owner_id = uid) >= 10 then raise exception 'GRUP_TERLALU_BANYAK'; end if;
  loop
    code := public.gen_invite_code();
    exit when not exists (select 1 from public.shared_groups where invite_code = code);
  end loop;
  insert into public.shared_groups (name, owner_id, invite_code) values (trim(p_name), uid, code) returning id into gid;
  insert into public.shared_members (group_id, user_id, display_name) values (gid, uid, trim(p_display));
  return jsonb_build_object('id', gid, 'invite_code', code);
end $$;

create or replace function public.planner_create_invite(p_event uuid) returns text
language plpgsql security definer set search_path = public as $$
declare code text;
begin
  if auth.uid() is null then raise exception 'BELUM_LOGIN'; end if;
  if not public.planner_is_owner(p_event) then raise exception 'BUKAN_PEMILIK'; end if;
  select invite_code into code from public.planner_events where id = p_event;
  if code is not null then return code; end if;
  loop
    code := public.gen_invite_code();
    exit when not exists (select 1 from public.planner_events where invite_code = code);
  end loop;
  update public.planner_events set invite_code = code where id = p_event;
  return code;
end $$;
