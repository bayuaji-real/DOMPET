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

## Putaran QA 20 Nov 2026 (sore), di live setelah deploy 20f1313

### BUG-022 Analitik selalu kosong untuk pengguna asli (server query tanpa login)
Severity: S1 | Case: F06 | Bukti: log Supabase, request `rpc/get_financial_analytics` dan `goal_progress` dari user-agent `node` dengan role kosong (anon); hasil `wallets: []` padahal ada 4 dompet.
Penyebab: lib/data/analytics.ts dijalankan di server (/api/analytics, /analisis) tapi memakai klien Supabase browser yang tidak membawa cookie login, sehingga RLS mengembalikan nol. Begitu ada transaksi, Beranda > Analisis, halaman Analisis, dan Insight AI tetap Rp0.
Status: fixed (analitik memakai klien server yang membaca cookie)

### BUG-023 "Hari ini" di Analisis dikunci ke 20 Nov 2026
Severity: S1 | resolveDateRange memakai `new Date("2026-11-20T12:00:00Z")`. Mulai 21 Nov angka "Minggu/Bulan ini" salah; Desember tetap menampilkan November.
Status: fixed (pakai tanggal WIB sebenarnya; halaman /analisis dirender per permintaan + muat ulang data saat dibuka). Tes dikunci ke tanggal tetap.

### BUG-024 Transaksi jam 00:00–06:59 WIB tercatat di tanggal kemarin
Severity: S2 | Bukti SQL: `'2026-11-20T18:30:00Z'::date` = 2026-11-20 (padahal 21 Nov 01:30 WIB). Catat manual, quick bar, transfer, suara ("tadi"/"kemarin"), dan struk tanpa tanggal memakai toISOString (UTC). Di tanggal 1 dini hari transaksi masuk ke bulan sebelumnya.
Status: fixed (semua memakai todayJakarta(); resolveRelativeDate dihitung di WIB, ada tes dini hari)

### BUG-025 Jadwal gajian & tagihan berulang dari Pengaturan selalu dibuat di November 2026
Severity: S2 | Kode: `2026-11-${tanggal}`. Status: fixed (tanggal terdekat yang akan datang, dipotong ke akhir bulan)

### BUG-026 Tagihan berulang tanggal 29–31 meloncat bulan (31 Jan → 3 Mar)
Severity: S3 | Status: fixed (nextMonthOnDay, dipotong ke akhir bulan; ada tes)

### BUG-027 Pembagian gaji tanpa tanggal dicatat pada 20 Nov 2026
Severity: S3 | processPaydayAllocation default "2026-11-20". Status: fixed (todayJakarta)

### BUG-028 Status "Kritis" padahal belum ada data
Severity: S3 | Akun tanpa transaksi bulan ini mendapat label merah "Kondisi Kritis". Status: fixed (status "Belum ada data"; dana darurat "belum" bila biaya hidup belum diisi; ada tes)

### BUG-029 Mikrofon tetap menyala setelah pindah halaman saat merekam
Severity: S3 | Quick bar hanya ada di Beranda; pindah tab saat merekam membuat bar hilang tapi mic tetap aktif. Modal suara juga tidak mematikan mic saat dilepas.
Status: fixed (rekaman dihentikan tanpa diproses saat pindah halaman / modal dilepas)

### Dicek, bukan bug
- Header menempel saat scroll, lonceng notifikasi, menu tema (Terang/Gelap/Sistem), halaman More: OK di live.
- Halaman sempat "Memuat…" ±7 detik: terjadi karena panel browser uji sedang tersembunyi (timer diperlambat). Pindah halaman normal 0,15–0,7 detik.
- Header keamanan (X-Frame-Options DENY dll.) aktif di semua halaman.

### Masih terbuka (bukan bug, fitur)
- Edit transaksi belum ada (sementara: hapus lalu catat ulang).
- Peringatan saldo dompet jadi minus (S4).
- ESLint: aturan gaya lama (any, set-state-in-effect), tidak memengaruhi fungsi.

## Putaran 20 Nov 2026 (malam)

### BUG-030 Foto profil tidak sama di perangkat lain
Severity: S2 | Foto hanya disimpan di localStorage HP (sengaja tidak di cookie untuk menghindari 494), jadi perangkat lain tetap melihat foto lama.
Status: fixed (bucket publik `avatars` di Supabase Storage, path {user_id}/avatar-*.jpg, RLS hanya pemilik yang boleh tulis; di akun hanya disimpan URL-nya. Foto lama di HP otomatis diunggah sekali saat app dibuka.)

### BUG-031 Halaman login masih memakai logo berkotak
Severity: S4 | Status: fixed (logo transparan). Ikon PWA/splash yang sudah terpasang di HP baru berubah setelah PWA dipasang ulang.

### BUG-032 Keyboard HP menutupi kolom di halaman login
Severity: S3 | Halaman dipusatkan vertikal + overflow-hidden, jadi tidak bisa digeser saat keyboard muncul.
Status: fixed (viewport interactive-widget=resizes-content, halaman bisa di-scroll, kolom yang diketuk digeser ke tengah)

### BUG-033 Tambah dompet "berhasil" padahal gagal tersimpan
Severity: S2 | createWallet mengembalikan dompet palsu lokal saat DB menolak, juga di production. Status: fixed (production mengembalikan null + pesan gagal)

## Fitur baru
- Edit transaksi (Riwayat > detail > Ubah): nominal, judul, toko, kategori, dompet (asal/tujuan untuk transfer), tanggal. Jenis transaksi tidak bisa diubah.
- Split Bill (/split-bill): item per orang, diskon/pajak/service proporsional, ongkir rata atau proporsional, pembulatan pas total, salin/bagikan WhatsApp, catat bagianku ke Riwayat. Tes: src/lib/split-bill.test.ts.
- Rencana Keuangan AI (/rencana): jadwal gajian, biaya hidup, tagihan bulanan & target tabungan dari app (+ kebutuhan tambahan), dibagi berurutan sesuai tenggat kelipatan Rp50.000, status tepat waktu/telat, saran tempat simpan sesuai jangka waktu; Gemini menjelaskan + menyarankan dompet (tombol Buat). Tes: src/lib/financial-plan.test.ts.
- More: "Catat Manual" dihapus (masih bisa lewat ikon pensil di quick bar Beranda); ditambah Rencana Keuangan AI dan Split Bill.
