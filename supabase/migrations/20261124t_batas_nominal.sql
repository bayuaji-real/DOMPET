-- Putaran serang 24 Nov 2026 (Serangan 5: "Pesan -1 barang"). Temuan Tinggi.
-- Sebelumnya database menerima transaksi bernominal negatif, nol, raksasa (sampai batas bigint), dan tipe ngawur
-- bila browser/REST dipanggil langsung (zod/validasi hanya ada di kode browser).
-- Perbaikan: batasan di database. NOT VALID = hanya berlaku untuk baris baru/diubah, aman untuk data lama di production.
-- Batas atas sama dengan MAX_AMOUNT di src/lib/utils.ts (Rp100.000.000.000).
-- Rollback: alter table <tabel> drop constraint <nama>;

alter table public.transactions
  add constraint transactions_amount_ok check (amount > 0 and amount <= 100000000000) not valid,
  add constraint transactions_type_ok check (type in ('income','expense','transfer','goal_deposit','goal_withdraw')) not valid;

alter table public.wallets
  add constraint wallets_initial_balance_ok check (initial_balance is null or abs(initial_balance) <= 100000000000) not valid;

alter table public.savings_goals
  add constraint savings_goals_amount_ok check (target_amount > 0 and target_amount <= 100000000000 and (initial_amount is null or (initial_amount >= 0 and initial_amount <= 100000000000))) not valid;

alter table public.recurring_transactions
  add constraint recurring_amount_ok check (amount > 0 and amount <= 100000000000) not valid;

alter table public.budgets
  add constraint budgets_limit_ok check (limit_amount >= 0 and limit_amount <= 100000000000) not valid;

alter table public.payday_schedule
  add constraint payday_amount_ok check (
    (expected_amount is null or (expected_amount >= 0 and expected_amount <= 100000000000)) and
    (actual_amount is null or (actual_amount >= 0 and actual_amount <= 100000000000))) not valid;

-- Data staging sudah dicek bersih; validasi penuh (production: jalankan hanya setelah cek data lama).
-- alter table public.transactions validate constraint transactions_amount_ok;  (dst.)
