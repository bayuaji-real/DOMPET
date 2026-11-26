/**
 * Alokasi uang untuk konteks Ruby. Dihitung di SERVER dengan kode (bukan oleh AI) supaya Ruby
 * selalu memisahkan uang bebas dari uang yang sudah terikat di target, menandai target yang mendekati
 * tenggat, dan punya rencana nominal "sisihkan berapa untuk apa" sebagai dasar jawaban.
 */

export interface AllocationGoalInput {
  name: string;
  target: number;
  saved: number;
  deadline: string | null;
  /** Setoran rencana per bulan yang sudah diatur pengguna (dipakai bila target tanpa tenggat). */
  monthly: number;
}

export interface AllocationInput {
  today: string;
  totalBalance: number;
  savingsBalance: number;
  nextPayday: string | null;
  /** Gaji yang diharapkan pada gajian berikutnya; 0 bila belum diatur. */
  nextPaydayAmount: number;
  /** Berapa kali gajian per bulan (1 = bulanan, ±2,17 = dua mingguan). */
  perMonth: number;
  /** Biaya hidup + tagihan rutin + cicilan utang per bulan. */
  fixedMonthly: number;
  goals: AllocationGoalInput[];
}

export type GoalStatus = "lewat" | "dekat" | "terjadwal" | "tanpa-tenggat" | "tercapai";

export interface AllocationGoal {
  name: string;
  remaining: number;
  deadline: string | null;
  daysLeft: number | null;
  paydaysLeft: number | null;
  /** Kebutuhan per gajian agar tepat waktu; null bila tanpa tenggat. */
  neededPerPayday: number | null;
  allocated: number;
  shortfall: number;
  status: GoalStatus;
}

export interface Allocation {
  freeMoney: number;
  lockedInSavings: number;
  fixedPerPayday: number;
  paydayAmount: number;
  /** Uang yang bisa dibagi pada gajian berikutnya: uang bebas + gaji - biaya tetap sesiklus. */
  pool: number;
  leftover: number;
  goals: AllocationGoal[];
}

/** Jumlah hari dari a ke b (b - a), format YYYY-MM-DD. */
export function daysBetween(a: string, b: string): number {
  const f = (d: string) => {
    const [y, m, dd] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, dd) / 86_400_000;
  };
  return Math.round(f(b) - f(a));
}

function addDays(d: string, n: number): string {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10);
}

function addMonthKeepDay(d: string, n: number, day: number): string {
  const [y, m] = d.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const out = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, last)));
  return out.toISOString().slice(0, 10);
}

/** Banyak gajian dari gajian berikutnya sampai tenggat (termasuk yang jatuh di hari tenggat). Minimal 1. */
export function paydaysUntil(nextPayday: string | null, deadline: string, perMonth: number): number {
  if (!nextPayday) return 1;
  const biweekly = perMonth > 1.6;
  const day = Number(nextPayday.slice(8, 10));
  let d = nextPayday;
  let n = 0;
  while (d <= deadline && n < 120) {
    n += 1;
    d = biweekly ? addDays(d, 14) : addMonthKeepDay(nextPayday, n, day);
  }
  return Math.max(1, n);
}

const ceil1000 = (n: number) => Math.ceil(n / 1000) * 1000;
const NEAR_DAYS = 45;

