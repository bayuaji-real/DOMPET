-- Migrasi: Dashboard Admin Desktop Tahap 1 (Idempotent)
-- Berkas: 20261125c_admin_dashboard_t1.sql
-- Sasaran: Database STAGING (dompetku-staging)
-- Peran: Pak Slamet, Database

-- =========================================================================
-- 1. Kolom status di ai_usage_logs (jika belum ada)
-- =========================================================================
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ai_usage_logs' and column_name = 'status'
  ) then
    alter table public.ai_usage_logs
      add column status text not null default 'success'
      check (status in ('success', 'failed'));
  end if;
end $$;

-- =========================================================================
-- 2. Inisialisasi app_settings (ai_controls & usd_idr_rate)
-- =========================================================================
insert into public.app_settings (key, value)
values (
  'ai_controls',
  jsonb_build_object(
    'master_kill_switch', false,
    'basic_ai_disabled_at_100pct', true,
    'pro_hard_limit_enabled', false,
    'feature_toggles', jsonb_build_object(
      'struk', true,
      'suara', true,
      'konsultasi', true,
      'insight', true,
      'rencana', true,
      'impor', true,
      'tabungan', true
    )
  )
)
on conflict (key) do nothing;

insert into public.app_settings (key, value)
values ('usd_idr_rate', '16000'::jsonb)
on conflict (key) do nothing;

-- =========================================================================
-- 3. Fungsi pembaca runtime saklar AI untuk peladen (guardAi)
--    SECURITY DEFINER agar peladen (authenticated / service_role) bisa membaca
--    meskipun tabel app_settings tidak terbuka langsung.
-- =========================================================================
drop function if exists public.get_ai_runtime_guard();
create or replace function public.get_ai_runtime_guard()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  ctrl jsonb;
  bgt jsonb;
  usd jsonb;
  budget_val numeric := 0;
  spent_month numeric := 0;
  month_start timestamptz := date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
  exhausted boolean := false;
begin
  select value into ctrl from public.app_settings where key = 'ai_controls';
  if ctrl is null then
    ctrl := jsonb_build_object(
      'master_kill_switch', false,
      'basic_ai_disabled_at_100pct', true,
      'pro_hard_limit_enabled', false,
      'feature_toggles', jsonb_build_object(
        'struk', true, 'suara', true, 'konsultasi', true,
        'insight', true, 'rencana', true, 'impor', true, 'tabungan', true
      )
    );
  end if;

  select value into bgt from public.app_settings where key = 'api_budget';
  if bgt is not null then
    budget_val := coalesce((bgt->>'budget_idr')::numeric, 0);
  end if;

  if budget_val > 0 then
    select coalesce(sum(cost_idr), 0) into spent_month
    from public.ai_usage_logs
    where created_at >= month_start and status = 'success';

    if spent_month >= budget_val then
      exhausted := true;
    end if;
  end if;

  select value into usd from public.app_settings where key = 'usd_idr_rate';

  return jsonb_build_object(
    'master_kill_switch', coalesce((ctrl->>'master_kill_switch')::boolean, false),
    'basic_ai_disabled_at_100pct', coalesce((ctrl->>'basic_ai_disabled_at_100pct')::boolean, true),
    'pro_hard_limit_enabled', coalesce((ctrl->>'pro_hard_limit_enabled')::boolean, false),
    'feature_toggles', coalesce(ctrl->'feature_toggles', '{}'::jsonb),
    'budget_exhausted', exhausted,
    'spent_month_idr', round(spent_month, 2),
    'budget_idr', budget_val,
    'usd_idr_rate', coalesce(usd::numeric, 16000)
  );
end $$;

