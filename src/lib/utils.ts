import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format nominal rupiah utuh (BigInt atau number) ke string "Rp1.250.000"
 * Nominal negatif: "-Rp50.000" (kecuali opsi absolute: true)
 */
export function formatRupiah(
  amount: number | bigint | string,
  options?: { absolute?: boolean }
): string {
  try {
    const num =
      typeof amount === "string"
        ? BigInt(amount.trim() || "0")
        : typeof amount === "number"
          ? BigInt(Math.round(amount))
          : amount;
    const isNegative = !options?.absolute && num < 0n;
    const absVal = num < 0n ? -num : num;

    const formatted = absVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return isNegative ? `-Rp${formatted}` : `Rp${formatted}`;
  } catch {
    return "Rp0";
  }
}

/**
 * Parse string rupiah (misal "1.250.000" atau "Rp1.250.000") menjadi number
 * parseRupiah("1.250.000") → 1250000
 */
export function parseRupiah(value: string | number): number {
  if (typeof value === "number") return Math.round(value);
  const clean = value.replace(/[^0-9]/g, "");
  if (!clean) return 0;
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/** Batas atas satu nominal transaksi: Rp100 miliar (sama dengan batas di tabel database yang lebih baru). */
export const MAX_AMOUNT = 100_000_000_000;
export const MAX_AMOUNT_MESSAGE = "Nominal terlalu besar. Maksimal Rp100.000.000.000.";

/**
 * Parse string input user (misal "1.250.000" atau "Rp 50.000") menjadi BigInt
 */
export function parseRupiahInput(value: string): bigint {
  const clean = value.replace(/[^0-9]/g, "");
  if (!clean) return 0n;
  try {
    return BigInt(clean);
  } catch {
    return 0n;
  }
}

/**
 * Format tanggal ke zona waktu Asia/Jakarta: contoh "20 Nov 2026"
 */
export function formatTanggalWIB(dateInput: string | Date | number): string {
  const date =
    typeof dateInput === "string" || typeof dateInput === "number"
      ? new Date(dateInput)
      : dateInput;
  if (!date || isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export const formatTanggal = formatTanggalWIB;

/**
 * Format tanggal & jam ke zona waktu Asia/Jakarta: contoh "20 Nov 2026, 14.30"
 */
export function formatTanggalWaktuWIB(dateInput: string | Date | number): string {
  const date =
    typeof dateInput === "string" || typeof dateInput === "number"
      ? new Date(dateInput)
      : dateInput;
  if (!date || isNaN(date.getTime())) return "-";

  const formatted = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return formatted.replace(":", ".");
}

/**
 * Memberikan getaran haptic singkat saat pengguna menekan tombol aksi / simpan
 */
export function triggerHapticFeedback(pattern: number | number[] = 15) {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Abaikan jika browser tidak mendukung
    }
  }
}
