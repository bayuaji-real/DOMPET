# 💰 Dompetku — Aplikasi Manajemen Finansial Pribadi Modern (PWA)

**Dompetku** adalah aplikasi pencatatan keuangan pribadi modern berbasis Progressive Web App (PWA) yang dirancang khusus untuk kenyamanan pengguna di Indonesia melalui antarmuka mobile-first, mata uang Rupiah utuh, dan integrasi kecerdasan buatan Google Gemini.

---

## ✨ Fitur Unggulan

1. **Pencatatan Transaksi Cerdas & Cepat:**
   - **Input Manual:** Form cepat untuk Pengeluaran, Pemasukan, dan Transfer antar dompet dengan haptic feedback taktil.
   - **Pindai Struk Belanja (AI OCR):** Foto struk belanjaan Anda; Gemini AI akan mengekstrak merchant, tanggal, total, rincian diskon/pajak, serta item belanja secara akurat.
   - **Pesan Suara (Voice Note):** Cukup ucapkan pengeluaran Anda (contoh: *"Beli bakso lima belas ribu tunai dan kopi dua puluh ribu gopay"*), sistem akan memecahnya menjadi transaksi terpisah secara otomatis.
2. **Multi-Dompet & Saldo Real-Time:**
   - Kelola berbagai rekening bank (BCA, Mandiri, BRI, BNI), e-wallet (GoPay, OVO, Dana, ShopeePay), uang tunai, dan investasi dalam satu genggaman.
   - Dilengkapi fitur **Sembunyikan Saldo** (ikon mata) untuk menjaga privasi di tempat umum.
3. **Mode Gajian (Payday Mode):**
   - Mendeteksi tanggal gajian rutin bulanan Anda secara otomatis.
   - Rekomendasi alokasi pintar: biaya hidup pokok, setoran otomatis ke target tabungan sesuai prioritas, dan sisa dana bebas jajan.
4. **Target Tabungan Berjadwal:**
   - Rencanakan target masa depan (Dana Darurat, Liburan, Beli Gadget).
   - Proyeksi target realistis berdasarkan siklus tanggal gajian.
5. **Transaksi Berulang (Recurring Bills):**
   - Catat dan ingatkan tagihan langganan rutin (misal: Claude Pro, Spotify, Wifi).
   - Tombol *"Catat"* atau *"Lewati"* sekali ketuk di Beranda saat jatuh tempo.
6. **Anggaran Bulanan per Kategori:**
   - Batas pengeluaran dengan indikator warna: Hijau (aman <80%), Kuning (waspada 80-99%), dan Merah (over budget ≥100%).
7. **Analisis Keuangan & Insight AI ✨:**
   - Ringkasan arus kas, rasio menabung, dan indikator kesehatan keuangan dinamis (Sehat / Waspada / Kritis).
   - Donut chart pengeluaran per kategori, bar chart bulanan, dan tren harian.
   - Tombol **Insight AI ✨** untuk mendapatkan rekomendasi finansial dan pola belanja santai dari Gemini AI tanpa membebani kuota API.
8. **Export & Backup Data:**
   - Unduh seluruh riwayat transaksi ke format **CSV** siap olah di Google Sheets / Excel.
   - Backup menyeluruh seluruh akun ke format **JSON** sekali klik.

---

## 🛠️ Panduan Menjalankan Secara Lokal

### Prasyarat
- **Node.js:** Versi 18.18 atau lebih tinggi
- **npm** (atau pnpm / yarn / bun)
- Akun **Supabase** & **Google Gemini API Key**

### Langkah Instalasi
1. **Clone Repositori:**
   ```bash
   git clone https://github.com/username/dompetku.git
   cd DOMPET
   ```

