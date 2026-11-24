export interface Debt { id: string; name: string; balance: number; annualRatePct: number; minPayment: number }
export interface PayoffPlan { strategy: "avalanche" | "snowball"; months: number; totalInterest: number; feasible: boolean; order: string[] }
const MAX_MONTHS = 600;

/** Simulasi lunasi utang. budget = total yang dibayar tiap bulan untuk semua utang (minimal sama dengan jumlah cicilan minimum). */
export function planPayoff(debts: Debt[], monthlyBudget: number, strategy: "avalanche" | "snowball"): PayoffPlan {
  const ds = debts.filter((d) => d.balance > 0).map((d) => ({ ...d }));
  const minTotal = ds.reduce((s, d) => s + d.minPayment, 0);
  if (ds.length === 0) return { strategy, months: 0, totalInterest: 0, feasible: true, order: [] };
  if (monthlyBudget < minTotal || monthlyBudget <= 0) return { strategy, months: 0, totalInterest: 0, feasible: false, order: [] };
  const prio = (a: Debt, b: Debt) => (strategy === "avalanche" ? b.annualRatePct - a.annualRatePct : a.balance - b.balance);
  let months = 0, interest = 0;
  const order: string[] = [];
  while (ds.some((d) => d.balance > 0.5) && months < MAX_MONTHS) {
    months++;
    let pool = monthlyBudget;
    for (const d of ds) if (d.balance > 0) { const i = d.balance * (d.annualRatePct / 100 / 12); d.balance += i; interest += i; }
    for (const d of ds) if (d.balance > 0) { const p = Math.min(d.minPayment, d.balance); d.balance -= p; pool -= p; }
    for (const d of [...ds].sort(prio)) {
      if (d.balance <= 0 || pool <= 0) continue;
      const p = Math.min(pool, d.balance); d.balance -= p; pool -= p;
    }
    for (const d of ds) if (d.balance <= 0.5 && !order.includes(d.name)) { d.balance = 0; order.push(d.name); }
  }
  const feasible = !ds.some((d) => d.balance > 0.5);
  return { strategy, months, totalInterest: Math.round(interest), feasible, order };
}
