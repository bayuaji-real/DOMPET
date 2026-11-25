import { NextResponse } from "next/server";
import { estimateCostIdr, usageOf, type UsageInfo } from "@/lib/ai/gemini";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { AI_LOG_FEATURE, CICIP_LABEL, QUOTA_MESSAGE, cicipHabisMessage, parseEntitlement, upgradeMessage, canUse, type AiFeatureKey } from "@/lib/plans";

type Guard = { ok: true; userId: string } | { ok: false; response: NextResponse };

export interface AiRuntimeGuard {
  master_kill_switch: boolean;
  basic_ai_disabled_at_100pct: boolean;
  pro_hard_limit_enabled: boolean;
  feature_toggles: Record<string, boolean>;
  budget_exhausted: boolean;
  spent_month_idr?: number;
  budget_idr?: number;
  usd_idr_rate?: number;
}

const DEFAULT_AI_RUNTIME_GUARD: AiRuntimeGuard = {
  master_kill_switch: false,
  basic_ai_disabled_at_100pct: true,
  pro_hard_limit_enabled: false,
  feature_toggles: {},
  budget_exhausted: false,
};

let cachedGuard: { data: AiRuntimeGuard; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // Cache memori server maks 60 detik

/** Reset cache runtime guard (berguna untuk pengujian unit). */
export function resetAiControlsCache() {
  cachedGuard = null;
}

/**
 * Baca konfigurasi saklar AI dari app_settings via RPC get_ai_runtime_guard.
 * Cache disimpan di memori server maksimal 60 detik.
 * Jika pembacaan gagal, perilaku bawaan = izinkan (tidak membuat AI mati karena galat baca).
 */
async function fetchAiRuntimeGuard(): Promise<AiRuntimeGuard> {
  const now = Date.now();
  if (cachedGuard && now - cachedGuard.fetchedAt < CACHE_TTL_MS) {
    return cachedGuard.data;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_ai_runtime_guard");
    if (error || !data) {
      if (error) console.warn("[entitlement] gagal membaca saklar AI, izinkan bawaan:", error.message);
      return DEFAULT_AI_RUNTIME_GUARD;
    }
    const guard = data as unknown as AiRuntimeGuard;
    cachedGuard = { data: guard, fetchedAt: now };
    return guard;
  } catch (e) {
    console.warn("[entitlement] gagal membaca saklar AI, izinkan bawaan:", e instanceof Error ? e.message : e);
    return DEFAULT_AI_RUNTIME_GUARD;
  }
}

/**
 * Penjaga paket + kuota AI di SERVER. Dipanggil di awal setiap route AI sesudah verifyServerAuth.
 * Pengecekan berurutan:
 * 1. master_kill_switch true -> tolak 503 dengan pesan ramah.
 * 2. feature_toggles untuk fitur itu false -> tolak 503.
 * 3. jika pemakaian bulan ini >= 100% anggaran:
 *    - Basic & basic_ai_disabled_at_100pct -> tolak 429.
 *    - Pro tetap lolos kecuali pro_hard_limit_enabled true -> tolak 429.
 * 4. Pengecekan entitlement paket & kuota user (Basic jatah cicip, Pro kuota bulanan).
 */
export async function guardAi(feature: AiFeatureKey, userId: string, logFeature?: string, tanpaCicip = false): Promise<Guard> {
  if (userId === "demo-user" && process.env.NODE_ENV !== "production") return { ok: true, userId };

  // Kuota dihitung setelah jawaban selesai, jadi permintaan paralel bisa menembus sesaat.
  // Batasi laju per pengguna (maks 8 panggilan AI per menit per server).
  const burst = rateLimit(`ai-burst:${userId}`, 8, 60_000);
  if (!burst.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Terlalu cepat. Tunggu sebentar lalu coba lagi." },
        { status: 429, headers: { "Retry-After": String(burst.retryAfter) } }
      ),
    };
  }

  // Lapisan 1, 2, & 3: Baca saklar AI global
  const controls = await fetchAiRuntimeGuard();

  // (1) Master kill switch
  if (controls.master_kill_switch) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, code: "AI_OFF", error: "Layanan AI sedang diistirahatkan sementara." },
        { status: 503 }
      ),
    };
  }

  // (2) Saklar per-fitur
  const featureKey = logFeature ?? AI_LOG_FEATURE[feature];
  if (controls.feature_toggles && controls.feature_toggles[featureKey] === false) {
    const label = CICIP_LABEL[featureKey] ?? "AI";
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, code: "FITUR_AI_OFF", error: `Fitur ${label} sedang diistirahatkan sementara.` },
        { status: 503 }
      ),
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_my_entitlement");
    if (error) throw error;
    const ent = parseEntitlement(data);

    // (3) Anggaran bulan ini >= 100%
    if (controls.budget_exhausted) {
      if (ent.plan === "free" && controls.basic_ai_disabled_at_100pct) {
        return {
          ok: false,
          response: NextResponse.json(
            {
              success: false,
              code: "ANGGARAN_AI_HABIS",
              error: "Kuota gratis AI sistem bulan ini telah mencapai batas. Coba lagi bulan depan atau tingkatkan ke Pro.",
            },
            { status: 429 }
          ),
        };
      }

      if (ent.plan !== "free" && controls.pro_hard_limit_enabled) {
        return {
          ok: false,
          response: NextResponse.json(
            {
              success: false,
              code: "ANGGARAN_AI_HABIS",
              error: "Anggaran AI sistem telah mencapai batas maksimal. Hubungi admin.",
            },
            { status: 429 }
          ),
        };
      }
    }

    if (!canUse(ent.plan, feature)) {
      // Basic boleh mencicipi fitur Ruby sesuai jatah (dihitung dari ai_usage_logs di database).
      if (ent.plan === "free" && !tanpaCicip) {
        const c = ent.cicip[featureKey];
        if (c && c.remaining > 0) return { ok: true, userId };
        if (c) return { ok: false, response: NextResponse.json({ success: false, code: "JATAH_HABIS", error: cicipHabisMessage(featureKey, c.per) }, { status: 402 }) };
      }
      return { ok: false, response: NextResponse.json({ success: false, code: "BUTUH_PAKET", error: upgradeMessage(feature) }, { status: 402 }) };
    }

    if (ent.plan !== "free" && ent.aiRemaining <= 0) {
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
 * Jika `status` = 'failed', biaya dicatat Rp0.
 */
export async function logAi(
  feature: AiFeatureKey,
  source?: unknown,
  status: "success" | "failed" = "success"
): Promise<void> {
  try {
    const u: UsageInfo | undefined =
      source && typeof source === "object" && "inputTokens" in (source as object)
        ? (source as UsageInfo)
        : usageOf(source);
    const supabase = await createClient();
    const { error } = await supabase.from("ai_usage_logs").insert({
      feature: AI_LOG_FEATURE[feature],
      model: u?.model ?? "gemini",
      input_tokens: status === "failed" ? 0 : (u?.inputTokens ?? 0),
      output_tokens: status === "failed" ? 0 : (u?.outputTokens ?? 0),
      cost_idr: status === "failed" ? 0 : Number((u ? estimateCostIdr(u) : 0).toFixed(4)),
      status,
    });
    if (error) console.warn("[entitlement] gagal mencatat pemakaian:", error.message);
  } catch (e) {
    console.warn("[entitlement] gagal mencatat pemakaian:", e instanceof Error ? e.message : e);
  }
}
