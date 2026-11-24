-- MFA (kode dari aplikasi authenticator) untuk admin. Wajib hanya setelah superadmin menyalakan sakelarnya.
create or replace function public._require_admin(need_super boolean default false)
returns void language plpgsql stable security definer set search_path to 'public' as $$
declare r text; must boolean;
begin
  if auth.uid() is null then raise exception 'BELUM_LOGIN'; end if;
  select role into r from public.app_admins where user_id = auth.uid();
  if r is null or (need_super and r <> 'superadmin') then raise exception 'BUKAN_ADMIN'; end if;
  select coalesce((value->>'on')::boolean, false) into must from public.app_settings where key = 'require_admin_mfa';
  if coalesce(must, false) and coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then raise exception 'MFA_WAJIB'; end if;
end $$;

-- Status untuk layar: peran, apakah MFA diwajibkan, dan level sesi saat ini. Tanpa cek MFA supaya layar bisa meminta kode.
create or replace function public.admin_mfa_status()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object(
    'role', (select role from public.app_admins where user_id = auth.uid()),
    'require_mfa', coalesce((select (value->>'on')::boolean from public.app_settings where key = 'require_admin_mfa'), false),
    'aal', coalesce(auth.jwt()->>'aal', 'aal1'));
$$;

-- Hanya superadmin; menyalakan hanya bila sesinya sendiri sudah lolos kode (aal2), supaya tidak terkunci.
create or replace function public.admin_set_require_mfa(p_on boolean)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  perform public._require_admin(true);
  if p_on and coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then raise exception 'MFA_BELUM_AKTIF'; end if;
  insert into public.app_settings (key, value) values ('require_admin_mfa', jsonb_build_object('on', p_on))
  on conflict (key) do update set value = excluded.value, updated_at = now();
  perform public._audit('set_require_mfa', null, p_on::text);
end $$;
revoke all on function public.admin_mfa_status() from public, anon;
revoke all on function public.admin_set_require_mfa(boolean) from public, anon;
grant execute on function public.admin_mfa_status() to authenticated;
grant execute on function public.admin_set_require_mfa(boolean) to authenticated;
