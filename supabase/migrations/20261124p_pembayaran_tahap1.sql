-- Pembayaran Tahap 1: bayar ke QRIS merchant Owner, bukti disaring Ruby, Pro sementara 24 jam,
-- Owner cek manual lalu Konfirmasi atau Tolak. Pak Wiryo (Arsitek) + Pak Slamet (Database).
-- Dicoba di STAGING dulu. Hanya menambah, tidak mengubah data lama.
-- Catatan: ini pengecualian Tahap 1 dari aturan "status bayar hanya dari webhook". Berlaku sampai Tahap 2 (gateway).

-- 1. Harga paket (satu-satunya sumber harga; dibaca server dan layar Paket, bukan dikirim browser)
create table if not exists public.payment_prices (
  months integer primary key check (months in (1, 6, 12)),
  amount integer not null check (amount > 0 and amount <= 10000000)
);
insert into public.payment_prices (months, amount) values (1, 15000), (6, 50000), (12, 100000)
  on conflict (months) do nothing;
alter table public.payment_prices enable row level security;
drop policy if exists "Harga paket terlihat pengguna login" on public.payment_prices;
create policy "Harga paket terlihat pengguna login" on public.payment_prices for select to authenticated using (true);
revoke all on public.payment_prices from anon;
revoke insert, update, delete, truncate on public.payment_prices from authenticated;

-- 2. Permintaan pembayaran
create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  months integer not null check (months in (1, 6, 12)),
  base_amount integer not null check (base_amount > 0),
  unique_code integer not null check (unique_code between 1 and 999),
  amount integer not null,
  status text not null default 'menunggu'
    check (status in ('menunggu', 'pro_sementara', 'menunggu_cek', 'dikonfirmasi', 'ditolak', 'kedaluwarsa')),
  expires_at timestamptz not null,
  proof_path text,
  proof_sha256 text,
  proof_ref text,
  proof_amount bigint,
  proof_paid_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  last_note text,
  temp_pro_until timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id) on delete set null,
  rejected_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_requests_amount_ok check (amount = base_amount + unique_code)
);
create index if not exists payment_requests_user_created on public.payment_requests (user_id, created_at desc);
-- Maksimal 1 permintaan terbuka per akun
create unique index if not exists payment_requests_one_open on public.payment_requests (user_id)
  where status in ('menunggu', 'pro_sementara', 'menunggu_cek');
-- Nominal unik: tidak ada dua permintaan terbuka dengan nominal sama
create unique index if not exists payment_requests_amount_open on public.payment_requests (amount)
  where status in ('menunggu', 'pro_sementara', 'menunggu_cek');
-- Satu nomor referensi dan satu gambar bukti hanya boleh dipakai sekali, selamanya
create unique index if not exists payment_requests_proof_ref_uniq on public.payment_requests (proof_ref) where proof_ref is not null;
create unique index if not exists payment_requests_proof_sha_uniq on public.payment_requests (proof_sha256) where proof_sha256 is not null;

alter table public.payment_requests enable row level security;
drop policy if exists "Pembayaran: lihat milik sendiri" on public.payment_requests;
create policy "Pembayaran: lihat milik sendiri" on public.payment_requests for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.payment_requests from anon;
revoke insert, update, delete, truncate on public.payment_requests from authenticated;

-- 3. Bucket bukti bayar (privat). Pengguna hanya menambah di folder sendiri. Tidak ada ubah/hapus dari aplikasi.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
drop policy if exists "bukti_bayar_insert_own" on storage.objects;
create policy "bukti_bayar_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "bukti_bayar_select_own" on storage.objects;
create policy "bukti_bayar_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "bukti_bayar_select_admin" on storage.objects;
create policy "bukti_bayar_select_admin" on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and public.my_admin_role() is not null);

-- 4. Fungsi dalam
create or replace function public._expire_payment_requests() returns void
language sql security definer set search_path = public as $$
  update public.payment_requests set status = 'kedaluwarsa', updated_at = now()
    where status = 'menunggu' and expires_at < now();
  update public.payment_requests set status = 'kedaluwarsa', updated_at = now()
    where status = 'pro_sementara' and temp_pro_until < now();
  update public.payment_requests set status = 'kedaluwarsa', updated_at = now()
    where status = 'menunggu_cek' and updated_at < now() - interval '7 days';
