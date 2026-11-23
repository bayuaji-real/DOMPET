import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import { USE_SAMPLE_DATA, todayJakarta } from "./sample-mode";

export type Wallet = Database["public"]["Tables"]["wallets"]["Row"];
export type WalletBalance = Database["public"]["Views"]["wallet_balances"]["Row"];

export const SAMPLE_WALLETS: WalletBalance[] = [
  {
    id: "w-1",
    user_id: "demo-user",
    name: "BCA Utama",
    type: "bank",
    color: "#0284c7",
    icon: "Building2",
    sort_order: 1,
    initial_balance: 5000000,
    is_archived: false,
    is_default: false,
    goal_id: null,
    balance: 8250000,
  },
  {
    id: "w-2",
    user_id: "demo-user",
    name: "GoPay",
    type: "ewallet",
    color: "#0d9488",
    icon: "Smartphone",
    sort_order: 2,
    initial_balance: 200000,
    is_archived: false,
    is_default: false,
    goal_id: null,
    balance: 450000,
  },
  {
    id: "w-3",
    user_id: "demo-user",
    name: "Uang Tunai",
    type: "cash",
    color: "#16a34a",
    icon: "Banknote",
    sort_order: 3,
    initial_balance: 100000,
    is_archived: false,
    is_default: true,
    goal_id: null,
    balance: 150000,
  },
  {
    id: "w-4",
    user_id: "demo-user",
    name: "Bank Mandiri",
    type: "bank",
    color: "#f59e0b",
    icon: "CreditCard",
    sort_order: 4,
    initial_balance: 1000000,
    is_archived: false,
    is_default: false,
    goal_id: null,
    balance: 1200000,
  },
];

export async function getWallets(): Promise<WalletBalance[]> {
  if (!isSupabaseConfigured()) {
    return USE_SAMPLE_DATA ? SAMPLE_WALLETS : [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("wallet_balances")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.warn("Gagal mengambil data dompet dari DB, fallback:", error);
    return USE_SAMPLE_DATA ? SAMPLE_WALLETS : [];
  }

  return data && data.length > 0 ? data : USE_SAMPLE_DATA ? SAMPLE_WALLETS : [];
}

export async function getWalletById(id: string): Promise<WalletBalance | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("wallet_balances")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Gagal mengambil dompet dengan ID ${id}:`, error);
    return null;
  }

  return data;
}

export async function createWallet(
  wallet: Omit<Database["public"]["Tables"]["wallets"]["Insert"], "user_id">
): Promise<WalletBalance | null> {
  const newWallet: WalletBalance = {
    id: `w-local-${Date.now()}`,
    user_id: "demo-user",
    name: wallet.name,
    type: wallet.type || "bank",
    color: wallet.color || "#0d9488",
    icon: wallet.icon || "Building2",
    sort_order: wallet.sort_order || SAMPLE_WALLETS.length + 1,
    initial_balance: wallet.initial_balance || 0,
    is_archived: false,
    is_default: false,
    goal_id: null,
    balance: wallet.initial_balance || 0,
  };

  if (!isSupabaseConfigured()) {
    SAMPLE_WALLETS.push(newWallet);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wallet_created"));
    }
    return newWallet;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("wallets")
    .insert(wallet)
    .select()
    .single();

  if (error) {
    console.warn("Gagal membuat dompet baru di DB (fallback lokal):", error.message || error);
    // Di production jangan pura-pura berhasil: pengguna harus tahu dompetnya tidak tersimpan
    if (!USE_SAMPLE_DATA) return null;
    SAMPLE_WALLETS.push(newWallet);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wallet_created"));
    }
    return newWallet;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("wallet_created"));
  }

  return data as any;
}

export async function updateWallet(
  id: string,
  wallet: Database["public"]["Tables"]["wallets"]["Update"]
): Promise<Wallet | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("wallets")
    .update(wallet)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`Gagal mengupdate dompet ID ${id}:`, error);
    throw error;
  }

  return data;
}

export async function archiveWallet(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("wallets")
    .update({ is_archived: true })
    .eq("id", id);

  if (error) {
    console.error(`Gagal mengarsipkan dompet ID ${id}:`, error);
    return false;
  }

  return true;
}

/**
 * Pastikan dompet "Uang Tunai" bawaan ada, lalu kembalikan ID-nya.
 * Dipakai sebagai tujuan transaksi yang tidak menyebut dompet (keputusan Owner B).
 */
export async function ensureDefaultWallet(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("ensure_default_wallet");
  if (error) {
    console.error("Gagal menyiapkan dompet Uang Tunai:", error);
    return null;
  }
  return (data as string | null) ?? null;
}

/** Dompet yang boleh dipakai mencatat transaksi (dompet tabungan hanya lewat menu Tabungan). */
export function isSpendableWallet(w: { type: string; is_archived?: boolean }): boolean {
  return w.type !== "tabungan" && !w.is_archived;
}

export async function getSpendableWallets(): Promise<WalletBalance[]> {
  return (await getWallets()).filter(isSpendableWallet);
}

/** Pilih dompet bawaan dari daftar: Uang Tunai dulu, kalau tidak ada dompet pertama. */
export function pickDefaultWallet<T extends { id: string; is_default?: boolean }>(
  list: T[]
): T | undefined {
  return list.find((w) => w.is_default) ?? list.find((w) => (w as { type?: string }).type !== "tabungan") ?? list[0];
}

/** Hapus dompet. Semua transaksinya dipindah ke dompet tujuan (keputusan Owner C). */
export async function deleteWallet(
  id: string,
  moveToId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_wallet", {
    p_wallet_id: id,
    p_move_to: moveToId,
  });
  if (error) {
    console.error(`Gagal menghapus dompet ID ${id}:`, error);
    return { ok: false, error: error.message };
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("wallet_created"));
  }
  return { ok: true };
}
