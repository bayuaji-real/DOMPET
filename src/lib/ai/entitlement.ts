import { NextResponse } from "next/server";
import { estimateCostIdr, usageOf, type UsageInfo } from "@/lib/ai/gemini";
import { createClient } from "@/lib/supabase/server";
import { AI_LOG_FEATURE, QUOTA_MESSAGE, parseEntitlement, upgradeMessage, canUse, type AiFeatureKey } from "@/lib/plans";

type Guard = { ok: true; userId: string } | { ok: false; response: NextResponse };

/**
 * Penjaga paket + kuota AI di SERVER. Dipanggil di awal setiap route AI sesudah verifyServerAuth.
 * Gratis -> 402 (butuh paket). Kuota bulan ini habis -> 429. Mode demo lokal (bukan production) dilewati.
 * Jika pengecekan gagal, kita TOLAK (aman untuk biaya), bukan lolos.
 */
export async function guardAi(feature: AiFeatureKey, userId: string): Promise<Guard> {
  if (userId === "demo-user" && process.env.NODE_ENV !== "production") return { ok: true, userId };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_my_entitlement");
    if (error) throw error;
    const ent = parseEntitlement(data);
    if (!canUse(ent.plan, feature)) {
      return { ok: false, response: NextResponse.json({ success: false, code: "BUTUH_PAKET", error: upgradeMessage(feature) }, { status: 402 }) };
    }
    if (ent.aiRemaining <= 0) {
      return { ok: false, response: NextResponse.json({ success: false, code: "KUOTA_HABIS", error: QUOTA_MESSAGE }, { status: 429 }) };
    }
    return { ok: true, userId };
  } catch (e) {
    console.warn("[entitlement] gagal cek paket:", e instanceof Error ? e.message : e);
    return { ok: false, response: NextResponse.json({ success: false, error: "Paket kamu belum bisa dicek. Coba lagi sebentar." }, { status: 503 }) };
  }
}

/**
 * Catat satu pemakaian AI (dihitung ke kuota bulanan dan ke dashboard biaya admin).
 * `source` boleh hasil generateJson (token diambil otomatis) atau { model, inputTokens, outputTokens }.
 * Biaya adalah PERKIRAAN. Gagal mencatat tidak menggagalkan jawaban.
 */
export async function logAi(feature: AiFeatureKey, source?: unknown): Promise<void> {
  try {
    const u: UsageInfo | undefined = (source && typeof source === "object" && "inputTokens" in (source as object) ? (source as UsageInfo) : usageOf(source));
    const supabase = await createClient();
    const { error } = await supabase.from("ai_usage_logs").insert({
      feature: AI_LOG_FEATURE[feature],
      model: u?.model ?? "gemini",
      input_tokens: u?.inputTokens ?? 0,
      output_tokens: u?.outputTokens ?? 0,
      cost_idr: Number((u ? estimateCostIdr(u) : 0).toFixed(4)),
    });
    if (error) console.warn("[entitlement] gagal mencatat pemakaian:", error.message);
  } catch (e) {
    console.warn("[entitlement] gagal mencatat pemakaian:", e instanceof Error ? e.message : e);
  }
}