$$;

create or replace function public._payment_json(r public.payment_requests) returns jsonb
language sql immutable set search_path = public as $$
  select jsonb_build_object(
    'id', r.id, 'months', r.months, 'base_amount', r.base_amount, 'unique_code', r.unique_code, 'amount', r.amount,
    'status', r.status, 'created_at', r.created_at, 'expires_at', r.expires_at, 'temp_pro_until', r.temp_pro_until,
    'attempts_left', greatest(5 - r.attempts, 0), 'last_note', r.last_note);
$$;

-- 5. Pengguna: buat permintaan (nominal unik dari server, berlaku 1 jam)
create or replace function public.create_payment_request(p_months integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  base integer; code integer; i integer; cname text;
  r public.payment_requests%rowtype;
begin
  if uid is null then raise exception 'BELUM_LOGIN'; end if;
  select amount into base from public.payment_prices where months = p_months;
  if base is null then raise exception 'PAKET_TIDAK_DIKENAL'; end if;
  perform public._expire_payment_requests();

  select * into r from public.payment_requests
    where user_id = uid and status in ('menunggu', 'pro_sementara', 'menunggu_cek') for update;
  if found then
    if r.status = 'menunggu' and r.months = p_months then return public._payment_json(r); end if;
    if r.status = 'menunggu' then
      update public.payment_requests set status = 'kedaluwarsa', updated_at = now() where id = r.id;
    else
      raise exception 'MASIH_ADA_PERMINTAAN';
    end if;
  end if;

  if (select count(*) from public.payment_requests where user_id = uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'TERLALU_BANYAK';
  end if;

  for i in 1..40 loop
    code := 1 + floor(random() * 999)::int;
    begin
      insert into public.payment_requests (user_id, months, base_amount, unique_code, amount, expires_at)
      values (uid, p_months, base, code, base + code, now() + interval '1 hour')
      returning * into r;
      return public._payment_json(r);
    exception when unique_violation then
      get stacked diagnostics cname = constraint_name;
      if cname = 'payment_requests_one_open' then raise exception 'MASIH_ADA_PERMINTAAN'; end if;
    end;
  end loop;
  raise exception 'KODE_PENUH';
end $$;

-- 6. Pengguna: lihat permintaan terakhirnya (terbuka, atau 3 hari terakhir)
create or replace function public.get_my_payment_request() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.payment_requests%rowtype;
begin
  if uid is null then raise exception 'BELUM_LOGIN'; end if;
  perform public._expire_payment_requests();
  select * into r from public.payment_requests
    where user_id = uid and (status in ('menunggu', 'pro_sementara', 'menunggu_cek') or created_at > now() - interval '3 days')
    order by created_at desc limit 1;
  if not found then return null; end if;
  return public._payment_json(r);
end $$;

-- 7. KHUSUS SERVER (service_role): mulai membaca bukti. Menambah hitungan percobaan (maks 5) supaya biaya Ruby terbatas.
create or replace function public.payment_begin_proof(p_user uuid, p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.payment_requests%rowtype;
begin
  perform public._expire_payment_requests();
  select * into r from public.payment_requests where id = p_id and user_id = p_user for update;
  if not found then raise exception 'PERMINTAAN_TIDAK_ADA'; end if;
  if r.status = 'kedaluwarsa' then raise exception 'KEDALUWARSA'; end if;
  if r.status <> 'menunggu' then raise exception 'BUKAN_MENUNGGU'; end if;
  if r.attempts >= 5 then raise exception 'PERCOBAAN_HABIS'; end if;
  update public.payment_requests set attempts = attempts + 1, updated_at = now() where id = r.id returning * into r;
  return public._payment_json(r);
end $$;

-- 8. KHUSUS SERVER (service_role): terapkan hasil bacaan Ruby. Nominal, waktu, dan referensi disaring di sini.
create or replace function public.payment_apply_proof(
  p_user uuid, p_id uuid, p_amount bigint, p_paid_at timestamptz, p_ref text, p_sha text, p_path text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r public.payment_requests%rowtype;
  refn text; reason text; had_temp boolean; sub public.user_subscriptions%rowtype; until_ts timestamptz;
begin
  perform public._expire_payment_requests();
  select * into r from public.payment_requests where id = p_id and user_id = p_user for update;
  if not found then raise exception 'PERMINTAAN_TIDAK_ADA'; end if;
  if r.status = 'kedaluwarsa' then raise exception 'KEDALUWARSA'; end if;
  if r.status <> 'menunggu' then raise exception 'BUKAN_MENUNGGU'; end if;

  refn := upper(regexp_replace(coalesce(p_ref, ''), '[^A-Za-z0-9]', '', 'g'));
  if p_amount is null or p_amount <> r.amount then reason := 'NOMINAL_BEDA';
  elsif p_paid_at is null then reason := 'WAKTU_TIDAK_TERBACA';
  elsif p_paid_at < r.created_at - interval '2 minutes' or p_paid_at > r.expires_at + interval '10 minutes' then reason := 'WAKTU_DI_LUAR';
  elsif char_length(refn) < 6 or char_length(refn) > 64 then reason := 'REFERENSI_TIDAK_TERBACA';
  end if;

  if reason is null then
    begin
      update public.payment_requests set
        proof_path = p_path, proof_sha256 = p_sha, proof_ref = refn, proof_amount = p_amount, proof_paid_at = p_paid_at,
        updated_at = now()
      where id = r.id;
    exception when unique_violation then
      reason := 'BUKTI_SUDAH_DIPAKAI';
    end;
  end if;

  if reason is not null then
    update public.payment_requests set last_note = reason, updated_at = now() where id = r.id;
    return jsonb_build_object('ok', false, 'reason', reason);
  end if;

  -- Pro sementara 24 jam hanya sekali per akun per paket
  select exists (select 1 from public.payment_requests
    where user_id = p_user and months = r.months and id <> r.id and temp_pro_until is not null) into had_temp;
  if had_temp then
    update public.payment_requests set status = 'menunggu_cek', last_note = null, updated_at = now() where id = r.id;
    perform public._audit('payment_proof', p_user, 'menunggu_cek ' || r.amount);
    return jsonb_build_object('ok', true, 'status', 'menunggu_cek', 'amount', r.amount, 'months', r.months);
  end if;

  until_ts := now() + interval '24 hours';
  select * into sub from public.user_subscriptions where user_id = p_user;
  -- Jangan menimpa Pro berbayar yang lebih panjang atau tanpa batas
  if not (sub.user_id is not null and sub.plan = 'pro' and (sub.plan_expires_at is null or sub.plan_expires_at > until_ts)) then
    insert into public.user_subscriptions (user_id, plan, plan_expires_at) values (p_user, 'pro', until_ts)
    on conflict (user_id) do update set plan = 'pro', plan_expires_at = until_ts, updated_at = now();
  end if;
  update public.payment_requests set status = 'pro_sementara', temp_pro_until = until_ts, last_note = null, updated_at = now() where id = r.id;
  perform public._audit('payment_proof', p_user, 'pro_sementara ' || r.amount);
  return jsonb_build_object('ok', true, 'status', 'pro_sementara', 'temp_pro_until', until_ts, 'amount', r.amount, 'months', r.months);
end $$;

-- 9. Admin: daftar, konfirmasi, tolak
create or replace function public.admin_list_payments() returns table (
  id uuid, user_id uuid, email text, months integer, amount integer, status text, created_at timestamptz,
  expires_at timestamptz, proof_path text, proof_ref text, proof_paid_at timestamptz, temp_pro_until timestamptz,
  attempts integer, last_note text, confirmed_at timestamptz)
language plpgsql security definer set search_path = public, auth as $$
begin
  perform public._require_admin();
  perform public._expire_payment_requests();
  return query
  select p.id, p.user_id, u.email::text, p.months, p.amount, p.status, p.created_at, p.expires_at, p.proof_path, p.proof_ref,
         p.proof_paid_at, p.temp_pro_until, p.attempts, p.last_note, p.confirmed_at
  from public.payment_requests p join auth.users u on u.id = p.user_id
  order by (p.status in ('pro_sementara', 'menunggu_cek')) desc, p.created_at desc
  limit 100;
end $$;

create or replace function public.admin_confirm_payment(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r public.payment_requests%rowtype; sub public.user_subscriptions%rowtype; base_ts timestamptz;
begin
  perform public._require_admin();
  select * into r from public.payment_requests where id = p_id for update;
  if not found then raise exception 'PERMINTAAN_TIDAK_ADA'; end if;
  if r.status in ('dikonfirmasi', 'ditolak') then raise exception 'SUDAH_DIPROSES'; end if;
  if r.status = 'kedaluwarsa' and r.proof_path is null then raise exception 'KEDALUWARSA_TANPA_BUKTI'; end if;

  select * into sub from public.user_subscriptions where user_id = r.user_id;
  if sub.user_id is not null and sub.plan = 'pro' and sub.plan_expires_at is null then
    null; -- sudah Pro tanpa batas, tidak diubah
  else
    -- Dihitung dari saat konfirmasi; kalau Pro berbayar masih berjalan (bukan masa sementara), disambung dari tanggal habisnya
    base_ts := now();
    if sub.user_id is not null and sub.plan = 'pro' and sub.plan_expires_at is not null and sub.plan_expires_at > now()
       and sub.plan_expires_at is distinct from r.temp_pro_until then
      base_ts := sub.plan_expires_at;
    end if;
    insert into public.user_subscriptions (user_id, plan, plan_expires_at)
    values (r.user_id, 'pro', base_ts + make_interval(months => r.months))
    on conflict (user_id) do update set plan = 'pro', plan_expires_at = excluded.plan_expires_at, updated_at = now();
  end if;
  update public.payment_requests set status = 'dikonfirmasi', confirmed_at = now(), confirmed_by = auth.uid(), updated_at = now() where id = r.id;
  perform public._audit('payment_confirm', r.user_id, r.months || ' bulan, Rp' || r.amount);
end $$;

create or replace function public.admin_reject_payment(p_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare r public.payment_requests%rowtype;
begin
  perform public._require_admin();
  select * into r from public.payment_requests where id = p_id for update;
  if not found then raise exception 'PERMINTAAN_TIDAK_ADA'; end if;
  if r.status in ('dikonfirmasi', 'ditolak') then raise exception 'SUDAH_DIPROSES'; end if;
  -- Cabut Pro sementara hanya kalau masa Pro akun masih persis masa sementara dari permintaan ini
  if r.temp_pro_until is not null then
    update public.user_subscriptions set plan = 'free', plan_expires_at = null, updated_at = now()
      where user_id = r.user_id and plan = 'pro' and plan_expires_at = r.temp_pro_until;
  end if;
  update public.payment_requests set status = 'ditolak', rejected_reason = left(nullif(trim(p_reason), ''), 200), updated_at = now() where id = r.id;
  perform public._audit('payment_reject', r.user_id, left(coalesce(p_reason, ''), 200));
end $$;

-- 10. Hak akses fungsi
revoke all on function public._expire_payment_requests() from public, anon, authenticated;
revoke all on function public._payment_json(public.payment_requests) from public, anon, authenticated;
revoke all on function public.payment_begin_proof(uuid, uuid) from public, anon, authenticated;
revoke all on function public.payment_apply_proof(uuid, uuid, bigint, timestamptz, text, text, text) from public, anon, authenticated;
grant execute on function public.payment_begin_proof(uuid, uuid) to service_role;
grant execute on function public.payment_apply_proof(uuid, uuid, bigint, timestamptz, text, text, text) to service_role;

revoke all on function public.create_payment_request(integer) from public, anon;
revoke all on function public.get_my_payment_request() from public, anon;
revoke all on function public.admin_list_payments() from public, anon;
revoke all on function public.admin_confirm_payment(uuid) from public, anon;
revoke all on function public.admin_reject_payment(uuid, text) from public, anon;
grant execute on function public.create_payment_request(integer), public.get_my_payment_request(),
  public.admin_list_payments(), public.admin_confirm_payment(uuid), public.admin_reject_payment(uuid, text) to authenticated;
