/**
 * Proyeksi timeline tabungan: tiap gajian dibagi ke target secara berurutan
 * (prioritas 1 dulu sampai penuh, lalu prioritas 2, dst), setelah dikurangi
 * biaya hidup, kasih ortu, dan tagihan bulanan (mis. langganan Claude).
 * Fungsi murni: tidak membaca jam atau database.
 */

export interface TimelineGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  priority: number;
  deadline: string | null;
}

export interface TimelinePayday {
  date: string; // YYYY-MM-DD
  income: number; // uang masuk (actual jika sudah, kalau belum expected)
  done: boolean; // sudah terjadi / sudah tercatat
  parents: number; // kasih ortu pada gajian ini
}

export interface MonthlyCharge {
  name: string;
  amount: number;
  dayOfMonth: number;
}

export interface TimelineInput {
  goals: TimelineGoal[];
  paydays: TimelinePayday[];
  livingCost: number;
  charges: MonthlyCharge[];
  today: string; // YYYY-MM-DD (WIB)
  step?: number; // pembulatan ke atas setoran, default Rp50.000
}

export interface TimelineEntry {
  date: string;
  income: number;
  living: number;
  parents: number;
  charges: { name: string; amount: number }[];
  free: number;
  add: Record<string, number>;
  balance: Record<string, number>;
  leftover: number;
  done: boolean;
  isNext: boolean;
}

export interface TimelineMonth {
  key: string; // YYYY-MM
  entries: TimelineEntry[];
  start: Record<string, number>;
  end: Record<string, number>;
  done: boolean;
}

export interface TimelineResult {
  entries: TimelineEntry[];
  months: TimelineMonth[];
  /** tanggal gajian saat target penuh, "done" jika sudah penuh, null jika belum penuh dalam jadwal */
  eta: Record<string, string | "done" | null>;
}

/** Ambil nominal "Kasih ortu Rp1.000.000" dari catatan jadwal gajian. */
export function parseParentsAmount(note: string | null | undefined): number {
  if (!note) return 0;
  const m = note.match(/kasih\s+ortu\s*rp\s*([\d.]+)/i);
  if (!m) return 0;
  return parseInt(m[1].replace(/\./g, ""), 10) || 0;
}

function lastDayOfMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

const pad = (n: number) => String(n).padStart(2, "0");