-- =========================================================================
-- 4. Fungsi admin_dashboard_summary(p_from, p_to)
--    Menghitung ringkasan KPI agregat untuk kartu Ringkasan.
-- =========================================================================
drop function if exists public.admin_dashboard_summary(timestamptz, timestamptz);
create or replace function public.admin_dashboard_summary(
  p_from timestamptz default null,
  p_to timestamptz default null
) returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare
  now_wib timestamptz := now() at time zone 'Asia/Jakarta';
  today_start timestamptz := date_trunc('day', now_wib) at time zone 'Asia/Jakarta';
  month_start timestamptz := date_trunc('month', now_wib) at time zone 'Asia/Jakarta';
  v_from timestamptz := coalesce(p_from, month_start);
  v_to timestamptz := coalesce(p_to, now());

  v_total_users bigint := 0;
  v_new_users_today bigint := 0;
  v_active_today bigint := 0;
  v_active_30d bigint := 0;

  v_cash_in_period numeric := 0;
  v_cash_in_month numeric := 0;

  v_ai_cost_period numeric := 0;
  v_ai_cost_month numeric := 0;

  v_pending_count bigint := 0;
  v_oldest_pending_minutes numeric := 0;

  bgt jsonb;
  v_budget_idr numeric := 0;
  v_warn_pct integer := 70;
  v_budget_used_pct numeric := null;
begin
  perform public._require_admin();

  -- Total pengguna terdaftar
  select count(*) into v_total_users from auth.users;

  -- Pengguna baru hari ini (zona waktu WIB)
  select count(*) into v_new_users_today
  from auth.users
  where created_at >= today_start;

  -- Pengguna aktif hari ini: mencatat transaksi ATAU memakai AI hari ini (WIB)
  select count(distinct act.user_id) into v_active_today
  from (
    select user_id from public.transactions where created_at >= today_start or date::text = to_char(now_wib, 'YYYY-MM-DD')
    union
    select user_id from public.ai_usage_logs where created_at >= today_start
  ) act;

  -- Pengguna aktif 30 hari terakhir
  select count(distinct act.user_id) into v_active_30d
  from (
    select user_id from public.transactions where created_at >= (now() - interval '30 days') or date::date >= ((now_wib)::date - 30)
    union
    select user_id from public.ai_usage_logs where created_at >= (now() - interval '30 days')
  ) act;

  -- Kas masuk periode terpilih & bulan ini (status dikonfirmasi, dihitung dari confirmed_at)
  select coalesce(sum(amount), 0) into v_cash_in_period
  from public.payment_requests
  where status = 'dikonfirmasi' and confirmed_at >= v_from and confirmed_at <= v_to;

  select coalesce(sum(amount), 0) into v_cash_in_month
  from public.payment_requests
  where status = 'dikonfirmasi' and confirmed_at >= month_start;

  -- Biaya AI periode terpilih & bulan ini
  select coalesce(sum(cost_idr), 0) into v_ai_cost_period
  from public.ai_usage_logs
  where created_at >= v_from and created_at <= v_to;

  select coalesce(sum(cost_idr), 0) into v_ai_cost_month
  from public.ai_usage_logs
  where created_at >= month_start;

  -- Antrean menunggu verifikasi Owner (pro_sementara + menunggu_cek)
  select count(*), coalesce(max(round(extract(epoch from (now() - created_at)) / 60)), 0)
  into v_pending_count, v_oldest_pending_minutes
  from public.payment_requests
  where status in ('pro_sementara', 'menunggu_cek');

  -- Anggaran AI dari app_settings
  select value into bgt from public.app_settings where key = 'api_budget';
  if bgt is not null then
    v_budget_idr := coalesce((bgt->>'budget_idr')::numeric, 0);
    v_warn_pct := coalesce((bgt->>'warn_pct')::int, 70);
    if v_budget_idr > 0 then
      v_budget_used_pct := round((v_ai_cost_month / v_budget_idr) * 100, 1);
    end if;
  end if;

  return jsonb_build_object(
    'total_users', v_total_users,
    'new_users_today', v_new_users_today,
    'active_users_today', v_active_today,
    'active_users_30d', v_active_30d,
    'cash_in_period', round(v_cash_in_period, 0),
    'cash_in_month', round(v_cash_in_month, 0),
    'ai_cost_period', round(v_ai_cost_period, 2),
    'ai_cost_month', round(v_ai_cost_month, 2),
    'pending_payments', v_pending_count,
    'oldest_pending_minutes', v_oldest_pending_minutes,
    'budget_idr', v_budget_idr,
    'warn_pct', v_warn_pct,
    'budget_used_pct', v_budget_used_pct,
    'period_from', v_from,
    'period_to', v_to
  );
