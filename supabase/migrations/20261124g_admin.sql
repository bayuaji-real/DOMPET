-- Superadmin / admin: kelola pengguna dan paket, lihat permintaan langganan, isi data Info Pasar resmi.
-- Semua pengecekan hak akses ada di SERVER (fungsi di bawah), bukan hanya di tampilan. Mas Joko + Pak Slamet.

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('superadmin','admin')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor uuid references auth.users(id) on delete set null,
  action text not null,
  target uuid,
  detail text,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

create or replace function public.my_admin_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.app_admins where user_id = auth.uid();
$$;

create or replace function public._require_admin(need_super boolean default false) returns void
language plpgsql stable security definer set search_path = public as $$
declare r text;
begin
  if auth.uid() is null then raise exception 'BELUM_LOGIN'; end if;
  select role into r from public.app_admins where user_id = auth.uid();
  if r is null or (need_super and r <> 'superadmin') then raise exception 'BUKAN_ADMIN'; end if;
end $$;

create or replace function public._audit(p_action text, p_target uuid, p_detail text) returns void
language sql security definer set search_path = public as $$
  insert into public.admin_audit_log (actor, action, target, detail) values (auth.uid(), p_action, p_target, left(p_detail, 300));
$$;

create or replace function public.admin_list_users() returns table (
  user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, admin_role text,
  plan text, source text, plan_expires_at timestamptz, trial_ends_at timestamptz, ai_used integer)
language plpgsql stable security definer set search_path = public, auth as $$
declare month_start timestamptz := date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
begin
  perform public._require_admin();
  return query
  select u.id, u.email::text, u.created_at, u.last_sign_in_at, a.role,
    case when s.plan is not null and s.plan <> 'free' and (s.plan_expires_at is null or s.plan_expires_at > now()) then s.plan
         when s.trial_plan is not null and s.trial_ends_at > now() then s.trial_plan else 'free' end,
    case when s.plan is not null and s.plan <> 'free' and (s.plan_expires_at is null or s.plan_expires_at > now()) then 'paid'
         when s.trial_plan is not null and s.trial_ends_at > now() then 'trial' else 'free' end,
    s.plan_expires_at, s.trial_ends_at,
    (select count(*)::int from public.ai_usage_logs l where l.user_id = u.id and l.created_at >= month_start)
  from auth.users u
  left join public.user_subscriptions s on s.user_id = u.id
  left join public.app_admins a on a.user_id = u.id
  order by u.created_at desc;
end $$;

