import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
type T = Database["public"]["Tables"];
export type EventRow = T["planner_events"]["Row"];
export type ItemRow = T["planner_items"]["Row"];
export type PaymentRow = T["planner_payments"]["Row"];
export type GuestRow = T["planner_guests"]["Row"];
export type TodoRow = T["planner_todos"]["Row"];

const db = () => createClient();
function ok(error: { message: string } | null) { if (error) throw new Error(error.message); }

export async function getEvents(): Promise<EventRow[]> {
  const { data, error } = await db().from("planner_events").select("*").order("created_at", { ascending: true });
  ok(error); return (data ?? []) as EventRow[];
}
export async function createEvent(e: T["planner_events"]["Insert"]): Promise<EventRow> {
  const { data, error } = await db().from("planner_events").insert(e).select("*").single();
  ok(error); return data as EventRow;
}
export async function updateEvent(id: string, e: T["planner_events"]["Update"]): Promise<void> {
  const { error } = await db().from("planner_events").update(e).eq("id", id); ok(error);
}
export async function deleteEvent(id: string): Promise<void> {
  const { error } = await db().from("planner_events").delete().eq("id", id); ok(error);
}

export type PlannerData = { items: ItemRow[]; payments: PaymentRow[]; guests: GuestRow[]; todos: TodoRow[] };
export async function getPlannerData(eventId: string): Promise<PlannerData> {
  const c = db();
  const [i, p, g, t] = await Promise.all([
    c.from("planner_items").select("*").eq("event_id", eventId).order("created_at", { ascending: true }),
    c.from("planner_payments").select("*").eq("event_id", eventId).order("paid_at", { ascending: false }),
    c.from("planner_guests").select("*").eq("event_id", eventId).order("created_at", { ascending: true }),
    c.from("planner_todos").select("*").eq("event_id", eventId).order("created_at", { ascending: true }),
  ]);
  ok(i.error); ok(p.error); ok(g.error); ok(t.error);
  return { items: (i.data ?? []) as ItemRow[], payments: (p.data ?? []) as PaymentRow[], guests: (g.data ?? []) as GuestRow[], todos: (t.data ?? []) as TodoRow[] };
}

export async function addItem(x: T["planner_items"]["Insert"]) { const { error } = await db().from("planner_items").insert(x); ok(error); }
export async function addItems(x: T["planner_items"]["Insert"][]) { if (!x.length) return; const { error } = await db().from("planner_items").insert(x); ok(error); }
export async function updateItem(id: string, x: T["planner_items"]["Update"]) { const { error } = await db().from("planner_items").update(x).eq("id", id); ok(error); }
export async function deleteItem(id: string) { const { error } = await db().from("planner_items").delete().eq("id", id); ok(error); }

export async function addPayment(x: T["planner_payments"]["Insert"]) { const { error } = await db().from("planner_payments").insert(x); ok(error); }
export async function deletePayment(id: string) { const { error } = await db().from("planner_payments").delete().eq("id", id); ok(error); }

export async function addGuest(x: T["planner_guests"]["Insert"]) { const { error } = await db().from("planner_guests").insert(x); ok(error); }
export async function updateGuest(id: string, x: T["planner_guests"]["Update"]) { const { error } = await db().from("planner_guests").update(x).eq("id", id); ok(error); }
export async function deleteGuest(id: string) { const { error } = await db().from("planner_guests").delete().eq("id", id); ok(error); }

export async function addTodo(x: T["planner_todos"]["Insert"]) { const { error } = await db().from("planner_todos").insert(x); ok(error); }
export async function addTodos(x: T["planner_todos"]["Insert"][]) { if (!x.length) return; const { error } = await db().from("planner_todos").insert(x); ok(error); }
export async function updateTodo(id: string, x: T["planner_todos"]["Update"]) { const { error } = await db().from("planner_todos").update(x).eq("id", id); ok(error); }
export async function deleteTodo(id: string) { const { error } = await db().from("planner_todos").delete().eq("id", id); ok(error); }

const SHARE_MSG: Record<string, string> = { BUKAN_PEMILIK: "Hanya pemilik planner yang bisa membuat kode undangan.", KODE_TIDAK_DITEMUKAN: "Kode tidak ditemukan. Cek lagi hurufnya.", ANGGOTA_PENUH: "Planner ini sudah penuh (maksimal 5 anggota)." };
export function shareErrorText(e: unknown): string {
  const m = e instanceof Error ? e.message : "";
  const k = Object.keys(SHARE_MSG).find((x) => m.includes(x));
  return k ? SHARE_MSG[k] : "Belum berhasil. Coba lagi sebentar.";
}
export async function createInvite(eventId: string): Promise<string> {
  const { data, error } = await db().rpc("planner_create_invite", { p_event: eventId }); ok(error); return data as string;
}
export async function resetInvite(eventId: string): Promise<void> { const { error } = await db().rpc("planner_reset_invite", { p_event: eventId }); ok(error); }
export async function joinPlanner(code: string): Promise<string> {
  const { data, error } = await db().rpc("planner_join", { p_code: code }); ok(error); return data as string;
}
