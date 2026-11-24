import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type HoldingRow = Database["public"]["Tables"]["holdings"]["Row"];
export type SnapshotRow = Database["public"]["Tables"]["market_snapshots"]["Row"];

export async function getHoldings(): Promise<HoldingRow[]> {
  const { data, error } = await createClient().from("holdings").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function addHolding(h: { name: string; kind: HoldingRow["kind"]; units: number; avg_price: number; last_price: number | null }): Promise<void> {
  const { error } = await createClient().from("holdings").insert({ ...h, last_price_at: h.last_price != null ? new Date().toISOString() : null });
  if (error) throw error;
}
export async function updateHoldingPrice(id: string, last_price: number): Promise<void> {
  const { error } = await createClient().from("holdings").update({ last_price, last_price_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
export async function deleteHolding(id: string): Promise<void> {
  const { error } = await createClient().from("holdings").delete().eq("id", id);
  if (error) throw error;
}
export async function getSnapshots(): Promise<SnapshotRow[]> {
  const { data, error } = await createClient().from("market_snapshots").select("*");
  if (error) throw error;
  return data ?? [];
}
