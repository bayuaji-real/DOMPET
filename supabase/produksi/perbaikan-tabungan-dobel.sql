-- Perbaikan Total Saldo dobel (uang tabungan terhitung dua kali). Dijalankan di PRODUKSI.
-- Aman: kalau total berubah dari Rp2.924.000 atau ada dompet lama yang masih dipakai, semuanya dibatalkan.
do $$
declare
  uid constant uuid := '1bd0fa2d-3445-4764-8dbb-629f1b3f4f1c';
  old_lamaran constant uuid := '470a2403-4b5c-42f2-8f17-5f97eb1ceea5';
  old_kuliah  constant uuid := '16808802-c185-4308-8426-9dd6fc2a49e2';
  sav_kuliah  constant uuid := '238c992b-a2ff-4de7-ac0a-eb28d268df31';
  goal_kuliah constant uuid := '0e728115-a2a1-4705-9b80-1a37b25a3bef';
  tx_transfer constant uuid := 'd110813d-c969-4104-8de5-4a59670d2f55';
  total_before bigint; total_after bigint;
begin
  select sum(balance) into total_before from wallet_balances where user_id = uid and goal_id is null;
  if total_before is distinct from 2924000 then raise exception 'Total dompet biasa bukan 2924000: %', total_before; end if;

  if exists (select 1 from transactions where wallet_id = old_lamaran or to_wallet_id = old_lamaran)
     or exists (select 1 from recurring_transactions where wallet_id = old_lamaran)
     or exists (select 1 from user_settings where default_wallet_id = old_lamaran)
     or exists (select 1 from savings_goals where storage_wallet_id = old_lamaran) then
    raise exception 'Dompet Lamaran lama masih dipakai';
  end if;
  delete from wallets where id = old_lamaran and user_id = uid;

  update transactions
     set type = 'goal_withdraw', goal_id = goal_kuliah, wallet_id = '6baeccda-50fc-40a5-afb6-35eeb07a6732', to_wallet_id = sav_kuliah
   where id = tx_transfer and user_id = uid and wallet_id = old_kuliah;
  if exists (select 1 from transactions where wallet_id = old_kuliah or to_wallet_id = old_kuliah)
     or exists (select 1 from recurring_transactions where wallet_id = old_kuliah)
     or exists (select 1 from user_settings where default_wallet_id = old_kuliah) then
    raise exception 'Dompet Kuliah lama masih dipakai';
  end if;
  delete from wallets where id = old_kuliah and user_id = uid;
  update savings_goals set initial_amount = 765000 where id = goal_kuliah and user_id = uid;

  select sum(balance) into total_after from wallet_balances where user_id = uid;
  if total_after is distinct from 2924000 then raise exception 'Total berubah: %', total_after; end if;
end $$;
