import { createClient } from "@/lib/supabase/client";
import { todayJakarta } from "./sample-mode";
import { getRecurringTransactions } from "./recurring";
import { getDebts } from "./debts";
import { getSavingsGoals } from "./goals";
import { billsMonthlyFromRules, paydayInfoFromRows, generatePaydaysFromInfo, type PaydayInfo, type PlanBasisInput, type QueueGoal } from "@/lib/savings-queue";

/**
 * Data dasar hitung Money Planner dari database (gaji, biaya hidup, tagihan, cicilan, tabungan lain).
 * Tidak ada tebakan: bagian yang kosong tetap kosong, lalu pemanggil bertanya ke pengguna.
 */
export interface PlanContext {
  basisInput: PlanBasisInput;
  /** Tabungan aktif yang masih berjalan (ikut antrean). */
  savingsGoals: QueueGoal[];
  /** Total setoran bulanan tabungan aktif. */
  savingsMonthly: number;
}

export async function loadPlanContext(avgMonthlyExpense: number): Promise<PlanContext> {
  const supabase = createClient();
  const today = todayJakarta();
  const [payRes, settingsRes, rec, debts, goals] = await Promise.all([
    supabase.from("payday_schedule").select("date, expected_amount").gte("date", today).is("actual_amount", null).order("date", { ascending: true }).limit(6),
    supabase.from("user_settings").select("living_cost_per_payday, other_fixed_monthly").maybeSingle(),
    getRecurringTransactions().catch(() => []),
    getDebts().catch(() => []),
    getSavingsGoals().catch(() => []),
  ]);
  const pd = paydayInfoFromRows((payRes.data ?? []).map((r) => ({ date: String(r.date), expected_amount: Number(r.expected_amount) })));
  const living = Math.round(Number(settingsRes.data?.living_cost_per_payday ?? 0) * pd.perMonth);
  const active = goals.filter((g) => g.status === "aktif");
  return {
    basisInput: {
      today,
      payday: pd.payday,
      scheduleIncomeMonthly: pd.incomeMonthly,
      livingMonthlySet: living,
      billsMonthly: billsMonthlyFromRules(rec.filter((r) => r.is_active && r.type === "expense")),
      debtMonthly: Math.round(debts.reduce((a, d) => a + Number(d.min_payment || 0), 0)),
      avgMonthlyExpense,
      otherFixedMonthly: settingsRes.data?.other_fixed_monthly == null ? null : Number(settingsRes.data.other_fixed_monthly),
    },
    savingsGoals: active
      .filter((g) => Number(g.remaining) > 0)
      .map((g) => ({ name: String(g.name), target: Number(g.target_amount) || 0, saved: Number(g.saved) || 0, deadline: g.deadline ?? null })),
    savingsMonthly: active.reduce((a, g) => a + (Number(g.planned_per_payday) || 0), 0),
  };
}

/** Simpan gaji dan biaya hidup yang baru dijawab pengguna, supaya tidak ditanya lagi. */
export async function persistPlanAnswers(a: { newPayday?: PaydayInfo | null; livingMonthly?: number | null; otherFixedMonthly?: number | null }): Promise<void> {
  const supabase = createClient();
  if (a.newPayday) {
    const rows = generatePaydaysFromInfo(a.newPayday, 12).map((p) => ({ date: p.date, expected_amount: p.amount, note: "Dari obrolan Ruby" }));
    const { error } = await supabase.from("payday_schedule").insert(rows);
    if (error) throw new Error(error.message);
  }
  if (a.livingMonthly != null || a.otherFixedMonthly != null) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error("Belum masuk");
    const patch: { user_id: string; living_cost_per_payday?: number; other_fixed_monthly?: number } = { user_id: data.user.id };
    if (a.livingMonthly != null) patch.living_cost_per_payday = a.livingMonthly;
    if (a.otherFixedMonthly != null) patch.other_fixed_monthly = a.otherFixedMonthly;
    const { error } = await supabase.from("user_settings").upsert(patch, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
  }
}
