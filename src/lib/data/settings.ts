import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  user_id: "demo-user",
  default_wallet_id: "w-1",
  // 0 = belum diisi. Jangan diisi tebakan: hitungan Money Planner bertanya ke pengguna bila kosong.
  living_cost_per_payday: 0,
  living_cost_source: null,
  living_cost_monthly: null,
  other_fixed_monthly: null,
  pin_hash: null,
  pin_enabled: false,
  hide_balance: false,
  payday_reminder: false,
  payday_reminder_offered_at: null,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

export async function getUserSettings(): Promise<UserSettings | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return DEFAULT_USER_SETTINGS;

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.warn("Gagal mengambil pengaturan pengguna dari DB, gunakan default:", error);
    return DEFAULT_USER_SETTINGS;
  }

  return data;
}

export async function updateUserSettings(
  settings: Database["public"]["Tables"]["user_settings"]["Update"]
): Promise<UserSettings | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    Object.assign(DEFAULT_USER_SETTINGS, settings);
    return DEFAULT_USER_SETTINGS;
  }

  let { data, error } = await supabase
    .from("user_settings")
    .update(settings)
    .eq("user_id", user.id)
    .select()
    .single();

  // Kolom penanda biaya hidup belum dipasang di database: simpan sisanya saja, jangan gagal total.
  if (error && /living_cost_(source|monthly)/.test(error.message)) {
    const { living_cost_source: _s, living_cost_monthly: _m, ...rest } = settings;
    void _s;
    void _m;
    ({ data, error } = await supabase.from("user_settings").update(rest).eq("user_id", user.id).select().single());
  }

  if (error) {
    console.error("Gagal memperbarui pengaturan pengguna:", error);
    Object.assign(DEFAULT_USER_SETTINGS, settings);
    return DEFAULT_USER_SETTINGS;
  }

  return data;
}
