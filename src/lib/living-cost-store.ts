import type { SupabaseClient } from "@supabase/supabase-js";
import type { LivingCostAnswer } from "@/lib/living-cost";

const MISSING_COL = /living_cost_(source|monthly)/;

/**
 * Simpan jawaban biaya hidup ke profil pengguna (baris user_settings miliknya, dijaga RLS).
 * Aman dipakai di server maupun peramban. Bila kolom penanda belum ada di database, angkanya tetap
 * disimpan (stored=false) supaya tidak hilang.
 */
export async function storeLivingCostAnswer(supabase: SupabaseClient, userId: string, a: LivingCostAnswer): Promise<{ stored: boolean }> {
  const base = { user_id: userId, living_cost_per_payday: a.perPayday };
  const full = await supabase
    .from("user_settings")
    .upsert({ ...base, living_cost_source: a.source, living_cost_monthly: a.monthly }, { onConflict: "user_id" });
  if (!full.error) return { stored: true };
  if (MISSING_COL.test(full.error.message)) {
    const numOnly = await supabase.from("user_settings").upsert(base, { onConflict: "user_id" });
    if (numOnly.error) throw new Error(numOnly.error.message);
    return { stored: false };
  }
  throw new Error(full.error.message);
}
