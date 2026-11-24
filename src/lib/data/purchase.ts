import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type PurchaseRow = Database["public"]["Tables"]["purchase_goals"]["Row"];
type Ins = Database["public"]["Tables"]["purchase_goals"]["Insert"];
type Upd = Database["public"]["Tables"]["purchase_goals"]["Update"];
const c = () => createClient();
const ok = (e: { message: string } | null) => { if (e) throw new Error(e.message); };

export async function getPurchases(): Promise<PurchaseRow[]> {
  const { data, error } = await c().from("purchase_goals").select("*").neq("status", "batal").order("created_at", { ascending: false });
  ok(error); return (data ?? []) as PurchaseRow[];
}
export async function addPurchase(x: Ins) { const { error } = await c().from("purchase_goals").insert(x); ok(error); }
export async function updatePurchase(id: string, x: Upd) { const { error } = await c().from("purchase_goals").update(x).eq("id", id); ok(error); }
export async function deletePurchase(id: string) { const { error } = await c().from("purchase_goals").delete().eq("id", id); ok(error); }
