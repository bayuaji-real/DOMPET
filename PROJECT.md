# PROJECT: Dompetku

Aplikasi catatan keuangan pribadi berbahasa Indonesia, didesain mobile-first untuk digunakan sendiri di HP.

---

## 📌 Konteks Proyek

- **Nama App:** Dompetku (dapat disesuaikan)
- **Pengguna:** 1 orang (pemula keuangan, berdomisili di Indonesia)
- **Mata Uang:** Rupiah (IDR) saja.

### Fitur Utama:
1. **Pencatatan Transaksi (Pemasukan & Pengeluaran):**
   - Input manual cepat dan ramah pemula.
   - Pindai/foto struk belanja (OCR via Gemini API).
   - Catat via pesan suara / voice note (Transkripsi & ekstraksi entitas via Gemini API).
2. **Multi-Dompet / Kantong Keuangan:**
   - Bank, e-wallet, tunai, reksa dana/investasi.
   - Setiap transaksi wajib memilih dompet asal/tujuan.
3. **Tabungan & Impian (Goals/Targets):**
   - Target nominal, saldo saat ini, tenggat waktu (deadline), lokasi penyimpanan dompet.
   - Estimasi setoran per periode gajian dan proyeksi tanggal tercapai penuh.
4. **Analisis & Wawasan Keuangan:**
   - Ringkasan bulanan (cashflow).
   - Visualisasi per kategori dan per dompet.
   - Tren pengeluaran dan smart insight.

---

## 🛠️ Tech Stack & Arsitektur

- **Frontend & Framework:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **PWA:** Installable Mobile-First PWA (Manifest, Icons, Offline fallback, Add to Home Screen)
- **Backend & Database:** Supabase (PostgreSQL, Supabase Auth, Storage untuk struk & audio, Edge Functions/Server Actions)
- **AI & Multimodal:** Google Gemini API (Gemini 2.5/Flash) untuk OCR struk dan ekstraksi voice note
- **Visualisasi Grafik:** Recharts
- **Testing:** Vitest
- **Deployment:** Vercel

---

## 🗄️ Skema Database Supabase (Public Schema)

Koneksi: `https://yupcalxuirodvfwovtzu.supabase.co`

### Tabel:
- **`wallets`**: `id`, `user_id`, `name`, `type ('bank'|'ewallet'|'cash'|'investasi')`, `initial_balance`, `color`, `icon`, `is_archived`, `sort_order`
- **`categories`**: `id`, `user_id`, `name`, `type ('income'|'expense')`, `icon`, `color`, `is_default`, `sort_order`
- **`savings_goals`**: `id`, `user_id`, `name`, `target_amount`, `initial_amount`, `deadline`, `storage_place`, `storage_wallet_id`, `planned_per_payday`, `priority`, `status ('aktif'|'tercapai'|'dibatalkan')`, `is_emergency_fund`, `notes`
- **`transactions`**: `id`, `user_id`, `type`, `amount`, `wallet_id`, `to_wallet_id`, `category_id`, `goal_id`, `date`, `note`, `merchant`, `source ('manual'|'voice'|'receipt'|'recurring'|'payday')`, `receipt_path`
- **`budgets`**: `id`, `user_id`, `category_id`, `month`, `limit_amount`
- **`recurring_transactions`**: `id`, `user_id`, `type`, `amount`, `wallet_id`, `category_id`, `note`, `rule ('monthly'|'biweekly')`, `day_of_month`, `next_date`, `is_active`
- **`payday_schedule`**: `id`, `user_id`, `date`, `expected_amount`, `actual_amount`, `note`
- **`user_settings`**: `user_id (PK)`, `living_cost_per_payday (default 400000)`, `default_wallet_id`, `pin_hash`, `pin_enabled`, `hide_balance`
- **`ai_insights`**: `id`, `user_id`, `period_start`, `period_end`, `content (jsonb)`

### Views:
- **`wallet_balances`**: Semua kolom `wallets` + `balance` (saldo terhitung otomatis)
- **`goal_progress`**: Semua kolom `savings_goals` + `saved`, `remaining`, `percent`

### Storage:
- Bucket privat `'receipts'`, path wajib diawali `{user_id}/`