export function buildSavingsTimeline(input: TimelineInput): TimelineResult {
  const step = input.step ?? 50000;
  const goals = [...input.goals].sort((a, b) => a.priority - b.priority);
  const paydays = [...input.paydays].sort((a, b) => a.date.localeCompare(b.date));

  const isDone = (p: TimelinePayday) => p.done || p.date < input.today;

  // 1. Tentukan gajian yang menanggung tiap tagihan bulanan:
  //    gajian terakhir pada/sebelum tanggal tagihan. Kalau gajian itu sudah lewat/tercatat,
  //    pakai gajian pertama setelah tanggal tagihan.
  const chargesByPayday = new Map<string, { name: string; amount: number }[]>();
  if (paydays.length > 0 && input.charges.length > 0) {
    const first = paydays[0].date;
    const last = paydays[paydays.length - 1].date;
    let y = parseInt(first.slice(0, 4), 10);
    let m = parseInt(first.slice(5, 7), 10);
    const endKey = last.slice(0, 7);
    // sampai 1 bulan setelah gajian terakhir tidak perlu: tagihan sesudahnya tak punya gajian
    for (let guard = 0; guard < 120; guard++) {
      const key = `${y}-${pad(m)}`;
      for (const c of input.charges) {
        const day = Math.min(c.dayOfMonth, lastDayOfMonth(y, m));
        const chargeDate = `${key}-${pad(day)}`;
        let target: TimelinePayday | undefined;
        for (const p of paydays) if (p.date <= chargeDate) target = p;
        if (!target || isDone(target)) {
          target = paydays.find((p) => p.date > chargeDate && !isDone(p));
        }
        if (target) {
          const list = chargesByPayday.get(target.date) ?? [];
          list.push({ name: c.name, amount: c.amount });
          chargesByPayday.set(target.date, list);
        }
      }
      if (key >= endKey) break;
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
  }

  // 2. Proyeksi per gajian dari saldo sekarang.
  const bal: Record<string, number> = {};
  goals.forEach((g) => (bal[g.id] = g.saved));
  const eta: Record<string, string | "done" | null> = {};
  goals.forEach((g) => (eta[g.id] = g.saved >= g.target ? "done" : null));

  const entries: TimelineEntry[] = [];
  let nextAssigned = false;

  for (const p of paydays) {
    const done = isDone(p);
    const add: Record<string, number> = {};
    goals.forEach((g) => (add[g.id] = 0));
    const charges = done ? [] : chargesByPayday.get(p.date) ?? [];
    const chargeTotal = charges.reduce((s, c) => s + c.amount, 0);
    const living = done ? 0 : input.livingCost;
    const parents = done ? 0 : p.parents;
    const free = done ? 0 : p.income - living - parents - chargeTotal;
    let left = Math.max(0, free);

    if (!done) {
      for (const g of goals) {
        const need = Math.max(0, g.target - bal[g.id]);
        const give = Math.min(left, Math.ceil(need / step) * step);
        add[g.id] = give;
        left -= give;
        bal[g.id] += give;
        if (eta[g.id] === null && bal[g.id] >= g.target) eta[g.id] = p.date;
      }
    }

    const isNext = !done && !nextAssigned;
    if (isNext) nextAssigned = true;

    entries.push({
      date: p.date,
      income: p.income,
      living,
      parents,
      charges,
      free,
      add,
      balance: { ...bal },
      leftover: left,
      done,
      isNext,
    });
  }

  // 3. Kelompokkan per bulan; berhenti setelah bulan saat semua target penuh.
  const startBal: Record<string, number> = {};
  goals.forEach((g) => (startBal[g.id] = g.saved));
  const months: TimelineMonth[] = [];
  let prevEnd = { ...startBal };
  for (const e of entries) {
    const key = e.date.slice(0, 7);
    let month = months[months.length - 1];
    if (!month || month.key !== key) {
      month = { key, entries: [], start: { ...prevEnd }, end: { ...prevEnd }, done: true };
      months.push(month);
    }
    month.entries.push(e);
    month.end = { ...e.balance };
    if (!e.done) month.done = false;
    prevEnd = { ...e.balance };
  }

  let cut = months.length;
  if (goals.length > 0) {
    const idx = months.findIndex((m) => goals.every((g) => m.end[g.id] >= g.target));
    if (idx >= 0) cut = idx + 1;
  }

  return { entries, months: months.slice(0, cut), eta };
}

/* ───────── Deret waktu per tabungan (untuk grafik) ───────── */

export type Granularity = "day" | "week" | "month";

export interface SeriesPoint {
  date: string; // YYYY-MM-DD, akhir periode
  balance: number; // saldo tabungan pada tanggal itu
  added: number; // setoran yang masuk sejak titik sebelumnya
}

const DAY = 86_400_000;
const toMs = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Saldo satu tabungan pada tanggal tertentu (sesudah gajian pada/sebelum tanggal itu). */
export function balanceAt(
  entries: TimelineEntry[],
  goalId: string,
  startSaved: number,
  date: string
): number {
  let b = startSaved;
  for (const e of entries) {
    if (e.date <= date) b = e.balance[goalId] ?? b;
    else break;
  }
  return b;
}

/** Tanggal terakhir yang perlu digambar: saat penuh, atau gajian terakhir. */
export function seriesEnd(
  entries: TimelineEntry[],
  eta: string | "done" | null,
  today: string
): string {
  const lastEntry = entries.length ? entries[entries.length - 1].date : today;
  const end = eta && eta !== "done" ? eta : lastEntry;
  return end < today ? today : end;
}

export function buildGoalSeries(
  entries: TimelineEntry[],
  goalId: string,
  startSaved: number,
  today: string,
  end: string,
  gran: Granularity
): SeriesPoint[] {
  const startMs = toMs(today);
  const endMs = toMs(end);
  const dates: number[] = [startMs];

  if (gran === "day") {
    for (let t = startMs + DAY; t <= endMs && dates.length < 800; t += DAY) dates.push(t);
  } else if (gran === "week") {
    for (let t = startMs + 7 * DAY; t < endMs && dates.length < 400; t += 7 * DAY) dates.push(t);
  } else {
    const s = new Date(startMs);
    let y = s.getUTCFullYear();
    let m = s.getUTCMonth();
    for (let guard = 0; guard < 240; guard++) {
      const last = Date.UTC(y, m + 1, 0);
      if (last >= endMs) break;
      if (last > startMs) dates.push(last);
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
  }
  if (endMs > startMs && dates[dates.length - 1] !== endMs) dates.push(endMs);

  let prev = startSaved;
  return dates.map((t) => {
    const date = fromMs(t);
    const balance = balanceAt(entries, goalId, startSaved, date);
    const added = Math.max(0, balance - prev);
    prev = balance;
    return { date, balance, added };
  });
}
