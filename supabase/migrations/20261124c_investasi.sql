-- Modul investasi: portofolio manual pengguna + data pasar (hanya baca untuk pengguna).
create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null check (kind in ('reksa_dana','saham','emas','lainnya')),
  units numeric not null check (units >= 0),
  avg_price numeric not null check (avg_price >= 0),
  last_price numeric check (last_price is null or last_price >= 0),
  last_price_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.holdings enable row level security;
create policy holdings_select on public.holdings for select to authenticated using (user_id = (select auth.uid()));
create policy holdings_insert on public.holdings for insert to authenticated with check (user_id = (select auth.uid()));
create policy holdings_update on public.holdings for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy holdings_delete on public.holdings for delete to authenticated using (user_id = (select auth.uid()));
create index if not exists holdings_user on public.holdings(user_id);

create table if not exists public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('pasar_uang','pendapatan_tetap','campuran','saham')),
  risk text not null check (risk in ('rendah','sedang','tinggi')),
  ret_1m numeric,
  ret_ytd numeric,
  ret_1y numeric,
  aum numeric,
  as_of date not null,
  source_url text not null
);
alter table public.market_snapshots enable row level security;
create policy market_snapshots_read on public.market_snapshots for select to authenticated using (true);
revoke insert, update, delete on public.market_snapshots from anon, authenticated;

insert into public.market_snapshots (name, category, risk, ret_1m, ret_ytd, ret_1y, aum, as_of, source_url) values
  ('Insight Money','pasar_uang','rendah',0.43,null,5.10,563000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('Avrist Ada Kas Mutiara','pasar_uang','rendah',0.43,null,4.76,537000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('Majoris Pasar Uang Syariah Indonesia','pasar_uang','rendah',0.47,null,4.59,2870000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('TRIM Kas 2 Kelas A','pasar_uang','rendah',0.46,null,4.44,8800000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('Syailendra Sharia Money Market Fund Kelas A','pasar_uang','rendah',0.44,null,4.42,915000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('Trimegah Dana Obligasi Nusantara','pendapatan_tetap','sedang',-0.32,null,4.86,177000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('Syailendra Sharia Fixed Income Fund Kelas A','pendapatan_tetap','sedang',-0.23,null,5.37,2530000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('Trimegah Dana Tetap Syariah Kelas A','pendapatan_tetap','sedang',-0.40,null,3.31,4170000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('TRIM Dana Tetap 2 Kelas A','pendapatan_tetap','sedang',-0.24,null,1.62,1410000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('Syailendra Pendapatan Tetap Premium Kelas A','pendapatan_tetap','sedang',-0.32,null,3.89,1460000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('Sucorinvest Sharia Balanced Fund','campuran','sedang',-1.35,null,4.19,1010000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('Sucorinvest Premium Fund Kelas A','campuran','sedang',-1.43,null,2.33,876000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('TRAM Alpha','campuran','sedang',-3.51,null,-4.29,112000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('Setiabudi Dana Campuran','campuran','sedang',-2.86,null,-4.99,65000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('Sucorinvest Citra Dana Berimbang','campuran','sedang',-5.48,null,-9.27,163000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('Sucorinvest Maxi Fund Kelas A','saham','tinggi',-4.03,null,1.23,1050000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('Sucorinvest Equity Fund Kelas A','saham','tinggi',-3.35,null,-9.30,1410000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('Batavia Dana Saham Optimal','saham','tinggi',-6.48,null,-20.18,145000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('Sequis Equity Maxima','saham','tinggi',-7.17,null,-21.84,191000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('Manulife Dana Saham Kelas A','saham','tinggi',-4.54,null,-18.91,1590000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('BNP Paribas Sri Kehati Kelas RK1 (indeks)','saham','tinggi',-0.67,null,-17.63,2090000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('Allianz SRI KEHATI Index Fund (indeks)','saham','tinggi',-0.69,null,-21.22,97000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('Syailendra MSCI Indonesia Value Index Fund Kelas A (indeks)','saham','tinggi',0.31,null,-22.79,252000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('BNP Paribas IDX Growth30 (indeks)','saham','tinggi',-5.15,null,-18.48,191000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana'),
  ('UOBAM Indeks Bisnis-27 (indeks)','saham','tinggi',-5.39,null,-26.14,221000000000,'2026-11-13','https://www.bareksa.com/berita/reksa-dana/2026-11-16/top-reksadana-november-2026-versi-bareksa-barometer-pasar-uang-untuk-parkir-dana');
