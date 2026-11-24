-- Harga paket 12 bulan: Rp99.000 (keputusan Owner 24 Nov 2026). Sudah diterapkan di staging dan production.
update public.payment_prices set amount = 99000 where months = 12;
