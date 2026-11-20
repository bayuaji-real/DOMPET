import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  user_id: "demo-user",
  default_wallet_id: "w-1",
  living_cost_per_payday: 400000,
  pin_hash: null,
  pin_enabled: false,
  hide_balance: false,
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

  const { data, error } = await supabase
    .from("user_settings")
    .update(settings)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Gagal memperbarui pengaturan pengguna:", error);
    Object.assign(DEFAULT_USER_SETTINGS, settings);
    return DEFAULT_USER_SETTINGS;
  }

  return data;
}
