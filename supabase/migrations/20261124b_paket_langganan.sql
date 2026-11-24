-- Paket Gratis / Premium / Pro, uji coba 7 hari, kuota AI bulanan, tabel utang.
-- Pak Slamet (Database). Dicoba di STAGING dulu. Hanya menambah, tidak mengubah data lama.

-- 1. Batas per paket (bisa diubah Owner lewat SQL tanpa ubah kode)
create table if not exists public.plan_limits (
  plan text primary key check (plan in ('free','premium','pro')),
  ai_monthly_limit integer not null check (ai_monthly_limit >= 0)
);
insert into public.plan_limits (plan, ai_monthly_limit) values ('free',0),('premium',100),('pro',1000)
  on conflict (plan) do nothing;
alter table public.plan_limits enable row level security;
drop policy if exists "Pengguna login melihat batas paket" on public.plan_limits;
create policy "Pengguna login melihat batas paket" on public.plan_limits for select to authenticated using (true);

-- 2. Langganan. Pengguna HANYA boleh membaca. Perubahan lewat fungsi di bawah atau Owner.
create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','premium','pro')),
  plan_expires_at timestamptz,
  trial_plan text check (trial_plan in ('premium','pro')),
  trial_ends_at timestamptz,
  trial_premium_used_at timestamptz,
  trial_pro_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_subscriptions enable row level security;
drop policy if exists "Pengguna melihat langganannya" on public.user_subscriptions;
create policy "Pengguna melihat langganannya" on public.user_subscriptions for select to authenticated using (auth.uid() = user_id);
revoke insert, update, delete on public.user_subscriptions from anon, authenticated;

-- 3. Catatan AI: tambah jenis fitur
do $$
declare c record;
begin
  for c in select conname from pg_constraint
    where conrelid = 'public.ai_usage_logs'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%feature%'
  loop execute format('alter table public.ai_usage_logs drop constraint %I', c.conname); end loop;
  alter table public.ai_usage_logs add constraint ai_usage_logs_feature_check
    check (feature in ('tabungan','konsultasi','struk','suara','insight','rencana','impor'));
end $$;

-- 4. Status paket saat ini (membuat baris Gratis kalau belum ada)
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
    'trial_available', jsonb_build_object(
      'premium', s.trial_premium_used_at is null,
      'pro', s.trial_pro_used_at is null),
    'ai_used', used,
    'ai_limit', coalesce(lim, 0),
    'ai_remaining', greatest(coalesce(lim, 0) - used, 0)
  );
end $$;

-- 5. Mulai uji coba 7 hari (sekali per paket)
create or replace function public.start_trial(p_plan text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s public.user_subscriptions%rowtype;
begin
  if uid is null then raise exception 'BELUM_LOGIN'; end if;
  if p_plan not in ('premium','pro') then raise exception 'PAKET_TIDAK_DIKENAL'; end if;
  perform public.get_my_entitlement();
  select * into s from public.user_subscriptions where user_id = uid for update;
  if s.plan <> 'free' and (s.plan_expires_at is null or s.plan_expires_at > now()) then raise exception 'SUDAH_BERLANGGANAN'; end if;
  if s.trial_plan is not null and s.trial_ends_at is not null and s.trial_ends_at > now() then raise exception 'UJICOBA_MASIH_BERJALAN'; end if;
  if p_plan = 'premium' and s.trial_premium_used_at is not null then raise exception 'UJICOBA_SUDAH_DIPAKAI'; end if;
  if p_plan = 'pro' and s.trial_pro_used_at is not null then raise exception 'UJICOBA_SUDAH_DIPAKAI'; end if;
  update public.user_subscriptions set
    trial_plan = p_plan,
    trial_ends_at = now() + interval '7 days',
    trial_premium_used_at = case when p_plan = 'premium' then now() else trial_premium_used_at end,
    trial_pro_used_at = case when p_plan = 'pro' then now() else trial_pro_used_at end,
    updated_at = now()
  where user_id = uid;
  return public.get_my_entitlement();
end $$;

revoke all on function public.get_my_entitlement() from public, anon;
revoke all on function public.start_trial(text) from public, anon;
grant execute on function public.get_my_entitlement() to authenticated;
grant execute on function public.start_trial(text) to authenticated;

-- 6. Utang dan cicilan (untuk rencana lunasi utang)
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  balance bigint not null check (balance >= 0 and balance <= 100000000000),
  annual_rate numeric(6,2) not null default 0 check (annual_rate >= 0 and annual_rate <= 1000),
  min_payment bigint not null default 0 check (min_payment >= 0 and min_payment <= 100000000000),
  due_day integer check (due_day between 1 and 31),
  created_at timestamptz not null default now()
);
create index if not exists debts_user on public.debts (user_id);
alter table public.debts enable row level security;
drop policy if exists "Utang: lihat milik sendiri" on public.debts;
drop policy if exists "Utang: tambah milik sendiri" on public.debts;
drop policy if exists "Utang: ubah milik sendiri" on public.debts;
drop policy if exists "Utang: hapus milik sendiri" on public.debts;
create policy "Utang: lihat milik sendiri" on public.debts for select to authenticated using (auth.uid() = user_id);
create policy "Utang: tambah milik sendiri" on public.debts for insert to authenticated with check (auth.uid() = user_id);
create policy "Utang: ubah milik sendiri" on public.debts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Utang: hapus milik sendiri" on public.debts for delete to authenticated using (auth.uid() = user_id);
