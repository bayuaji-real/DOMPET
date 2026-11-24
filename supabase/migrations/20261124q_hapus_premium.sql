-- Paket Premium dihapus (keputusan Owner 24 Nov): hanya Gratis dan Pro.
-- 1. Akun Premium lama (jika ada) dilebur ke Pro dengan masa berlaku yang sama.
update public.user_subscriptions set plan = 'pro' where plan = 'premium';
update public.user_subscriptions set trial_plan = 'pro' where trial_plan = 'premium';

-- 2. Uji coba hanya untuk Pro. Paket lain ditolak di database, bukan hanya di tampilan.
create or replace function public.start_trial(p_plan text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s public.user_subscriptions%rowtype;
begin
  if uid is null then raise exception 'BELUM_LOGIN'; end if;
  if p_plan <> 'pro' then raise exception 'PAKET_TIDAK_DIKENAL'; end if;
  perform public.get_my_entitlement();
  select * into s from public.user_subscriptions where user_id = uid for update;
  if s.plan <> 'free' and (s.plan_expires_at is null or s.plan_expires_at > now()) then raise exception 'SUDAH_BERLANGGANAN'; end if;
  if s.trial_plan is not null and s.trial_ends_at is not null and s.trial_ends_at > now() then raise exception 'UJICOBA_MASIH_BERJALAN'; end if;
  if s.trial_pro_used_at is not null then raise exception 'UJICOBA_SUDAH_DIPAKAI'; end if;
  update public.user_subscriptions set
    trial_plan = 'pro',
    trial_ends_at = now() + interval '7 days',
    trial_pro_used_at = now(),
    updated_at = now()
  where user_id = uid;
  return public.get_my_entitlement();
end $$;
revoke all on function public.start_trial(text) from public, anon;
grant execute on function public.start_trial(text) to authenticated;

-- 3. Admin hanya bisa memberi Gratis atau Pro.
create or replace function public.admin_set_plan(p_user uuid, p_plan text, p_days integer default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  if p_plan not in ('free','pro') then raise exception 'PAKET_TIDAK_DIKENAL'; end if;
  if p_days is not null and (p_days < 1 or p_days > 3650) then raise exception 'HARI_TIDAK_VALID'; end if;
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'USER_TIDAK_ADA'; end if;
  insert into public.user_subscriptions (user_id, plan, plan_expires_at)
  values (p_user, p_plan, case when p_plan = 'free' or p_days is null then null else now() + make_interval(days => p_days) end)
  on conflict (user_id) do update set plan = excluded.plan, plan_expires_at = excluded.plan_expires_at, updated_at = now();
  perform public._audit('set_plan', p_user, p_plan || coalesce(' ' || p_days || ' hari', ' tanpa batas'));
end $$;
