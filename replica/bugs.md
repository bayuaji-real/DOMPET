# Laporan bug Dompetku (QA 20 Nov 2026)

### BUG-001 Aplikasi tidak bisa dibuka di HP (494 REQUEST_HEADER_TOO_LARGE)
Severity: S1 | Case: F09 | Penyebab: foto profil base64 tersimpan di user_metadata → cookie sesi membengkak.
Status: fixed (metadata dibersihkan di DB, kode menolak data: URL; user perlu hapus cookie sekali)

### BUG-002 Foto profil gagal dipasang dari HP
Severity: S2 | Case: F08-H1 | Steps: pilih foto kamera HP (>5MB) di Profil.
Actual: ditolak "Ukuran foto maksimal 5MB" / berat dibaca. Expected: foto bisa dipasang.
Status: fixed (foto dikecilkan otomatis ke maks 1600px sebelum dipotong; pesan error jelas bila tidak terbaca)

### BUG-003 Header menampilkan judul halaman, bukan nama user
Severity: S3 | Case: F08 | Status: fixed (selalu nama user)

### BUG-004 "+ Tambah Dompet" di Beranda membuka tambah transaksi
Severity: S3 | Case: F02-H2 | Status: fixed

### BUG-005 Tren Arus Kas menampilkan data palsu saat akun kosong
Severity: S2 (angka salah) | Case: F07-H1 | Status: fixed

### BUG-006 Kotak samar di belakang logo login, tombol demo, teks "(PWA)"
Severity: S3 | Case: F01 | Status: fixed

### BUG-007 Header ikut blur saat sheet/fitur dibuka
Severity: S4 | Status: fixed

### BUG-008 Cookie sesi lama masih membuat 494 di browser yang pernah login
Severity: S1 untuk perangkat yang terdampak | Case: F09
Bukti: di browser pane ini cookie `sb-...-auth-token` terpecah jadi 168 potongan (538 KB); SEMUA halaman dan /api memberi 494 (Vercel menolak sebelum app jalan, jadi kode tak bisa menyembuhkan diri).
Status: workaround. Cookie dibersihkan di pane ini, lalu semua normal. Di HP: hapus data situs dompet-red.vercel.app atau buka lewat incognito sekali. Pencegahan sudah ada (data: URL tak lagi dikirim ke metadata).

### BUG-009 Halaman diagnostik /cek-data terbuka tanpa login
Severity: S3 | Case: F09 | Actual: 200 tanpa login, menampilkan host Supabase dan status auth (tanpa data, RLS aman). Saran: hapus atau lindungi sebelum dipakai umum.

### BUG-010 Header keamanan kurang (X-Frame-Options, CSP, nosniff, Referrer-Policy)
Severity: S4 | Hanya HSTS yang terpasang. Saran: tambah di next.config.ts headers().

## Hasil tes live (https://dompet-red.vercel.app, tanpa login)
- Semua 5 endpoint /api/* → 401, juga dengan ?demo=true dan header x-demo-mode (demo mati di production).
- Semua halaman terproteksi → redirect ke /login. Login: tanpa tombol demo, tanpa "(PWA)", validasi form kosong jalan, logo baru tampil.

## Hasil tes logika uang (SQL, rollback, data asli tidak berubah)
9/9 lulus: saldo dompet, transfer, setor/tarik tabungan, tolak transfer ke dompet sama, tolak nominal 0/negatif, tolak setor tanpa goal, dompet/goal bertransaksi tak bisa dihapus.

## Keamanan
RLS aktif di 9 tabel dengan 4 policy tiap tabel; 2 view security_invoker; bucket receipts privat 5MB hanya gambar; semua route /api memverifikasi login; tidak ada secret di git.

## Perlu dicek (belum bisa direproduksi dari sini)
- Playwright tak bisa diunduh di lingkungan ini; jalankan `npx playwright install chromium && npx playwright test` di Mac.
- Pastikan env `ENABLE_DEMO_MODE` TIDAK ada / bukan true di Vercel (kalau true, API terbuka tanpa login).
- Leaked Password Protection di Supabase Auth masih mati (opsional, aktifkan di dashboard).
- npm audit: 4 moderate di rantai dev (shadcn → ts-morph), tidak ikut production.
- ESLint: 77 error lama (mayoritas `any`, set-state-in-effect), S4, tidak memengaruhi fungsi.
