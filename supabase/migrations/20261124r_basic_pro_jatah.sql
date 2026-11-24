-- Basic/Pro: jatah cicip fitur Ruby untuk Basic dan batas jumlah. Pak Slamet (Database).
-- Tanpa tabel baru: jatah dihitung dari ai_usage_logs. Hari dihitung WIB.

-- 1. Apakah pengguna sedang Pro (berbayar aktif atau uji coba aktif). Hanya dipanggil fungsi lain.
create or replace function public._is_pro(p_user uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.user_subscriptions s
    where s.user_id = p_user
      and ((s.plan = 'pro' and (s.plan_expires_at is null or s.plan_expires_at > now()))
        or (s.trial_plan = 'pro' and s.trial_ends_at is not null and s.trial_ends_at > now()))
  );
$$;
revoke all on function public._is_pro(uuid) from public, anon, authenticated;

-- 2. Jatah cicip Basic: {fitur: {limit, used, remaining, per}}
create or replace function public._cicip(p_user uuid) returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
        r jsonb := '{}'::jsonb; f text; lim int; per text; used int;
begin
  foreach f in array array['struk','suara','konsultasi','tabungan','insight','rencana','impor'] loop
    lim := case f when 'struk' then 2 when 'suara' then 2 when 'konsultasi' then 5 when 'tabungan' then 6 when 'rencana' then 6 else 1 end;  -- tabungan/rencana lewat chat berupa percakapan: 6 giliran = 1 sesi
    per := case when f in ('struk','suara') then 'hari' else 'akun' end;
    select count(*)::int into used from public.ai_usage_logs
      where user_id = p_user and feature = f and (per = 'akun' or created_at >= day_start);
    r := r || jsonb_build_object(f, jsonb_build_object('limit', lim, 'used', used, 'remaining', greatest(lim - used, 0), 'per', per));
  end loop;
  return r;
end $$;
revoke all on function public._cicip(uuid) from public, anon, authenticated;

-- 3. get_my_entitlement ditambah kunci 'cicip' (hanya terisi untuk Basic)
create or replace function public.get_my_entitlement() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.user_subscriptions%rowtype;
  eff text; src text; lim integer; used integer; month_start timestamptz;
begin
  if uid is null then raise exception 'BELUM_LOGIN'; end if;
  insert into public.user_subscriptions (user_id) values (uid) on conflict (user_id) do nothing;
  select * into s from public.user_subscriptions where user_id = uid;
  if s.plan <> 'free' and (s.plan_expires_at is null or s.plan_expires_at > now()) then
    eff := s.plan; src := 'paid';
  elsif s.trial_plan is not null and s.trial_ends_at is not null and s.trial_ends_at > now() then
    eff := s.trial_plan; src := 'trial';
  else
    eff := 'free'; src := 'free';
  end if;
  select ai_monthly_limit into lim from public.plan_limits where plan = eff;
  month_start := date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
  select count(*)::int into used from public.ai_usage_logs where user_id = uid and created_at >= month_start;
  return jsonb_build_object(
    'plan', eff,
    'source', src,
    'trial_ends_at', case when src = 'trial' then s.trial_ends_at else null end,
    'plan_expires_at', case when src = 'paid' then s.plan_expires_at else null end,
    'trial_available', jsonb_build_object('premium', false, 'pro', s.trial_pro_used_at is null),
    'ai_used', used,
    'ai_limit', coalesce(lim, 0),
    'ai_remaining', greatest(coalesce(lim, 0) - used, 0),
    'cicip', case when eff = 'free' then public._cicip(uid) else '{}'::jsonb end
  );
end $$;

-- 4. Batas jumlah untuk Basic (Pro tanpa batas). Data lama tidak dihapus, hanya penambahan baru yang dibatasi.
create or replace function public._batas_basic() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int; lim int; lbl text;
begin
  if public._is_pro(new.user_id) then return new; end if;
  if tg_table_name = 'savings_goals' then
    lim := 3; lbl := 'TABUNGAN'; select count(*) into n from public.savings_goals where user_id = new.user_id;
  elsif tg_table_name = 'recurring_transactions' then
    lim := 5; lbl := 'BERULANG'; select count(*) into n from public.recurring_transactions where user_id = new.user_id;
  elsif tg_table_name = 'planner_events' then
    lim := 1; lbl := 'PLANNER'; select count(*) into n from public.planner_events where user_id = new.user_id;
  else
    return new;
  end if;
  if n >= lim then raise exception 'BATAS_BASIC_%', lbl; end if;
  return new;
end $$;
revoke all on function public._batas_basic() from public, anon, authenticated;

drop trigger if exists batas_basic on public.savings_goals;
create trigger batas_basic before insert on public.savings_goals for each row execute function public._batas_basic();
drop trigger if exists batas_basic on public.recurring_transactions;
create trigger batas_basic before insert on public.recurring_transactions for each row execute function public._batas_basic();
drop trigger if exists batas_basic on public.planner_events;
create trigger batas_basic before insert on public.planner_events for each row execute function public._batas_basic();
