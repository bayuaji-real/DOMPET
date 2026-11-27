/**
 * Menilai tabungan baru dengan cara Money Planner (murni angka, tanpa AI):
 * uang bebas = gaji - biaya tetap, lalu diisi ke tujuan secara BERURUTAN (tenggat terdekat dulu).
 * Data yang kurang (gaji, biaya hidup) tidak ditebak: fungsi ini mengembalikan pertanyaan untuk pengguna.
 */
import { buildPlan, generatePaydays, type PlanNeed, type PlanPayday } from "@/lib/financial-plan";
import { addMonths, computeFeasibility, monthsBetween, type FeasibilityResult } from "@/lib/savings-feasibility";

export interface PaydayInfo {
  /** Tanggal gajian berikutnya (YYYY-MM-DD). */
  first: string;
  /** Gaji per gajian. */
  amount: number;
  frequency: "monthly" | "biweekly";
}

export interface PlanBasisInput {
  today: string;
  /** Jadwal gajian dari Rencana; null bila belum diatur. */
  payday: PaydayInfo | null;
  /** Gaji per bulan dari jadwal tersebut (0 bila belum diatur). */
  scheduleIncomeMonthly: number;
  /** Biaya hidup per bulan dari pengaturan Rencana (0 bila belum diisi). */
  livingMonthlySet: number;
  billsMonthly: number;
  debtMonthly: number;
  avgMonthlyExpense: number;
  /** Komitmen rutin pasti per bulan (zakat, investasi, asuransi, kiriman keluarga). Null = belum ditanya, 0 = tidak ada. */
  otherFixedMonthly: number | null;
}

/** Jawaban pengguna yang dibaca dari obrolan (diisi model, bukan ditebak). */
export interface PlanHints {
  monthly_income?: number;
  payday_day?: number;
  monthly_living_cost?: number;
  living_use_average?: boolean;
  /** Komitmen rutin lain per bulan; 0 berarti pengguna menjawab tidak ada. */
  other_fixed_monthly?: number;
}

export type PlanBasis =
  | {
      ok: true;
      incomeMonthly: number;
      fixedMonthly: number;
      payday: PaydayInfo;
      livingSource: "rencana" | "rata-rata" | "diisi";
      /** Biaya hidup per bulan (di luar tagihan rutin dan cicilan), untuk disimpan bila baru diisi pengguna. */
      livingMonthly: number;
      /** Gaji baru diisi lewat obrolan (belum ada di jadwal gajian), perlu disimpan. */
      newPayday: boolean;
      /** Komitmen rutin lain per bulan, dan apakah baru dijawab (perlu disimpan). */
      otherFixedMonthly: number;
      otherFixedNew: boolean;
    }
  | { ok: false; ask: "gaji" | "tanggal_gajian" | "biaya_hidup" | "komitmen_rutin"; question: string };

const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
const pos = (n: unknown) => (Number(n) > 0 ? Math.round(Number(n)) : 0);

