/**
 * Data contoh (SAMPLE_*) HANYA boleh tampil saat development lokal / tes E2E.
 * Di production (Vercel) app selalu menampilkan data asli user, walaupun kosong.
 */
export const USE_SAMPLE_DATA = process.env.NODE_ENV !== "production";

/** Tanggal hari ini (YYYY-MM-DD) di zona Asia/Jakarta. */
export function todayJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}
