-- Kuota AI dihitung dari tabel ini, jadi pengguna hanya boleh MENAMBAH dan MELIHAT catatannya sendiri.
-- RLS sudah menolak ubah/hapus, ini sabuk pengaman kedua (TRUNCATE tidak tunduk pada RLS).
revoke update, delete, truncate, references, trigger on public.ai_usage_logs from anon, authenticated;
revoke all on public.ai_usage_logs from anon;
