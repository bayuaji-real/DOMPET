export interface ForecastInput { startBalance: number; monthlyIncome: number; avgMonthlyExpense: number; monthlyFixedBills: number; months?: number }
export interface ForecastMonth { month: number; balance: number; negative: boolean }
/** Proyeksi saldo sederhana. avgMonthlyExpense = pengeluaran variabel; tagihan tetap dipisah. Ini perkiraan, bukan kepastian. */
export function forecastCashflow(i: ForecastInput): { months: ForecastMonth[]; firstNegativeMonth: number | null } {
  const n = Math.min(Math.max(Math.floor(i.months ?? 3), 1), 12);
  let bal = i.startBalance;
  const months: ForecastMonth[] = [];
  for (let m = 1; m <= n; m++) {
    bal = bal + i.monthlyIncome - i.avgMonthlyExpense - i.monthlyFixedBills;
    months.push({ month: m, balance: Math.round(bal), negative: bal < 0 });
  }
  return { months, firstNegativeMonth: months.find((m) => m.negative)?.month ?? null };
}
