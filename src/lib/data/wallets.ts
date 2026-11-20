import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

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
    balance: 1200000,
  },
];

export async function getWallets(): Promise<WalletBalance[]> {
  if (!isSupabaseConfigured()) {
    return SAMPLE_WALLETS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("wallet_balances")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.warn("Gagal mengambil data dompet dari DB, fallback:", error);
    return SAMPLE_WALLETS;
  }

  return data && data.length > 0 ? data : SAMPLE_WALLETS;
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
