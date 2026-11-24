import { createClient, isSupabaseConfigured } from "../supabase/client";
import type { Database, TransactionType, TransactionSource } from "@/types/database";
import { todayJakarta } from "./sample-mode";
import { ensureDefaultWallet } from "./wallets";
import { MAX_AMOUNT, MAX_AMOUNT_MESSAGE } from "../utils";

/** Menolak nominal nol, negatif, bukan angka, atau di atas batas (jangan sampai tersimpan rusak). */
function assertAmountInRange(amount: number) {
  if (!Number.isFinite(amount) || !(amount > 0)) throw new Error("Nominal harus lebih dari Rp0.");
  if (amount > MAX_AMOUNT) throw new Error(MAX_AMOUNT_MESSAGE);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (options.walletId) {
    // Filter .or() merakit teks: pastikan hanya UUID agar tidak bisa disisipi sintaks filter lain.
    if (!UUID_RE.test(options.walletId)) throw new Error("ID dompet tidak valid.");
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

/**
 * Lengkapi dompet yang kosong: transaksi tanpa dompet masuk ke Uang Tunai (keputusan Owner B);
 * setoran/penarikan tabungan tujuannya dompet tabungan miliknya.
 */
async function withResolvedWallets(
  input: CreateTransactionInput
): Promise<CreateTransactionInput> {
  const out = { ...input };
  if (!out.wallet_id && isSupabaseConfigured()) {
    const cashId = await ensureDefaultWallet();
    if (!cashId) throw new Error("Dompet Uang Tunai belum siap. Coba lagi.");
    out.wallet_id = cashId;
  }
  if (
    (out.type === "goal_deposit" || out.type === "goal_withdraw") &&
    out.goal_id &&
    !out.to_wallet_id &&
    isSupabaseConfigured()
  ) {
    const { data } = await createClient()
      .from("wallets")
      .select("id")
      .eq("goal_id", out.goal_id)
      .maybeSingle();
    if (data?.id) out.to_wallet_id = data.id;
  }
  return out;
}

/**
 * Pengaman: kategori harus sama jenisnya dengan transaksi (pengeluaran <-> kategori pengeluaran).
 * Kalau tidak cocok (mis. kategori "Gaji" untuk pengeluaran), kategori dikosongkan supaya
 * tidak mengotori Analisis. Berlaku untuk semua jalur: form, suara, struk, input cepat, AI.
 */
async function categoryMatchingType(
  type: TransactionType,
  categoryId: string | null | undefined,
): Promise<string | null> {
  if (!categoryId) return null;
  if (type !== "income" && type !== "expense") return null;
  if (!isSupabaseConfigured()) return categoryId;
  const { data } = await createClient().from("categories").select("type").eq("id", categoryId).maybeSingle();
  if (!data) return categoryId; // tidak bisa dicek (mis. kategori contoh): biarkan, RLS tetap menjaga
  return data.type === type ? categoryId : null;
}

export async function createTransaction(
  rawInput: CreateTransactionInput
): Promise<Transaction | null> {
  assertAmountInRange(rawInput.amount);
  const input = await withResolvedWallets(rawInput);
  input.category_id = await categoryMatchingType(input.type, input.category_id);
  const supabase = createClient();

  // Validasi dan penegakan aturan integritas transaksi
  const payload: Database["public"]["Tables"]["transactions"]["Insert"] = {
    type: input.type,
    amount: input.amount,
    wallet_id: input.wallet_id,
    to_wallet_id: null,
    category_id: null,
    goal_id: null,
    date: input.date || todayJakarta(),
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
  rawInputs: CreateTransactionInput[]
): Promise<Transaction[]> {
  rawInputs.forEach((r) => assertAmountInRange(r.amount));
  const inputs = await Promise.all(
    rawInputs.map(async (raw) => {
      const resolved = await withResolvedWallets(raw);
      resolved.category_id = await categoryMatchingType(resolved.type, resolved.category_id);
      return resolved;
    }),
  );
  const supabase = createClient();
  const payloads: Database["public"]["Tables"]["transactions"]["Insert"][] = inputs.map((input) => {
    const payload: Database["public"]["Tables"]["transactions"]["Insert"] = {
      type: input.type,
      amount: input.amount,
      wallet_id: input.wallet_id,
      to_wallet_id: null,
      category_id: null,
      goal_id: null,
      date: input.date || todayJakarta(),
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

export type UpdateTransactionInput = {
  amount?: number;
  wallet_id?: string;
  to_wallet_id?: string | null;
  category_id?: string | null;
  date?: string;
  note?: string | null;
  merchant?: string | null;
};

/**
 * Ubah transaksi yang sudah ada. Jenis transaksi (pemasukan/pengeluaran/transfer/tabungan) tidak diubah
 * supaya aturan integritas tetap terjaga; saldo dompet & tabungan dihitung ulang otomatis oleh view.
 */
export async function updateTransaction(
  id: string,
  type: TransactionType,
  input: UpdateTransactionInput
): Promise<{ ok: boolean; error?: string }> {
  if (input.amount !== undefined && !(input.amount > 0)) {
    return { ok: false, error: "Nominal harus lebih dari Rp0." };
  }
  if (input.amount !== undefined && input.amount > MAX_AMOUNT) {
    return { ok: false, error: MAX_AMOUNT_MESSAGE };
  }
  if (type === "transfer" && input.wallet_id && input.to_wallet_id && input.wallet_id === input.to_wallet_id) {
    return { ok: false, error: "Dompet tujuan tidak boleh sama dengan dompet asal." };
  }
  const patch: Database["public"]["Tables"]["transactions"]["Update"] = {};
  if (input.amount !== undefined) patch.amount = input.amount;
  if (input.wallet_id) patch.wallet_id = input.wallet_id;
  if (input.date) patch.date = input.date;
  if (input.note !== undefined) patch.note = input.note?.trim() || null;
  if (input.merchant !== undefined) patch.merchant = input.merchant?.trim() || null;
  if (type === "transfer" && input.to_wallet_id) patch.to_wallet_id = input.to_wallet_id;
  if ((type === "income" || type === "expense") && input.category_id !== undefined) {
    patch.category_id = await categoryMatchingType(type, input.category_id);
  }

  const supabase = createClient();
  const { error } = await supabase.from("transactions").update(patch).eq("id", id);
  if (error) {
    console.error(`Gagal mengubah transaksi ID ${id}:`, error);
    return { ok: false, error: "Gagal menyimpan perubahan. Coba lagi." };
  }
  return { ok: true };
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
