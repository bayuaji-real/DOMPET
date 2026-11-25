-- Komitmen rutin yang pasti keluar atau disisihkan tiap bulan (zakat, investasi, asuransi, kiriman keluarga).
-- Ikut biaya tetap di hitungan Money Planner. Pak Slamet (Database), disetujui Owner 25 Nov 2026 17.29.
-- NULL = belum ditanya ke pengguna. 0 = pengguna menjawab tidak ada. Tidak pernah diisi otomatis.
-- Rollback: alter table public.user_settings drop column other_fixed_monthly;
alter table public.user_settings
  add column if not exists other_fixed_monthly bigint
  check (other_fixed_monthly is null or (other_fixed_monthly >= 0 and other_fixed_monthly <= 100000000000));