create or replace function public.admin_set_plan(p_user uuid, p_plan text, p_days integer default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  if p_plan not in ('free','premium','pro') then raise exception 'PAKET_TIDAK_DIKENAL'; end if;
  if p_days is not null and (p_days < 1 or p_days > 3650) then raise exception 'HARI_TIDAK_VALID'; end if;
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'USER_TIDAK_ADA'; end if;
  insert into public.user_subscriptions (user_id, plan, plan_expires_at)
  values (p_user, p_plan, case when p_plan = 'free' or p_days is null then null else now() + make_interval(days => p_days) end)
  on conflict (user_id) do update set plan = excluded.plan, plan_expires_at = excluded.plan_expires_at, updated_at = now();
  perform public._audit('set_plan', p_user, p_plan || coalesce(' ' || p_days || ' hari', ' tanpa batas'));
end $$;

create or replace function public.admin_set_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin(true);
  if p_role not in ('admin','superadmin','none') then raise exception 'PERAN_TIDAK_DIKENAL'; end if;
  if p_user = auth.uid() then raise exception 'TIDAK_BISA_UBAH_DIRI_SENDIRI'; end if;
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'USER_TIDAK_ADA'; end if;
  if p_role = 'none' then delete from public.app_admins where user_id = p_user;
  else insert into public.app_admins (user_id, role, created_by) values (p_user, p_role, auth.uid())
    on conflict (user_id) do update set role = excluded.role; end if;
  perform public._audit('set_role', p_user, p_role);
end $$;

create or replace function public.admin_list_requests() returns table (
  id uuid, user_id uuid, email text, plan text, note text, status text, created_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public._require_admin();
  return query select r.id, r.user_id, u.email::text, r.plan, r.note, r.status, r.created_at
    from public.subscription_requests r join auth.users u on u.id = r.user_id order by r.created_at desc limit 200;
end $$;

create or replace function public.admin_resolve_request(p_id uuid, p_status text, p_days integer default 30) returns void
language plpgsql security definer set search_path = public as $$
declare r public.subscription_requests%rowtype;
begin
  perform public._require_admin();
  if p_status not in ('diproses','aktif','ditolak') then raise exception 'STATUS_TIDAK_VALID'; end if;
  select * into r from public.subscription_requests where id = p_id for update;
  if not found then raise exception 'PERMINTAAN_TIDAK_ADA'; end if;
  if p_status = 'aktif' then perform public.admin_set_plan(r.user_id, r.plan, p_days); end if;
  update public.subscription_requests set status = p_status where id = p_id;
  perform public._audit('resolve_request', r.user_id, p_status);
end $$;

create or replace function public.admin_upsert_market(p_id uuid, p_name text, p_category text, p_risk text,
  p_ret_1m numeric, p_ret_ytd numeric, p_ret_1y numeric, p_aum numeric, p_as_of date, p_source_url text) returns uuid
language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  perform public._require_admin();
  if p_source_url is null or p_source_url !~ '^https://' then raise exception 'SUMBER_WAJIB_HTTPS'; end if;
  if p_as_of is null or p_as_of > current_date then raise exception 'TANGGAL_TIDAK_VALID'; end if;
  if p_id is null then
    insert into public.market_snapshots (name, category, risk, ret_1m, ret_ytd, ret_1y, aum, as_of, source_url)
    values (trim(p_name), p_category, p_risk, p_ret_1m, p_ret_ytd, p_ret_1y, p_aum, p_as_of, p_source_url) returning id into rid;
  else
    update public.market_snapshots set name = trim(p_name), category = p_category, risk = p_risk, ret_1m = p_ret_1m,
      ret_ytd = p_ret_ytd, ret_1y = p_ret_1y, aum = p_aum, as_of = p_as_of, source_url = p_source_url where id = p_id returning id into rid;
    if rid is null then raise exception 'DATA_TIDAK_ADA'; end if;
  end if;
  perform public._audit('upsert_market', null, trim(p_name));
  return rid;
end $$;

create or replace function public.admin_delete_market(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  delete from public.market_snapshots where id = p_id;
  perform public._audit('delete_market', null, p_id::text);
end $$;

create or replace function public.admin_list_audit() returns table (id bigint, actor_email text, action text, target_email text, detail text, created_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public._require_admin();
  return query select l.id, a.email::text, l.action, t.email::text, l.detail, l.created_at
    from public.admin_audit_log l left join auth.users a on a.id = l.actor left join auth.users t on t.id = l.target
    order by l.id desc limit 100;
end $$;

revoke all on function public.my_admin_role(), public._require_admin(boolean), public._audit(text, uuid, text),
  public.admin_list_users(), public.admin_set_plan(uuid, text, integer), public.admin_set_role(uuid, text),
  public.admin_list_requests(), public.admin_resolve_request(uuid, text, integer),
  public.admin_upsert_market(uuid, text, text, text, numeric, numeric, numeric, numeric, date, text),
  public.admin_delete_market(uuid), public.admin_list_audit() from public, anon, authenticated;
grant execute on function public.my_admin_role(), public.admin_list_users(), public.admin_set_plan(uuid, text, integer),
  public.admin_set_role(uuid, text), public.admin_list_requests(), public.admin_resolve_request(uuid, text, integer),
  public.admin_upsert_market(uuid, text, text, text, numeric, numeric, numeric, numeric, date, text),
  public.admin_delete_market(uuid), public.admin_list_audit() to authenticated;
