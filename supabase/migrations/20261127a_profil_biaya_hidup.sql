-- Jawaban "biaya hidup" milik tiap pengguna (profil pribadi, bukan bawaan umum). Biaya hidup = kebutuhan harian
-- (makan, minum, laundry, transport, dll), TIDAK termasuk tagihan rutin dan langganan.
-- Pak Slamet (Database), diminta Owner 27 Nov 2026 14.56 dan 15.02 (production langsung).
-- living_cost_source: NULL = belum pernah dijawab (Ruby bertanya sekali, tidak ditanya lagi di gajian berikutnya).
--   diisi = pengguna mengetik angkanya; rata_rata = dari rata-rata pengeluaran pengguna; dihitung = dihitung bareng Ruby
--   dari rincian kebutuhan; belum_punya = pengguna menjawab belum tahu / belum punya (angka 0).
-- living_cost_monthly: jawaban per BULAN (bisa NULL). living_cost_per_payday (sudah ada) = jawaban dibagi gajian per bulan.
-- Baris user_settings sudah dibatasi RLS per pengguna.
-- Rollback: alter table public.user_settings drop column living_cost_source, drop column living_cost_monthly;
alter table public.user_settings
  add column if not exists living_cost_source text
  check (living_cost_source is null or living_cost_source in ('diisi', 'rata_rata', 'dihitung', 'belum_punya'));
alter table public.user_settings
  add column if not exists living_cost_monthly bigint
  check (living_cost_monthly is null or (living_cost_monthly >= 0 and living_cost_monthly <= 100000000000));
