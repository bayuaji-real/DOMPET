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
Severity: S3 | Case: F09 | Actual: 200 tanpa login, menampilkan host Supabase dan status auth (tanpa data, RLS aman).
Status: fixed (sekarang wajib login)

### BUG-010 Header keamanan kurang (X-Frame-Options, CSP, nosniff, Referrer-Policy)
Severity: S4 | Hanya HSTS yang terpasang.
Status: fixed (nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy; CSP sengaja belum dipasang)

### BUG-011 Anggaran per kategori tidak bisa dimuat/disimpan (400 dari Supabase)
Severity: S2 | Case: F07 | Bukti: GET /rest/v1/budgets?month=eq.2026-11 → 400. Kolom `month` bertipe date, kode kirim "2026-11".
Lebih parah: gagal simpan di production diam-diam dianggap sukses (data tak tersimpan).
Status: fixed (bulan dikirim "YYYY-MM-01", gagal simpan sekarang terlihat sebagai pesan error)

### BUG-012 Badge "Telat" muncul di semua tabungan padahal tenggat belum lewat
Severity: S3 | Case: F06 | Penyebab: rencana setoran per gajian (planned_per_payday) kosong → dianggap telat; bertentangan dengan timeline.
Status: fixed (label "Belum ada rencana" kecuali tenggat sudah lewat)

### BUG-013 Side bar di desktop melekat ke tepi jendela, bukan frame aplikasi
Severity: S4 | Status: tidak relevan lagi (side bar dihapus)

### BUG-014 Pemasukan/Pengeluaran Bulan Ini di Beranda hanya menjumlah 5 transaksi terbaru
Severity: S1 (angka uang salah) | Case: F02 | Penyebab: total dihitung dari daftar "Transaksi Terbaru" (limit 5).
Status: fixed (total dihitung dari semua transaksi bulan berjalan)

### BUG-015 Layar pembuka (splash) HP menampilkan kotak hijau; foto profil gelap setelah dipilih
Severity: S3/S2 | Status: fixed (ikon "any" transparan + ikon maskable terpisah; pratinjau crop tidak lagi tereset setelah gambar termuat)

### BUG-016 Nama ikon kategori tampil sebagai teks ("utensils Makan...", "bike Transportasi")
Severity: S3 | Case: F03-H1 | Bukti: chip kategori di /tambah. Status: fixed (pakai emoji kategori)

### BUG-017 Tab "Scan Struk" dan "Pesan Suara" di /tambah hanya membuka Beranda
Severity: S2 | Case: F03-H3/H2 | Link ke /?scan=true dan /?voice=true tidak ditangani siapa pun.
Status: fixed (Beranda membuka pilihan foto struk / mulai merekam suara)

### BUG-018 Transaksi tidak bisa dihapus dari aplikasi
Severity: S2 | Case: F04 | Bukti: sheet detail hanya punya tombol Tutup; fungsi deleteTransaction tidak dipakai UI. Salah ketik nominal tak bisa dibetulkan.
Status: fixed (tombol Hapus dengan konfirmasi; edit transaksi belum ada)

### BUG-019 Riwayat tidak kosong lagi setelah transaksi terakhir dihapus
Severity: S3 | Daftar hanya diganti jika hasil query tidak kosong. Status: fixed (daftar selalu mengikuti database)

### BUG-020 Transfer / setor tabungan tampil sebagai "Pemasukan" di Riwayat
Severity: S2 | Case: F04 | Kode memetakan semua tipe selain expense menjadi PEMASUKAN (hijau, positif). Belum terlihat karena belum ada data transfer. Status: fixed (tampil netral biru dengan ikon panah dua arah, judul/kategori "Transfer"/"Tabungan", tidak ikut filter Pemasukan/Pengeluaran). Batas muat dinaikkan ke 500 transaksi.

## Hasil tes live (https://dompet-red.vercel.app, tanpa login)
- Semua 5 endpoint /api/* → 401, juga dengan ?demo=true dan header x-demo-mode (demo mati di production).
- Semua halaman terproteksi → redirect ke /login. Login: tanpa tombol demo, tanpa "(PWA)", validasi form kosong jalan, logo baru tampil.

## Uji tulis di live (dengan izin): catat pengeluaran Rp1.000 manual
Input "abc1x000" → "1.000" (huruf dibuang), emoji di catatan tersimpan, saldo Tunai jadi -1.000, tampil di Riwayat. Data uji sudah dihapus; saldo semua dompet kembali Rp0 dan jumlah transaksi 0.
Catatan: saldo dompet boleh minus tanpa peringatan (S4).

## Hasil tes logika uang (SQL, rollback, data asli tidak berubah)
9/9 lulus: saldo dompet, transfer, setor/tarik tabungan, tolak transfer ke dompet sama, tolak nominal 0/negatif, tolak setor tanpa goal, dompet/goal bertransaksi tak bisa dihapus.

## Keamanan
RLS aktif di 9 tabel dengan 4 policy tiap tabel; 2 view security_invoker; bucket receipts privat 5MB hanya gambar; semua route /api memverifikasi login; tidak ada secret di git.

## Perlu dicek (belum bisa direproduksi dari sini)
- Playwright tak bisa diunduh di lingkungan ini; jalankan `npx playwright install chromium && npx playwright test` di Mac.
- ENABLE_DEMO_MODE: sudah dicek di Vercel (project dompet), tidak ada. Aman, demo mati di production.
- Leaked Password Protection di Supabase Auth masih mati (opsional, aktifkan di dashboard).
- npm audit: 4 moderate di rantai dev (shadcn → ts-morph), tidak ikut production.
- ESLint: 77 error lama (mayoritas `any`, set-state-in-effect), S4, tidak memengaruhi fungsi.

### BUG-021 Header ikut ter-scroll (tidak menempel di atas)
Severity: S3 | Penyebab: kontainer frame memakai overflow-x-hidden sehingga `sticky` tidak bekerja. Status: fixed (overflow-x-clip)
