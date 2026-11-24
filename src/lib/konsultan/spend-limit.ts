// Batas pengeluaran harian/mingguan/bulanan (murni, tanpa database). Minggu dihitung Senin sampai Minggu (WIB).
export type Period = "harian" | "mingguan" | "bulanan";
export type Limit = { id: string; name: string; period: Period; amount: number; category_ids: string[]; warn_pct: number; is_active: boolean };
export type Tx = { type: string; amount: number; date: string; category_id: string | null };
export type Level = "aman" | "hampir" | "lewat";
export type Status = { limit: Limit; spent: number; remaining: number; pct: number; level: Level; from: string; to: string };

const addDays = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

export function periodRange(period: Period, today: string): { from: string; to: string } {
  if (period === "harian") return { from: today, to: today };
  if (period === "mingguan") {
    const dow = (new Date(today + "T00:00:00Z").getUTCDay() + 6) % 7; // Senin = 0
    const from = addDays(today, -dow);
    return { from, to: addDays(from, 6) };
  }
  const y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7));
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${today.slice(0, 7)}-01`, to: `${today.slice(0, 7)}-${String(last).padStart(2, "0")}` };
}

export function limitStatus(limit: Limit, txs: Tx[], today: string): Status {
  const { from, to } = periodRange(limit.period, today);
  const cats = new Set(limit.category_ids);
  const spent = txs.reduce((s, t) => (t.type === "expense" && t.date >= from && t.date <= to && (cats.size === 0 || (t.category_id !== null && cats.has(t.category_id))) ? s + Number(t.amount) : s), 0);
  const pct = limit.amount > 0 ? Math.round((spent / limit.amount) * 100) : 0;
  const level: Level = spent > limit.amount ? "lewat" : pct >= limit.warn_pct ? "hampir" : "aman";
  return { limit, spent, remaining: limit.amount - spent, pct, level, from, to };
}

export function limitStatuses(limits: Limit[], txs: Tx[], today: string): Status[] {
  return limits.filter((l) => l.is_active).map((l) => limitStatus(l, txs, today));
}

const PERIOD_TEXT: Record<Period, string> = { harian: "hari ini", mingguan: "minggu ini", bulanan: "bulan ini" };
export function limitMessage(s: Status, fmt: (n: number) => string): string | null {
  if (s.level === "aman") return null;
  const when = PERIOD_TEXT[s.limit.period];
  if (s.level === "lewat") return `Batas "${s.limit.name}" terlewati ${when}: terpakai ${fmt(s.spent)} dari ${fmt(s.limit.amount)} (lebih ${fmt(-s.remaining)}).`;
  return `Batas "${s.limit.name}" hampir habis ${when}: terpakai ${fmt(s.spent)} dari ${fmt(s.limit.amount)}, sisa ${fmt(s.remaining)}.`;
}
/** Rentang tanggal terlebar yang dibutuhkan untuk menghitung semua batas. */
export function neededRange(limits: Limit[], today: string): { from: string; to: string } {
  const rs = limits.map((l) => periodRange(l.period, today));
  return { from: rs.reduce((a, r) => (r.from < a ? r.from : a), today), to: today };
}
