// Format dan penanda usang untuk acuan pasar (murni, bisa dites).
export type BenchmarkLike = { value: number; unit: "persen" | "poin" | "rupiah" | string; as_of: string };

export function formatBenchmark(b: BenchmarkLike): string {
  const n = Number(b.value);
  if (b.unit === "persen") return `${n.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
  if (b.unit === "rupiah") return `Rp${n.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
  return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

export function daysOld(asOf: string, today: string): number {
  return Math.round((Date.parse(today + "T00:00:00Z") - Date.parse(asOf + "T00:00:00Z")) / 86400000);
}
/** Angka dianggap mungkin sudah berubah kalau lebih tua dari 45 hari. */
export const isStale = (asOf: string, today: string, limit = 45) => daysOld(asOf, today) > limit;
