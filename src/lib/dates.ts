/**
 * Utilitas tanggal kalender (YYYY-MM-DD) tanpa jebakan zona waktu.
 * Semua hitungan memakai UTC murni di atas string tanggal, jadi hasilnya sama di HP (WIB) maupun server (UTC).
 */

const pad = (n: number) => String(n).padStart(2, "0");

export function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

function ymd(year: number, month1: number, day: number): string {
  return `${year}-${pad(month1)}-${pad(day)}`;
}

/** Tanggal ke-`day` pada bulan (year, month1), dipotong ke akhir bulan (31 Feb → 28/29 Feb). */
export function clampedDate(year: number, month1: number, day: number): string {
  return ymd(year, month1, Math.min(Math.max(1, day), daysInMonth(year, month1)));
}

/**
 * Tanggal terdekat (hari ini atau sesudahnya) yang jatuh pada tanggal `day` setiap bulan.
 * Contoh: hari ini 2026-11-20, day 25 → 2026-11-25; day 5 → 2026-12-05; day 31 (Feb) → akhir Februari.
 */
export function nextDateForDay(day: number, todayYmd: string): string {
  const [y, m, d] = todayYmd.split("-").map(Number);
  const thisMonth = clampedDate(y, m, day);
  if (Number(thisMonth.slice(8)) >= d) return thisMonth;
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return clampedDate(ny, nm, day);
}

/** Bulan berikutnya setelah `fromYmd`, pada tanggal `day` (dipotong ke akhir bulan). */
export function nextMonthOnDay(fromYmd: string, day: number): string {
  const [y, m] = fromYmd.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return clampedDate(ny, nm, day);
}
