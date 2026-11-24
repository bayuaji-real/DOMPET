/** Hitung siapa berutang ke siapa di grup patungan. Semua angka bulat Rupiah. */
export interface SMember { user_id: string; display_name: string }
export interface SExpense { paid_by: string; amount: number; split_among: string[] }
export interface SPayment { from_user: string; to_user: string; amount: number }
export interface Transfer { from: string; to: string; amount: number }

/** Saldo bersih per orang: positif = piutang (harus menerima), negatif = berutang. */
export function netBalances(members: SMember[], expenses: SExpense[], payments: SPayment[]): Map<string, number> {
  const net = new Map<string, number>(members.map((m) => [m.user_id, 0]));
  const add = (id: string, v: number) => net.set(id, (net.get(id) ?? 0) + v);
  for (const e of expenses) {
    const n = e.split_among.length;
    if (n === 0) continue;
    const base = Math.floor(e.amount / n);
    let rest = e.amount - base * n; // sisa rupiah dibebankan ke orang pertama, supaya total pas
    add(e.paid_by, e.amount);
    for (const u of e.split_among) { add(u, -(base + (rest > 0 ? 1 : 0))); if (rest > 0) rest--; }
  }
  for (const p of payments) { add(p.from_user, p.amount); add(p.to_user, -p.amount); }
  return net;
}

/** Saran transfer paling sedikit: yang berutang membayar yang berpiutang. */
export function suggestTransfers(net: Map<string, number>): Transfer[] {
  const debt = [...net].filter(([, v]) => v < 0).map(([id, v]) => ({ id, v: -v })).sort((a, b) => b.v - a.v);
  const cred = [...net].filter(([, v]) => v > 0).map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v);
  const out: Transfer[] = [];
  let i = 0, j = 0;
  while (i < debt.length && j < cred.length) {
    const amt = Math.min(debt[i].v, cred[j].v);
    if (amt > 0) out.push({ from: debt[i].id, to: cred[j].id, amount: amt });
    debt[i].v -= amt; cred[j].v -= amt;
    if (debt[i].v === 0) i++;
    if (cred[j].v === 0) j++;
  }
  return out;
}
