import { formatRupiah } from "@/lib/utils";
import type { FinancialHealth, HealthStatus } from "@/types/analytics";
export interface HealthInput { monthlyIncome: number; monthlyExpense: number; liquidSavings: number; monthlyDebtPayment: number }
export interface HealthPart { key: "tabung" | "darurat" | "utang" | "arus"; label: string; score: number; max: number; tip: string }
export interface HealthResult { total: number; level: "perlu perhatian" | "cukup" | "sehat"; parts: HealthPart[] }

const lin = (v: number, zero: number, full: number) => Math.min(Math.max((v - zero) / (full - zero), 0), 1);

export function healthScore(i: HealthInput): HealthResult {
  const income = Math.max(i.monthlyIncome, 0);
  const exp = Math.max(i.monthlyExpense, 0);
  const saveRate = income > 0 ? (income - exp) / income : 0;
  const emergencyMonths = exp > 0 ? i.liquidSavings / exp : i.liquidSavings > 0 ? 6 : 0;
  const dsr = income > 0 ? i.monthlyDebtPayment / income : i.monthlyDebtPayment > 0 ? 1 : 0;
  const parts: HealthPart[] = [
    { key: "tabung", label: "Sisa uang tiap bulan", max: 25, score: Math.round(25 * lin(saveRate, 0, 0.2)), tip: "Targetkan menyisihkan sekitar 20% pemasukan." },
    { key: "darurat", label: "Dana darurat", max: 30, score: Math.round(30 * lin(emergencyMonths, 0, 6)), tip: "Idealnya setara 3 sampai 6 bulan pengeluaran." },
    { key: "utang", label: "Beban cicilan", max: 25, score: Math.round(25 * (1 - lin(dsr, 0.15, 0.5))), tip: "Usahakan cicilan di bawah sekitar 30% pemasukan." },
    { key: "arus", label: "Arus kas", max: 20, score: income <= 0 ? 0 : exp <= income ? 20 : Math.round(20 * (1 - lin(exp / income, 1, 1.3))), tip: "Pengeluaran sebaiknya tidak melebihi pemasukan." },
  ];
  const total = parts.reduce((s, p) => s + p.score, 0);
  return { total, level: total >= 70 ? "sehat" : total >= 40 ? "cukup" : "perlu perhatian", parts };
}

type SnapLike = { hasData: boolean; monthlyIncome: number; monthlyExpense: number; freeCash?: number; liquidSavings: number };

/**
 * SATU RUMUS untuk semua halaman: status di Analisis dan Beranda memakai healthScore() yang sama dengan
 * halaman Kesehatan Finansial (rata-rata bulanan, dana darurat dari uang bebas pakai di luar tabungan dan investasi).
 * sehat >= 70, cukup (tampil "waspada") >= 40, sisanya "kritis".
 */
export function unifyHealth(fh: FinancialHealth, snap: SnapLike | null, monthlyDebtPayment: number): FinancialHealth {
  if (!snap || !snap.hasData) return fh;
  const free = snap.freeCash ?? snap.liquidSavings;
  const r = healthScore({ monthlyIncome: snap.monthlyIncome, monthlyExpense: snap.monthlyExpense, liquidSavings: free, monthlyDebtPayment });
  const part = (k: HealthPart["key"]): HealthStatus => {
    const p = r.parts.find((x) => x.key === k)!;
    const ratio = p.score / p.max;
    return ratio >= 0.7 ? "sehat" : ratio >= 0.35 ? "waspada" : "kritis";
  };
  const exp = Math.max(snap.monthlyExpense, 0);
  return {
    ...fh,
    overallStatus: r.level === "sehat" ? "sehat" : r.level === "cukup" ? "waspada" : "kritis",
    savingsRate: snap.monthlyIncome > 0 ? Math.round(((snap.monthlyIncome - exp) / snap.monthlyIncome) * 100) : 0,
    savingsRateStatus: part("tabung"),
    emergencyFundBalance: Math.round(free),
    emergencyFundMonths: exp > 0 ? Math.round((free / exp) * 10) / 10 : 0,
    emergencyStatus: part("darurat"),
  };
}

