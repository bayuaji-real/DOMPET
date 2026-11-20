import { createClient, isSupabaseConfigured } from "../supabase/client";
import type { Database, TransactionType, RecurringRule } from "@/types/database";
import { createTransaction } from "./transactions";
import { USE_SAMPLE_DATA, todayJakarta } from "./sample-mode";

export type RecurringTransaction =
  Database["public"]["Tables"]["recurring_transactions"]["Row"];

export const SAMPLE_RECURRING: (RecurringTransaction & {
  category_name?: string;
  wallet_name?: string;
})[] = [
  {
    id: "rec-claude-pro",
    user_id: "demo-user",
    type: "expense",
    amount: 416000,
    wallet_id: "w-1", // BCA Utama
    category_id: "c-bills", // Tagihan
    note: "Langganan Claude Pro",
    rule: "monthly",
    day_of_month: 20, // Diatur tanggal 20 agar langsung jatuh tempo hari ini (20 Nov 2026) untuk pengujian live
    next_date: "2026-11-20",
    is_active: true,
    created_at: "2026-11-01T00:00:00Z",
    category_name: "Tagihan",
    wallet_name: "BCA Utama",
  },
  {
    id: "rec-internet-indihome",
    user_id: "demo-user",
    type: "expense",
    amount: 320000,
    wallet_id: "w-1",
    category_id: "c-bills",
    note: "Paket Internet & TV Indihome",
    rule: "monthly",
    day_of_month: 6,
    next_date: "2026-12-06",
    is_active: true,
    created_at: "2026-11-01T00:00:00Z",
    category_name: "Tagihan",
    wallet_name: "BCA Utama",
  },
  {
    id: "rec-spotify",
    user_id: "demo-user",
    type: "expense",
    amount: 55000,
    wallet_id: "w-2", // GoPay
    category_id: "c-ent", // Hiburan
    note: "Spotify Premium Family",
    rule: "monthly",
    day_of_month: 26,
    next_date: "2026-11-26",
    is_active: true,
    created_at: "2026-11-01T00:00:00Z",
    category_name: "Hiburan",
    wallet_name: "GoPay",
  },
];

/**
 * Mengambil semua transaksi berulang aktif
 */
export async function getRecurringTransactions(): Promise<RecurringTransaction[]> {
  if (!isSupabaseConfigured()) {
    return USE_SAMPLE_DATA ? SAMPLE_RECURRING : [];
  }

  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("recurring_transactions")
      .select("*")
      .order("next_date", { ascending: true });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn("Gagal fetch recurring_transactions dari DB, gunakan sample:", err);
  }

  return USE_SAMPLE_DATA ? SAMPLE_RECURRING : [];
}

/**
 * Ambil daftar tagihan/transaksi berulang yang jatuh tempo hari ini (atau sudah lewat)
 */
export async function getDueRecurringTransactions(
  simulatedDate = todayJakarta()
): Promise<RecurringTransaction[]> {
  const all = await getRecurringTransactions();
  return all.filter((r) => r.is_active && r.next_date <= simulatedDate);
}

/**
 * Eksekusi aksi tagihan berulang:
 * - 'record': Catat transaksi pengeluaran (source='recurring'), lalu majukan next_date ke bulan berikutnya.
 * - 'skip': Majukan next_date ke bulan berikutnya tanpa mencatat pengeluaran.
 */
export async function processRecurringTransaction(
  id: string,
  action: "record" | "skip",
  currentNextDate = todayJakarta()
) {
  const supabase = createClient();
  const all = await getRecurringTransactions();
  const target = all.find((r) => r.id === id);

  if (!target) {
    throw new Error(`Tagihan berulang dengan ID ${id} tidak ditemukan`);
  }

  let createdTrx = null;
  if (action === "record") {
    createdTrx = await createTransaction({
      type: target.type,
      amount: target.amount,
      wallet_id: target.wallet_id,
      category_id: target.category_id,
      note: target.note || "Tagihan Berulang",
      source: "recurring",
      date: currentNextDate,
    });
  }

  // Hitung tanggal berikutnya (tambah 1 bulan)
  const curr = new Date(target.next_date);
  const nextMonth = new Date(curr.getFullYear(), curr.getMonth() + 1, target.day_of_month || 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const nextDateStr = `${nextMonth.getFullYear()}-${pad(nextMonth.getMonth() + 1)}-${pad(nextMonth.getDate())}`;

  // Update next_date di Supabase
  if (!id.startsWith("rec-")) {
    try {
      await supabase
        .from("recurring_transactions")
        .update({ next_date: nextDateStr })
        .eq("id", id);
    } catch (err) {
      console.warn("Gagal update next_date recurring_transactions:", err);
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("transaction_created"));
    window.dispatchEvent(new CustomEvent("recurring_processed"));
  }

  return {
    action,
    createdTrx,
    nextDate: nextDateStr,
  };
}

export async function createRecurringTransaction(
  item: Omit<Database["public"]["Tables"]["recurring_transactions"]["Insert"], "user_id">
): Promise<RecurringTransaction | null> {
  if (!isSupabaseConfigured()) {
    const newItem: RecurringTransaction = {
      id: "rec-" + Date.now(),
      user_id: "demo-user",
      type: item.type,
      amount: item.amount,
      wallet_id: item.wallet_id,
      category_id: item.category_id || null,
      note: item.note || null,
      rule: item.rule || "monthly",
      day_of_month: item.day_of_month || 1,
      next_date: item.next_date,
      is_active: item.is_active ?? true,
      created_at: new Date().toISOString(),
    };
    SAMPLE_RECURRING.push(newItem);
    return newItem;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("recurring_transactions")
    .insert(item)
    .select()
    .single();

  if (error) {
    console.error("Gagal menambah transaksi berulang:", error);
    throw error;
  }

  return data;
}

export async function deleteRecurringTransaction(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const idx = SAMPLE_RECURRING.findIndex((r) => r.id === id);
    if (idx !== -1) SAMPLE_RECURRING.splice(idx, 1);
    return true;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("recurring_transactions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Gagal menghapus transaksi berulang:", error);
    throw error;
  }

  return true;
}
