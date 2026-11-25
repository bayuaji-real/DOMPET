import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { parseEntitlement, trialErrorMessage, type Entitlement } from "@/lib/plans";
import { USE_SAMPLE_DATA } from "./sample-mode";

/** Paket pengguna dari database. Tanpa Supabase (mode demo lokal) = Pro supaya semua layar bisa diuji. */
export async function getEntitlement(): Promise<Entitlement> {
  // Mode demo lokal: bypass ke Pro agar screenshot dan pengujian fitur Pro lengkap
  if (
    typeof document !== "undefined" &&
    document.cookie.includes("dompet_dev_mode=true") &&
    process.env.NODE_ENV !== "production"
  ) {
    return parseEntitlement({ plan: "pro", source: "paid", ai_limit: 1000, ai_used: 0 });
  }

  if (!isSupabaseConfigured()) {
    return parseEntitlement(USE_SAMPLE_DATA ? { plan: "pro", source: "paid", ai_limit: 1000, ai_used: 0 } : null);
  }
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_my_entitlement");
  if (error) {
    console.warn("Gagal cek paket:", error.message);
    return parseEntitlement(null);
  }
  return parseEntitlement(data);
}

export async function startTrial(plan: "premium" | "pro"): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient();
  const { error } = await supabase.rpc("start_trial", { p_plan: plan });
  if (error) return { ok: false, message: trialErrorMessage(error.message) };
  return { ok: true };
}

export async function requestSubscription(plan: "premium" | "pro", note: string): Promise<boolean> {
  const { error } = await createClient().from("subscription_requests").insert({ plan, note: note.trim() || null });
  return !error;
}
