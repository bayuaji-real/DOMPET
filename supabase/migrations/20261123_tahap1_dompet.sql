-- Tahap 1 (Dompet, Uang Tunai, Tabungan = dompet). Dicoba di STAGING dulu.
-- Pak Slamet (Database). Keputusan Owner: A (Uang Tunai tak bisa dihapus), B (tanpa dompet -> Uang Tunai),
-- C (hapus dompet: transaksi dipindah ke dompet pilihan), D (Total Saldo hitung semua termasuk tabungan).

-- 1. Kolom baru
alter table public.wallets add column if not exists is_default boolean not null default false;
alter table public.wallets add column if not exists goal_id uuid references public.savings_goals(id) on delete set null;
create unique index if not exists wallets_one_default_per_user on public.wallets (user_id) where is_default;
create unique index if not exists wallets_one_per_goal on public.wallets (goal_id) where goal_id is not null;

-- 2. View saldo: dua suku terpisah supaya baris yang menunjuk dompet sama di kedua sisi tetap benar
create or replace view public.wallet_balances with (security_invoker = true) as
select
  w.id, w.user_id, w.name, w.type, w.color, w.icon, w.is_archived, w.sort_order, w.initial_balance,
  (w.initial_balance + coalesce(sum(
      (case when t.wallet_id = w.id then
         case when t.type in ('income','goal_withdraw') then t.amount
              when t.type in ('expense','transfer','goal_deposit') then -t.amount
              else 0 end
       else 0 end)
    + (case when t.to_wallet_id = w.id then
         case when t.type in ('transfer','goal_deposit') then t.amount
              when t.type = 'goal_withdraw' then -t.amount
              else 0 end
       else 0 end)
  ), 0))::bigint as balance,
  w.is_default, w.goal_id
from public.wallets w
left join public.transactions t
  on t.user_id = w.user_id and (t.wallet_id = w.id or t.to_wallet_id = w.id)
group by w.id;

-- 3. Uang Tunai bawaan
create or replace function public.ensure_default_wallet() returns uuid
language plpgsql set search_path = public as $$
declare uid uuid := auth.uid(); v uuid;
begin
  if uid is null then raise exception 'Belum login'; end if;
  select id into v from wallets where user_id = uid and is_default;
  if v is not null then return v; end if;
  select id into v from wallets where user_id = uid and type = 'cash' and lower(name) = 'uang tunai'
    order by created_at limit 1;
  if v is not null then
    update wallets set is_default = true, is_archived = false where id = v;
    return v;
  end if;
  insert into wallets (user_id, name, type, initial_balance, color, icon, sort_order, is_default)
  values (uid, 'Uang Tunai', 'cash', 0, '#16a34a', 'Banknote',
          coalesce((select max(sort_order) from wallets where user_id = uid), 0) + 1, true)
  returning id into v;
  return v;
end $$;

create or replace function public.protect_default_wallet() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if old.is_default and exists (select 1 from auth.users where id = old.user_id) then
    raise exception 'Dompet Uang Tunai tidak bisa dihapus, hanya boleh diganti nama';
  end if;
  return old;
end $$;
drop trigger if exists trg_protect_default_wallet on public.wallets;
create trigger trg_protect_default_wallet before delete on public.wallets
  for each row execute function public.protect_default_wallet();

-- 4. Hapus dompet: transaksi dipindah ke dompet tujuan (keputusan C)
create or replace function public._merge_wallet(p_uid uuid, p_src uuid, p_dst uuid) returns jsonb
language plpgsql set search_path = public as $$
declare w wallets; n_tx int; n_del int;
begin
  if p_uid is distinct from auth.uid() then raise exception 'Tidak diizinkan'; end if;
  select * into w from wallets where id = p_src and user_id = p_uid;
  delete from transactions where user_id = p_uid and type = 'transfer'
    and ((wallet_id = p_src and to_wallet_id = p_dst) or (wallet_id = p_dst and to_wallet_id = p_src));
  get diagnostics n_del = row_count;
  update transactions set wallet_id = p_dst where user_id = p_uid and wallet_id = p_src;
  get diagnostics n_tx = row_count;
  update transactions set to_wallet_id = p_dst where user_id = p_uid and to_wallet_id = p_src;
  update recurring_transactions set wallet_id = p_dst where user_id = p_uid and wallet_id = p_src;
  update savings_goals set storage_wallet_id = p_dst where user_id = p_uid and storage_wallet_id = p_src;
  update user_settings set default_wallet_id = p_dst where user_id = p_uid and default_wallet_id = p_src;
  update wallets set initial_balance = initial_balance + w.initial_balance where id = p_dst and user_id = p_uid;
  delete from wallets where id = p_src and user_id = p_uid;
  return jsonb_build_object('transaksi_dipindah', n_tx, 'transfer_antar_keduanya_dibuang', n_del);
end $$;

create or replace function public.delete_wallet(p_wallet_id uuid, p_move_to uuid) returns jsonb
language plpgsql set search_path = public as $$
declare uid uuid := auth.uid(); w wallets;
begin
  if uid is null then raise exception 'Belum login'; end if;
  select * into w from wallets where id = p_wallet_id and user_id = uid;
  if not found then raise exception 'Dompet tidak ditemukan'; end if;
  if w.is_default then raise exception 'Dompet Uang Tunai tidak bisa dihapus, hanya boleh diganti nama'; end if;
  if w.goal_id is not null then raise exception 'Dompet tabungan dihapus lewat menu Tabungan'; end if;
  if p_move_to is null or p_move_to = p_wallet_id then raise exception 'Pilih dompet tujuan untuk memindahkan transaksi'; end if;
  if not exists (select 1 from wallets where id = p_move_to and user_id = uid and not is_archived) then
    raise exception 'Dompet tujuan tidak ditemukan';
  end if;
  return public._merge_wallet(uid, p_wallet_id, p_move_to);
