import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type GroupRow = Database["public"]["Tables"]["shared_groups"]["Row"];
export type MemberRow = Database["public"]["Tables"]["shared_members"]["Row"];
export type ExpenseRow = Database["public"]["Tables"]["shared_expenses"]["Row"];
export type PaymentRow = Database["public"]["Tables"]["shared_payments"]["Row"];

const ERR: Record<string, string> = {
  KODE_TIDAK_DITEMUKAN: "Kode undangan tidak ditemukan. Cek lagi hurufnya.",
  GRUP_PENUH: "Grup ini sudah penuh (maksimal 30 orang).",
  GRUP_TERLALU_BANYAK: "Kamu sudah membuat 10 grup. Hapus yang tidak dipakai dulu.",
};
export function bersamaError(raw: string | undefined): string {
  const m = String(raw ?? "");
  for (const k of Object.keys(ERR)) if (m.includes(k)) return ERR[k];
  return "Belum berhasil. Coba lagi sebentar.";
}

export async function myUserId(): Promise<string | null> {
  const { data } = await createClient().auth.getUser();
  return data.user?.id ?? null;
}
export async function listGroups(): Promise<GroupRow[]> {
  const { data, error } = await createClient().from("shared_groups").select("*").order("created_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function createGroup(name: string, display: string): Promise<string> {
  const { data, error } = await createClient().rpc("create_shared_group", { p_name: name, p_display: display });
  if (error) throw new Error(bersamaError(error.message));
  return (data as { id: string }).id;
}
export async function joinGroup(code: string, display: string): Promise<string> {
  const { data, error } = await createClient().rpc("join_shared_group", { p_code: code, p_display: display });
  if (error) throw new Error(bersamaError(error.message));
  return data as string;
}
export async function loadGroup(id: string) {
  const c = createClient();
  const [g, m, e, p] = await Promise.all([
    c.from("shared_groups").select("*").eq("id", id).maybeSingle(),
    c.from("shared_members").select("*").eq("group_id", id),
    c.from("shared_expenses").select("*").eq("group_id", id).order("date", { ascending: false }).order("created_at", { ascending: false }),
    c.from("shared_payments").select("*").eq("group_id", id).order("created_at", { ascending: false }),
  ]);
  if (g.error || m.error || e.error || p.error) throw new Error("gagal");
  return { group: g.data as GroupRow | null, members: (m.data ?? []) as MemberRow[], expenses: (e.data ?? []) as ExpenseRow[], payments: (p.data ?? []) as PaymentRow[] };
}
export async function addExpense(x: { group_id: string; paid_by: string; amount: number; note: string; split_among: string[] }): Promise<void> {
  const { error } = await createClient().from("shared_expenses").insert(x); if (error) throw error;
}
export async function addPayment(x: { group_id: string; from_user: string; to_user: string; amount: number }): Promise<void> {
  const { error } = await createClient().from("shared_payments").insert(x); if (error) throw error;
}
export async function deleteExpense(id: string): Promise<void> { const { error } = await createClient().from("shared_expenses").delete().eq("id", id); if (error) throw error; }
export async function leaveGroup(id: string, uid: string): Promise<void> { const { error } = await createClient().from("shared_members").delete().eq("group_id", id).eq("user_id", uid); if (error) throw error; }
export async function deleteGroup(id: string): Promise<void> { const { error } = await createClient().from("shared_groups").delete().eq("id", id); if (error) throw error; }