### Aturan Transaksi (`transactions.type`):
- `income`: `wallet_id` bertambah. Wajib `to_wallet_id` & `goal_id` null.
- `expense`: `wallet_id` berkurang. Wajib `to_wallet_id` & `goal_id` null.
- `transfer`: `wallet_id` → `to_wallet_id`. Wajib `category_id: null`.
- `goal_deposit`: `wallet_id` berkurang; jika `to_wallet_id` diisi, dompet itu bertambah. Wajib `goal_id`.
- `goal_withdraw`: `wallet_id` bertambah; jika `to_wallet_id` diisi, dompet itu berkurang. Wajib `goal_id`.
- `transfer`, `goal_deposit`, `goal_withdraw` TIDAK dihitung sebagai pemasukan/pengeluaran di analisis.
- `user_id` terisi otomatis (`default auth.uid()`).
- Kategori default & `user_settings` otomatis dibuat oleh trigger database saat user mendaftar.

---

## 📐 Aturan Teknis Wajib

1. **Mata Uang & Angka:**
   - Semua nominal disimpan dalam bentuk integer/`BIGINT` rupiah utuh (tanpa desimal, tanpa sen).
   - Format tampilan UI: `Rp1.250.000` tanpa tanda plus (+) atau minus (-). Pembedaan transaksi murni menggunakan warna (merah untuk pengeluaran, hijau/teal untuk pemasukan).
2. **Waktu & Tanggal:**
   - Zona waktu: `Asia/Jakarta` (WIB, UTC+7).
   - Format tampilan: `20 Nov 2026`.
3. **Bahasa UI:**
   - Seluruh teks antarmuka menggunakan bahasa Indonesia santai, hangat, dan mudah dipahami pemula keuangan.
4. **Keamanan & Kredensial:**
   - API key (Gemini API, Supabase Service Role Key) **HARAM** bocor ke client-side bundle.
   - Gunakan Server Actions / Next.js Server Route Handler atau Edge Function.
   - Gunakan `.env.local` dan pastikan masuk ke `.gitignore`.
5. **Integritas Saldo:**
   - Saldo dompet dan saldo tabungan **DIHITUNG** secara kalkulatif dari riwayat transaksi (bukan field saldo yang diedit manual), kecuali nilai saldo awal (initial balance transaction).
6. **Desain Mobile-First:**
   - Optimasi viewport mobile (lebar dasar ~390px, centered di layar desktop).
   - Bottom navigation 5 menu: Beranda, Transaksi, [+] Tambah, Tabungan, Analisis.
   - Dukungan Dark Mode & tema warna tenang (hijau/teal untuk pemasukan, merah lembut untuk pengeluaran).
7. **Quality Gate:**
   - Setiap fitur selesai: jalankan build/dev, buka dan tes di browser, verifikasi console clean tanpa error sebelum konfirmasi selesai.

---

## 🚀 Progres Pengerjaan

