// Hitungan Target Beli (murni angka, bisa dites). Dipakai untuk menjawab: mampu atau belum, kapan, dan berapa per bulan.
import { computeFeasibility, monthsBetween, type FeasibilityResult } from "@/lib/savings-feasibility";
import { evaluateSavingsQueue, type QueueBasis } from "@/lib/savings-queue";

export type PurchaseInput = {
  name: string; price: number; downPayment: number; saved: number; mode: "tunai" | "cicilan";
  months: number; ratePctYear: number; targetDate: string | null; today: string;
  /** Dasar hitung Money Planner (gaji - biaya tetap, antrean). Null bila gaji atau biaya hidup belum diisi: tidak ditebak. */
  basis: QueueBasis | null;
  /** Inflasi dari Acuan Pasar resmi. Null bila belum ada: harga masa depan tidak dihitung. */
  inflationPct: number | null;
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
  const b = i.basis;
  const feas = b
    ? evaluateSavingsQueue({
        today: i.today,
        newGoal: { name: i.name, target: cashNeeded, initial: i.saved, deadline: i.targetDate },
        otherGoals: b.others,
        incomeMonthly: b.incomeMonthly,
        fixedMonthly: b.fixedMonthly,
        payday: b.payday,
        otherMonthlyCommitments: b.otherMonthlyCommitments,
      })
    : computeFeasibility({ targetAmount: cashNeeded, initialAmount: i.saved, deadline: i.targetDate, today: i.today, avgMonthlyIncome: 0, avgMonthlyExpense: 0, otherMonthlyCommitments: 0 });
  const income = b?.incomeMonthly ?? 0;
  const inst = cicil ? flatInstallment(i.price - i.downPayment, i.ratePctYear, i.months) : null;
  const installment = inst ? inst.monthly : null;
  const totalInterest = inst ? inst.interest : 0;
  const totalPaid = cicil ? i.downPayment + (installment ?? 0) * i.months : i.price;
  const instPct = installment !== null && income > 0 ? Math.round((installment / income) * 1000) / 10 : null;
  const leftoverAfterInstallment = installment !== null ? feas.freeMonthly - installment : null;
  const yrs = i.targetDate ? Math.max(0, monthsBetween(i.today, i.targetDate)) / 12 : null;
  const priceAtTarget = yrs !== null && i.inflationPct !== null ? Math.round(i.price * Math.pow(1 + i.inflationPct / 100, yrs)) : null;
  // Tanggal terbeli = tanggal target penuh menurut antrean (null bila lebih dari 10 tahun atau data belum lengkap).
  const buyDate = !b ? null : feas.remaining === 0 ? i.today : feas.earliestRealisticDate;
  const monthsToBuy = buyDate && feas.remaining > 0 ? Math.max(1, Math.round(monthsBetween(i.today, buyDate))) : null;

  let verdict: Verdict;
  if (!b || income <= 0) verdict = "belum_ada_data";
  else {
    const dpOk = feas.reason === "sudah_tercapai" || feas.reason === "ok" || feas.reason === "tanpa_tenggat" && feas.feasible;
    const instBad = installment !== null && ((instPct ?? 0) > 30 || (leftoverAfterInstallment ?? 0) < 0);
    const instTight = installment !== null && (leftoverAfterInstallment ?? 0) < income * 0.1;
    const cashTight = feas.leftoverAfter !== null && feas.leftoverAfter < income * 0.1;
    if (!dpOk || instBad) verdict = "berat"; else if (instTight || cashTight) verdict = "pas"; else verdict = "aman";
  }
  const headline = verdict === "belum_ada_data" ? "Isi gaji dan biaya hidup dulu supaya bisa dihitung."
    : verdict === "aman" ? "Masih aman dengan kondisi keuanganmu sekarang."
    : verdict === "pas" ? "Bisa, tapi pas-pasan. Sisa uang bulananmu tipis."
    : "Berat untuk saat ini. Pertimbangkan menunda, menaikkan DP, atau memilih harga lebih rendah.";
  return { cashNeeded, remainingCash: Math.max(0, cashNeeded - i.saved), feasibility: feas, installment, totalInterest, totalPaid, installmentPctIncome: instPct, leftoverAfterInstallment, priceAtTarget, monthsToBuy, buyDate, verdict, headline };
}

/** Ringkasan pendek (maksimal 3 baris) untuk obrolan Target Beli. */
export function quickSummary(r: PurchaseResult, rp: (n: number) => string, fmtDate: (d: string) => string): string[] {
  const lines: string[] = [];
  const fe = r.feasibility;
  if (r.verdict === "belum_ada_data") return ["Isi gaji dan biaya hidupmu dulu supaya bisa dihitung."];
  if (r.installment !== null) {
    lines.push(`Cicilan ${rp(r.installment)} per bulan${r.installmentPctIncome !== null ? ` (${r.installmentPctIncome}% dari pemasukan)` : ""}, DP ${rp(r.cashNeeded)}.`);
  }
  if (fe.monthlyNeeded !== null && fe.monthlyNeeded > 0) lines.push(`Sisihkan ${rp(fe.monthlyNeeded)} per bulan selama ${fe.monthsLeft} bulan.`);
  else if (r.remainingCash > 0) {
    const free = fe.freeMonthly;
    if (r.monthsToBuy !== null && r.monthsToBuy <= 120 && r.buyDate) {
      lines.push(`Sisa uangmu tiap bulan sekitar ${rp(free)}. Paling cepat terbeli ${fmtDate(r.buyDate)} kalau semuanya ditabung.`);
      // Solusi: tabungan per bulan untuk beberapa pilihan lama menabung, hanya yang masih muat di sisa uang bulanan.
      const opts = [3, 6, 12, 24].map((n) => ({ n, per: Math.ceil(r.remainingCash / n) })).filter((o) => o.per <= free && o.per > 0).slice(0, 3);
      if (opts.length > 0) lines.push(`Pilihan menabung: ${opts.map((o) => `${o.n} bulan = ${rp(o.per)} per bulan`).join(", ")}.`);
    } else lines.push("Dengan sisa uang sekarang, belum terjangkau dalam waktu dekat.");
  } else lines.push("Uangnya sudah cukup.");
  if (r.priceAtTarget !== null && r.priceAtTarget > r.cashNeeded && r.installment === null) lines.push(`Harga di tanggal target diperkirakan ${rp(r.priceAtTarget)}.`);
  // Solusi yang bisa langsung dijalankan bila belum aman.
  if (r.verdict === "berat" || r.verdict === "pas") {
    if (r.installment !== null && r.installmentPctIncome) {
      const income = r.installment / (r.installmentPctIncome / 100);
      const maxInst = Math.floor((income * 0.3) / 1000) * 1000;
      if (r.installment > maxInst) lines.push(`Solusi: cicilan sebaiknya maksimal ${rp(maxInst)} per bulan (30% pemasukan). Naikkan DP, perpanjang tenor, atau pilih harga lebih rendah.`);
    } else if (fe.shortfallMonthly > 0) {
      lines.push(`Solusi: kurang ${rp(fe.shortfallMonthly)} per bulan dari yang dibutuhkan. Mundurkan tanggal target${fe.earliestRealisticDate ? ` ke ${fmtDate(fe.earliestRealisticDate)}` : ""}, atau kurangi pengeluaran sebesar itu.`);
    } else if (r.verdict === "pas") {
      lines.push("Solusi: sisa uang bulananmu tipis. Sisihkan sedikit demi sedikit dan jangan ambil pembelian lain sebelum ini selesai.");
    }
  }
  return lines.slice(0, 4);
}
