/**
 * Hitungan kelayakan tabungan baru (murni angka, tanpa AI, supaya selalu konsisten dan bisa diuji).
 * Keputusan Owner: bandingkan target dengan pemasukan, pengeluaran, dan cicilan tabungan lain.
 */

export interface FeasibilityInput {
  targetAmount: number;
  /** Uang yang sudah dimiliki untuk tabungan ini. */
  initialAmount: number;
  /** YYYY-MM-DD atau null kalau tanpa tenggat. */
  deadline: string | null;
  /** YYYY-MM-DD, hari ini (WIB). */
  today: string;
  avgMonthlyIncome: number;
  avgMonthlyExpense: number;
  /** Total setoran bulanan tabungan lain yang masih aktif. */
  otherMonthlyCommitments: number;
}

export interface FeasibilityResult {
  remaining: number;
  /** Berapa bulan tersisa sampai tenggat (minimal 1), atau null tanpa tenggat. */
  monthsLeft: number | null;
  /** Yang harus disisihkan per bulan agar tepat waktu. Null kalau tanpa tenggat. */
  monthlyNeeded: number | null;
  /** Sisa uang per bulan sebelum tabungan baru: pemasukan - pengeluaran - tabungan lain. */
  freeMonthly: number;
  /** Sisa uang per bulan kalau tabungan baru ini dijalankan. */
  leftoverAfter: number | null;
  feasible: boolean;
  /** Kurang berapa per bulan (0 kalau layak). */
  shortfallMonthly: number;
  /** Bulan yang dibutuhkan kalau menabung sebesar sisa uang bulanan. Null kalau sisa <= 0. */
  monthsAtFreeRate: number | null;
  /** Tanggal paling cepat yang realistis (YYYY-MM-DD). */
  earliestRealisticDate: string | null;
  reason: "ok" | "tidak_ada_sisa" | "kurang_per_bulan" | "sudah_tercapai" | "tenggat_lewat" | "tanpa_tenggat";
}

export function monthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  let months = (ty - fy) * 12 + (tm - fm);
  if (td < fd) months -= 1;
  return months;
}

export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  const nd = Math.min(d, lastDay);
  return `${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
}

/** Bulatkan ke atas ke kelipatan 10.000 supaya angka mudah disisihkan. */
const roundUp10k = (n: number) => Math.ceil(n / 10000) * 10000;

export function computeFeasibility(i: FeasibilityInput): FeasibilityResult {
  const remaining = Math.max(0, Math.round(i.targetAmount - i.initialAmount));
  const freeMonthly = Math.round(i.avgMonthlyIncome - i.avgMonthlyExpense - i.otherMonthlyCommitments);

  const base = {
    remaining,
    freeMonthly,
    monthsAtFreeRate: freeMonthly > 0 && remaining > 0 ? Math.ceil(remaining / freeMonthly) : null,
  };
  const earliest = base.monthsAtFreeRate ? addMonths(i.today, base.monthsAtFreeRate) : null;

  if (remaining === 0) {
    return { ...base, monthsLeft: null, monthlyNeeded: 0, leftoverAfter: freeMonthly, feasible: true, shortfallMonthly: 0, earliestRealisticDate: i.today, reason: "sudah_tercapai" };
  }

  if (!i.deadline) {
    return { ...base, monthsLeft: null, monthlyNeeded: null, leftoverAfter: null, feasible: freeMonthly > 0, shortfallMonthly: 0, earliestRealisticDate: earliest, reason: freeMonthly > 0 ? "tanpa_tenggat" : "tidak_ada_sisa" };
  }

  const diff = monthsBetween(i.today, i.deadline);
  if (i.deadline <= i.today) {
    return { ...base, monthsLeft: 0, monthlyNeeded: null, leftoverAfter: null, feasible: false, shortfallMonthly: 0, earliestRealisticDate: earliest, reason: "tenggat_lewat" };
  }
  const monthsLeft = Math.max(1, diff);
  const monthlyNeeded = roundUp10k(remaining / monthsLeft);
  const leftoverAfter = freeMonthly - monthlyNeeded;
  const feasible = leftoverAfter >= 0;

  return {
    ...base,
    monthsLeft,
    monthlyNeeded,
    leftoverAfter,
    feasible,
    shortfallMonthly: feasible ? 0 : -leftoverAfter,
    earliestRealisticDate: earliest,
    reason: feasible ? "ok" : freeMonthly <= 0 ? "tidak_ada_sisa" : "kurang_per_bulan",
  };
}
