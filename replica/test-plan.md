# Rencana tes Dompetku

Legenda: [A] otomatis (vitest/SQL/Playwright), [M] manual di HP.

## F01 Login/daftar
- H1 login benar masuk Beranda [M]; E1 email kosong/format salah [A e2e]; N1 password salah → pesan error [M]
- E2 logout lalu login lagi, data tetap ada [M]; E3 sesi habis → diarahkan ke /login [A e2e]
- Tidak ada tombol demo, tidak ada teks "(PWA)" [A e2e]

## F02 Beranda
- H1 saldo total = jumlah saldo dompet [A SQL]; H2 "+ Tambah Dompet" membuka form dompet [A e2e]
- E1 akun kosong tidak menampilkan data contoh [A e2e]

## F03 Tambah transaksi (bar quick entry melayang)
- H1 ketik "Nasi padang 25rb gopay" → konfirmasi [M]; H2 suara [M]; H3 foto struk [M]
- E1 bar tidak menempel ke tepi bawah, tidak tampil di /login dan /tambah [A e2e]
- E2 double klik kirim, teks kosong, emoji, teks sangat panjang [A e2e]; N1 AI error → pesan ramah [M]

## F04 Transaksi
- H1 filter dropdown (Semua/Struk/Pengeluaran/Pemasukan) [A e2e]; E1 daftar kosong [A e2e]

## F05 Dompet
- H1 tambah/edit/arsip dompet [M]; E1 dompet bertransaksi tak bisa dihapus [A SQL T8]

## F06 Tabungan + timeline
- H1 setor/tarik mengubah saldo target [A SQL T2/T3]; H2 timeline per tabungan: grafik, skala tanggal/minggu/bulan, cek tanggal [A vitest + M]
- E1 target sudah penuh → "Sudah penuh" [A vitest]; E2 goal bersetoran tak bisa dihapus [A SQL T9]

## F07 Analisis
- H1 grafik arus kas kosong bila belum ada transaksi [A e2e]

## F08 Pengaturan & profil
- H1 foto dari galeri HP >5MB bisa dipasang [M]; E1 file bukan gambar ditolak [A e2e]; H2 hamburger membuka side bar berisi semua menu [A e2e]
- Header selalu menampilkan nama user di semua tab [A e2e]

## F09 Keamanan
- RLS aktif semua tabel [A SQL]; view security_invoker [A SQL]; bucket receipts privat [A SQL]
- /api/* tanpa login → 401 [M curl dari Mac]; cookie sesi < 4KB [M]; demo mode mati di production [A e2e]
