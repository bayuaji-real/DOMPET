import { formatTanggalWIB } from "./utils";

export type GoalAutomaticStatus = "tercapai" | "sesuai_jadwal" | "telat";

export interface CalculateSavingsProjectionParams {
  currentAmount: number | bigint;
  targetAmount: number | bigint;
  deadline?: string | Date | null;
  plannedPerPayday?: number | bigint | null;
  paydayDates?: (string | Date)[];
  asOfDate?: Date; // Tanggal acuan (default: hari ini)
}

export interface SavingsProjectionResult {
  saved: number;
  target: number;
  remaining: number;
  percent: number;
  daysRemaining: number | null; // Selisih hari sampai tenggat
  daysRemainingText: string | null; // Contoh: "35 hari lagi", "Hari ini", "Lewat 3 hari"
  paydaysNeeded: number; // Berapa kali gajian lagi sampai tercapai
  projectedFullDate: Date | null; // Tanggal estimasi tabungan penuh
  projectedFullDateFormatted: string | null; // Contoh: "25 Des 2026"
  status: GoalAutomaticStatus;
  statusLabel: string; // "Tercapai" | "Sesuai jadwal" | "Telat"
  statusColor: "emerald" | "amber" | "blue";
  requiredPerPayday: number | null; // Jika telat, nominal setoran agar tepat waktu (kelipatan 50.000)
}

/**
 * Bulatkan angka ke atas ke kelipatan tertentu (default 50.000)
 */
export function roundUpToMultiple(value: number, multiple = 50000): number {
  if (value <= 0) return 0;
  return Math.ceil(value / multiple) * multiple;
}

/**
 * Normalisasi objek Date ke 00:00:00 hari tersebut
 */
function normalizeDate(d: Date): Date {
  const normalized = new Date(d);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Hitung proyeksi tabungan, estimasi tanggal penuh, dan status otomatis
 */
export function calculateSavingsProjection(
  params: CalculateSavingsProjectionParams
): SavingsProjectionResult {
  const asOf = normalizeDate(params.asOfDate || new Date());
  const saved = Math.max(0, Number(params.currentAmount || 0));
  const target = Math.max(0, Number(params.targetAmount || 0));
  const remaining = Math.max(0, target - saved);
  const planned = Math.max(0, Number(params.plannedPerPayday || 0));

  const percent = target > 0 ? Number(((saved / target) * 100).toFixed(1)) : 0;

  // 1. Parsing Deadline & Hitung Mundur Hari
  let deadlineDate: Date | null = null;
  let daysRemaining: number | null = null;
  let daysRemainingText: string | null = null;

  if (params.deadline) {
    const rawDate =
      typeof params.deadline === "string"
        ? new Date(params.deadline)
        : params.deadline;

    if (!isNaN(rawDate.getTime())) {
      deadlineDate = normalizeDate(rawDate);
      const diffMs = deadlineDate.getTime() - asOf.getTime();
      daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (daysRemaining > 0) {
        daysRemainingText = `${daysRemaining} hari lagi`;
      } else if (daysRemaining === 0) {
        daysRemainingText = "Hari ini";
      } else {
        daysRemainingText = `Lewat ${Math.abs(daysRemaining)} hari`;
      }
    }
  }

  // 2. Jika sudah tercapai
  if (target > 0 && saved >= target) {
    return {
      saved,
      target,
      remaining: 0,
      percent: Math.min(100, percent),
      daysRemaining,
      daysRemainingText,
      paydaysNeeded: 0,
      projectedFullDate: asOf,
      projectedFullDateFormatted: formatTanggalWIB(asOf),
      status: "tercapai",
      statusLabel: "Tercapai",
      statusColor: "blue",
      requiredPerPayday: 0,
    };
  }

  // 3. Hitung Proyeksi Tanggal Penuh berdasarkan gajian
  let paydaysNeeded = 0;
  let projectedFullDate: Date | null = null;
  let projectedFullDateFormatted: string | null = null;

  // Sortir dan filter tanggal gajian yang >= asOf
  const upcomingPaydays: Date[] = (params.paydayDates || [])
    .map((d) => normalizeDate(typeof d === "string" ? new Date(d) : d))
    .filter((d) => !isNaN(d.getTime()) && d.getTime() >= asOf.getTime())
    .sort((a, b) => a.getTime() - b.getTime());

  if (planned > 0 && remaining > 0) {
    paydaysNeeded = Math.ceil(remaining / planned);

    if (upcomingPaydays.length >= paydaysNeeded) {
      projectedFullDate = upcomingPaydays[paydaysNeeded - 1];
    } else {
      // Ekstrapolasi jika jadwal di tabel belum sampai jumlah paydaysNeeded
      let baseDate =
        upcomingPaydays.length > 0
          ? new Date(upcomingPaydays[upcomingPaydays.length - 1])
          : new Date(asOf);

      const neededMore = paydaysNeeded - upcomingPaydays.length;
      for (let i = 0; i < neededMore; i++) {
        // Ekstrapolasi siklus bulanan (tambah 1 bulan per gajian)
        const nextMonth = new Date(baseDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        baseDate = nextMonth;
      }
      projectedFullDate = baseDate;
    }

    if (projectedFullDate) {
      projectedFullDateFormatted = formatTanggalWIB(projectedFullDate);
    }
  }

  // 4. Evaluasi Status Otomatis ("tercapai" | "sesuai_jadwal" | "telat")
  let status: GoalAutomaticStatus = "sesuai_jadwal";
  let statusLabel = "Sesuai jadwal";
  let statusColor: "emerald" | "amber" | "blue" = "emerald";
  let requiredPerPayday: number | null = null;

  if (deadlineDate) {
    const isDeadlinePassed = daysRemaining !== null && daysRemaining < 0;
    const isProjectedPastDeadline =
      projectedFullDate !== null &&
      projectedFullDate.getTime() > deadlineDate.getTime();
    const isZeroDeposit = planned === 0;

    if (isDeadlinePassed || isProjectedPastDeadline || isZeroDeposit) {
      status = "telat";
      statusLabel = "Telat";
      statusColor = "emerald";

      // Hitung rekomendasi setoran per gajian agar tepat waktu
      // Hitung berapa kali gajian yang tersisa sebelum deadline
      const paydaysBeforeDeadline = upcomingPaydays.filter(
        (d) => d.getTime() <= deadlineDate!.getTime()
      ).length;

      // Minimal 1 kali gajian jika masih ada waktu
      const availableCycles = Math.max(1, paydaysBeforeDeadline);
      const rawNeeded = remaining / availableCycles;
      requiredPerPayday = roundUpToMultiple(rawNeeded, 50000);
    } else {
      status = "sesuai_jadwal";
      statusLabel = "Sesuai jadwal";
      statusColor = "emerald";
      requiredPerPayday = null;
    }
  } else {
    // Tanpa tenggat: jika ada setoran maka sesuai jadwal, jika setoran 0 tetap netral
    status = "sesuai_jadwal";
    statusLabel = "Sesuai jadwal";
    statusColor = "emerald";
    requiredPerPayday = null;
  }

  return {
    saved,
    target,
    remaining,
    percent,
    daysRemaining,
    daysRemainingText,
    paydaysNeeded,
    projectedFullDate,
    projectedFullDateFormatted,
    status,
    statusLabel,
    statusColor,
    requiredPerPayday,
  };
}
