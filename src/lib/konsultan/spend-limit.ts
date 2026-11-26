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

// ---------------------------------------------------------------------------------------------
// Batas utama: satu angka (harian, mingguan, atau bulanan) dipecah otomatis ke tiga periode, plus "utang batas".
// Utang batas = kelebihan di atas jatah harian yang terbawa ke hari berikutnya sampai lunas (bukan utang sungguhan).
// Murni, tanpa database. Tidak ada angka yang ditebak: semua turunan dari angka yang diisi pengguna.
// ---------------------------------------------------------------------------------------------
export const daysInMonthOf = (date: string): number => new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).getUTCDate();

/** Batas utama = batas aktif tanpa kategori (semua pengeluaran). Pilih periode terkecil, lalu yang paling lama dibuat. */
export function masterLimit<T extends Limit & { created_at?: string }>(limits: T[]): T | null {
  const order: Record<Period, number> = { harian: 0, mingguan: 1, bulanan: 2 };
  const all = limits.filter((l) => l.is_active && l.category_ids.length === 0);
  if (all.length === 0) return null;
  return [...all].sort((a, b) => order[a.period] - order[b.period] || (a.created_at ?? "").localeCompare(b.created_at ?? ""))[0];
}

/** Jatah satu hari pada tanggal tertentu, diturunkan dari periode yang diisi pengguna. */
export function dailyAllowance(limit: Pick<Limit, "period" | "amount">, date: string): number {
  if (limit.period === "harian") return limit.amount;
  if (limit.period === "mingguan") return Math.round(limit.amount / 7);
  return Math.round(limit.amount / daysInMonthOf(date));
}

/** Tiga angka batas dari satu angka. Periode yang diisi pengguna dipakai apa adanya. */
export function splitLimit(limit: Pick<Limit, "period" | "amount">, today: string): Record<Period, number> {
  const d = dailyAllowance(limit, today);
  return {
    harian: limit.period === "harian" ? limit.amount : d,
    mingguan: limit.period === "mingguan" ? limit.amount : limit.period === "harian" ? limit.amount * 7 : Math.round(d * 7),
    bulanan: limit.period === "bulanan" ? limit.amount : d * daysInMonthOf(today),
  };
}

export type DebtView = {
  /** Utang batas yang terbawa MASUK hari ini (dari hari-hari sebelumnya). */
  debtIn: number;
  /** Jatah harian penuh hari ini. */
  allowance: number;
  /** Jatah yang masih boleh dipakai hari ini setelah dipotong utang (tidak pernah negatif). */
  available: number;
  spentToday: number;
  /** Sisa jatah hari ini (negatif = lebih). */
  remainingToday: number;
  /** Utang batas bila hari ini ditutup dengan pengeluaran sekarang. */
  debtAfterToday: number;
  /** Paling cepat berapa hari lagi lunas bila tidak belanja sama sekali (null = sudah lunas). */
  daysToClear: number | null;
};

/**
 * Hitung utang batas dari `startDate` sampai kemarin: tiap hari utang = max(0, utang kemarin + pengeluaran - jatah).
 * Hari hemat melunasi utang; tidak ada saldo lebih yang disimpan.
 */
export function debtView(limit: Pick<Limit, "period" | "amount">, txs: Tx[], startDate: string, today: string): DebtView {
  const spentOn = new Map<string, number>();
  for (const t of txs) if (t.type === "expense") spentOn.set(t.date, (spentOn.get(t.date) ?? 0) + Number(t.amount));
  let debt = 0;
  for (let d = startDate; d < today; d = addDays(d, 1)) {
    debt = Math.max(0, debt + (spentOn.get(d) ?? 0) - dailyAllowance(limit, d));
  }
  const allowance = dailyAllowance(limit, today);
  const spentToday = spentOn.get(today) ?? 0;
  const debtAfterToday = Math.max(0, debt + spentToday - allowance);
  // Patokan paling cepat: berapa hari utang lunas bila pengguna tidak belanja sama sekali (bukan tebakan kebiasaan).
  const daysToClear = debtAfterToday === 0 ? null : Math.ceil(debtAfterToday / Math.max(allowance, 1));
  return { debtIn: debt, allowance, available: Math.max(0, allowance - debt), spentToday, remainingToday: allowance - debt - spentToday, debtAfterToday, daysToClear };
}

/** Status tiga periode untuk batas utama (semua pengeluaran), siap ditampilkan. */
export function masterStatuses(limit: Limit, txs: Tx[], today: string): Record<Period, Status> {
  const amounts = splitLimit(limit, today);
  const one = (p: Period): Status => limitStatus({ ...limit, period: p, amount: amounts[p] }, txs, today);
  return { harian: one("harian"), mingguan: one("mingguan"), bulanan: one("bulanan") };
}

/**
 * Ukuran "terpakai" untuk batas utama HARI INI, dipakai sama persis di Beranda dan halaman Batas Pengeluaran.
 * Pembagi = jatah setelah dipotong utang batas. Jatah 0 karena utang dihitung 100% (lewat).
 */
export function dailyGauge(d: DebtView, warnPct: number): { pct: number; level: Level; cap: number; spent: number; over: boolean } {
  const cap = d.available, spent = d.spentToday;
  const pct = cap > 0 ? Math.round((spent / cap) * 100) : spent > 0 || d.debtIn > 0 ? 100 : 0;
  const level: Level = spent > cap || (cap === 0 && d.debtIn > 0) ? "lewat" : pct >= warnPct ? "hampir" : "aman";
  return { pct, level, cap, spent, over: spent > cap };
}

/** Status batas utama HARI INI yang sudah memperhitungkan hutang batas (dipakai push dan peringatan). */
export function masterDailyStatus(limit: Limit, d: DebtView, today: string): Status {
  const g = dailyGauge(d, limit.warn_pct);
  return { limit: { ...limit, period: "harian", amount: g.cap }, spent: g.spent, remaining: g.cap - g.spent, pct: g.pct, level: g.level, from: today, to: today };
}

/** Pesan peringatan batas utama hari ini, menyebut hutang batas bila ada. Null bila aman. */
export function masterMessage(name: string, d: DebtView, warnPct: number, fmt: (n: number) => string): string | null {
  const g = dailyGauge(d, warnPct);
  if (g.level === "aman") return null;
  const cut = d.debtIn > 0 ? ` (jatah ${fmt(d.allowance)} sudah dipotong hutang batas ${fmt(d.debtIn)})` : "";
  if (g.level === "lewat") return `Batas "${name}" terlewati hari ini: terpakai ${fmt(g.spent)} dari jatah ${fmt(g.cap)}${cut}${g.over ? `, lebih ${fmt(g.spent - g.cap)}` : ""}.`;
  return `Batas "${name}" hampir habis hari ini: terpakai ${fmt(g.spent)} dari jatah ${fmt(g.cap)}${cut}, sisa ${fmt(g.cap - g.spent)}.`;
}