export function resolvePlanBasis(b: PlanBasisInput, hints: PlanHints): PlanBasis {
  // 1. Gaji
  let payday = b.payday;
  let incomeMonthly = b.scheduleIncomeMonthly;
  let newPayday = false;
  if (!payday || incomeMonthly <= 0) {
    const income = pos(hints.monthly_income);
    const day = Math.round(Number(hints.payday_day) || 0);
    if (income <= 0) {
      return {
        ok: false,
        ask: "gaji",
        question: "Gajimu belum diatur di Rencana, jadi aku belum bisa menghitung dengan benar. Berapa gajimu per bulan, dan tanggal berapa biasanya gajian? Contoh: 5 juta, tanggal 25.",
      };
    }
    if (day < 1 || day > 31) {
      return { ok: false, ask: "tanggal_gajian", question: "Tanggal berapa biasanya kamu gajian? Contoh: tanggal 25." };
    }
    const [y, m] = b.today.split("-").map(Number);
    const thisMonth = `${y}-${String(m).padStart(2, "0")}-${String(Math.min(day, 28)).padStart(2, "0")}`;
    const first = thisMonth >= b.today ? thisMonth : addMonths(thisMonth, 1);
    payday = { first, amount: income, frequency: "monthly" };
    incomeMonthly = income;
    newPayday = true;
  }

  // 2. Biaya hidup
  let fixed: number;
  let livingMonthly: number;
  let livingSource: "rencana" | "rata-rata" | "diisi";
  if (b.livingMonthlySet > 0) {
    fixed = b.livingMonthlySet + b.billsMonthly + b.debtMonthly;
    livingMonthly = b.livingMonthlySet;
    livingSource = "rencana";
  } else if (pos(hints.monthly_living_cost) > 0) {
    fixed = pos(hints.monthly_living_cost) + b.billsMonthly + b.debtMonthly;
    livingMonthly = pos(hints.monthly_living_cost);
    livingSource = "diisi";
  } else if (hints.living_use_average && b.avgMonthlyExpense > 0) {
    fixed = Math.max(b.avgMonthlyExpense, b.billsMonthly) + b.debtMonthly;
    // Rata-rata pengeluaran sudah memuat tagihan rutin, jadi biaya hidup = rata-rata - tagihan (supaya tidak terhitung dua kali).
    livingMonthly = Math.max(0, b.avgMonthlyExpense - b.billsMonthly);
    livingSource = "rata-rata";
  } else {
    return {
      ok: false,
      ask: "biaya_hidup",
      question:
        b.avgMonthlyExpense > 0
          ? `Biaya hidupmu sebulan berapa? Khusus makan, minum, laundry, transport (di luar tagihan dan langganan). Mau pakai rata-rata pengeluaranmu selama ini (${rp(b.avgMonthlyExpense)} per bulan), isi sendiri angkanya, atau bilang "bingung" biar kita hitung bareng?`
          : "Biaya hidupmu sebulan berapa? Khusus kebutuhan harian seperti makan, minum, laundry, dan transport (di luar tagihan dan langganan). Kalau bingung, bilang \"bingung\" biar kita hitung bareng.",
    };
  }
  // 3. Komitmen rutin pasti lain (zakat, investasi, asuransi, kiriman keluarga)
  const otherFixed = b.otherFixedMonthly ?? (hints.other_fixed_monthly !== undefined && hints.other_fixed_monthly >= 0 ? Math.round(hints.other_fixed_monthly) : null);
  if (otherFixed === null) {
    return {
      ok: false,
      ask: "komitmen_rutin",
      question:
        "Ada yang pasti kamu keluarkan atau sisihkan tiap bulan selain itu, misalnya zakat, investasi rutin, asuransi, atau kiriman ke keluarga? Kalau ada, sebutkan total per bulannya. Kalau tidak ada, jawab \"tidak ada\".",
    };
  }
  fixed += otherFixed;
  return { ok: true, incomeMonthly, fixedMonthly: fixed, payday, livingSource, livingMonthly, newPayday, otherFixedMonthly: otherFixed, otherFixedNew: b.otherFixedMonthly === null };
}

export interface QueueGoal {
  name: string;
  target: number;
  saved: number;
  deadline: string | null;
}

export interface QueueInput {
  today: string;
  newGoal: { name: string; target: number; initial: number; deadline: string | null };
  otherGoals: QueueGoal[];
  incomeMonthly: number;
  fixedMonthly: number;
  payday: PaydayInfo;
  /** Total setoran bulanan tabungan lain (hanya untuk angka "sisa uang per bulan" di kartu). */
  otherMonthlyCommitments: number;
}

const roundUp10k = (n: number) => Math.ceil(n / 10000) * 10000;
/** Batas pencarian tanggal penuh: lebih dari ini dianggap belum realistis. */
export const MAX_HORIZON_MONTHS = 120;

