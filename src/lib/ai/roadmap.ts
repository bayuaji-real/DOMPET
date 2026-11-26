/**
 * Rencana jangka panjang Ruby: simulasi bagi uang per gajian sampai semua target selesai.
 * Dihitung di SERVER dengan kode (bukan AI). Urutan: tenggat terdekat dulu; uang yang tersisa
 * mengalir ke target berikutnya setelah satu target selesai. Hasilnya dipakai Ruby untuk memberi
 * peta jalan beberapa bulan ke depan dan strategi mempercepat, bukan hanya langkah gajian berikutnya.
 */
import { addDays, addMonthKeepDay, daysBetween, type AllocationInput } from "@/lib/ai/allocation";

export interface RoadmapGoal {
  name: string;
  remaining: number;
  deadline: string | null;
  /** Tanggal gajian saat target ini lunas menurut simulasi; null bila tidak lunas dalam batas simulasi. */
  doneDate: string | null;
  /** Hari terlambat dari tenggat (0 bila tepat waktu atau tanpa tenggat). */
  lateDays: number;
}

export interface RoadmapStep {
  date: string;
  pool: number;
  gives: { name: string; amount: number }[];
}

export interface Roadmap {
  /** false bila gaji belum diatur (tidak bisa memproyeksikan pemasukan). */
  projectable: boolean;
  goals: RoadmapGoal[];
  steps: RoadmapStep[];
  /** Tambahan uang per gajian (hemat atau tambah pemasukan) agar semua target bertenggat tepat waktu; 0 = sudah aman; null = tidak tercapai wajar. */
  extraPerPaydayToBeOnTime: number | null;
  /** Alternatif: tambahan SEKALI di gajian pertama saja agar semua tenggat tepat waktu (null = tidak cukup). */
  extraOnceToBeOnTime: number | null;
  /** Total uang yang masih dibutuhkan semua target. */
  totalRemaining: number;
}

const MAX_PERIODS = 60;
const EXTRA_STEP = 10_000;
const EXTRA_MAX = 20_000_000;

function paydayDates(first: string, perMonth: number, count: number): string[] {
  const biweekly = perMonth > 1.6;
  const day = Number(first.slice(8, 10));
  const out: string[] = [];
  for (let k = 0; k < count; k++) out.push(biweekly ? addDays(first, 14 * k) : addMonthKeepDay(first, k, day));
  return out;
}

interface SimOut {
  goals: RoadmapGoal[];
  steps: RoadmapStep[];
}

