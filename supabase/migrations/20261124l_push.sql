-- Notifikasi push + peringatan otomatis.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push milik sendiri" on public.push_subscriptions;
create policy "push milik sendiri" on public.push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.push_subscriptions from anon;

-- Catatan pengiriman supaya peringatan yang sama tidak dikirim berulang. Hanya diakses server (service role).
create table if not exists public.push_log (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  kind text not null,
  dedupe_key text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, kind, dedupe_key)
);
alter table public.push_log enable row level security;
revoke all on public.push_log from anon, authenticated;

-- Hitung pemakaian API tanpa cek admin (dipakai server terjadwal dan admin_api_usage).
create or replace function public.api_usage_core()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare
  cfg jsonb; budget numeric := 0; since timestamptz := date_trunc('month', now()); warn int := 70;
  month_start timestamptz := date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
  spent numeric; month_spent numeric; today_spent numeric; calls_month int; avg7 numeric; remaining numeric; pct numeric; lvl text; days_left numeric;
begin
  select value into cfg from public.app_settings where key = 'api_budget';
  if cfg is not null then budget := (cfg->>'budget_idr')::numeric; since := (cfg->>'since')::timestamptz; warn := (cfg->>'warn_pct')::int; end if;
  select coalesce(sum(cost_idr),0) into spent from public.ai_usage_logs where created_at >= since;
  select coalesce(sum(cost_idr),0), count(*) into month_spent, calls_month from public.ai_usage_logs where created_at >= month_start;
  select coalesce(sum(cost_idr),0) into today_spent from public.ai_usage_logs where created_at >= date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
  select coalesce(sum(cost_idr),0) / 7 into avg7 from public.ai_usage_logs where created_at >= now() - interval '7 days';
  remaining := budget - spent;
  pct := case when budget > 0 then round(spent / budget * 100, 1) else null end;
  lvl := case when cfg is null then 'belum_diatur' when pct >= 100 then 'habis' when pct >= 90 then 'kritis' when pct >= warn then 'waspada' else 'aman' end;
  days_left := case when cfg is not null and avg7 > 0 and remaining > 0 then floor(remaining / avg7) else null end;
  return jsonb_build_object(
    'configured', cfg is not null, 'budget_idr', budget, 'since', since, 'warn_pct', warn,
    'spent_idr', round(spent, 2), 'remaining_idr', round(remaining, 2), 'used_pct', pct, 'level', lvl,
    'days_left', days_left, 'avg_daily_idr', round(avg7, 2),
    'month_spent_idr', round(month_spent, 2), 'today_spent_idr', round(today_spent, 2), 'calls_month', calls_month,
    'by_feature', coalesce((select jsonb_agg(jsonb_build_object('feature', f, 'calls', c, 'cost_idr', round(s, 2)) order by s desc)
        from (select feature f, count(*) c, coalesce(sum(cost_idr),0) s from public.ai_usage_logs where created_at >= month_start group by feature) x), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'calls', c, 'cost_idr', round(s, 2)) order by d)
        from (select (created_at at time zone 'Asia/Jakarta')::date d, count(*) c, coalesce(sum(cost_idr),0) s from public.ai_usage_logs
              where created_at >= now() - interval '30 days' group by 1) y), '[]'::jsonb)
  );
end $$;
revoke all on function public.api_usage_core() from public, anon, authenticated;

create or replace function public.admin_api_usage()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform public._require_admin();
  return public.api_usage_core();
end $$;

-- Data untuk server terjadwal: pemakaian API + daftar admin. Hanya service role.
create or replace function public.cron_alert_data()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
begin
  return jsonb_build_object('usage', public.api_usage_core(), 'admins', coalesce((select jsonb_agg(user_id) from public.app_admins), '[]'::jsonb));
end $$;
revoke all on function public.cron_alert_data() from public, anon, authenticated;
grant execute on function public.cron_alert_data() to service_role;