### Phase 0: Fondasi Proyek, Autentikasi, & Mobile Shell (SELESAI ✅)
- [x] Inisialisasi proyek Next.js + TypeScript + Tailwind CSS + shadcn/ui
- [x] Integrasi Supabase SSR (`@supabase/ssr`), buat template `.env.local.example`
- [x] Supabase Auth (Email + Password) & Route Protection (Middleware)
- [x] Mobile Layout (Container 390px, Safe Area, Bottom Navigation 5 menu bersih tanpa elemen menumpuk)
- [x] Quick Entry Bar terintegrasi di dalam modal tombol [+] Tambah (kamera struk di kiri, input santai di tengah, tombol mic/kirim di kanan)
- [x] Konfigurasi PWA (Web App Manifest, theme color, icons, meta tags)
- [x] Skema Tema & Styling (Hijau/Teal pemasukan, Merah lembut pengeluaran, Dark mode support)
- [x] Pengujian browser & verifikasi console bebas error (Terverifikasi di http://localhost:3000)

### Phase 1: Database Schema & Lapisan Data (SELESAI ✅)
- [x] Hubungkan kredensial Supabase di `.env.local`
- [x] Generate TypeScript database types di `src/types/database.ts`
- [x] Client Supabase bertipe ketat (`createBrowserClient<Database>`, `createServerClient<Database>`)
- [x] Modul lapisan data di `src/lib/data/` (wallets, categories, transactions, goals, payday, settings)
- [x] Utilitas format finansial & tanggal di `src/lib/utils.ts` + 14 unit tests Vitest lulus 100%
- [x] Halaman sementara `/cek-data` terhubung live ke Supabase
- [x] Dokumentasi skema lengkap di `PROJECT.md`

### Phase 3 / Fitur Tabungan: Halaman Tabungan & Proyeksi Finansial (SELESAI ✅)
- [x] Logika proyeksi tabungan terisolasi di `src/lib/savings.ts` (hitung mundur hari, status otomatis: tercapai/sesuai jadwal/telat, rekomendasi setoran kelipatan Rp50.000 jika telat)
- [x] Unit test Vitest 100% lulus (20/20 skenario uji di `savings.test.ts` dan `utils.test.ts`)
- [x] Halaman Tabungan (`/tabungan`) lengkap dengan Ringkasan Atas (Total Terkumpul, Total Target, Total Kekurangan)
- [x] Kartu per tujuan tabungan dengan badge status otomatis, badge tempat simpan, persentase, sisa kekurangan, dan hitung mundur
- [x] Sheet Detail Tabungan dengan panel proyeksi cerdas, peringatan jadwal telat, grafik Recharts (Aktual vs Rencana), dan riwayat mutasi
- [x] Alur in-sheet Setor Uang & Tarik Uang (mutasi `goal_deposit` dan `goal_withdraw`)
- [x] Form modal Tambah & Edit Tabungan
- [x] Terverifikasi di browser dengan Data Seed "Lamaran" (saldo Rp2.100.000, target Rp6.000.000, tenggat 25 Des 2026, status Telat -> Setor Rp400.000 naik ke Rp2.500.000)
- [x] Revisi modal [+] di navbar: hilangkan tanda 'X' (cukup klik di luar untuk cancel) dan ubah tombol menjadi "Input Manual" yang bersih tanpa tombol "Buka ->"
- [x] Refinement warna halaman Tabungan: hilangkan warna oranye/amber sepenuhnya, sesuaikan kartu "Lamaran" (badge dan progress bar) menggunakan tema hijau/teal konsisten seperti kartu "Dana Darurat"

### Phase 4: Pencatatan Transaksi dari Foto Struk (OCR Gemini AI) (SELESAI ✅)
- [x] Pilihan input foto dari bottom sheet [+] (opsi "Buka Kamera" capture=environment dan "Pilih dari Galeri")
- [x] Kompresi gambar di sisi klien (`src/lib/image-compression.ts`, maks 1600px, JPEG 0.8)
- [x] Copywriting ramah proses scan: *"Sedang membaca struk belanjamu"* dengan animasi pemindaian AI
- [x] Helper upload Supabase Storage privat bucket `receipts` (`{user_id}/{tanggal}/{uuid}.jpg`) & signed URL generator (`src/lib/storage.ts`)
- [x] Server Route `/api/scan-receipt` dengan Google Gemini API live (`@google/genai` v1beta multimodal)
- [x] Prompt cerdas struk Indonesia: deteksi Total Akhir setelah diskon/pajak/pembulatan, nama toko, tanggal, item rincian, saran kategori & dompet pengguna, dan confidence score
- [x] Keterangan Pajak & Rincian Pembayaran (Subtotal, Pajak PPN/PB1, Service Charge, Diskon, Pembulatan Kasir)
- [x] Layar Konfirmasi Struk (`ReceiptConfirmationSheet`) dengan thumbnail struk mini (tap-to-zoom), field dropdown & input yang terpusat vertikal rapi, accordion item barang, banner peringatan bila confidence < 0.7, dan pesan ramah fallback jika foto buram
- [x] Detail transaksi (`/transaksi`): menampilkan badge "Struk", thumbnail bukti struk belanja, kartu rincian pajak, dan modal lightbox layar penuh
- [x] Pengujian live dengan 2 contoh struk nyata (Indomaret Point: Rp 82.500 setelah diskon Rp 5.000 via GoPay, dan Kopi Kenangan: Rp 71.000 setelah PB1 & SC via Tunai)
- [x] Refinement UI: Dropdown kaku native `<select>` diganti dengan custom modal picker playful `rounded-3xl` (kartu dompet berikon, subtitle tipe akun, grid kategori berikon, centang teal aktif), panah ganda dibersihkan jadi chevron tunggal, dan layar scan struk dibersihkan hanya menyisakan headline "Sedang membaca struk belanjamu".
- [x] Unit test Vitest 100% lulus (25/25 test di `receipt.test.ts`, `utils.test.ts`, dan `savings.test.ts`) serta verifikasi browser QA live

### Phase 5: Catat Transaksi Lewat Suara & Ketik Cepat (SELESAI ✅)
- [x] Server Route `/api/voice-transaction` dengan Gemini API multimodal (`generateJson`) untuk parsing audio langsung & kalimat teks bebas
- [x] Dukungan penuh bahasa gaul & angka lisan Indonesia (*goceng, ceban, noban, gocap, cepek, 15rb, dua ratus rebu, 1,5 juta, dua setengah juta*)
- [x] Fitur multi-transaksi: mengekstrak beberapa transaksi sekaligus dari 1 rekaman/kalimat
- [x] Konversi waktu relatif (*tadi pagi, kemarin, kemarin lusa*) otomatis ke tanggal YYYY-MM-DD zona `Asia/Jakarta`
- [x] Pencocokan otomatis nama dompet & kategori pengguna dengan fallback aman ke dompet default
- [x] Modal Perekam Suara (`VoiceRecordingModal`) dengan tombol mic besar, timer 60 detik, animasi gelombang audio (*waveform*), dan kolom input *"Ketik Cepat"*
- [x] Layar Konfirmasi Multi-Transaksi (`VoiceConfirmationSheet`) dengan transkrip AI, kartu transaksi individual (toggle tipe, nominal Rp, keterangan, tanggal, dompet, kategori), tombol hapus, dan ringkasan total
- [x] Batch insert ke database Supabase dengan `source='voice'` dan event dispatch `transaction_created`
- [x] Halaman Riwayat Transaksi (`/transaksi`) terhubung live query ke Supabase dan langsung menampilkan transaksi baru di urutan teratas
- [x] Modul utilitas & 12 unit test Vitest di `src/lib/voice.ts` dan `src/lib/voice.test.ts` (total 37/37 unit test lulus 100%)
- [x] Terverifikasi live di browser dengan kalimat uji: *"tadi makan bakso lima belas ribu terus isi bensin dua puluh ribu pakai gopay, sama gajian masuk dua setengah juta ke BCA"* -> berhasil mengekstrak 3 transaksi dan tersimpan ke Supabase (HTTP 201 Created)

### Phase 6: Halaman Analisis & Wawasan Keuangan (SELESAI ✅)
- [x] Pemilih periode di atas: Minggu ini / Bulan ini (default) / Bulan lalu / 3 bulan / Kustom (rentang tanggal).
- [x] Aturan agregasi finansial: Transfer antar dompet dan setoran ke tabungan (`goal_deposit` / `goal_withdraw`) **TIDAK** dihitung sebagai pengeluaran atau pemasukan belanja.
- [x] Ringkasan Arus Kas (Grid 2x2): Total pemasukan, pengeluaran, selisih (cashflow), dan rasio menabung (% dari pemasukan yang masuk tabungan) lengkap dengan perbandingan terhadap periode sebelumnya (% naik/turun).
- [x] Donut Chart pengeluaran per kategori via Recharts + daftar kategori terurut dengan nominal rupiah dan persentase porsi belanja.
- [x] Bar Chart tren arus kas 6 bulan terakhir (Pemasukan vs Pengeluaran per bulan) dengan visualisasi warna teal & rose.
- [x] Area Chart pengeluaran harian + garis/label rata-rata pengeluaran per hari (`dailyAverage`).
- [x] Distribusi pengeluaran per dompet/rekening menggunakan `WalletIcon` dan visual progress bar persentase belanja.
- [x] Tab switcher Top 5 transaksi terbesar & daftar toko/merchant yang paling sering dikunjungi beserta frekuensi kunjungan.
- [x] Kartu "Kesehatan Keuangan" dengan status dinamis Sehat / Waspada / Kritis:
  * Rasio menabung: >20% sehat, 10–20% waspada, <10% kritis
  * Dana darurat: ≥3 bulan biaya hidup sehat, 1–3 waspada, <1 kritis
  * Tabungan bertenggat sesuai jadwal: on-track / telat
- [x] Wawasan Otomatis (*Insight AI ✨*): Tombol "Insight AI" memicu Route Handler `/api/ai-insights` yang mengirimkan ringkasan angka agregasi ke Gemini API, menghasilkan 3–5 poin wawasan berbahasa Indonesia santai + 1 rekomendasi konkret (*actionable tip*), dicache di database Supabase per user & periode agar hemat panggilan API.
- [x] Arsitektur Agregasi Database: Disediakan SQL function / RPC Supabase (`get_financial_analytics`) di `scripts/create_analytics_rpc.sql` serta fallback agregasi server-side lengkap.
- [x] Script Seed Data Contoh 2 Bulan (`scripts/seed-analytics-sample.ts`) dengan flag pembersihan `--cleanup` via `npm run seed:analytics:clean`.
- [x] Format nominal bersih tanpa tanda plus (`+`) atau minus (`-`) pada seluruh komponen transaksi & analisis (murni dibedakan via warna merah untuk pengeluaran, teal/hijau untuk pemasukan).
- [x] Copywriting konsisten & ringkas: Menggunakan label **"Insight AI ✨"**.
- [x] Server-side rendering (SSR) dengan `initialData` di `page.tsx` memastikan halaman terbuka seketika tanpa flash loading.
- [x] Unit test Vitest 100% lulus (6/6 test di `src/lib/analytics.test.ts`, total 44/44 test di seluruh suite).

### Phase 7: Fitur Finansial Lanjutan & Pengaturan (SELESAI ✅)
- [x] **Copywriting Update:** Tombol dan kartu wawasan AI di halaman `/analisis` menggunakan label ringkas & jelas: **"Insight AI ✨"**.
- [x] **A. Mode Gajian (Payday Mode):**
  * Deteksi otomatis hari gajian dari `payday_schedule`. Beranda menampilkan kartu cerdas *"Gajian hari ini 🎉"*.
  * Input nominal gaji yang benar-benar masuk + pilih dompet penerima.
  * Aplikasi menyarankan pembagian otomatis: biaya hidup (default Rp400.000 dari `user_settings`), setoran ke tiap target tabungan sesuai `planned_per_payday` dan prioritas (`P1`, `P2`), serta perhitungan sisa "Dana Bebas" secara real-time.
  * Tombol *"Bagi sekarang"* mengeksekusi pencatatan pemasukan gaji (`type='income'`, `source='payday'`) dan setoran batch ke tabungan (`type='goal_deposit'`, `source='payday'`) secara atomik.
- [x] **B. Transaksi Berulang (Recurring Transactions):**
  * Kelola daftar tagihan rutin (contoh: Langganan Claude Pro Rp416.000 tiap tgl 20, Internet Indihome Rp320.000, Spotify Family Rp55.000).
  * Saat jatuh tempo (atau lewat jatuh tempo), kartu *"Tagihan Hari Ini ⚡"* muncul otomatis di Beranda dengan tombol aksi **"✓ Catat"** (mencatat pengeluaran `source='recurring'` & memajukan `next_date` ke bulan depan) atau **"Lewati"** (hanya memajukan `next_date`).
- [x] **C. Anggaran per Kategori (Budgets):**
  * Atur batas pengeluaran bulanan per kategori di tabel `budgets`.
  * Visualisasi progress bar dinamis di halaman Analisis (`/analisis`) dengan status otomatis:
    - Hijau / Teal: Aman (<80% pemakaian)
    - Kuning / Amber: Waspada (80% – 99% pemakaian)
    - Merah: Kritis / Over Budget (≥100% pemakaian)
  * Modal interaktif *"Atur Batas Anggaran"* untuk mengubah target limit langsung dari halaman Analisis.
- [x] **D. Export & Backup Data:**
  * Export riwayat transaksi periode tertentu ke format **CSV** dengan prefix UTF-8 BOM (`\uFEFF`) sehingga dapat langsung dibuka rapi di Microsoft Excel, Google Sheets, atau Apple Numbers tanpa karakter rusak.
  * Export pencadangan menyeluruh (**JSON Backup**) mencakup seluruh data saldo dompet, transaksi, target tabungan, dan preferensi pengguna.
- [x] **E. Keamanan (Sembunyikan Saldo):**
  * Ikon mata interaktif (`Eye` / `EyeOff`) di header kartu saldo Beranda.
  * Menyembunyikan seluruh nominal sensitif (Saldo Total, Pemasukan/Pengeluaran Bulan Ini, saldo per dompet) menjadi masking `••••••••`.
  * Preferensi tersimpan persisten di browser (`localStorage.getItem("dompet_hide_balance")`).
- [x] **F. Pengaturan Lengkap (`/pengaturan`):**
  * Tab *Umum & Gaji*: Memilih dompet default, mengubah tanggal gajian rutin bulanan, estimasi gaji, dan batas biaya hidup pokok per gajian (`living_cost_per_payday`).
  * Tab *Kategori*: Menambah kategori baru (pemasukan/pengeluaran) lengkap dengan color picker, serta daftar kategori aktif dengan opsi hapus.
  * Tab *Langganan Rutin*: Tambah dan kelola tagihan berulang beserta pilihan tanggal dan dompet pembayar.
  * Tab *Export & Backup*: Tombol unduh file `.CSV` dan backup `.JSON`.
  * Tombol navigasi gear `Settings` di Top Header mengarah langsung ke `/pengaturan`.
- [x] **Pengujian & Verifikasi:**
  * 7/7 unit test Vitest Phase 7 lulus 100% (total 51/51 unit test di seluruh repository).
  * Seluruh alur (A → F) telah diverifikasi visual menggunakan browser mobile headless dengan tangkapan layar (screenshots) tersimpan di direktori artefak.

### Phase 8: Audit Keamanan, Pengujian E2E, UX, Performa, Deploy & Dokumentasi (SELESAI ✅)
- [x] **1. Audit Keamanan & Hardening RLS:**
  * **RLS (Row Level Security) Aktif 100%:** Diterapkan di seluruh 9 tabel database Supabase (`wallets`, `transactions`, `categories`, `savings_goals`, `savings_history`, `payday_schedule`, `recurring_bills`, `budgets`, `ai_insights`).
  * **Kebijakan Isolasi Data:** Seluruh query SELECT, INSERT, UPDATE, dan DELETE dipagari filter kepemilikan ketat `auth.uid() = user_id`.
  * **Storage Bucket Security:** Bucket Storage `'receipts'` dikonfigurasi sebagai bucket privat dengan RLS policy yang hanya mengizinkan user mengunggah dan membaca file di direktori miliknya sendiri (`(storage.foldername(name))[1] = auth.uid()::text`).
  * **Supabase Security Advisor Fix:** Fungsi PostgreSQL RPC `get_financial_analytics` dilengkapi klausul `SET search_path = public, pg_temp;` untuk menangkal potensi eskalasi *search path hijacking*.
  * **Server-Side Authentication:** Dibuat helper `verifyServerAuth()` di `src/lib/auth/server-auth.ts`. Seluruh 5 Route Handler (`/api/scan-receipt`, `/api/voice-transaction`, `/api/ai-insights`, `/api/analytics`, `/api/ai-health`) memvalidasi session cookie pengguna secara ketat dan menolak request tanpa autentikasi (401 Unauthorized).
  * **Frontend Bundle Sanitization:** Verifikasi bundle memastikan tidak ada API key rahasia (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`) yang terekspos ke browser; hanya environment variable publik berspesifikasi `NEXT_PUBLIC_*` yang digunakan di client.
- [x] **2. Pengujian Otomatis End-to-End (E2E Testing):**
  * Script E2E komprehensif (`scripts/e2e-main-flow.mjs`) menguji alur utama aplikasi secara otomatis di browser mobile headless:
    1. Login via tombol Mode Demo di `/login` → Beranda
    2. Tambah dompet baru (*SeaBank Tabungan*, saldo Rp500.000) di tab Dompet `/pengaturan`
    3. Catat transaksi pengeluaran manual (Rp35.000 *"Makan Siang Soto Ayam"*) di `/tambah`
    4. Catat transaksi transfer antar dompet (Rp100.000 *"Top up GoPay dari BCA"*) di `/tambah`
    5. Setor tabungan (Rp250.000 ke target *"Dana Darurat"*) di `/tabungan`
    6. Cek dasbor Analisis Arus Kas & Kesehatan Finansial di `/analisis`
  * Seluruh 6 langkah lulus 100% dan menghasilkan screenshot verifikasi visual di direktori artefak (`e2e_01` s/d `e2e_06`).
- [x] **3. UX & Polish Mobile Native:**
  * **Skeleton Loader:** Komponen `src/components/ui/skeleton.tsx` untuk loading state halus di daftar transaksi dan ringkasan finansial tanpa layout shift.
  * **Empty State Ramah:** Menampilkan ilustrasi dan pesan hangat (*"Belum ada transaksi, yuk catat yang pertama"*) disertai tombol langsung ke halaman tambah transaksi.
  * **Pesan Error Bahasa Indonesia:** Validasi form dan pesan kegagalan ramah pemula, jelas, dan solutif.
  * **Haptic Feedback:** Integrasi getaran taktil halus (`triggerHapticFeedback()`) saat pengguna menyimpan transaksi, transfer, atau memuat data tambahan di perangkat mobile yang mendukung `navigator.vibrate`.
- [x] **4. Performa & Optimasi PWA:**
  * **Pagination / Virtual Loading:** Daftar transaksi pada `/transaksi` mengimplementasikan mekanisme batching *"Muat Lebih Banyak"* untuk menjaga scrolling tetap 60fps meskipun memiliki ratusan transaksi.
  * **PWA & Mobile Meta Tags:** Web app manifest (`src/app/manifest.ts`), ikon responsif 192px & 512px, Apple touch icon, `viewportFit: "cover"`, dan warna tema konsisten (`#0D9488`).
- [x] **5. Panduan Deploy ke Vercel (`DEPLOY.md`):**
  * Dokumentasi lengkap langkah demi langkah dengan bahasa sederhana untuk menghubungkan repositori GitHub ke Vercel, setup Environment Variables, dan konfigurasi Supabase Auth Redirect URLs.
- [x] **6. Dokumentasi Proyek Komprehensif (`README.md`):**
  * Berisi panduan instalasi lokal, dependensi, arsitektur folder, tata cara backup/export data, dan checklist pengujian.

---

---

## 🏦 Ikon & Preset Dompet (ditambahkan Claude, 20 Nov 2026)

- Daftar preset bank/e-wallet/investasi/tunai ada di `src/lib/wallet-presets.ts` (`WALLET_PRESETS`, `searchPresets`, `presetToIcon`, `getPresetFromIcon`).
- Tampilkan ikon dompet SELALU lewat `<WalletIcon icon={wallet.icon} color={wallet.color} size={40} />` dari `src/components/wallet/wallet-icon.tsx`.
- Konvensi kolom `wallets.icon`: `"brand:<id>"` untuk logo brand (contoh `brand:bca`), atau nama ikon lucide (`banknote`, `landmark`, `smartphone`, `trending-up`, `credit-card`, `piggy-bank`, `wallet`).
- Logo diambil otomatis dari favicon situs resmi (layanan favicon Google); kalau gagal → inisial berwarna brand.
- Form tambah dompet (Phase 2): langkah 1 pilih preset (grid logo + kolom cari + tab Bank/E-wallet/Investasi/Tunai), langkah 2 nama otomatis terisi dari preset (boleh diubah), tipe & warna otomatis dari preset, lalu isi saldo awal.

---

## 🤖 Gemini API (sudah disiapkan Claude, 20 Nov 2026)

- Kunci ada di `.env.local` (`GEMINI_API_KEY`, Free tier, Google AI Studio project "Default Gemini Project"). Model: `GEMINI_MODEL=gemini-3.5-flash-lite`, cadangan `GEMINI_FALLBACK_MODEL=gemini-flash-latest`.
- Semua panggilan AI WAJIB lewat `src/lib/ai/gemini.ts` (`generateText`, `generateJson`, `fileToPart`, `GeminiError.userMessage`) dan hanya dari server (Route Handler / Server Action). Jangan pernah import file ini dari komponen client.
- Fungsi ini sudah menangani: timeout, fallback ke model cadangan saat 5xx/sibuk, pesan error ramah bahasa Indonesia (429 kuota habis, dll).
- Tes koneksi: buka `/api/ai-health` saat sudah login → harus `ok: true`.
- Phase 4 (struk) & Phase 5 (voice): kirim gambar/audio via `fileToPart(file)` + `responseSchema` untuk JSON terstruktur.