end $$;

-- 5. Tabungan = dompet bertipe 'tabungan'
create or replace function public.goal_create_wallet() returns trigger
language plpgsql set search_path = public as $$
declare wid uuid;
begin
  insert into wallets (user_id, name, type, initial_balance, color, icon, sort_order, goal_id)
  values (new.user_id, new.name, 'tabungan', new.initial_amount, '#8b5cf6', 'PiggyBank',
          coalesce((select max(sort_order) from wallets where user_id = new.user_id), 0) + 1, new.id)
  returning id into wid;
  update savings_goals set storage_wallet_id = wid where id = new.id;
  return new;
end $$;
drop trigger if exists trg_goal_create_wallet on public.savings_goals;
create trigger trg_goal_create_wallet after insert on public.savings_goals
  for each row execute function public.goal_create_wallet();

create or replace function public.goal_sync_wallet() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.name is distinct from old.name or new.initial_amount is distinct from old.initial_amount then
    update wallets set name = new.name, initial_balance = new.initial_amount where goal_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists trg_goal_sync_wallet on public.savings_goals;
create trigger trg_goal_sync_wallet after update on public.savings_goals
  for each row execute function public.goal_sync_wallet();

-- Hapus tabungan: setoran/penarikan diubah jadi transfer biasa, lalu dompet tabungan dilebur ke dompet pilihan
create or replace function public.delete_savings_goal(p_goal_id uuid, p_move_to uuid) returns jsonb
language plpgsql set search_path = public as $$
declare uid uuid := auth.uid(); sw uuid; res jsonb;
begin
  if uid is null then raise exception 'Belum login'; end if;
  if not exists (select 1 from savings_goals where id = p_goal_id and user_id = uid) then
    raise exception 'Tabungan tidak ditemukan';
  end if;
  select id into sw from wallets where goal_id = p_goal_id and user_id = uid;
  if p_move_to is null or p_move_to = sw
     or not exists (select 1 from wallets where id = p_move_to and user_id = uid and not is_archived and goal_id is null) then
    raise exception 'Pilih dompet tujuan untuk sisa uang tabungan';
  end if;
  update transactions set type = 'transfer', goal_id = null
    where user_id = uid and goal_id = p_goal_id and type = 'goal_deposit' and to_wallet_id is not null;
  update transactions set type = 'transfer', goal_id = null, wallet_id = to_wallet_id, to_wallet_id = wallet_id
    where user_id = uid and goal_id = p_goal_id and type = 'goal_withdraw' and to_wallet_id is not null;
  update transactions set type = 'expense', goal_id = null
    where user_id = uid and goal_id = p_goal_id and type = 'goal_deposit';
  update transactions set type = 'income', goal_id = null
    where user_id = uid and goal_id = p_goal_id and type = 'goal_withdraw';
  if sw is not null then res := public._merge_wallet(uid, sw, p_move_to); end if;
  delete from savings_goals where id = p_goal_id and user_id = uid;
  return coalesce(res, '{}'::jsonb);
end $$;

-- 6. Isi data lama (idempotent): Uang Tunai untuk setiap pengguna, dompet untuk setiap tabungan
do $$
declare u record; g record; wid uuid;
begin
  for u in select id from auth.users loop
    if not exists (select 1 from wallets where user_id = u.id and is_default) then
      update wallets set is_default = true, is_archived = false
        where id = (select id from wallets where user_id = u.id and type = 'cash' and lower(name) = 'uang tunai'
                    order by created_at limit 1);
      if not exists (select 1 from wallets where user_id = u.id and is_default) then
        insert into wallets (user_id, name, type, initial_balance, color, icon, sort_order, is_default)
        values (u.id, 'Uang Tunai', 'cash', 0, '#16a34a', 'Banknote',
                coalesce((select max(sort_order) from wallets where user_id = u.id), 0) + 1, true);
      end if;
    end if;
  end loop;
  for g in select * from savings_goals sg where not exists (select 1 from wallets w where w.goal_id = sg.id) loop
    insert into wallets (user_id, name, type, initial_balance, color, icon, sort_order, goal_id)
    values (g.user_id, g.name, 'tabungan', g.initial_amount, '#8b5cf6', 'PiggyBank',
            coalesce((select max(sort_order) from wallets where user_id = g.user_id), 0) + 1, g.id)
    returning id into wid;
    update savings_goals set storage_wallet_id = wid where id = g.id;
    update transactions set to_wallet_id = wid
      where user_id = g.user_id and goal_id = g.id and type in ('goal_deposit','goal_withdraw');
  end loop;
end $$;

-- 7. Hak akses fungsi: hanya pengguna login
revoke all on function public.ensure_default_wallet(), public.delete_wallet(uuid, uuid),
  public.delete_savings_goal(uuid, uuid), public._merge_wallet(uuid, uuid, uuid) from public, anon;
grant execute on function public.ensure_default_wallet(), public.delete_wallet(uuid, uuid),
  public.delete_savings_goal(uuid, uuid), public._merge_wallet(uuid, uuid, uuid) to authenticated;

-- 8. Fungsi trigger tidak boleh dipanggil lewat API (saran Pak Harjo setelah cek Supabase Advisors)
revoke all on function public.protect_default_wallet() from public, anon, authenticated;
revoke all on function public.goal_create_wallet(), public.goal_sync_wallet() from public, anon;