2. **Instal Dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variables:**
   Salin berkas contoh konfigurasi:
   ```bash
   cp .env.example .env.local
   ```
   Buka berkas `.env.local` dan lengkapi nilainya:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   GEMINI_API_KEY=your-gemini-api-key
   GEMINI_MODEL=gemini-3.5-flash-lite
   GEMINI_FALLBACK_MODEL=gemini-flash-latest
   ```

4. **Jalankan Database Migration di Supabase:**
   Buka SQL Editor di dashboard Supabase dan jalankan berkas migrasi:
   - `supabase/migrations/20261120_security_audit_rls.sql`

5. **Jalankan Development Server:**
   ```bash
   npm run dev
   ```
   Buka browser di [http://localhost:3000](http://localhost:3000). Gunakan mode responsive mobile (misal: iPhone / Pixel 412x915px) di DevTools untuk pengalaman visual terbaik.

6. **Menjalankan Pengujian (Testing):**
   - **Unit Tests (Vitest):**
     ```bash
     npm run test
     ```
   - **End-to-End Test (E2E):**
     ```bash
     node scripts/e2e-main-flow.mjs
     ```

---

## 📁 Struktur Folder Proyek

```text
DOMPET/
├── public/                 # Aset statis, ikon PWA (192px, 512px, favicon, apple-icon)
├── scripts/                # Script utilitas, seed data analisis, dan runner test E2E
│   ├── e2e-main-flow.mjs   # Automasi pengujian alur utama pengguna (E2E)
│   ├── seed-analytics-sample.ts # Script seed contoh transaksi 2 bulan (hanya staging, lihat komentar di file)
│   └── test-phase7-ui.mjs  # Verifikasi antarmuka headless
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (auth)/         # Halaman autentikasi (/login, /auth/callback)
│   │   ├── (main)/         # Rute aplikasi utama
│   │   │   ├── page.tsx    # Beranda / Dashboard Saldo
│   │   │   ├── transaksi/  # Daftar Riwayat Transaksi & Filter
│   │   │   ├── tambah/     # Form Pencatatan (Pengeluaran, Pemasukan, Transfer)
│   │   │   ├── tabungan/   # Target Tabungan & Simulasi
│   │   │   ├── analisis/   # Laporan Keuangan, Grafik & Insight AI
│   │   │   └── pengaturan/ # Kelola Dompet, Kategori, Gaji, Backup Data
│   │   ├── api/            # API Route Handlers (Terproteksi Autentikasi)
│   │   │   ├── scan-receipt/     # Ekstraksi foto struk via Gemini AI
│   │   │   ├── voice-transaction/# Parsing audio suara via Gemini AI
│   │   │   ├── ai-insights/      # Rekomendasi finansial santai
│   │   │   └── analytics/        # Agregasi data RPC Supabase
│   │   ├── manifest.ts     # Konfigurasi PWA Web App Manifest
│   │   └── layout.tsx      # Root Layout PWA & Metadata Theme
│   ├── components/         # Komponen Antarmuka (UI)
│   │   ├── analytics/      # Komponen grafik (Donut, Bar, Progress Anggaran)
│   │   ├── home/           # Kartu Saldo, Mode Gajian, Tagihan Hari Ini
│   │   ├── layout/         # Bottom Navigation & Top Header
│   │   ├── transaction/    # Sheet Konfirmasi Struk & Sheet Konfirmasi Suara
│   │   ├── wallet/         # Selector dompet & ikon brand
│   │   └── ui/             # Primitif komponen UI (Button, Input, Skeleton, Modal)
│   └── lib/                # Logika bisnis & integrasi eksternal
│       ├── ai/             # Integrasi SDK Google Gemini API
│       ├── auth/           # Helper verifikasi sesi pengguna server-side
│       ├── data/           # Layer akses data Supabase (wallets, transactions, dll)
│       ├── supabase/       # Client & Server Supabase instance
│       └── utils.ts        # Helper formatRupiah, haptic feedback, tailwind-merge
├── supabase/
│   └── migrations/         # Skrip SQL DDL & Kebijakan Keamanan RLS
├── DEPLOY.md               # Panduan langkah demi langkah deploy ke Vercel
├── PROJECT.md              # Dokumentasi lengkap progres per fase proyek
└── package.json            # Daftar dependensi & npm scripts
```

---

## 💾 Cara Backup & Export Data

Anda memiliki kontrol penuh 100% atas data finansial Anda:
1. Buka halaman **Pengaturan** (ikon gear di pojok kanan atas Beranda atau navigasi `/pengaturan`).
2. Masuk ke tab **Export & Backup**:
   - **Export Transaksi (CSV):** Pilih rentang tanggal yang diinginkan, lalu ketuk **"Unduh CSV Transaksi"**. Berkas CSV diformat dengan UTF-8 BOM sehingga langsung terbaca rapi di Microsoft Excel, Google Sheets, dan Numbers tanpa kendala encoding karakter.
   - **Download Backup Penuh (JSON):** Ketuk **"Download Backup Lengkap (JSON)"** untuk mencadangkan seluruh data akun Anda (saldo dompet, seluruh transaksi, target tabungan, kategori, dan preferensi akun).

---

## 🚀 Panduan Publikasi / Deploy ke Vercel

Untuk mempublikasikan aplikasi ini ke Vercel secara gratis dalam hitungan menit, silakan ikuti petunjuk lengkap di:
👉 **[Lihat Panduan Lengkap Deploy (DEPLOY.md)](file:///Users/Pribadi/WEBSITE/DOMPET/DEPLOY.md)**

---

## 📄 Lisensi & Privasi

Aplikasi ini bersifat open-source dan mengedepankan privasi pengguna. Seluruh transmisi data transaksi diamankan menggunakan Row Level Security (RLS) PostgreSQL, dan tidak ada data mentah yang dibagikan ke pihak ketiga tanpa enkripsi.