export function evaluateSavingsQueue(i: QueueInput): FeasibilityResult {
  const base = computeFeasibility({
    targetAmount: i.newGoal.target,
    initialAmount: i.newGoal.initial,
    deadline: i.newGoal.deadline,
    today: i.today,
    avgMonthlyIncome: i.incomeMonthly,
    avgMonthlyExpense: i.fixedMonthly,
    otherMonthlyCommitments: i.otherMonthlyCommitments,
  });
  if (base.reason === "sudah_tercapai" || base.reason === "tenggat_lewat") return base;

  const perMonth = i.payday.frequency === "biweekly" ? 26 / 12 : 1;
  const count = Math.min(300, Math.ceil(MAX_HORIZON_MONTHS * perMonth) + 2);
  const paydays = generatePaydays(i.payday.first, i.payday.amount, i.payday.frequency, count);

  const needs: PlanNeed[] = i.otherGoals
    .map((g, idx) => ({ id: `lama-${idx}`, name: g.name, remaining: Math.max(0, g.target - g.saved), target: g.target, deadline: g.deadline }))
    .filter((n) => n.remaining > 0);
  needs.push({ id: "baru", name: i.newGoal.name, remaining: base.remaining, target: i.newGoal.target, deadline: i.newGoal.deadline });

  const plan = buildPlan({
    today: i.today,
    paydays,
    livingPerPayday: i.fixedMonthly / perMonth,
    bills: [],
    needs,
    roundTo: 10000,
  });
  const me = plan.needs.find((n) => n.id === "baru");
  const fullOn = me?.fullOn ?? null;
  const withinHorizon = fullOn !== null && monthsBetween(i.today, fullOn) <= MAX_HORIZON_MONTHS;

  if (!i.newGoal.deadline) {
    const ok = withinHorizon;
    return { ...base, feasible: ok, earliestRealisticDate: withinHorizon ? fullOn : null, reason: ok ? "tanpa_tenggat" : "tidak_ada_sisa" };
  }

  const feasible = me?.onTime === true;
  const monthsLeft = base.monthsLeft ?? 1;
  const shortGap = me ? roundUp10k(me.shortfallAtDeadline / monthsLeft) : 0;
  return {
    ...base,
    feasible,
    shortfallMonthly: feasible ? 0 : Math.max(shortGap, base.shortfallMonthly, 10000),
    earliestRealisticDate: withinHorizon ? fullOn : null,
    reason: feasible ? "ok" : base.freeMonthly <= 0 ? "tidak_ada_sisa" : "kurang_per_bulan",
  };
}

const dayNum = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, dd) / 86_400_000;
};

export interface PaydayRow {
  date: string;
  expected_amount: number | string;
}

/** Gaji dari jadwal gajian mendatang: bulanan atau dua mingguan ditentukan dari jarak antar gajian. Tanpa jadwal: payday null. */
export function paydayInfoFromRows(rows: PaydayRow[]): { payday: PaydayInfo | null; perMonth: number; incomeMonthly: number } {
  const list = rows.filter((r) => Number(r.expected_amount) > 0).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (list.length === 0) return { payday: null, perMonth: 1, incomeMonthly: 0 };
  let perMonth = 1;
  if (list.length >= 2) {
    const gap = (dayNum(String(list[list.length - 1].date)) - dayNum(String(list[0].date))) / (list.length - 1);
    if (gap > 0) perMonth = Math.min(2.2, Math.max(0.5, 30.4 / gap));
  }
  const avg = list.reduce((a, r) => a + Number(r.expected_amount), 0) / list.length;
  return {
    payday: { first: String(list[0].date), amount: Math.round(avg), frequency: perMonth > 1.6 ? "biweekly" : "monthly" },
    perMonth,
    incomeMonthly: Math.round(avg * perMonth),
  };
}

/** Total tagihan rutin per bulan (dua mingguan dihitung 26/12 kali per bulan). */
export function billsMonthlyFromRules(rules: { amount: number | string; rule: string }[]): number {
  return Math.round(rules.reduce((a, r) => a + Number(r.amount || 0) * (r.rule === "biweekly" ? 26 / 12 : 1), 0));
}

/** Dasar hitung yang sudah lengkap, dipakai Target Beli dan fitur lain yang menilai tujuan. */
export interface QueueBasis {
  incomeMonthly: number;
  fixedMonthly: number;
  payday: PaydayInfo;
  /** Setoran bulanan tabungan lain yang sudah berjalan. */
  otherMonthlyCommitments: number;
  /** Tujuan lain yang ikut antrean (tabungan aktif dan target beli lain). */
  others: QueueGoal[];
}

/** Jadwal gajian turunan dari satu info gajian (untuk disimpan atau dihitung). */
export function generatePaydaysFromInfo(info: PaydayInfo, count: number): PlanPayday[] {
  return generatePaydays(info.first, info.amount, info.frequency, count);
}
