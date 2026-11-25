import { getTransactions } from "./transactions";
import { getWallets } from "./wallets";
import { getBudgets } from "./budgets";
import { getRecurringTransactions } from "./recurring";
import { getCategories } from "./categories";
import { todayJakarta } from "./sample-mode";

export interface FinanceSnapshot {
  monthlyIncome: number; monthlyExpense: number; liquidSavings: number; fixedBills: number;
  /** Uang yang bebas dipakai: di luar dompet tabungan dan investasi (dasar hitung dana darurat). */
  freeCash?: number;
  /** Berapa bulan data yang benar-benar ada (1 sampai 3). Rata-rata dibagi angka ini, bukan selalu 3. */
  monthsCovered?: number;
  /** Bila diisi, angka pemasukan/pengeluaran berasal dari Money Planner (gaji dikurangi biaya tetap), bukan rata-rata. Isinya penjelasan sumbernya. */
  basisNote?: string;
  budgets: { name: string; limit: number; spent: number }[];
  txs: { type: string; amount: number; date: string; category_id: string | null }[];
  categoryNames: Record<string, string>;
  today: string; hasData: boolean;
}

const shift = (d: string, days: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + days); return x.toISOString().slice(0, 10); };

/** Ringkasan angka untuk fitur konsultan. Rata-rata dari 90 hari terakhir, dibagi jumlah bulan data yang ada (1 sampai 3). Semua dihitung di perangkat, tanpa AI. */
export async function getFinanceSnapshot(): Promise<FinanceSnapshot> {
  const today = todayJakarta();
  const [txs, wallets, recurring, cats] = await Promise.all([
    getTransactions({ startDate: shift(today, -90), endDate: today }),
    getWallets(), getRecurringTransactions(), getCategories().catch(() => []),
  ]);
  const month = today.slice(0, 7);
  const budgets = await getBudgets(month).catch(() => []);
  const catNames: Record<string, string> = {};
  for (const c of cats as { id: string; name: string }[]) catNames[c.id] = c.name;
  const sum = (t: string) => txs.filter((x) => x.type === t).reduce((s, x) => s + Number(x.amount), 0);
  const spentByCat = new Map<string, number>();
  for (const t of txs) if (t.type === "expense" && t.category_id && t.date.startsWith(month)) spentByCat.set(t.category_id, (spentByCat.get(t.category_id) ?? 0) + Number(t.amount));
  // Data baru ada beberapa hari: jangan dibagi 3 (perkiraan jadi terlalu kecil).
  const earliest = txs.reduce((m, x) => (x.date < m ? x.date : m), today);
  const spanDays = Math.max(1, Math.round((Date.parse(today + "T00:00:00Z") - Date.parse(earliest + "T00:00:00Z")) / 86_400_000) + 1);
  const monthsCovered = Math.min(3, Math.max(1, Math.ceil(spanDays / 30)));
  const active = wallets.filter((w) => !w.is_archived);
  return {
    monthsCovered,
    monthlyIncome: Math.round(sum("income") / monthsCovered),
    monthlyExpense: Math.round(sum("expense") / monthsCovered),
    freeCash: active.filter((w) => w.type !== "investasi" && w.type !== "tabungan").reduce((s, w) => s + Number(w.balance), 0),
    liquidSavings: wallets.filter((w) => !w.is_archived && w.type !== "investasi").reduce((s, w) => s + Number(w.balance), 0),
    fixedBills: recurring.filter((r) => r.is_active && r.type === "expense").reduce((s, r) => s + Number(r.amount) * (r.rule === "biweekly" ? 26 / 12 : 1), 0),
    budgets: budgets.map((b) => ({ name: catNames[b.category_id] ?? "Kategori", limit: Number(b.limit_amount), spent: spentByCat.get(b.category_id) ?? 0 })),
    txs: txs.map((t) => ({ type: t.type, amount: Number(t.amount), date: t.date, category_id: t.category_id })),
    categoryNames: catNames, today, hasData: txs.length > 0,
  };
}