end $$;

-- =========================================================================
-- 5. Ubah admin_confirm_payment: Aturan 7 hari & bulan kalender
-- =========================================================================
drop function if exists public.admin_confirm_payment(uuid);
create or replace function public.admin_confirm_payment(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r public.payment_requests%rowtype;
  sub public.user_subscriptions%rowtype;
  base_ts timestamptz;
  new_expires timestamptz;
begin
  perform public._require_admin();

  select * into r from public.payment_requests where id = p_id for update;
  if not found then raise exception 'PERMINTAAN_TIDAK_ADA'; end if;
  if r.status in ('dikonfirmasi', 'ditolak') then raise exception 'SUDAH_DIPROSES'; end if;
  if r.status = 'kedaluwarsa' and r.proof_path is null then raise exception 'KEDALUWARSA_TANPA_BUKTI'; end if;

  select * into sub from public.user_subscriptions where user_id = r.user_id;

  if sub.user_id is not null and sub.plan = 'pro' and sub.plan_expires_at is null then
    -- Sudah Pro tanpa batas waktu, biarkan tetap aktif tanpa batas
    null;
  else
    base_ts := now();

    -- Kasus 1: Pro masih aktif dan bukan masa sementara -> sambung dari plan_expires_at
    if sub.user_id is not null and sub.plan = 'pro' and sub.plan_expires_at is not null
       and sub.plan_expires_at > now()
       and sub.plan_expires_at is distinct from r.temp_pro_until then
      base_ts := sub.plan_expires_at;

    -- Kasus 2: Masa Pro habis dalam 7 hari kalender terakhir (toleransi perpanjangan) -> sambung dari plan_expires_at
    elsif sub.user_id is not null and sub.plan_expires_at is not null
       and sub.plan_expires_at <= now()
       and sub.plan_expires_at >= (now() - interval '7 days')
       and sub.plan_expires_at is distinct from r.temp_pro_until then
      base_ts := sub.plan_expires_at;
    end if;

    new_expires := base_ts + make_interval(months => r.months);

    insert into public.user_subscriptions (user_id, plan, plan_expires_at)
    values (r.user_id, 'pro', new_expires)
    on conflict (user_id) do update
      set plan = 'pro', plan_expires_at = new_expires, updated_at = now();
  end if;

  update public.payment_requests
  set status = 'dikonfirmasi', confirmed_at = now(), confirmed_by = auth.uid(), updated_at = now()
  where id = r.id;

  perform public._audit('payment_confirm', r.user_id, r.months || ' bulan, Rp' || r.amount);
end $$;

-- =========================================================================
-- 6. Fungsi admin_list_prices() & admin_set_price(p_months, p_amount)
-- =========================================================================
drop function if exists public.admin_list_prices();
create or replace function public.admin_list_prices()
returns table (months integer, amount integer)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_admin();
  return query select p.months, p.amount from public.payment_prices p order by p.months;
end $$;

drop function if exists public.admin_set_price(integer, integer);
drop function if exists public.admin_set_price(integer, numeric);
create or replace function public.admin_set_price(p_months integer, p_amount integer)
returns void
language plpgsql security definer set search_path = public as $$
declare
  old_amount integer;
begin
  perform public._require_admin(true); -- Hanya Superadmin

  if p_months not in (1, 6, 12) then
    raise exception 'DURASI_TIDAK_VALID';
  end if;

  if p_amount is null or p_amount < 1000 or p_amount > 100000000 then
    raise exception 'HARGA_TIDAK_VALID';
  end if;

  select amount into old_amount from public.payment_prices where months = p_months;

  insert into public.payment_prices (months, amount)
  values (p_months, p_amount)
  on conflict (months) do update set amount = excluded.amount;

  perform public._audit('set_price', null, p_months || ' bulan: Rp' || coalesce(old_amount::text, '0') || ' -> Rp' || p_amount);
end $$;

-- =========================================================================
-- 7. Tambah parameter alasan ke admin_set_plan (Wajib minimal 5 karakter)
--    Menolak 'premium', hanya 'free' dan 'pro'.
-- =========================================================================
create or replace function public.admin_set_plan(
  p_user uuid,
  p_plan text,
  p_days integer default null,
  p_reason text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reason text;
begin
  perform public._require_admin(true); -- Hanya Superadmin

  if p_plan not in ('free', 'pro') then
    raise exception 'PAKET_TIDAK_DIKENAL';
  end if;

  if p_days is not null and (p_days < 1 or p_days > 3650) then
    raise exception 'HARI_TIDAK_VALID';
  end if;

  v_reason := trim(coalesce(p_reason, ''));
  if char_length(v_reason) < 5 then
    raise exception 'ALASAN_WAJIB_DIISI';
  end if;

  if not exists (select 1 from auth.users where id = p_user) then
    raise exception 'USER_TIDAK_ADA';
  end if;

  insert into public.user_subscriptions (user_id, plan, plan_expires_at)
  values (
    p_user,
    p_plan,
    case when p_plan = 'free' or p_days is null then null else now() + make_interval(days => p_days) end
  )
  on conflict (user_id) do update
    set plan = excluded.plan, plan_expires_at = excluded.plan_expires_at, updated_at = now();

  perform public._audit('set_plan', p_user, p_plan || coalesce(' ' || p_days || ' hari', ' tanpa batas') || ' | Alasan: ' || v_reason);
end $$;

-- Pembungkus tanda tangan lama untuk kompatibilitas panggilan internal (misal dari script/rpc lama)
create or replace function public.admin_set_plan(
  p_user uuid,
  p_plan text,
  p_days integer
) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_set_plan(p_user, p_plan, p_days, 'Diatur melalui sistem admin');
end $$;

-- Perbarui admin_resolve_request agar menyertakan alasan
create or replace function public.admin_resolve_request(p_id uuid, p_status text, p_days integer default 30) returns void
language plpgsql security definer set search_path = public as $$
declare r public.subscription_requests%rowtype;
begin
  perform public._require_admin();
  if p_status not in ('diproses','aktif','ditolak') then raise exception 'STATUS_TIDAK_VALID'; end if;
  select * into r from public.subscription_requests where id = p_id for update;
  if not found then raise exception 'PERMINTAAN_TIDAK_ADA'; end if;
  if p_status = 'aktif' then
    perform public.admin_set_plan(r.user_id, r.plan, p_days, 'Permintaan langganan disetujui');
  end if;
  update public.subscription_requests set status = p_status where id = p_id;
  perform public._audit('resolve_request', r.user_id, p_status);
end $$;

-- =========================================================================
-- 8. Fungsi admin_get_ai_controls() & admin_set_ai_controls(p_controls, p_usd)
-- =========================================================================
drop function if exists public.admin_get_ai_controls();
create or replace function public.admin_get_ai_controls()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  ctrl jsonb;
  usd jsonb;
begin
  perform public._require_admin();

  select value into ctrl from public.app_settings where key = 'ai_controls';
  if ctrl is null then
    ctrl := jsonb_build_object(
      'master_kill_switch', false,
      'basic_ai_disabled_at_100pct', true,
      'pro_hard_limit_enabled', false,
      'feature_toggles', jsonb_build_object(
        'struk', true, 'suara', true, 'konsultasi', true,
        'insight', true, 'rencana', true, 'impor', true, 'tabungan', true
      )
    );
  end if;

  select value into usd from public.app_settings where key = 'usd_idr_rate';

  return jsonb_build_object(
    'controls', ctrl,
    'usd_idr_rate', coalesce(usd::numeric, 16000)
  );
end $$;

drop function if exists public.admin_set_ai_controls(jsonb, numeric);
drop function if exists public.admin_set_ai_controls(jsonb);
create or replace function public.admin_set_ai_controls(
  p_controls jsonb,
  p_usd_idr_rate numeric default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_master boolean;
  v_basic_off boolean;
  v_pro_limit boolean;
  v_toggles jsonb;
begin
  perform public._require_admin(true); -- Hanya Superadmin

  if p_controls is null or jsonb_typeof(p_controls) <> 'object' then
    raise exception 'KONTROL_AI_TIDAK_VALID';
  end if;

  v_master := coalesce((p_controls->>'master_kill_switch')::boolean, false);
  v_basic_off := coalesce((p_controls->>'basic_ai_disabled_at_100pct')::boolean, true);
  v_pro_limit := coalesce((p_controls->>'pro_hard_limit_enabled')::boolean, false);
  v_toggles := coalesce(p_controls->'feature_toggles', '{}'::jsonb);

  if jsonb_typeof(v_toggles) <> 'object' then
    raise exception 'TOGGLES_TIDAK_VALID';
  end if;

  insert into public.app_settings (key, value, updated_at)
  values (
    'ai_controls',
    jsonb_build_object(
      'master_kill_switch', v_master,
      'basic_ai_disabled_at_100pct', v_basic_off,
      'pro_hard_limit_enabled', v_pro_limit,
      'feature_toggles', v_toggles
    ),
    now()
  )
  on conflict (key) do update set value = excluded.value, updated_at = now();

  if p_usd_idr_rate is not null then
    if p_usd_idr_rate < 5000 or p_usd_idr_rate > 50000 then
      raise exception 'KURS_TIDAK_VALID';
    end if;
    insert into public.app_settings (key, value, updated_at)
    values ('usd_idr_rate', to_jsonb(p_usd_idr_rate), now())
    on conflict (key) do update set value = excluded.value, updated_at = now();
  end if;

  perform public._audit(
    'set_ai_controls',
    null,
    'master:' || v_master::text || ', basic_cutoff:' || v_basic_off::text || ', pro_hard_limit:' || v_pro_limit::text
    || coalesce(', kurs:' || p_usd_idr_rate::text, '')
  );
end $$;

-- =========================================================================
-- 9. Pengaturan hak akses (Privilege Hardening)
-- =========================================================================
revoke all on function public.get_ai_runtime_guard() from public, anon;
revoke all on function public.admin_dashboard_summary(timestamptz, timestamptz) from public, anon;
revoke all on function public.admin_list_prices() from public, anon;
revoke all on function public.admin_set_price(integer, integer) from public, anon;
revoke all on function public.admin_set_plan(uuid, text, integer, text) from public, anon;
revoke all on function public.admin_set_plan(uuid, text, integer) from public, anon;
revoke all on function public.admin_get_ai_controls() from public, anon;
revoke all on function public.admin_set_ai_controls(jsonb, numeric) from public, anon;

grant execute on function public.get_ai_runtime_guard() to authenticated, service_role;
grant execute on function public.admin_dashboard_summary(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_list_prices() to authenticated;
grant execute on function public.admin_set_price(integer, integer) to authenticated;
grant execute on function public.admin_set_plan(uuid, text, integer, text) to authenticated;
grant execute on function public.admin_set_plan(uuid, text, integer) to authenticated;
grant execute on function public.admin_get_ai_controls() to authenticated;
grant execute on function public.admin_set_ai_controls(jsonb, numeric) to authenticated;