/**
 * Penjelasan skor per bagian dalam bahasa biasa, dari angka yang sama dengan skor (tanpa AI, gratis, hasil selalu sama untuk angka yang sama).
 * Tiap bagian menyebut angkanya, hitungannya, targetnya, dan artinya.
 */
export function explainHealth(i: HealthInput, r: HealthResult): string {
  const income = Math.max(i.monthlyIncome, 0);
  const exp = Math.max(i.monthlyExpense, 0);
  const rp = (n: number) => formatRupiah(Math.round(n));
  const dec = (n: number) => n.toFixed(1).replace(".", ",");
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const level = r.level === "sehat" ? "sehat" : r.level === "cukup" ? "cukup baik, masih ada yang bisa dirapikan" : "perlu perhatian";
  const out: string[] = [`Skormu **${r.total} dari 100**, kondisi ${level}. Ini artinya per bagian:`];

  for (const p of r.parts) {
    const head = `**${p.label} (${p.score}/${p.max})**`;
    let body = "";
    if (p.key === "tabung") {
      const left = income - exp;
      const target = income * 0.2;
      if (income <= 0) body = "Belum ada pemasukan yang terhitung, jadi belum bisa dinilai.";
      else if (left <= 0) body = `Pengeluaranmu per bulan (${rp(exp)}) sudah menghabiskan pemasukan (${rp(income)}), jadi tidak ada sisa.`;
      else body = `Dari pemasukan ${rp(income)} per bulan, sisa ${rp(left)} setelah pengeluaran ${rp(exp)} (${pct(left, income)}%). ${left >= target ? "Itu sudah di atas target 20%, bagus." : `Targetnya 20% (${rp(target)}), jadi masih kurang ${rp(target - left)}.`}`;
    } else if (p.key === "darurat") {
      const months = exp > 0 ? i.liquidSavings / exp : i.liquidSavings > 0 ? 6 : 0;
      if (exp <= 0) body = `Saldo yang bisa dipakai ${rp(i.liquidSavings)}. Pengeluaran belum terhitung, jadi belum bisa dinilai.`;
      else body = `Saldo yang bisa dipakai ${rp(i.liquidSavings)}, cukup untuk ${dec(months)} bulan pengeluaran. ${months >= 6 ? "Itu sudah di atas target 6 bulan, bagus." : `Idealnya 3 sampai 6 bulan, jadi ${months >= 3 ? "kamu sudah aman, tinggal menambah" : "masih kurang"} ${rp(Math.max(exp * (months >= 3 ? 6 : 3) - i.liquidSavings, 0))}.`}`;
    } else if (p.key === "utang") {
      if (i.monthlyDebtPayment <= 0) body = "Tidak ada cicilan utang, jadi nilainya penuh.";
      else body = `Cicilan utangmu ${rp(i.monthlyDebtPayment)} per bulan, ${pct(i.monthlyDebtPayment, income)}% dari pemasukan. ${pct(i.monthlyDebtPayment, income) <= 15 ? "Masih ringan." : pct(i.monthlyDebtPayment, income) <= 30 ? "Masih wajar, usahakan tidak naik." : "Sudah berat, jangan tambah cicilan baru."}`;
    } else {
      if (income <= 0) body = "Belum ada pemasukan yang terhitung, jadi belum bisa dinilai.";
      else if (exp <= income) body = `Pengeluaran lebih kecil dari pemasukan, jadi tiap bulan uangmu bertambah ${rp(income - exp)}.`;
      else body = `Pengeluaran lebih besar dari pemasukan, jadi tiap bulan uangmu berkurang ${rp(exp - income)}.`;
    }
    out.push(`${head}\n${body}`);
  }

  const weak = [...r.parts].filter((p) => p.score < p.max).sort((a, b) => a.score / a.max - b.score / b.max)[0];
  out.push(weak ? `**Yang paling perlu digarap:** ${weak.label.toLowerCase()} (${weak.score} dari ${weak.max}). ${weak.tip}` : "**Kesimpulan:** semua bagian penuh. Pertahankan kebiasaanmu dan tinjau lagi tiap bulan.");
  return out.join("\n\n");
}
