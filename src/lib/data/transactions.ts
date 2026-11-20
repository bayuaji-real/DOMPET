import { createClient, isSupabaseConfigured } from "../supabase/client";
import type { Database, TransactionType, TransactionSource } from "@/types/database";

export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export interface GetTransactionsOptions {
  limit?: number;
  offset?: number;
  walletId?: string;
  categoryId?: string;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
}

export async function getTransactions(
  options: GetTransactionsOptions = {}
): Promise<Transaction[]> {
  const supabase = createClient();
  let query = supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });

  if (options.walletId) {
    query = query.or(`wallet_id.eq.${options.walletId},to_wallet_id.eq.${options.walletId}`);
  }

  if (options.categoryId) {
    query = query.eq("category_id", options.categoryId);
  }

  if (options.type) {
    query = query.eq("type", options.type);
  }

  if (options.startDate) {
    query = query.gte("date", options.startDate);
  }

  if (options.endDate) {
    query = query.lte("date", options.endDate);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Gagal mengambil daftar transaksi:", error);
    throw error;
  }

  return data || [];
}

export type CreateTransactionInput = {
  type: TransactionType;
  amount: number;
  wallet_id: string;
  to_wallet_id?: string | null;
  category_id?: string | null;
  goal_id?: string | null;
  date?: string;
  note?: string | null;
  merchant?: string | null;
  source?: TransactionSource;
  receipt_path?: string | null;
};

export async function createTransaction(
  input: CreateTransactionInput
): Promise<Transaction | null> {
  const supabase = createClient();

  // Validasi dan penegakan aturan integritas transaksi
  const payload: Database["public"]["Tables"]["transactions"]["Insert"] = {
    type: input.type,
    amount: input.amount,
    wallet_id: input.wallet_id,
    to_wallet_id: null,
    category_id: null,
    goal_id: null,
    date: input.date || new Date().toISOString(),
    note: input.note || null,
    merchant: input.merchant || null,
    source: input.source || "manual",
    receipt_path: input.receipt_path || null,
  };

  if (input.type === "income" || input.type === "expense") {
    // Wajib to_wallet_id & goal_id kosong
    payload.to_wallet_id = null;
    payload.goal_id = null;
    payload.category_id = input.category_id || null;
  } else if (input.type === "transfer") {
    // Transfer antar dompet: wajib to_wallet_id, tanpa kategori
    if (!input.to_wallet_id) {
      throw new Error("Transaksi transfer wajib menentukan dompet tujuan (to_wallet_id)");
    }
    payload.to_wallet_id = input.to_wallet_id;
    payload.category_id = null;
    payload.goal_id = null;
  } else if (input.type === "goal_deposit" || input.type === "goal_withdraw") {
    // Setor / Tarik tabungan: wajib goal_id
    if (!input.goal_id) {
      throw new Error(`Transaksi ${input.type} wajib menentukan target tabungan (goal_id)`);
    }
    payload.goal_id = input.goal_id;
    payload.to_wallet_id = input.to_wallet_id || null;
    payload.category_id = null;
  }

  if (!isSupabaseConfigured()) {
    return {
      id: "trx-mock-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      user_id: "demo-user",
      ...payload,
      created_at: new Date().toISOString(),
    } as Transaction;
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.warn("Gagal mencatat transaksi ke database (fallback ke mode lokal):", error.message || error);
    return {
      id: "trx-mock-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      user_id: "demo-user",
      ...payload,
      created_at: new Date().toISOString(),
    } as Transaction;
  }

  return data;
}

export async function createTransactions(
  inputs: CreateTransactionInput[]
): Promise<Transaction[]> {
  const supabase = createClient();
  const payloads: Database["public"]["Tables"]["transactions"]["Insert"][] = inputs.map((input) => {
    const payload: Database["public"]["Tables"]["transactions"]["Insert"] = {
      type: input.type,
      amount: input.amount,
      wallet_id: input.wallet_id,
      to_wallet_id: null,
      category_id: null,
      goal_id: null,
      date: input.date || new Date().toISOString(),
      note: input.note || null,
      merchant: input.merchant || null,
      source: input.source || "manual",
      receipt_path: input.receipt_path || null,
    };

    if (input.type === "income" || input.type === "expense") {
      payload.to_wallet_id = null;
      payload.goal_id = null;
      payload.category_id = input.category_id || null;
    } else if (input.type === "transfer") {
      payload.to_wallet_id = input.to_wallet_id || null;
      payload.category_id = null;
      payload.goal_id = null;
    } else if (input.type === "goal_deposit" || input.type === "goal_withdraw") {
      payload.goal_id = input.goal_id || null;
      payload.to_wallet_id = input.to_wallet_id || null;
      payload.category_id = null;
    }
    return payload;
  });

  if (!isSupabaseConfigured()) {
    return payloads.map((p, idx) => ({
      id: `trx-mock-${Date.now()}-${idx}`,
      user_id: "demo-user",
      ...p,
      created_at: new Date().toISOString(),
    })) as Transaction[];
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert(payloads)
    .select();

  if (error) {
    console.warn("Gagal mencatat batch transaksi ke database (fallback ke mode lokal):", error.message || error);
    return payloads.map((p, idx) => ({
      id: `trx-mock-${Date.now()}-${idx}`,
      user_id: "demo-user",
      ...p,
      created_at: new Date().toISOString(),
    })) as Transaction[];
  }

  return data || [];
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(`Gagal menghapus transaksi ID ${id}:`, error);
    return false;
  }

  return true;
}
