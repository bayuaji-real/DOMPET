import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import { USE_SAMPLE_DATA, todayJakarta } from "./sample-mode";

export type SavingsGoal = Database["public"]["Tables"]["savings_goals"]["Row"];
export type GoalProgress = Database["public"]["Views"]["goal_progress"]["Row"];

export const SAMPLE_GOALS: GoalProgress[] = [
  {
    id: "g-1",
    user_id: "demo-user",
    name: "Target Lamaran & Nikah",
    target_amount: 15000000,
    initial_amount: 2000000,
    deadline: "2027-12-31",
    storage_place: "BCA Tabungan",
    storage_wallet_id: "w-1",
    planned_per_payday: 500000,
    priority: 1,
    status: "aktif",
    is_emergency_fund: false,
    notes: "Persiapan seserahan & lamaran",
    saved: 3100000,
    remaining: 11900000,
    percent: 20.67,
  },
  {
    id: "g-2",
    user_id: "demo-user",
    name: "Dana Darurat (3 Bulan)",
    target_amount: 12000000,
    initial_amount: 3000000,
    deadline: "2027-06-30",
    storage_place: "Bank Jago",
    storage_wallet_id: "w-1",
    planned_per_payday: 1000000,
    priority: 2,
    status: "aktif",
    is_emergency_fund: true,
    notes: "Simpanan liquid saat kondisi darurat",
    saved: 7500000,
    remaining: 4500000,
    percent: 62.5,
  },
];

export async function getSavingsGoals(): Promise<GoalProgress[]> {
  if (!isSupabaseConfigured()) {
    return USE_SAMPLE_DATA ? SAMPLE_GOALS : [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("goal_progress")
    .select("*")
    .order("priority", { ascending: true });

  if (error) {
    console.warn("Gagal mengambil progres tabungan dari DB, fallback:", error);
    return USE_SAMPLE_DATA ? SAMPLE_GOALS : [];
  }

  return data && data.length > 0 ? data : USE_SAMPLE_DATA ? SAMPLE_GOALS : [];
}

export async function getGoalById(id: string): Promise<GoalProgress | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("goal_progress")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Gagal mengambil tabungan ID ${id}:`, error);
    return null;
  }

  return data;
}

export async function createSavingsGoal(
  goal: Omit<Database["public"]["Tables"]["savings_goals"]["Insert"], "user_id">
): Promise<SavingsGoal | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("savings_goals")
    .insert(goal)
    .select()
    .single();

  if (error) {
    console.error("Gagal membuat target tabungan baru:", error);
    throw error;
  }

  return data;
}

export async function updateSavingsGoal(
  id: string,
  goal: Database["public"]["Tables"]["savings_goals"]["Update"]
): Promise<SavingsGoal | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("savings_goals")
    .update(goal)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`Gagal mengupdate tabungan ID ${id}:`, error);
    throw error;
  }

  return data;
}
