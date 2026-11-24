/** Simulator cicilan dan paylater. Angka ilustrasi dari rumus standar. */
export function annuityPayment(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0 || principal <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}
/** Cicilan bunga flat: bunga dihitung dari pokok awal. */
export function flatPayment(principal: number, flatRatePctPerYear: number, months: number): number {
  if (months <= 0 || principal <= 0) return 0;
  return (principal + principal * (flatRatePctPerYear / 100) * (months / 12)) / months;
}
/** Bunga efektif per tahun (%) dari cicilan tetap, dicari dengan bisection. */
export function effectiveAnnualRatePct(principal: number, payment: number, months: number): number {
  if (principal <= 0 || months <= 0 || payment * months <= principal) return 0;
  let lo = 0, hi = 1; // bunga per bulan
  const pv = (r: number) => (r === 0 ? payment * months : (payment * (1 - Math.pow(1 + r, -months))) / r);
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (pv(mid) > principal) lo = mid; else hi = mid;
  }
  return (Math.pow(1 + (lo + hi) / 2, 12) - 1) * 100;
}
export interface LoanCompare { payment: number; total: number; interest: number; effectiveAnnualPct: number }
export function compareFlat(principal: number, flatRatePctPerYear: number, months: number): LoanCompare {
  const payment = flatPayment(principal, flatRatePctPerYear, months);
  return { payment, total: payment * months, interest: payment * months - principal, effectiveAnnualPct: effectiveAnnualRatePct(principal, payment, months) };
}
/** Paylater: biaya per bulan (%) dari harga awal, ditambah biaya admin sekali. */
export function comparePaylater(principal: number, monthlyFeePct: number, months: number, adminFee = 0): LoanCompare {
  const payment = principal / months + principal * (monthlyFeePct / 100);
  const total = payment * months + adminFee;
  return { payment, total, interest: total - principal, effectiveAnnualPct: effectiveAnnualRatePct(principal - adminFee, payment, months) };
}
