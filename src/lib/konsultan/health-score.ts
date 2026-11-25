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
 * Penjelasan skor dalam bahasa biasa, dari angka yang sama dengan skor (tanpa AI, gratis, hasil selalu sama untuk angka yang sama).
 * Menyebut bagian yang paling lemah lebih dulu, lengkap dengan selisih rupiahnya.
 */
export function explainHealth(i: HealthInput, r: HealthResult): string {
  const income = Math.max(i.monthlyIncome, 0);
  const exp = Math.max(i.monthlyExpense, 0);
  const rp = (n: number) => formatRupiah(Math.round(n));
  const level = r.level === "sehat" ? "sehat" : r.level === "cukup" ? "cukup baik, masih ada yang bisa dirapikan" : "perlu perhatian";
  const lines: string[] = [`Skormu ${r.total} dari 100, kondisi ${level}.`];
  const weak = [...r.parts].filter((p) => p.score / p.max < 0.7).sort((a, b) => a.score / a.max - b.score / b.max);
  const detail = (p: HealthPart): string => {
    if (p.key === "tabung") {
      const left = income - exp;
      const target = income * 0.2;
      return `Sisa uang tiap bulan ${rp(Math.max(left, 0))} (${income > 0 ? Math.round((Math.max(left, 0) / income) * 100) : 0}% pemasukan). Targetnya sekitar 20%, yaitu ${rp(target)}${left < target ? `, jadi masih kurang ${rp(target - Math.max(left, 0))} per bulan` : ""}.`;
    }
    if (p.key === "darurat") {
      const months = exp > 0 ? i.liquidSavings / exp : 0;
      const target = exp * 3;
      return `Dana darurat setara ${months.toFixed(1).replace(".", ",")} bulan pengeluaran. Minimal 3 bulan, yaitu ${rp(target)}${i.liquidSavings < target ? `, jadi masih kurang ${rp(target - i.liquidSavings)}` : ""}.`;
    }
    if (p.key === "utang") {
      return `Cicilan ${rp(i.monthlyDebtPayment)} per bulan, ${income > 0 ? Math.round((i.monthlyDebtPayment / income) * 100) : 0}% dari pemasukan. Usahakan di bawah sekitar 30%.`;
    }
    return `Pengeluaran ${rp(exp)} melebihi pemasukan ${rp(income)}, selisih ${rp(Math.max(exp - income, 0))} per bulan.`;
  };
  if (weak.length === 0) {
    lines.push("Semua bagian sudah baik. Pertahankan kebiasaanmu dan tinjau lagi tiap bulan.");
  } else {
    lines.push(`Yang paling berpengaruh: ${weak[0].label.toLowerCase()}.`);
    weak.slice(0, 3).forEach((p, idx) => lines.push(`${idx + 1}. ${detail(p)}`));
  }
  return lines.join("\n");
}
