/**
 * SCRIPT SEED DUMMY TRANSAKSI 2 BULAN (Oktober & November 2026)
 * Digunakan untuk menguji visualisasi grafik di Halaman Analisis:
 * - Donut Chart Kategori
 * - Bar Chart Pemasukan vs Pengeluaran 6 Bulan
 * - Grafik Harian & Rata-rata per Hari
 * - Pengeluaran per Dompet
 * - Top 5 Transaksi & Toko Paling Sering
 *
 * CARA PAKAI (HANYA untuk database STAGING, bukan database utama):
 * 1. Buat file .env.staging.local (sudah diabaikan git) berisi:
 *      NEXT_PUBLIC_SUPABASE_URL=<url project staging>
 *      SUPABASE_SERVICE_ROLE_KEY=<key project staging>
 *      SEED_ALLOWED_PROJECT_REF=<ref project staging, harus sama dengan ref di URL>
 *      SEED_BLOCKED_PROJECT_REFS=<ref database utama, pisahkan koma bila lebih dari satu>
 *      SEED_CONFIRM_STAGING=yes
 *    Skrip ini TIDAK membaca .env.local (yang biasanya menunjuk ke database utama)
 *    dan tidak punya URL bawaan. Skrip menolak jalan bila ref di URL ada di
 *    SEED_BLOCKED_PROJECT_REFS, tidak sama dengan SEED_ALLOWED_PROJECT_REF,
 *    atau bila SEED_CONFIRM_STAGING bukan "yes".
 * 2. Jalankan: npx tsx scripts/seed-analytics-sample.ts
 *    Hapus data contoh: npx tsx scripts/seed-analytics-sample.ts --cleanup
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import { assertSafeSeedEnv } from "./seed-guard";

dotenv.config({ path: path.resolve(process.cwd(), ".env.staging.local") });

// Wajib lolos pengaman sebelum koneksi dibuat. Tidak ada nilai bawaan.
const { url: supabaseUrl, key: supabaseKey } = assertSafeSeedEnv(process.env);

const supabase = createClient(supabaseUrl, supabaseKey);

const SAMPLE_TAG = "[SAMPLE_PHASE_6]";

async function main() {
  const isCleanup = process.argv.includes("--cleanup");

  console.log("🌱 Menghubungkan ke Supabase staging...");

  // Dapatkan daftar dompet & kategori yang ada
  const [walletsRes, catsRes, goalsRes] = await Promise.all([
    supabase.from("wallets").select("id, name"),
    supabase.from("categories").select("id, name, type"),
    supabase.from("savings_goals").select("id, name"),
  ]);

  const wallets = walletsRes.data || [];
  const categories = catsRes.data || [];
  const goals = goalsRes.data || [];

  const bcaId = wallets.find((w) => /bca/i.test(w.name))?.id || wallets[0]?.id;
  const cashId = wallets.find((w) => /tunai/i.test(w.name))?.id || wallets[0]?.id;
  const gopayId = wallets.find((w) => /gopay/i.test(w.name))?.id || wallets[0]?.id;
  const mandiriId = wallets.find((w) => /mandiri/i.test(w.name))?.id || wallets[0]?.id;

  const catFoodId = categories.find((c) => /makan/i.test(c.name))?.id;
  const catGroceriesId = categories.find((c) => /belanja/i.test(c.name))?.id;
  const catTransId = categories.find((c) => /trans/i.test(c.name))?.id;
  const catBillsId = categories.find((c) => /tagihan/i.test(c.name))?.id;
  const catEntId = categories.find((c) => /hiburan/i.test(c.name))?.id;
  const catSalaryId = categories.find((c) => /gaji|pemasukan/i.test(c.name))?.id;

  const goalDaruratId = goals.find((g) => /darurat/i.test(g.name))?.id;
  const goalLamaranId = goals.find((g) => /lamaran/i.test(g.name))?.id;

  if (isCleanup) {
    console.log("🧹 Menghapus data transaksi sampel...");
    const { error, count } = await supabase
      .from("transactions")
      .delete()
      .like("note", `%${SAMPLE_TAG}%`);

    if (error) {
      console.error("Gagal menghapus:", error);
    } else {
      console.log(`✅ Berhasil membersihkan ${count || "semua"} data sampel!`);
    }
    return;
  }

  console.log("✨ Membuat data transaksi realistis 2 bulan (Oktober & November 2026)...");

  const sampleTransactions = [
    // === OKTOBER 2026 ===
    // Pemasukan
    {
      date: "2026-10-01",
      amount: 8500000,
      type: "income",
      wallet_id: bcaId,
      category_id: catSalaryId,
      merchant: "PT Solusi Digital",
      note: `Gaji Bulanan Oktober ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-10-15",
      amount: 1500000,
      type: "income",
      wallet_id: mandiriId,
      category_id: catSalaryId,
      merchant: "Klien Lepas",
      note: `Bonus Proyek UI/UX ${SAMPLE_TAG}`,
      source: "manual",
    },
    // Setoran Tabungan (TIDAK dihitung sbg pengeluaran)
    {
      date: "2026-10-02",
      amount: 1500000,
      type: "goal_deposit",
      wallet_id: bcaId,
      goal_id: goalDaruratId,
      note: `Setor Dana Darurat Okt ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-10-02",
      amount: 500000,
      type: "goal_deposit",
      wallet_id: bcaId,
      goal_id: goalLamaranId,
      note: `Setor Lamaran Okt ${SAMPLE_TAG}`,
      source: "manual",
    },
    // Pengeluaran Rutin Tagihan
    {
      date: "2026-10-05",
      amount: 450000,
      type: "expense",
      wallet_id: bcaId,
      category_id: catBillsId,
      merchant: "PLN Pascabayar",
      note: `Listrik Rumah Okt ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-10-06",
      amount: 320000,
      type: "expense",
      wallet_id: bcaId,
      category_id: catBillsId,
      merchant: "Indihome",
      note: `Internet & TV Kabel ${SAMPLE_TAG}`,
      source: "manual",
    },
    // Pengeluaran Makanan & Belanja
    {
      date: "2026-10-04",
      amount: 250000,
      type: "expense",
      wallet_id: gopayId,
      category_id: catGroceriesId,
      merchant: "Superindo",
      note: `Belanja Mingguan 1 ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-10-08",
      amount: 65000,
      type: "expense",
      wallet_id: cashId,
      category_id: catFoodId,
      merchant: "Warung Padang Sederhana",
      note: `Makan Siang Tim ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-10-10",
      amount: 72000,
      type: "expense",
      wallet_id: gopayId,
      category_id: catFoodId,
      merchant: "Kopi Kenangan",
      note: `Kopi Sore ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-10-12",
      amount: 50000,
      type: "expense",
      wallet_id: cashId,
      category_id: catTransId,
      merchant: "SPBU Pertamina",
      note: `Bensin Pertamax Motor ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-10-14",
      amount: 115000,
      type: "expense",
      wallet_id: gopayId,
      category_id: catGroceriesId,
      merchant: "Indomaret",
      note: `Sabun & Snack ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-10-18",
      amount: 85000,
      type: "expense",
      wallet_id: gopayId,
      category_id: catEntId,
      merchant: "Cinema XXI",
      note: `Nonton Bioskop ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-10-22",
      amount: 48000,
      type: "expense",
      wallet_id: cashId,
      category_id: catFoodId,
      merchant: "Mie Gacoan",
      note: `Makan Malam Santai ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-10-25",
      amount: 82500,
      type: "expense",
      wallet_id: gopayId,
      category_id: catFoodId,
      merchant: "Indomaret Point",
      note: `Kopi & Roti ${SAMPLE_TAG}`,
      source: "receipt",
    },

    // === NOVEMBER 2026 (Bulan Ini) ===
    // Pemasukan
    {
      date: "2026-11-01",
      amount: 8500000,
      type: "income",
      wallet_id: bcaId,
      category_id: catSalaryId,
      merchant: "PT Solusi Digital",
      note: `Gaji Bulanan November ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-11-10",
      amount: 2500000,
      type: "income",
      wallet_id: bcaId,
      category_id: catSalaryId,
      merchant: "Klien Lepas",
      note: `Pelunasan Desain Aplikasi ${SAMPLE_TAG}`,
      source: "voice",
    },
    // Setoran Tabungan
    {
      date: "2026-11-02",
      amount: 1500000,
      type: "goal_deposit",
      wallet_id: bcaId,
      goal_id: goalDaruratId,
      note: `Setor Rutin Dana Darurat ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-11-02",
      amount: 600000,
      type: "goal_deposit",
      wallet_id: bcaId,
      goal_id: goalLamaranId,
      note: `Setor Target Lamaran ${SAMPLE_TAG}`,
      source: "manual",
    },
    // Transfer Antar Dompet
    {
      date: "2026-11-03",
      amount: 300000,
      type: "transfer",
      wallet_id: bcaId,
      to_wallet_id: gopayId,
      note: `Topup Saldo GoPay ${SAMPLE_TAG}`,
      source: "manual",
    },
    // Pengeluaran Rutin Tagihan Nov
    {
      date: "2026-11-05",
      amount: 465000,
      type: "expense",
      wallet_id: bcaId,
      category_id: catBillsId,
      merchant: "PLN Pascabayar",
      note: `Listrik November ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-11-06",
      amount: 320000,
      type: "expense",
      wallet_id: bcaId,
      category_id: catBillsId,
      merchant: "Indihome",
      note: `Paket Internet ${SAMPLE_TAG}`,
      source: "manual",
    },
    // Pengeluaran Harian Nov
    {
      date: "2026-11-03",
      amount: 45000,
      type: "expense",
      wallet_id: cashId,
      category_id: catFoodId,
      merchant: "Bakso Pak Kumis",
      note: `Makan Bakso Siang ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-11-05",
      amount: 180000,
      type: "expense",
      wallet_id: gopayId,
      category_id: catGroceriesId,
      merchant: "Indomaret",
      note: `Belanja Kebutuhan Harian ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-11-07",
      amount: 71000,
      type: "expense",
      wallet_id: cashId,
      category_id: catFoodId,
      merchant: "Kopi Kenangan",
      note: `Kopi & Toast ${SAMPLE_TAG}`,
      source: "receipt",
    },
    {
      date: "2026-11-09",
      amount: 50000,
      type: "expense",
      wallet_id: cashId,
      category_id: catTransId,
      merchant: "SPBU Pertamina",
      note: `Bensin Motor ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-11-12",
      amount: 82500,
      type: "expense",
      wallet_id: gopayId,
      category_id: catFoodId,
      merchant: "Indomaret Point",
      note: `Camilan Kantor & Kopi ${SAMPLE_TAG}`,
      source: "receipt",
    },
    {
      date: "2026-11-14",
      amount: 340000,
      type: "expense",
      wallet_id: bcaId,
      category_id: catGroceriesId,
      merchant: "Superindo",
      note: `Belanja Dapur Mingguan ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-11-16",
      amount: 35000,
      type: "expense",
      wallet_id: gopayId,
      category_id: catFoodId,
      merchant: "Warung Padang Sederhana",
      note: `Nasi Rendang ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-11-18",
      amount: 22000,
      type: "expense",
      wallet_id: gopayId,
      category_id: catTransId,
      merchant: "GoJek",
      note: `GoRide ke Stasiun ${SAMPLE_TAG}`,
      source: "voice",
    },
    {
      date: "2026-11-19",
      amount: 125000,
      type: "expense",
      wallet_id: gopayId,
      category_id: catGroceriesId,
      merchant: "Indomaret",
      note: `Buah & Susu ${SAMPLE_TAG}`,
      source: "manual",
    },
    {
      date: "2026-11-20",
      amount: 25000,
      type: "expense",
      wallet_id: cashId,
      category_id: catFoodId,
      merchant: "Sate Ayam Madura",
      note: `Makan Sate Siang ${SAMPLE_TAG}`,
      source: "voice",
    },
  ];

  console.log(`Mengunggah ${sampleTransactions.length} transaksi sampel...`);

  const { data, error } = await supabase.from("transactions").insert(sampleTransactions);

  if (error) {
    console.error("Gagal menyisipkan data sampel:", error);
  } else {
    console.log("🎉 Berhasil menyisipkan data contoh 2 bulan ke database Supabase!");
    console.log("Untuk menghapus nanti, jalankan: npx tsx scripts/seed-analytics-sample.ts --cleanup");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
