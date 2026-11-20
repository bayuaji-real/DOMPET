# 🚀 Panduan Deploy Dompetku ke Vercel

Panduan ini ditulis dengan langkah demi langkah yang sederhana agar siapa saja bisa mempublikasikan aplikasi **Dompetku** ke internet secara gratis menggunakan **Vercel** dan **Supabase**.

---

## 📋 Prasyarat Sebelum Mulai
1. Akun **GitHub** (tempat menyimpan kode proyek).
2. Akun **Vercel** ([vercel.com](https://vercel.com)).
3. Proyek **Supabase** yang sudah aktif ([supabase.com](https://supabase.com)).
4. Kunci API **Google Gemini** dari [Google AI Studio](https://aistudio.google.com).

---

## Langkah 1: Push Kode ke Repositori GitHub
Pastikan seluruh kode aplikasi Anda sudah tersimpan di repositori GitHub (publik atau privat):

```bash
git add .
git commit -m "Dompetku: Siap deploy ke Vercel"
git push origin main
```

---

## Langkah 2: Hubungkan Repositori ke Vercel
1. Buka dashboard [Vercel](https://vercel.com/dashboard) dan klik tombol **"Add New..."** lalu pilih **"Project"**.
2. Pilih akun GitHub Anda dan temukan repositori **`DOMPET`** (atau nama repositori Anda).
3. Klik tombol **"Import"** di sebelah nama repositori tersebut.
4. Pada bagian **Framework Preset**, Vercel akan otomatis mendeteksi **Next.js**. Biarkan pengaturan build default (`npm run build`).

---

## Langkah 3: Isi Environment Variables di Vercel
Sebelum menekan tombol Deploy, buka menu akordeon **"Environment Variables"** di halaman pengaturan proyek Vercel. 

Tambahkan variabel berikut satu per satu (salin nilainya dari file `.env.local` Anda):

| Nama Variabel | Deskripsi | Contoh Nilai |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL endpoint proyek Supabase Anda | `https://xyzproject.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon public key Supabase | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase (rahasia, hanya di server) | `eyJhbGciOi...` |
| `GEMINI_API_KEY` | Kunci API Google Gemini (Free tier) | `AIzaSy...` |
| `GEMINI_MODEL` | Model AI utama untuk analisis & parsing suara/struk | `gemini-3.5-flash-lite` |
| `GEMINI_FALLBACK_MODEL` | Model AI cadangan jika model utama sibuk | `gemini-flash-latest` |

Setelah semua variabel di atas terisi, klik tombol **"Deploy"**. Tunggu proses build selesai sekitar 1-2 menit hingga muncul layar perayaan (*Congratulations!*).

---

## Langkah 4: Atur URL Redirect di Supabase Auth
Agar fitur Login & Autentikasi Magic Link / Email berfungsi di domain produksi Vercel:

1. Buka dashboard proyek Anda di [Supabase](https://supabase.com/dashboard).
2. Di bilah sisi kiri, klik **Authentication** (ikon gembok), lalu pilih **URL Configuration**.
3. Di bagian **Site URL**, masukkan domain Vercel Anda, contoh:
   ```text
   https://dompetku.vercel.app
   ```
4. Di bagian **Redirect URLs**, klik **"Add URL"** dan tambahkan URL berikut:
   * `https://dompetku.vercel.app/**`
   * `https://dompetku.vercel.app/auth/callback`
   * `http://localhost:3000/**` *(tetap simpan agar pengujian lokal tidak terganggu)*
5. Klik **"Save"**.

---

## Langkah 5: Jalankan Migration SQL di Supabase
Pastikan seluruh tabel dan kebijakan keamanan (RLS) sudah aktif di database:

1. Di dashboard Supabase, klik menu **SQL Editor**.
2. Buka file `supabase/migrations/20261120_security_audit_rls.sql` di proyek ini, salin seluruh kodenya, lalu tempel ke dalam SQL Editor Supabase.
3. Klik tombol **"Run"** untuk mengeksekusi. Skrip ini akan mengamankan 9 tabel, mengunci bucket storage struk, dan mengaktifkan fungsi agregasi SQL.

---

## 🎉 Selesai!
Buka URL domain Vercel Anda di browser HP (contoh: `https://dompetku.vercel.app`). 
Anda juga dapat menambahkan aplikasi ke layar utama (*Add to Home Screen*) untuk digunakan layaknya aplikasi native mobile!
