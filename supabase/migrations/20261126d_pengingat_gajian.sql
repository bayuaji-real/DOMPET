-- Pengingat gajian dari Ruby: bila aktif, pada pagi hari gajian aplikasi mengirim notifikasi berisi pembagian uang
-- (taruh berapa ke target mana). payday_reminder_offered_at = kapan Ruby terakhir menawarkan (maks sekali per 3 hari).
-- Pak Slamet (Database), diminta Owner 26 Nov 2026 20.47. Tidak ada data baru yang sensitif; aturan RLS user_settings tetap.
-- Rollback: alter table public.user_settings drop column payday_reminder, drop column payday_reminder_offered_at;
alter table public.user_settings
  add column if not exists payday_reminder boolean not null default false,
  add column if not exists payday_reminder_offered_at timestamptz;
