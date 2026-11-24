export interface Tx { type: "income" | "expense" | "transfer" | string; amount: number; date: string; category_id: string | null }
export interface WeekReport { income: number; expense: number; net: number; prevExpense: number; expenseDeltaPct: number | null; topCategoryId: string | null; topCategoryAmount: number; count: number }
const sum = (t: Tx[], type: string) => t.filter((x) => x.type === type).reduce((s, x) => s + x.amount, 0);
/** Laporan minggu ini (7 hari sampai `end` termasuk) dibanding 7 hari sebelumnya. Tanggal format YYYY-MM-DD. */
export function weeklyReport(txs: Tx[], end: string): WeekReport {
  const shift = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const start = shift(end, -6), pStart = shift(end, -13), pEnd = shift(end, -7);
  const cur = txs.filter((t) => t.date >= start && t.date <= end);
  const prev = txs.filter((t) => t.date >= pStart && t.date <= pEnd);
  const by = new Map<string, number>();
  for (const t of cur) if (t.type === "expense" && t.category_id) by.set(t.category_id, (by.get(t.category_id) ?? 0) + t.amount);
  const top = [...by.entries()].sort((a, b) => b[1] - a[1])[0];
  const expense = sum(cur, "expense"), prevExpense = sum(prev, "expense"), income = sum(cur, "income");
  return { income, expense, net: income - expense, prevExpense, expenseDeltaPct: prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : null, topCategoryId: top?.[0] ?? null, topCategoryAmount: top?.[1] ?? 0, count: cur.length };
}
