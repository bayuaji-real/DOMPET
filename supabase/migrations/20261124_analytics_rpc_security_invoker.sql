-- Temuan keamanan Pak Harjo (Security): get_financial_analytics berstatus SECURITY DEFINER
-- sehingga bisa dipanggil pengguna login dengan hak pemilik fungsi.
-- Perbaikan: ubah ke SECURITY INVOKER. Aman karena fungsi sudah memfilter user_id = auth.uid(),
-- semua tabel punya RLS, dan view goal_progress/wallet_balances memakai security_invoker=true.
-- Status: BELUM diterapkan (24 Nov 2026). Uji di staging dulu, produksi menunggu SETUJU tertulis Owner.
-- Rollback: ALTER FUNCTION public.get_financial_analytics(DATE, DATE) SECURITY DEFINER;
ALTER FUNCTION public.get_financial_analytics(DATE, DATE) SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.get_financial_analytics(DATE, DATE) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_financial_analytics(DATE, DATE) TO authenticated;
