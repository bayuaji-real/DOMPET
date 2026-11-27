/**
 * Biaya hidup milik pengguna (profil pribadi). Hitungan murni, tanpa AI.
 * Biaya hidup = kebutuhan harian (makan, minum, laundry, transport, dll), TIDAK termasuk tagihan rutin dan langganan.
 * Tidak ada angka bawaan: bila pengguna belum menjawab, Ruby bertanya SEKALI, jawabannya disimpan di profilnya
 * dan tidak ditanya lagi di gajian berikutnya.
 */

export type LivingCostSource = "diisi" | "rata_rata" | "dihitung" | "belum_punya";

export interface LivingCostAnswer {
  source: LivingCostSource;
  /** rupiah per bulan (0 bila belum_punya) */
  monthly: number;
  /** rupiah per gajian = per bulan dibagi jumlah gajian per bulan (0 bila belum_punya) */
  perPayday: number;
}

export const LIVING_SOURCE_LABEL: Record<LivingCostSource, string> = {
  diisi: "Kamu isi sendiri",
  rata_rata: "Dari rata-rata pengeluaranmu",
  dihitung: "Dihitung bareng Ruby",
  belum_punya: "Belum dianggarkan",
};

/** Rincian kebutuhan harian yang ditanyakan Ruby bila pengguna bingung. Tagihan dan langganan sengaja tidak ada. */
export const LIVING_NEEDS: { key: string; label: string; hint: string }[] = [
  { key: "makan", label: "Makan", hint: "di rumah dan di luar" },
  { key: "minum", label: "Minum dan jajan", hint: "kopi, air galon, camilan" },
  { key: "laundry", label: "Laundry", hint: "cuci dan setrika" },
  { key: "transport", label: "Transport harian", hint: "bensin, ojek, angkot" },
  { key: "rumah", label: "Kebutuhan harian lain", hint: "sabun, perlengkapan mandi, dll" },
];

export function paydaysPerMonth(frequency: "monthly" | "biweekly" | null | undefined): number {
  return frequency === "biweekly" ? 26 / 12 : 1;
}

/** Jumlah per bulan dibagi gajian per bulan, dibulatkan ke rupiah. */
export function perPaydayFromMonthly(monthly: number, perMonth: number): number {
  const m = Math.max(0, Math.round(monthly));
  return Math.round(m / (perMonth > 0 ? perMonth : 1));
}

export function makeAnswer(source: LivingCostSource, monthly: number, perMonth: number): LivingCostAnswer {
  if (source === "belum_punya") return { source, monthly: 0, perPayday: 0 };
  const m = Math.max(0, Math.round(monthly));
  return { source, monthly: m, perPayday: perPaydayFromMonthly(m, perMonth) };
}

export function sumNeeds(values: Record<string, number | string | undefined>): number {
  return Object.values(values).reduce<number>((a, v) => a + Math.max(0, Math.round(Number(v) || 0)), 0);
}

/** Pengguna dianggap sudah menjawab hanya bila penandanya ada (angka lama tanpa penanda bukan jawaban). */
export function toLivingAnswer(
  source: string | null | undefined,
  perPayday: number | null | undefined,
  monthly?: number | null
): LivingCostAnswer | null {
  if (source !== "diisi" && source !== "rata_rata" && source !== "dihitung" && source !== "belum_punya") return null;
  if (source === "belum_punya") return { source, monthly: 0, perPayday: 0 };
  const pp = Math.max(0, Math.round(Number(perPayday) || 0));
  const m = monthly != null && Number(monthly) >= 0 ? Math.round(Number(monthly)) : pp;
  return { source, monthly: m, perPayday: pp };
}

/**
 * Rata-rata pengeluaran sudah memuat tagihan rutin, jadi biaya hidup = rata-rata - tagihan
 * (supaya tidak terhitung dua kali), dibulatkan ke Rp1.000. Hasilnya per BULAN.
 */
export function averageLivingMonthly(i: { avgMonthlyExpense: number; billsMonthly: number }): number {
  const living = Math.max(0, i.avgMonthlyExpense - Math.max(0, i.billsMonthly));
  return Math.round(living / 1000) * 1000;
}
