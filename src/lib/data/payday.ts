import { createClient, isSupabaseConfigured } from "../supabase/client";
import type { Database } from "@/types/database";
import { createTransaction } from "./transactions";
import { USE_SAMPLE_DATA, todayJakarta } from "./sample-mode";

export type PaydaySchedule = Database["public"]["Tables"]["payday_schedule"]["Row"];

export const SAMPLE_PAYDAY_SCHEDULES: PaydaySchedule[] = [
  {
    id: "pd-sample-1",
    user_id: "demo-user",
    date: "2026-11-20", // Hari ini dalam simulasi kalender app
    expected_amount: 8500000,
    actual_amount: null,
    note: "Gaji Bulanan November",
    created_at: "2026-11-01T00:00:00Z",
  },
  {
    id: "pd-sample-2",
    user_id: "demo-user",
    date: "2026-12-25",
    expected_amount: 8500000,
    actual_amount: null,
    note: "Gaji Bulanan Desember + Bonus Akhir Tahun",
    created_at: "2026-11-01T00:00:00Z",
  },
];

/**
 * Mengambil jadwal gajian mendatang
 */
export async function getPaydaySchedules(limit = 3): Promise<PaydaySchedule[]> {
  if (!isSupabaseConfigured()) {
    return USE_SAMPLE_DATA ? SAMPLE_PAYDAY_SCHEDULES : [];
  }

  const supabase = createClient();
  const todayStr = todayJakarta();

  try {
    const { data, error } = await supabase
      .from("payday_schedule")
      .select("*")
      .gte("date", todayStr)
      .order("date", { ascending: true })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data;
    }

    // Coba ambil semua jadwal yang ada
    const fallbackRes = await supabase
      .from("payday_schedule")
      .select("*")
      .order("date", { ascending: true })
      .limit(limit);

    if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
      return fallbackRes.data;
    }
  } catch (err) {
    console.warn("Gagal fetch payday_schedule dari DB, gunakan fallback sampel:", err);
  }

  return USE_SAMPLE_DATA ? SAMPLE_PAYDAY_SCHEDULES : [];
}

/**
 * Cek apakah ada jadwal gajian untuk hari ini
 * Mendukung tanggal simulasi (default: 2026-11-20)
 */
export async function getTodayPaydaySchedule(simulatedDate = todayJakarta()): Promise<PaydaySchedule | null> {
  const schedules = await getPaydaySchedules(10);
  const found = schedules.find((s) => s.date === simulatedDate);
  if (found) return found;

  // Cek tanggal kalender sistem pengguna jika tidak cocok simulasi
  const realToday = todayJakarta();
  const foundReal = schedules.find((s) => s.date === realToday);
  if (foundReal) return foundReal;

  return null;
}

export interface PaydayAllocationItem {
  goalId: string;
  goalName: string;
  amount: number;
  storageWalletId?: string | null;
}

export interface ProcessPaydayParams {
  scheduleId?: string;
  walletId: string;
  actualAmount: number;
  livingCost: number;
  allocations: PaydayAllocationItem[];
  freeAmount: number;
  date?: string;
}

/**
 * Eksekusi pembagian gaji:
 * 1. Catat pemasukan gaji ke dompet sumber (source='payday')
 * 2. Catat setoran ke tiap target tabungan (source='payday')
 * 3. Update actual_amount di payday_schedule jika ada
 */
export async function processPaydayAllocation(params: ProcessPaydayParams) {
  const todayDate = params.date || "2026-11-20";
  const supabase = createClient();

  // 1. Catat Pemasukan Gaji
  const incomeTrx = await createTransaction({
    type: "income",
    amount: params.actualAmount,
    wallet_id: params.walletId,
    note: "Gaji Bulanan Masuk",
    source: "payday",
    date: todayDate,
  });

  // 2. Catat Setoran ke Tiap Tabungan
  const depositResults = [];
  for (const alloc of params.allocations) {
    if (alloc.amount > 0) {
      try {
        const depositTrx = await createTransaction({
          type: "goal_deposit",
          amount: alloc.amount,
          wallet_id: params.walletId,
          to_wallet_id: alloc.storageWalletId || null,
          goal_id: alloc.goalId,
          note: `Setor gajian ke ${alloc.goalName}`,
          source: "payday",
          date: todayDate,
        });
        depositResults.push(depositTrx);
      } catch (err) {
        console.error(`Gagal membuat setoran untuk goal ${alloc.goalName}:`, err);
      }
    }
  }

  // 3. Update status jadwal gajian bila id diberikan
  if (params.scheduleId && !params.scheduleId.startsWith("pd-sample-")) {
    try {
      await supabase
        .from("payday_schedule")
        .update({ actual_amount: params.actualAmount })
        .eq("id", params.scheduleId);
    } catch (err) {
      console.warn("Gagal mengupdate actual_amount pada payday_schedule:", err);
    }
  }

  // Dispatch event agar halaman Beranda, Transaksi & Tabungan langsung ter-refresh
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("transaction_created"));
    window.dispatchEvent(new CustomEvent("goal_updated"));
    window.dispatchEvent(new CustomEvent("payday_completed"));
  }

  return {
    incomeTrx,
    depositResults,
    totalAllocated: params.allocations.reduce((sum, a) => sum + a.amount, 0),
    livingCost: params.livingCost,
    freeAmount: params.freeAmount,
  };
}

export async function createPaydaySchedule(
  schedule: Omit<Database["public"]["Tables"]["payday_schedule"]["Insert"], "user_id">
): Promise<PaydaySchedule | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payday_schedule")
    .insert(schedule)
    .select()
    .single();

  if (error) {
    console.error("Gagal membuat jadwal gajian:", error);
    throw error;
  }

  return data;
}
