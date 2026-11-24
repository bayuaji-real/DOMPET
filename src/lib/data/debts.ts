import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
export type DebtRow = Database["public"]["Tables"]["debts"]["Row"];
export async function getDebts(): Promise<DebtRow[]> {
  const { data, error } = await createClient().from("debts").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
export async function addDebt(d: { name: string; balance: number; annual_rate: number; min_payment: number }): Promise<void> {
  const { error } = await createClient().from("debts").insert(d);
  if (error) throw error;
}
export async function deleteDebt(id: string): Promise<void> {
  const { error } = await createClient().from("debts").delete().eq("id", id);
  if (error) throw error;
}
