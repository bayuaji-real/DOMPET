/** Zakat penghasilan/maal 2,5% dan alokasi THR. Harga emas diisi pengguna (tidak ditebak aplikasi). */
export const NISAB_GOLD_GRAM = 85;
export const ZAKAT_RATE = 0.025;
export interface ZakatResult { nisab: number; wajib: boolean; zakat: number }
export function zakatMaal(totalWealth: number, goldPricePerGram: number): ZakatResult {
  const nisab = NISAB_GOLD_GRAM * Math.max(goldPricePerGram, 0);
  const wajib = nisab > 0 && totalWealth >= nisab;
  return { nisab, wajib, zakat: wajib ? Math.round(totalWealth * ZAKAT_RATE) : 0 };
}
/** Penghasilan: nisab bulanan = nisab tahunan / 12 (pendekatan umum). */
export function zakatPenghasilan(monthlyIncome: number, goldPricePerGram: number): ZakatResult {
  const nisab = (NISAB_GOLD_GRAM * Math.max(goldPricePerGram, 0)) / 12;
  const wajib = nisab > 0 && monthlyIncome >= nisab;
  return { nisab, wajib, zakat: wajib ? Math.round(monthlyIncome * ZAKAT_RATE) : 0 };
}
export interface ThrSplit { zakat: number; mudik: number; angpao: number; tabung: number; sisa: number }
/** Bagi THR: persen dari jumlah. Total persen tidak boleh lebih dari 100, kelebihan dipotong dari tabungan. */
export function allocateThr(amount: number, pct: { zakat: number; mudik: number; angpao: number; tabung: number }): ThrSplit {
  const a = Math.max(amount, 0);
  const z = Math.round((a * pct.zakat) / 100), m = Math.round((a * pct.mudik) / 100), g = Math.round((a * pct.angpao) / 100);
  let t = Math.round((a * pct.tabung) / 100);
  const over = z + m + g + t - a;
  if (over > 0) t = Math.max(t - over, 0);
  return { zakat: z, mudik: m, angpao: g, tabung: t, sisa: Math.max(a - z - m - g - t, 0) };
}
