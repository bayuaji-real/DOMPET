/**
 * Mesin rencana keuangan per gajian (pasti, tanpa AI).
 *
 * Cara kerjanya meniru cara bagi gaji manual:
 * 1. Tiap gajian: potong biaya hidup per gajian.
 * 2. Potong tagihan bulanan yang jatuh tempo sebelum gajian berikutnya, dan kebutuhan sekali bayar
 *    (yang tidak ditabung) yang jatuh pada periode itu.
 * 3. Sisanya diisi BERURUTAN ke kebutuhan/target (tenggat paling dekat dulu) sampai penuh,
 *    setoran dibulatkan ke kelipatan `roundTo` (default Rp50.000). Sisa recehan jadi "sisa bebas".
 * 4. Tempat simpan disarankan sesuai jarak ke tenggat (aturan jangka waktu).
 */

import { clampedDate, daysInMonth } from "@/lib/dates";

export interface PlanPayday {
  date: string; // YYYY-MM-DD
  amount: number;
}

export interface PlanBill {
  name: string;
  amount: number;
  /** tanggal jatuh tempo tiap bulan */
  dayOfMonth: number;
}

export interface PlanNeed {
  id: string;
  name: string;
  /** sisa yang masih harus dikumpulkan */
  remaining: number;
  /** total target (untuk tampilan) */
  target: number;
  deadline: string | null;
  priority?: number;
}

export interface PlanInput {
  today: string;
  paydays: PlanPayday[];
  livingPerPayday: number;
  bills: PlanBill[];
  needs: PlanNeed[];
  roundTo?: number;
}

export interface PaydayAllocation {
  date: string;
  income: number;
  living: number;
  bills: { name: string; amount: number }[];
  deposits: { needId: string; name: string; amount: number }[];
  leftover: number;
  /** pemasukan tidak cukup untuk biaya hidup + tagihan */
  deficit: number;
}

export type StorageAdvice = "bank" | "rdpu" | "investasi_jangka_panjang";

export interface NeedResult {
  id: string;
  name: string;
  target: number;
  remaining: number;
  deadline: string | null;
  /** tanggal gajian saat target diperkirakan penuh */
  fullOn: string | null;
  onTime: boolean | null;
  /** jumlah gajian dari sekarang sampai tenggat (termasuk gajian di hari tenggat) */
  paydaysUntilDeadline: number | null;
  /** setoran rata-rata per gajian yang dibutuhkan agar tepat waktu */
  neededPerPayday: number | null;
  /** kekurangan pada tenggat bila tidak tepat waktu */
  shortfallAtDeadline: number;
  monthsToDeadline: number | null;
  storage: StorageAdvice;
}

export interface PlanResult {
  allocations: PaydayAllocation[];
  needs: NeedResult[];
  totalNeeds: number;
  totalIncome: number;
  totalLiving: number;
  totalBills: number;
  totalLeftover: number;
  /** tanggal kebutuhan terakhir terpenuhi, atau null bila ada yang tidak terpenuhi dalam jadwal gajian */
  allDoneOn: string | null;
}

const ceilTo = (n: number, step: number) => Math.ceil(n / step) * step;
const floorTo = (n: number, step: number) => Math.floor(n / step) * step;

function monthsBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round(((b - a) / 86400000 / 30.44) * 10) / 10;
}

