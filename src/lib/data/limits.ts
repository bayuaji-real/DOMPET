import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import { getTransactions } from "./transactions";
import { todayJakarta } from "./sample-mode";
import { limitStatuses, limitMessage, neededRange, type Limit, type Status } from "@/lib/konsultan/spend-limit";
import { formatRupiah } from "@/lib/utils";

export type LimitRow = Database["public"]["Tables"]["spend_limits"]["Row"];
type Ins = Database["public"]["Tables"]["spend_limits"]["Insert"];
type Upd = Database["public"]["Tables"]["spend_limits"]["Update"];
const c = () => createClient();
const ok = (e: { message: string } | null) => { if (e) throw new Error(e.message); };

export async function getLimits(): Promise<LimitRow[]> {
  const { data, error } = await c().from("spend_limits").select("*").order("created_at", { ascending: true });
  ok(error); return (data ?? []) as LimitRow[];
}
export async function addLimit(x: Ins) { const { error } = await c().from("spend_limits").insert(x); ok(error); }
export async function updateLimit(id: string, x: Upd) { const { error } = await c().from("spend_limits").update(x).eq("id", id); ok(error); }
export async function deleteLimit(id: string) { const { error } = await c().from("spend_limits").delete().eq("id", id); ok(error); }

const toLimit = (r: LimitRow): Limit => ({ id: r.id, name: r.name, period: r.period, amount: Number(r.amount), category_ids: r.category_ids ?? [], warn_pct: r.warn_pct, is_active: r.is_active });

/** Status semua batas aktif untuk hari ini. */
export async function getLimitStatuses(): Promise<Status[]> {
  const rows = (await getLimits()).filter((r) => r.is_active);
  if (rows.length === 0) return [];
  const today = todayJakarta();
  const limits = rows.map(toLimit);
  const { from, to } = neededRange(limits, today);
  const txs = await getTransactions({ startDate: from, endDate: to });
  return limitStatuses(limits, txs.map((t) => ({ type: t.type, amount: Number(t.amount), date: t.date, category_id: t.category_id })), today);
}
/** Pesan peringatan untuk batas yang hampir habis atau terlewati. */
export async function limitWarnings(): Promise<string[]> {
  const s = await getLimitStatuses();
  return s.map((x) => limitMessage(x, (n) => formatRupiah(Math.round(n)))).filter((m): m is string => m !== null);
}
