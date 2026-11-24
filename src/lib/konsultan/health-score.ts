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
