import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { verifyServerAuth } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { generateJson, GeminiError } from "@/lib/ai/gemini";
import { rateLimit } from "@/lib/rate-limit";
import { configurePush, sendPush } from "@/lib/push/send";
import {
  MERCHANT_NAME, PROOF_SCHEMA, PROOF_SYSTEM, merchantMatches, monthsLabel, normalizeProofReading,
  paymentErrorMessage, proofReasonMessage, proofRequestSchema, sniffImage, type ProofReading,
} from "@/lib/payment";

const MAX_BYTES = 3 * 1024 * 1024;
const fail = (error: string, status: number, code?: string) => NextResponse.json({ success: false, error, code }, { status });

/**
 * Pembayaran Tahap 1: Ruby membaca bukti, server menyaring (nominal, waktu, referensi unik), lalu Pro sementara 24 jam.
 * Hasil bacaan Ruby TIDAK dipercaya langsung: penyaringan dan perubahan paket dilakukan fungsi database
 * yang hanya bisa dipanggil server (service_role). Browser tidak bisa menandai "sudah bayar".
 */
export async function POST(request: NextRequest) {
  const auth = await verifyServerAuth(request);
  if (!auth.authenticated && auth.response) return auth.response;
  if (!/^[0-9a-f-]{36}$/.test(auth.userId)) return fail("Pembayaran butuh akun sungguhan.", 400);

  const rl = rateLimit(`pay-proof:${auth.userId}`, 6, 60_000);
  if (!rl.ok) return fail("Terlalu banyak percobaan. Coba lagi sebentar.", 429);

  const parsed = proofRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Data bukti tidak valid.", 400);
  const { requestId, imagePath } = parsed.data;
  // Berkas bukti harus milik pengguna ini dan untuk permintaan ini
  if (!imagePath.startsWith(`${auth.userId}/${requestId}-`)) return fail("Data bukti tidak valid.", 400);

  const svc = serviceClient();
  if (!svc) return fail("Pembayaran sedang dalam perbaikan. Coba lagi nanti ya.", 503);

  // 1. Ambil gambar dari storage privat (lewat sesi pengguna, dibatasi aturan folder sendiri) dan periksa isinya
  const supabase = await createClient();
  const dl = await supabase.storage.from("payment-proofs").download(imagePath);
  if (dl.error || !dl.data) return fail("Gambar bukti tidak ditemukan. Unggah ulang ya.", 400);
  const bytes = new Uint8Array(await dl.data.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_BYTES) return fail("Ukuran gambar harus di bawah 3 MB.", 400);
  const mime = sniffImage(bytes);
  if (!mime) return fail("File harus berupa gambar (JPG, PNG, atau WEBP).", 400);
  const sha = createHash("sha256").update(bytes).digest("hex");

  // 2. Hitung percobaan (maksimal 5 per permintaan) dan pastikan permintaan masih menunggu bukti
  const begin = await svc.rpc("payment_begin_proof", { p_user: auth.userId, p_id: requestId });
  if (begin.error) {
    const m = begin.error.message;
    const status = m.includes("PERCOBAAN_HABIS") ? 429 : m.includes("KEDALUWARSA") ? 410 : 409;
    return fail(paymentErrorMessage(m), status, m.includes("KEDALUWARSA") ? "KEDALUWARSA" : undefined);
  }

  // 3. Ruby membaca bukti
  let reading: ProofReading;
  try {
    const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
    const raw = await generateJson<unknown>(
      [{ text: `Tanggal hari ini (WIB): ${today}. Baca bukti pembayaran ini.` }, { inlineData: { mimeType: mime, data: Buffer.from(bytes).toString("base64") } }],
      { system: PROOF_SYSTEM, responseSchema: PROOF_SCHEMA as unknown as Record<string, unknown>, temperature: 0, timeoutMs: 25_000 },
    );
    reading = normalizeProofReading(raw);
  } catch (e) {
    console.warn("[payment] Ruby gagal membaca bukti:", e instanceof GeminiError ? e.message : "error");
    return fail(proofReasonMessage("BACA_GAGAL"), 502, "BACA_GAGAL");
  }

  // 4. Penyaringan awal (sebelum ke database)
  if (!reading.is_payment_proof) return fail(proofReasonMessage("BUKAN_BUKTI"), 422, "BUKAN_BUKTI");
  if (reading.is_success === false) return fail(proofReasonMessage("TRANSAKSI_TIDAK_BERHASIL"), 422, "TRANSAKSI_TIDAK_BERHASIL");
  if (!merchantMatches(reading.merchant_name, MERCHANT_NAME)) return fail(proofReasonMessage("MERCHANT_BEDA"), 422, "MERCHANT_BEDA");

  // 5. Penyaringan nominal, waktu, referensi unik, lalu Pro sementara: di database
  const applied = await svc.rpc("payment_apply_proof", {
    p_user: auth.userId, p_id: requestId, p_amount: reading.amount, p_paid_at: reading.paid_at,
    p_ref: reading.reference, p_sha: sha, p_path: imagePath,
  });
  if (applied.error) return fail(paymentErrorMessage(applied.error.message), 409);
  const res = applied.data as { ok: boolean; reason?: string; status?: string; temp_pro_until?: string; amount?: number; months?: number };
  if (!res.ok) return fail(proofReasonMessage(res.reason), 422, res.reason);

  // 6. Beri tahu admin (gagal kirim tidak membatalkan; entri tetap muncul di halaman Admin)
  try {
    await notifyAdmins(svc, requestId, `Pembayaran Pro ${monthsLabel(res.months ?? 0)} masuk`, `Rp${Math.round(res.amount ?? 0).toLocaleString("id-ID")} menunggu kamu cek ke mutasi merchant. Buka Admin, tab Bayar.`);
  } catch (e) {
    console.warn("[payment] gagal kirim notifikasi admin:", e instanceof Error ? e.message : "error");
  }

  return NextResponse.json({ success: true, status: res.status, tempProUntil: res.temp_pro_until ?? null });
}

async function notifyAdmins(svc: NonNullable<ReturnType<typeof serviceClient>>, requestId: string, title: string, body: string) {
  if (!configurePush()) return;
  const { data: admins } = await svc.from("app_admins").select("user_id");
  for (const a of (admins ?? []) as { user_id: string }[]) {
    const { error } = await svc.from("push_log").insert({ user_id: a.user_id, kind: "bayar", dedupe_key: requestId });
    if (error) continue;
    const { data: subs } = await svc.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", a.user_id);
    for (const s of (subs ?? []) as { endpoint: string; p256dh: string; auth: string }[]) {
      const r = await sendPush(s, { title, body, url: "/admin", tag: `bayar-${requestId}` });
      if (r === "gone") await svc.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
}
