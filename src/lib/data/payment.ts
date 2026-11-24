import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-compression";
import { paymentErrorMessage, parsePaymentRequest, type PaymentRequest } from "@/lib/payment";
import type { Database } from "@/types/database";

export type AdminPayment = Database["public"]["Functions"]["admin_list_payments"]["Returns"][number];
export type PayPrice = { months: number; amount: number };

const c = () => createClient();

/** Harga paket dari database (satu-satunya sumber). */
export async function getPrices(): Promise<PayPrice[]> {
  const { data, error } = await c().from("payment_prices").select("months,amount").order("months");
  if (error) throw new Error(error.message);
  return (data ?? []) as PayPrice[];
}

export async function createPaymentRequest(months: number): Promise<{ ok: true; req: PaymentRequest } | { ok: false; message: string }> {
  const { data, error } = await c().rpc("create_payment_request", { p_months: months });
  const req = parsePaymentRequest(data);
  if (error || !req) return { ok: false, message: paymentErrorMessage(error?.message) };
  return { ok: true, req };
}

export async function getMyPaymentRequest(): Promise<PaymentRequest | null> {
  const { data, error } = await c().rpc("get_my_payment_request");
  if (error) return null;
  return parsePaymentRequest(data);
}

/** Unggah gambar bukti ke storage privat sendiri lalu minta server membacanya. */
export async function submitProof(requestId: string, file: File): Promise<{ ok: true; status: string; tempProUntil: string | null } | { ok: false; message: string; code?: string }> {
  try {
    if (!file.type.startsWith("image/")) return { ok: false, message: "Pilih file gambar ya." };
    const sb = c();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return { ok: false, message: "Sesi habis, silakan masuk lagi." };
    const img = await compressImage(file, 1600, 0.85);
    const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const path = `${u.user.id}/${requestId}-${rand}.jpg`;
    const up = await sb.storage.from("payment-proofs").upload(path, img.blob, { contentType: "image/jpeg" });
    if (up.error) return { ok: false, message: "Gambar gagal diunggah. Coba lagi." };
    const res = await fetch("/api/payment/proof", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, imagePath: path }) });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string; code?: string; status?: string; tempProUntil?: string | null };
    if (!res.ok || !json.success) return { ok: false, message: json.error ?? "Bukti belum bisa diterima. Coba lagi.", code: json.code };
    return { ok: true, status: json.status ?? "menunggu_cek", tempProUntil: json.tempProUntil ?? null };
  } catch {
    return { ok: false, message: "Tidak bisa terhubung. Cek internet lalu coba lagi." };
  }
}

// ---------- Admin ----------
const rpc = async <T,>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> => {
  const { data, error } = await p; if (error) throw new Error(error.message); return data as T;
};
export const listPayments = () => rpc(c().rpc("admin_list_payments")) as Promise<AdminPayment[]>;
export const confirmPayment = (id: string) => rpc(c().rpc("admin_confirm_payment", { p_id: id }));
export const rejectPayment = (id: string, reason: string | null) => rpc(c().rpc("admin_reject_payment", { p_id: id, p_reason: reason }));
/** Tautan sementara (5 menit) untuk melihat bukti. Hanya admin yang boleh, dijaga aturan storage. */
export async function proofUrl(path: string): Promise<string | null> {
  const { data } = await c().storage.from("payment-proofs").createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
