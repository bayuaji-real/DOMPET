-- Izinkan nilai feature 'memori' di ai_usage_logs (biaya ringkasan memori Ruby). Pak Slamet (Database), 26 Nov 2026 (SETUJU Owner #2).
-- Tidak memotong jatah Basic: jatah hanya menghitung struk, suara, konsultasi, tabungan, insight, rencana, impor.
-- Rollback: delete from public.ai_usage_logs where feature = 'memori'; lalu pasang lagi constraint tanpa 'memori'.
do $$
declare c record;
begin
  for c in select conname from pg_constraint where conrelid = 'public.ai_usage_logs'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%feature%'
  loop execute format('alter table public.ai_usage_logs drop constraint %I', c.conname); end loop;
  alter table public.ai_usage_logs add constraint ai_usage_logs_feature_check
    check (feature in ('tabungan','konsultasi','struk','suara','insight','rencana','impor','memori'));
end $$;