/** Tanggal jatuh tempo tagihan bulanan dalam rentang [start, end). */
export function billDueDates(bill: PlanBill, start: string, end: string): string[] {
  const out: string[] = [];
  let [y, m] = start.split("-").map(Number);
  for (let guard = 0; guard < 24; guard++) {
    const d = clampedDate(y, m, Math.min(bill.dayOfMonth, daysInMonth(y, m)));
    if (d >= end) break;
    if (d >= start) out.push(d);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function storageFor(monthsToDeadline: number | null): StorageAdvice {
  if (monthsToDeadline === null) return "rdpu";
  if (monthsToDeadline < 3) return "bank";
  if (monthsToDeadline <= 60) return "rdpu";
  return "investasi_jangka_panjang";
}

export function buildPlan(input: PlanInput): PlanResult {
  const step = input.roundTo ?? 50000;
  const paydays = [...input.paydays]
    .filter((p) => p.date >= input.today && p.amount > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const order = [...input.needs]
    .filter((n) => n.remaining > 0)
    .sort((a, b) => {
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline) || (a.priority ?? 0) - (b.priority ?? 0);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return (a.priority ?? 0) - (b.priority ?? 0);
    });
  const left = new Map(order.map((n) => [n.id, n.remaining]));
  const fullOn = new Map<string, string>();
  const savedBy = new Map<string, { date: string; total: number }[]>();

  const allocations: PaydayAllocation[] = [];
  for (let i = 0; i < paydays.length; i++) {
    const p = paydays[i];
    const nextDate = paydays[i + 1]?.date ?? clampedDate(Number(p.date.slice(0, 4)) + 1, 1, 1);
    const bills = input.bills.flatMap((b) =>
      billDueDates(b, p.date, nextDate).map(() => ({ name: b.name, amount: b.amount }))
    );
    const fixed = input.livingPerPayday + bills.reduce((a, b) => a + b.amount, 0);
    let free = p.amount - fixed;
    const deficit = free < 0 ? -free : 0;
    free = Math.max(0, free);

    const deposits: PaydayAllocation["deposits"] = [];
    for (const n of order) {
      const rem = left.get(n.id) ?? 0;
      if (rem <= 0) continue;
      const pot = floorTo(free, step);
      if (pot <= 0) break;
      const amount = Math.min(pot, ceilTo(rem, step));
      deposits.push({ needId: n.id, name: n.name, amount });
      free -= amount;
      const after = rem - amount;
      left.set(n.id, after);
      if (after <= 0 && !fullOn.has(n.id)) fullOn.set(n.id, p.date);
    }
    for (const n of order) {
      const list = savedBy.get(n.id) ?? [];
      list.push({ date: p.date, total: n.remaining - Math.max(0, left.get(n.id) ?? 0) });
      savedBy.set(n.id, list);
    }

    allocations.push({ date: p.date, income: p.amount, living: input.livingPerPayday, bills, deposits, leftover: free, deficit });
    if (order.every((n) => (left.get(n.id) ?? 0) <= 0) && i >= 0) {
      // semua kebutuhan sudah penuh: gajian berikutnya tidak perlu dihitung lagi
      break;
    }
  }

  const needs: NeedResult[] = [...input.needs].map((n) => {
    const done = fullOn.get(n.id) ?? (n.remaining <= 0 ? input.today : null);
    const until = n.deadline ? paydays.filter((p) => p.date <= n.deadline!).length : null;
    const savedAtDeadline = n.deadline
      ? (savedBy.get(n.id) ?? []).filter((s) => s.date <= n.deadline!).reduce((a, s) => Math.max(a, s.total), 0)
      : 0;
    const months = n.deadline ? monthsBetween(input.today, n.deadline) : null;
    return {
      id: n.id,
      name: n.name,
      target: n.target,
      remaining: n.remaining,
      deadline: n.deadline,
      fullOn: done,
      onTime: n.deadline ? (done !== null && done <= n.deadline) : null,
      paydaysUntilDeadline: until,
      neededPerPayday: until && until > 0 ? ceilTo(n.remaining / until, step) : null,
      shortfallAtDeadline: n.deadline ? Math.max(0, n.remaining - savedAtDeadline) : 0,
      monthsToDeadline: months,
      storage: storageFor(months),
    };
  });

  const doneDates = order.map((n) => fullOn.get(n.id) ?? null);
  return {
    allocations,
    needs,
    totalNeeds: order.reduce((a, n) => a + n.remaining, 0),
    totalIncome: allocations.reduce((a, x) => a + x.income, 0),
    totalLiving: allocations.reduce((a, x) => a + x.living, 0),
    totalBills: allocations.reduce((a, x) => a + x.bills.reduce((s, b) => s + b.amount, 0), 0),
    totalLeftover: allocations.reduce((a, x) => a + x.leftover, 0),
    allDoneOn: doneDates.length === 0 ? input.today : doneDates.every(Boolean) ? (doneDates as string[]).sort().at(-1)! : null,
  };
}

/** Bikin jadwal gajian perkiraan bila belum ada jadwal di aplikasi. */
export function generatePaydays(
  start: string,
  amount: number,
  frequency: "monthly" | "biweekly",
  count: number
): PlanPayday[] {
  const out: PlanPayday[] = [];
  const [y0, m0, d0] = start.split("-").map(Number);
  for (let i = 0; i < count; i++) {
    if (frequency === "biweekly") {
      const t = new Date(Date.UTC(y0, m0 - 1, d0 + i * 14));
      out.push({ date: t.toISOString().slice(0, 10), amount });
    } else {
      const m = ((m0 - 1 + i) % 12) + 1;
      const y = y0 + Math.floor((m0 - 1 + i) / 12);
      out.push({ date: clampedDate(y, m, d0), amount });
    }
  }
  return out;
}
