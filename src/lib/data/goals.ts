import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import { USE_SAMPLE_DATA, todayJakarta } from "./sample-mode";

export type SavingsGoal = Database["public"]["Tables"]["savings_goals"]["Row"];
export type GoalProgress = Database["public"]["Views"]["goal_progress"]["Row"];

export const SAMPLE_GOALS: GoalProgress[] = [
  {
    id: "g-1",
    user_id: "demo-user",
    name: "Dana Darurat (6 Bulan)",
    target_amount: 30000000,
    initial_amount: 5000000,
    deadline: "2027-06-30",
    storage_place: "Mandiri Utama",
    storage_wallet_id: "w-1",
    planned_per_payday: 1500000,
    priority: 1,
    status: "aktif",
    is_emergency_fund: true,
    notes: "Simpanan liquid saat kondisi darurat",
    saved: 19500000,
    remaining: 10500000,
    percent: 65,
  },
  {
    id: "g-2",
    user_id: "demo-user",
    name: "Liburan ke Labuan Bajo",
    target_amount: 12000000,
    initial_amount: 2000000,
    deadline: "2027-10-25",
    storage_place: "BCA Tabungan",
    storage_wallet_id: "w-1",
    planned_per_payday: 1000000,
    priority: 2,
    status: "aktif",
    is_emergency_fund: false,
    notes: "Tiket pesawat & penginapan kapal Phinisi",
    saved: 7200000,
    remaining: 4800000,
    percent: 60,
  },
  {
    id: "g-3",
    user_id: "demo-user",
    name: "Beli MacBook Pro M3",
    target_amount: 25000000,
    initial_amount: 5000000,
    deadline: "2027-12-31",
    storage_place: "Bank Jago",
    storage_wallet_id: "w-1",
    planned_per_payday: 1500000,
    priority: 3,
    status: "aktif",
    is_emergency_fund: false,
    notes: "Upgrade alat kerja desain & koding",
    saved: 12500000,
    remaining: 12500000,
    percent: 50,
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

/** Hapus tabungan. Sisa uangnya masuk ke dompet tujuan; setoran lama menjadi transfer biasa. */
export async function deleteSavingsGoal(
  id: string,
  moveToId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_savings_goal", {
    p_goal_id: id,
    p_move_to: moveToId,
  });
  if (error) {
    console.error(`Gagal menghapus tabungan ID ${id}:`, error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