export function buildAllocation(i: AllocationInput): Allocation {
  const freeMoney = Math.max(0, Math.round(i.totalBalance - i.savingsBalance));
  const perMonth = i.perMonth > 0 ? i.perMonth : 1;
  const fixedPerPayday = Math.round(i.fixedMonthly / perMonth);
  const paydayAmount = Math.max(0, Math.round(i.nextPaydayAmount));
  const pool = Math.max(0, freeMoney + (paydayAmount > 0 ? paydayAmount - fixedPerPayday : 0));

  const rows: AllocationGoal[] = i.goals.map((g) => {
    const remaining = Math.max(0, Math.round(g.target - g.saved));
    if (remaining === 0) {
      return { name: g.name, remaining, deadline: g.deadline, daysLeft: null, paydaysLeft: null, neededPerPayday: 0, allocated: 0, shortfall: 0, status: "tercapai" };
    }
    if (!g.deadline) {
      const want = Math.round((g.monthly || 0) / perMonth);
      return { name: g.name, remaining, deadline: null, daysLeft: null, paydaysLeft: null, neededPerPayday: want > 0 ? want : null, allocated: 0, shortfall: 0, status: "tanpa-tenggat" };
    }
    const daysLeft = daysBetween(i.today, g.deadline);
    if (daysLeft < 0) {
      return { name: g.name, remaining, deadline: g.deadline, daysLeft, paydaysLeft: 0, neededPerPayday: remaining, allocated: 0, shortfall: 0, status: "lewat" };
    }
    const paydaysLeft = paydaysUntil(i.nextPayday, g.deadline, perMonth);
    const needed = Math.min(remaining, ceil1000(remaining / paydaysLeft));
    return {
      name: g.name,
      remaining,
      deadline: g.deadline,
      daysLeft,
      paydaysLeft,
      neededPerPayday: needed,
      allocated: 0,
      shortfall: 0,
      status: daysLeft <= NEAR_DAYS ? "dekat" : "terjadwal",
    };
  });

  // Urut tenggat terdekat dulu (yang lewat paling atas, tanpa tenggat paling akhir), lalu bagi uang secara berurutan.
  rows.sort((a, b) => {
    if (a.deadline === b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });
  let left = pool;
  for (const r of rows) {
    if (r.status === "tercapai" || r.neededPerPayday == null || r.neededPerPayday <= 0) continue;
    const give = Math.min(r.neededPerPayday, left);
    r.allocated = give;
    r.shortfall = Math.max(0, r.neededPerPayday - give);
    left -= give;
  }
  return { freeMoney, lockedInSavings: Math.round(i.savingsBalance), fixedPerPayday, paydayAmount, pool, leftover: left, goals: rows };
}

const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

const STATUS_TEXT: Record<GoalStatus, string> = {
  lewat: "SUDAH LEWAT TENGGAT",
  dekat: "DEKAT TENGGAT",
  terjadwal: "masih aman waktunya",
  "tanpa-tenggat": "tanpa tenggat",
  tercapai: "sudah tercapai",
};

/** Teks untuk prompt. Ruby wajib memakai blok ini sebelum menjawab apa pun soal uang. */
export function allocationToText(a: Allocation, nextPayday: string | null): string {
  const lines: string[] = [
    "ALOKASI UANG (dihitung aplikasi, pakai ini sebagai dasar semua jawaban):",
    `- Uang bebas (di luar tabungan): ${rp(a.freeMoney)}. Uang yang sudah terikat di tabungan/target: ${rp(a.lockedInSavings)} (BUKAN sisa uang yang bebas dipakai).`,
  ];
  if (a.paydayAmount > 0) {
    lines.push(`- Gajian berikutnya ${nextPayday ?? "(tanggal belum diatur)"}: ${rp(a.paydayAmount)}. Biaya hidup + tagihan + cicilan per gajian: ${rp(a.fixedPerPayday)}.`);
  }
  lines.push(`- Uang yang bisa dibagi ke target pada gajian berikutnya: ${rp(a.pool)}.`);
  if (a.goals.length === 0) {
    lines.push("- Belum ada target tabungan aktif.");
  } else {
    lines.push("Target, urut dari tenggat terdekat (usulan pembagian dari uang yang bisa dibagi):");
    a.goals.forEach((g, idx) => {
      const waktu =
        g.deadline && g.daysLeft != null
          ? `tenggat ${g.deadline} (${g.daysLeft >= 0 ? `${g.daysLeft} hari lagi` : `lewat ${-g.daysLeft} hari`}, ${g.paydaysLeft ?? 0} gajian sebelum tenggat)`
          : "tanpa tenggat";
      const need = g.neededPerPayday ? `perlu ${rp(g.neededPerPayday)} per gajian` : "belum ada setoran rencana";
      const usulan =
        g.status === "tercapai"
          ? ""
          : g.neededPerPayday
            ? `; usulan sisihkan ${rp(g.allocated)}${g.shortfall > 0 ? `, KURANG ${rp(g.shortfall)}` : ""}`
            : "";
      lines.push(`${idx + 1}. ${g.name} [${STATUS_TEXT[g.status]}]: sisa ${rp(g.remaining)}, ${waktu}, ${need}${usulan}.`);
    });
  }
  lines.push(`- Sisa bebas setelah semua usulan: ${rp(a.leftover)}.`);
  return lines.join("\n");
}
