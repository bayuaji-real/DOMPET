-- Migrasi: Akses Admin ke Laporan Pelanggan (Pusat Bantuan)
-- Dibuat 26 Nov 2026

create or replace function public.admin_list_help_reports() returns table (
  id uuid,
  user_id uuid,
  email text,
  kind text,
  title text,
  body text,
  page text,
  status text,
  image_path text,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public._require_admin();
  return query
  select r.id, r.user_id, u.email::text, r.kind, r.title, r.body, r.page, r.status, r.image_path, r.created_at
  from public.help_reports r
  left join auth.users u on u.id = r.user_id
  order by r.created_at desc
  limit 200;
end $$;

create or replace function public.admin_update_help_report_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  if p_status not in ('baru', 'dibaca', 'dikerjakan', 'selesai') then
    raise exception 'STATUS_TIDAK_VALID';
  end if;
  update public.help_reports set status = p_status where id = p_id;
  perform public._audit('update_help_report', null, p_id::text || ' -> ' || p_status);
end $$;

revoke all on function public.admin_list_help_reports() from public, anon;
revoke all on function public.admin_update_help_report_status(uuid, text) from public, anon;
grant execute on function public.admin_list_help_reports() to authenticated;
grant execute on function public.admin_update_help_report_status(uuid, text) to authenticated;