function simulate(i: AllocationInput, extra: number, periods: number, firstOnly = false): SimOut | null {
  if (!i.nextPayday || i.nextPaydayAmount <= 0) return null;
  const perMonth = i.perMonth > 0 ? i.perMonth : 1;
  const fixedPerPayday = Math.round(i.fixedMonthly / perMonth);
  const base = Math.max(0, Math.round(i.nextPaydayAmount) - fixedPerPayday);
  const free = Math.max(0, Math.round(i.totalBalance - i.savingsBalance));
  const dates = paydayDates(i.nextPayday, perMonth, periods);

  const work = i.goals
    .map((g) => ({ name: g.name, deadline: g.deadline, left: Math.max(0, Math.round(g.target - g.saved)), done: null as string | null }))
    .filter((g) => g.left > 0)
    .sort((a, b) => {
      if (a.deadline === b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
  const initialLeft = new Map(work.map((g) => [g.name, g.left]));

  const steps: RoadmapStep[] = [];
  for (let k = 0; k < dates.length; k++) {
    let pool = base + (k === 0 ? free : 0) + (firstOnly ? (k === 0 ? extra : 0) : extra);
    const startPool = pool;
    const gives: { name: string; amount: number }[] = [];
    for (const g of work) {
      if (g.left <= 0 || pool <= 0) continue;
      const give = Math.min(g.left, pool);
      g.left -= give;
      pool -= give;
      gives.push({ name: g.name, amount: give });
      if (g.left === 0) g.done = dates[k];
    }
    steps.push({ date: dates[k], pool: startPool, gives });
    if (work.every((g) => g.left <= 0)) break;
  }

  const goals: RoadmapGoal[] = work.map((g) => ({
    name: g.name,
    remaining: initialLeft.get(g.name) ?? 0,
    deadline: g.deadline,
    doneDate: g.done,
    lateDays: g.deadline && g.done ? Math.max(0, daysBetween(g.deadline, g.done)) : g.deadline && !g.done ? 9999 : 0,
  }));
  return { goals, steps };
}

const onTime = (goals: RoadmapGoal[]) => goals.every((g) => !g.deadline || (g.doneDate !== null && g.lateDays === 0));

export function buildRoadmap(i: AllocationInput): Roadmap {
  const totalRemaining = i.goals.reduce((a, g) => a + Math.max(0, Math.round(g.target - g.saved)), 0);
  const sim = simulate(i, 0, MAX_PERIODS);
  if (!sim) return { projectable: false, goals: [], steps: [], extraPerPaydayToBeOnTime: null, extraOnceToBeOnTime: null, totalRemaining };

  const search = (firstOnly: boolean): number | null => {
    if (onTime(sim.goals)) return 0;
    const top = simulate(i, EXTRA_MAX, MAX_PERIODS, firstOnly);
    if (!top || !onTime(top.goals)) return null;
    let lo = 0;
    let hi = EXTRA_MAX / EXTRA_STEP;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const s = simulate(i, mid * EXTRA_STEP, MAX_PERIODS, firstOnly);
      if (s && onTime(s.goals)) hi = mid;
      else lo = mid + 1;
    }
    return lo * EXTRA_STEP;
  };
  return {
    projectable: true,
    goals: sim.goals,
    steps: sim.steps,
    extraPerPaydayToBeOnTime: search(false),
    extraOnceToBeOnTime: search(true),
    totalRemaining,
  };
}

const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
const MAX_GROUPS_SHOWN = 8;

/** Teks untuk prompt. Ruby memakai ini untuk peta jalan dan strategi (bukan menghitung sendiri). */
export function roadmapToText(r: Roadmap): string {
  if (!r.projectable) {
    return "RENCANA JANGKA PANJANG: belum bisa diproyeksikan karena gajian belum diatur. Minta pengguna mengatur gaji dan tanggal gajian dulu (halaman Rencana).";
  }
  if (r.goals.length === 0) return "RENCANA JANGKA PANJANG: semua target sudah tercapai atau belum ada target.";
  const lines: string[] = ["RENCANA JANGKA PANJANG (simulasi aplikasi: gaji tetap, urut tenggat terdekat, uang sisa mengalir ke target berikutnya):"];
  const doneText = (g: RoadmapGoal) => {
    if (!g.doneDate) return "tidak lunas dalam 5 tahun ke depan dengan kemampuan sekarang";
    if (!g.deadline) return `lunas ±${g.doneDate}`;
    if (g.lateDays === 0) return `lunas ±${g.doneDate}, TEPAT WAKTU (tenggat ${g.deadline})`;
    return `lunas ±${g.doneDate}, TERLAMBAT ${g.lateDays} hari dari tenggat ${g.deadline}`;
  };
  r.goals.forEach((g, idx) => lines.push(`${idx + 1}. ${g.name} (sisa ${rp(g.remaining)}): ${doneText(g)}.`));
  lines.push("Jadwal bagi uang per gajian (nominal Rp0 tidak ditulis; gajian dengan pembagian sama digabung):");
  const groups: { from: string; to: string; n: number; text: string }[] = [];
  r.steps.forEach((st, idx) => {
    const text = st.gives.map((x) => `${x.name} ${rp(x.amount)}`).join(", ");
    if (!text) return;
    const last = groups[groups.length - 1];
    if (last && last.text === text) {
      last.to = st.date;
      last.n += 1;
    } else groups.push({ from: st.date, to: st.date, n: 1, text: `${text}` });
  });
  groups.slice(0, MAX_GROUPS_SHOWN).forEach((g) => {
    lines.push(g.n === 1 ? `- Gajian ${g.from}: ${g.text}` : `- Gajian ${g.from} sampai ${g.to} (${g.n} gajian, tiap gajian): ${g.text}`);
  });
  if (groups.length > MAX_GROUPS_SHOWN) lines.push(`- ... lalu ${groups.length - MAX_GROUPS_SHOWN} tahap lagi sampai semua lunas (${r.steps[r.steps.length - 1].date}).`);
  if (r.extraPerPaydayToBeOnTime === 0) lines.push("Strategi: kemampuan sekarang sudah cukup untuk semua tenggat.");
  else if (r.extraPerPaydayToBeOnTime === null) lines.push("Strategi: tenggat tidak mungkin tercapai hanya dengan menambah sedikit; perlu menggeser tenggat atau menurunkan target.");
  else {
    const once = r.extraOnceToBeOnTime;
    lines.push(
      `Strategi agar semua tenggat tepat waktu: ${once !== null && once > 0 ? `tambahan SEKALI ${rp(once)} di gajian pertama, ATAU ` : ""}tambahan ${rp(r.extraPerPaydayToBeOnTime)} di setiap gajian (dari hemat biaya atau tambahan pemasukan). Alternatif tanpa tambahan: geser tenggat ke tanggal lunas di atas.`
    );
  }
  return lines.join("\n");
}
