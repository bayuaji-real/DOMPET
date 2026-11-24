-- Dashboard pemakaian API AI + peringatan saldo hampir habis (hanya admin lewat fungsi). Mas Joko + Pak Slamet.
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

create or replace function public.admin_set_api_budget(p_budget numeric, p_since timestamptz, p_warn integer default 70) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin(true);
  if p_budget is null or p_budget < 0 or p_budget > 100000000000 then raise exception 'ANGGARAN_TIDAK_VALID'; end if;
  if p_since is null or p_since > now() then raise exception 'TANGGAL_TIDAK_VALID'; end if;
  if p_warn < 10 or p_warn > 95 then raise exception 'AMBANG_TIDAK_VALID'; end if;
  insert into public.app_settings (key, value) values ('api_budget', jsonb_build_object('budget_idr', p_budget, 'since', p_since, 'warn_pct', p_warn))
  on conflict (key) do update set value = excluded.value, updated_at = now();
  perform public._audit('set_api_budget', null, p_budget::text || ' sejak ' || p_since::date::text);
end $$;

create or replace function public.admin_api_usage() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  cfg jsonb; budget numeric := 0; since timestamptz := date_trunc('month', now()); warn int := 70;
  month_start timestamptz := date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
  spent numeric; month_spent numeric; today_spent numeric; calls_month int; avg7 numeric; remaining numeric; pct numeric; lvl text; days_left numeric;
begin
  perform public._require_admin();
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

revoke all on function public.admin_set_api_budget(numeric, timestamptz, integer), public.admin_api_usage() from public, anon, authenticated;
grant execute on function public.admin_set_api_budget(numeric, timestamptz, integer), public.admin_api_usage() to authenticated;
