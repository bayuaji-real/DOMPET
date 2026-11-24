// Hitungan Target Beli (murni angka, bisa dites). Dipakai untuk menjawab: mampu atau belum, kapan, dan berapa per bulan.
import { computeFeasibility, addMonths, monthsBetween, type FeasibilityResult } from "@/lib/savings-feasibility";

export type PurchaseInput = {
  price: number; downPayment: number; saved: number; mode: "tunai" | "cicilan";
  months: number; ratePctYear: number; targetDate: string | null; today: string;
  income: number; expense: number; commitments: number; inflationPct: number;
};
export type Verdict = "aman" | "pas" | "berat" | "belum_ada_data";
export type PurchaseResult = {
  cashNeeded: number; remainingCash: number; feasibility: FeasibilityResult;
  installment: number | null; totalInterest: number; totalPaid: number; installmentPctIncome: number | null; leftoverAfterInstallment: number | null;
  priceAtTarget: number | null; monthsToBuy: number | null; buyDate: string | null; verdict: Verdict; headline: string;
};

/** Cicilan bunga flat per tahun (umum di dealer dan toko): pokok x (1 + bunga x tahun) dibagi jumlah bulan. */
export function flatInstallment(principal: number, ratePctYear: number, months: number): { monthly: number; interest: number } {
  if (principal <= 0 || months <= 0) return { monthly: 0, interest: 0 };
  const interest = principal * (ratePctYear / 100) * (months / 12);
  return { monthly: Math.ceil((principal + interest) / months), interest: Math.round(interest) };
}

export function analyzePurchase(i: PurchaseInput): PurchaseResult {
  const cicil = i.mode === "cicilan";
  const cashNeeded = cicil ? i.downPayment : i.price;
  const feas = computeFeasibility({ targetAmount: cashNeeded, initialAmount: i.saved, deadline: i.targetDate, today: i.today, avgMonthlyIncome: i.income, avgMonthlyExpense: i.expense, otherMonthlyCommitments: i.commitments });
  const inst = cicil ? flatInstallment(i.price - i.downPayment, i.ratePctYear, i.months) : null;
  const installment = inst ? inst.monthly : null;
  const totalInterest = inst ? inst.interest : 0;
  const totalPaid = cicil ? i.downPayment + (installment ?? 0) * i.months : i.price;
  const instPct = installment !== null && i.income > 0 ? Math.round((installment / i.income) * 1000) / 10 : null;
  const leftoverAfterInstallment = installment !== null ? feas.freeMonthly - installment : null;
  const yrs = i.targetDate ? Math.max(0, monthsBetween(i.today, i.targetDate)) / 12 : null;
  const priceAtTarget = yrs !== null ? Math.round(i.price * Math.pow(1 + i.inflationPct / 100, yrs)) : null;
  const monthsToBuy = feas.monthsAtFreeRate;
  const buyDate = feas.remaining === 0 ? i.today : monthsToBuy ? addMonths(i.today, monthsToBuy) : null;

  let verdict: Verdict;
  if (i.income <= 0) verdict = "belum_ada_data";
  else {
    const dpOk = feas.reason === "sudah_tercapai" || feas.reason === "ok" || feas.reason === "tanpa_tenggat" && feas.feasible;
    const instBad = installment !== null && ((instPct ?? 0) > 30 || (leftoverAfterInstallment ?? 0) < 0);
    const instTight = installment !== null && (leftoverAfterInstallment ?? 0) < i.income * 0.1;
    const cashTight = feas.leftoverAfter !== null && feas.leftoverAfter < i.income * 0.1;
    if (!dpOk || instBad) verdict = "berat"; else if (instTight || cashTight) verdict = "pas"; else verdict = "aman";
  }
  const headline = verdict === "belum_ada_data" ? "Catat pemasukan dulu supaya bisa dihitung."
    : verdict === "aman" ? "Masih aman dengan kondisi keuanganmu sekarang."
    : verdict === "pas" ? "Bisa, tapi pas-pasan. Sisa uang bulananmu tipis."
    : "Berat untuk saat ini. Pertimbangkan menunda, menaikkan DP, atau memilih harga lebih rendah.";
  return { cashNeeded, remainingCash: Math.max(0, cashNeeded - i.saved), feasibility: feas, installment, totalInterest, totalPaid, installmentPctIncome: instPct, leftoverAfterInstallment, priceAtTarget, monthsToBuy, buyDate, verdict, headline };
}
