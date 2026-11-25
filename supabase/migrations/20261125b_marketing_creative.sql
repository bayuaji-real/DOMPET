-- Snapshot ekspor Creative Marketing Suite. Rentang yang sama diganti utuh saat impor ulang.
create table if not exists public.marketing_creative_snapshots (
  id bigint generated always as identity primary key,
  period_start date not null,
  period_end date not null,
  rows jsonb not null,
  row_count integer not null,
  imported_by uuid references auth.users(id) on delete set null,
  imported_at timestamptz not null default now(),
  unique (period_start, period_end),
  check (period_end >= period_start),
  check (jsonb_typeof(rows) = 'array'),
  check (row_count > 0 and row_count <= 10000)
);
alter table public.marketing_creative_snapshots enable row level security;
revoke all on public.marketing_creative_snapshots from anon, authenticated;

create or replace function public.admin_import_marketing_creative(
  p_start date, p_end date, p_rows jsonb
) returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform public._require_admin();
  if p_start is null or p_end is null or p_end < p_start or p_end - p_start > 366 then
    raise exception 'PERIODE_TIDAK_VALID';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'CSV_TIDAK_VALID'; end if;
  n := jsonb_array_length(p_rows);
  if n < 1 or n > 10000 then raise exception 'JUMLAH_BARIS_TIDAK_VALID'; end if;
  insert into public.marketing_creative_snapshots (period_start, period_end, rows, row_count, imported_by)
  values (p_start, p_end, p_rows, n, auth.uid())
  on conflict (period_start, period_end) do update
    set rows = excluded.rows, row_count = excluded.row_count,
        imported_by = excluded.imported_by, imported_at = now();
  perform public._audit('import_marketing_creative', null, p_start || ' – ' || p_end || ': ' || n || ' iklan');
  return n;
end $$;

create or replace function public.admin_latest_marketing_creative()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  perform public._require_admin();
  select jsonb_build_object('period_start', period_start, 'period_end', period_end,
    'row_count', row_count, 'imported_at', imported_at, 'rows', rows)
    into result from public.marketing_creative_snapshots
    order by period_end desc, imported_at desc limit 1;
  return result;
end $$;

revoke all on function public.admin_import_marketing_creative(date,date,jsonb) from public, anon;
revoke all on function public.admin_latest_marketing_creative() from public, anon;
grant execute on function public.admin_import_marketing_creative(date,date,jsonb) to authenticated;
grant execute on function public.admin_latest_marketing_creative() to authenticated;
