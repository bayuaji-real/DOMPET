-- Acuan pasar: angka resmi tunggal (BI-Rate, bunga LPS, SUN, SBN ritel, IHSG, kurs, inflasi).
-- Dibaca semua pengguna; diubah hanya lewat fungsi admin. Setiap angka wajib punya tanggal dan sumber https.
create table if not exists public.market_benchmarks (
  code text primary key check (code ~ '^[a-z0-9_]{2,40}$'),
  name text not null,
  value numeric not null,
  unit text not null check (unit in ('persen','poin','rupiah')),
  as_of date not null,
  source_name text not null,
  source_url text not null check (source_url ~ '^https://'),
  note text,
  updated_at timestamptz not null default now()
);
alter table public.market_benchmarks enable row level security;
drop policy if exists "acuan dibaca pengguna" on public.market_benchmarks;
create policy "acuan dibaca pengguna" on public.market_benchmarks for select to authenticated using (true);
revoke all on public.market_benchmarks from anon;
revoke insert, update, delete, truncate on public.market_benchmarks from authenticated;

create or replace function public.admin_upsert_benchmark(p_code text, p_name text, p_value numeric, p_unit text, p_as_of date, p_source_name text, p_source_url text, p_note text)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  perform public._require_admin();
  if p_source_url is null or p_source_url !~ '^https://' then raise exception 'SUMBER_WAJIB_HTTPS'; end if;
  if p_as_of is null or p_as_of > current_date then raise exception 'TANGGAL_TIDAK_VALID'; end if;
  if p_code is null or p_code !~ '^[a-z0-9_]{2,40}$' then raise exception 'KODE_TIDAK_VALID'; end if;
  insert into public.market_benchmarks (code, name, value, unit, as_of, source_name, source_url, note)
  values (p_code, trim(p_name), p_value, p_unit, p_as_of, trim(p_source_name), p_source_url, nullif(trim(coalesce(p_note,'')),''))
  on conflict (code) do update set name = excluded.name, value = excluded.value, unit = excluded.unit, as_of = excluded.as_of,
    source_name = excluded.source_name, source_url = excluded.source_url, note = excluded.note, updated_at = now();
  perform public._audit('upsert_benchmark', null, p_code || '=' || p_value::text);
end $$;

create or replace function public.admin_delete_benchmark(p_code text)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  perform public._require_admin();
  delete from public.market_benchmarks where code = p_code;
  perform public._audit('delete_benchmark', null, p_code);
end $$;
revoke all on function public.admin_upsert_benchmark(text,text,numeric,text,date,text,text,text) from public, anon;
revoke all on function public.admin_delete_benchmark(text) from public, anon;
grant execute on function public.admin_upsert_benchmark(text,text,numeric,text,date,text,text,text) to authenticated;
grant execute on function public.admin_delete_benchmark(text) to authenticated;

-- Isi awal: hanya angka yang sudah dicek ke halaman resmi / lembaga pemerintah pada 24 Nov 2026.
insert into public.market_benchmarks (code, name, value, unit, as_of, source_name, source_url, note) values
 ('bi_rate','Suku bunga acuan BI (BI-Rate)',6.00,'persen','2026-11-18','Bank Indonesia','https://www.bi.go.id/en/iru/highlight-news/Pages/BI-Rate-Raised-25-bps-to-6.00-percent-Strengthening-Stability,-Supporting-Economic-Growth.aspx','Naik 25 bps pada Rapat Dewan Gubernur 17-18 Nov 2026'),
 ('kurs_usd','Kurs rupiah per 1 dolar AS',18245,'rupiah','2026-11-17','Bank Indonesia','https://www.bi.go.id/en/iru/highlight-news/Pages/BI-Rate-Raised-25-bps-to-6.00-percent-Strengthening-Stability,-Supporting-Economic-Growth.aspx','Posisi 17 Nov 2026'),
 ('inflasi_yoy','Inflasi tahunan (IHK)',3.23,'persen','2026-10-31','Bank Indonesia','https://www.bi.go.id/en/iru/highlight-news/Pages/BI-Rate-Raised-25-bps-to-6.00-percent-Strengthening-Stability,-Supporting-Economic-Growth.aspx','Inflasi Oktober 2026'),
 ('lps_tbp_umum','Bunga penjaminan LPS, rupiah bank umum',3.75,'persen','2026-10-01','InfoPublik (portal pemerintah)','https://infopublik.id/kategori/nasional-ekonomi-bisnis/991626/lps-pertahankan-tingkat-bunga-penjaminan','Berlaku 1 Okt 2026 sampai 31 Jan 2027')
on conflict (code) do nothing;
