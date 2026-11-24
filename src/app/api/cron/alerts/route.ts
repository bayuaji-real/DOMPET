import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serviceClient } from "@/lib/supabase/service";
import { configurePush, sendPush } from "@/lib/push/send";
import { apiPush, limitPushes, type PlannedPush } from "@/lib/push/alerts";
import { limitStatuses, neededRange, type Limit, type Tx } from "@/lib/konsultan/spend-limit";
import type { ApiUsage } from "@/lib/data/admin";

const jakartaToday = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

/** Dipanggil terjadwal oleh Vercel Cron. Wajib header Authorization: Bearer CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = Buffer.from(req.headers.get("authorization") ?? ""), want = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || got.length !== want.length || !timingSafeEqual(got, want)) return NextResponse.json({ ok: false }, { status: 401 });
  if (!configurePush()) return NextResponse.json({ ok: false, error: "Kunci VAPID belum diisi" }, { status: 503 });
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ ok: false, error: "Kunci layanan database belum diisi" }, { status: 503 });
  const today = jakartaToday();
  const planned: { userId: string; p: PlannedPush }[] = [];

  // 1) Saldo API untuk admin.
  const { data: cron } = await sb.rpc("cron_alert_data");
  const usage = (cron as { usage?: ApiUsage; admins?: string[] } | null)?.usage;
  const admins = (cron as { admins?: string[] } | null)?.admins ?? [];
  const ap = usage ? apiPush(usage, today) : null;
  if (ap) for (const id of admins) planned.push({ userId: id, p: ap });

  // 2) Batas pengeluaran semua pengguna.
  const { data: lims } = await sb.from("spend_limits").select("id,user_id,name,period,amount,category_ids,warn_pct,is_active").eq("is_active", true);
  const byUser = new Map<string, Limit[]>();
  for (const r of lims ?? []) {
    const l: Limit = { id: r.id, name: r.name, period: r.period, amount: Number(r.amount), category_ids: r.category_ids ?? [], warn_pct: r.warn_pct, is_active: true };
    byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), l]);
  }
  if (byUser.size > 0) {
    const all = [...byUser.values()].flat();
    const { from } = neededRange(all, today);
    const { data: txs } = await sb.from("transactions").select("user_id,type,amount,date,category_id").in("user_id", [...byUser.keys()]).eq("type", "expense").gte("date", from).lte("date", today).limit(50000);
    const txByUser = new Map<string, Tx[]>();
    for (const t of txs ?? []) txByUser.set(t.user_id, [...(txByUser.get(t.user_id) ?? []), { type: t.type, amount: Number(t.amount), date: t.date, category_id: t.category_id }]);
    for (const [uid, ls] of byUser) for (const p of limitPushes(limitStatuses(ls, txByUser.get(uid) ?? [], today))) planned.push({ userId: uid, p });
  }

  // 3) Buang yang sudah pernah dikirim, lalu kirim.
  let sent = 0, skipped = 0, removed = 0, failed = 0;
  for (const { userId, p } of planned) {
    const { error } = await sb.from("push_log").insert({ user_id: userId, kind: p.kind, dedupe_key: p.key });
    if (error) { skipped++; continue; }
    const { data: subs } = await sb.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", userId);
    for (const s of subs ?? []) {
      const r = await sendPush(s, p.msg);
      if (r === "ok") sent++; else if (r === "gone") { removed++; await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint); } else failed++;
    }
  }
  return NextResponse.json({ ok: true, planned: planned.length, sent, skipped, removed, failed });
}
