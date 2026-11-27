import { createClient } from "@/lib/supabase/client";
import { DEFAULT_USER_SETTINGS } from "./settings";
import { getFinanceSnapshot } from "./finance-snapshot";
import { loadPlanContext } from "./plan-basis";
import { storeLivingCostAnswer } from "@/lib/living-cost-store";
import { averageLivingMonthly, paydaysPerMonth, type LivingCostAnswer } from "@/lib/living-cost";

export interface LivingSuggestion {
  /** rata-rata biaya hidup per bulan dari riwayat pengguna (di luar tagihan rutin); null bila belum ada riwayat */
  avgMonthly: number | null;
  months: number;
  /** gajian per bulan dari jadwal gajian pengguna (1 bila belum ada jadwal) */
  perMonth: number;
}

/** Bahan saran untuk Ruby: rata-rata dari riwayat pengguna sendiri dan jumlah gajian per bulan. */
export async function getLivingSuggestion(): Promise<LivingSuggestion> {
  const snap = await getFinanceSnapshot();
  const ctx = await loadPlanContext(Math.max(0, snap.monthlyExpense));
  const perMonth = paydaysPerMonth(ctx.basisInput.payday?.frequency);
  if (!snap.hasData || snap.monthlyExpense <= 0) return { avgMonthly: null, months: 0, perMonth };
  const avg = averageLivingMonthly({ avgMonthlyExpense: snap.monthlyExpense, billsMonthly: ctx.basisInput.billsMonthly });
  return { avgMonthly: avg > 0 ? avg : null, months: snap.monthsCovered ?? 1, perMonth };
}

/** Simpan jawaban ke profil pengguna yang sedang masuk (peramban). */
export async function saveLivingCostAnswer(a: LivingCostAnswer): Promise<{ stored: boolean }> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    Object.assign(DEFAULT_USER_SETTINGS, { living_cost_per_payday: a.perPayday, living_cost_source: a.source, living_cost_monthly: a.monthly });
    return { stored: false };
  }
  return storeLivingCostAnswer(supabase, data.user.id, a);
}
