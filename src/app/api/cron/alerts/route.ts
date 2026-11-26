import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serviceClient } from "@/lib/supabase/service";
import { configurePush, sendPush } from "@/lib/push/send";
import { apiPush, billPushes, limitPushes, proExpiryPush, type PlannedPush } from "@/lib/push/alerts";
import { limitStatuses, neededRange, masterLimit, debtView, type DebtView, type Limit, type Tx } from "@/lib/konsultan/spend-limit";
import type { ApiUsage } from "@/lib/data/admin";
import { buildFinanceSummary } from "@/lib/ai/finance-summary";
import { paydayReminderMsg } from "@/lib/push/payday-reminder";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

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
  const { data: lims } = await sb.from("spend_limits").select("id,user_id,name,period,amount,category_ids,warn_pct,is_active,created_at").eq("is_active", true);
  const byUser = new Map<string, (Limit & { created_at?: string })[]>();
  const addDays = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
  const wib = (iso?: string) => (iso ? new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(0, 10) : "");
  for (const r of lims ?? []) {
    const l: Limit & { created_at?: string } = { created_at: r.created_at, id: r.id, name: r.name, period: r.period, amount: Number(r.amount), category_ids: r.category_ids ?? [], warn_pct: r.warn_pct, is_active: true };
    byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), l]);
  }
  if (byUser.size > 0) {
    const all = [...byUser.values()].flat();
    const { from: f0 } = neededRange(all, today);
    const from = [f0, addDays(today, -60)].sort()[0]; // utang batas dihitung paling jauh 60 hari ke belakang
    const { data: txs } = await sb.from("transactions").select("user_id,type,amount,date,category_id").in("user_id", [...byUser.keys()]).eq("type", "expense").gte("date", from).lte("date", today).limit(50000);
    const txByUser = new Map<string, Tx[]>();
    for (const t of txs ?? []) txByUser.set(t.user_id, [...(txByUser.get(t.user_id) ?? []), { type: t.type, amount: Number(t.amount), date: t.date, category_id: t.category_id }]);
    for (const [uid, ls] of byUser) {
      const txs = txByUser.get(uid) ?? [];
      const m = masterLimit(ls), floor = addDays(today, -60);
      const debts = new Map<string, DebtView>();
      for (const l of ls) {
        if (l.id !== m?.id && l.period !== "harian") continue; // hutang batas hanya untuk batas utama dan batas harian
        const cats = new Set(l.category_ids), cd = wib(l.created_at);
        const mine = cats.size === 0 ? txs : txs.filter((t) => t.category_id !== null && cats.has(t.category_id));
        debts.set(l.id, debtView(l, mine, cd && cd > floor ? cd : floor, today));
      }
      for (const p of limitPushes(limitStatuses(ls, txs, today), debts)) planned.push({ userId: uid, p });
    }
  }

  // 3) Tagihan berulang jatuh tempo hari ini atau besok.
  const tomorrow = new Date(Date.parse(today + "T00:00:00Z") + 86_400_000).toISOString().slice(0, 10);
  const { data: bills } = await sb.from("recurring_transactions").select("id,user_id,note,amount,next_date").eq("is_active", true).eq("type", "expense").gte("next_date", today).lte("next_date", tomorrow).limit(5000);
  for (const b of billPushes((bills ?? []).map((r) => ({ id: r.id, user_id: r.user_id, note: r.note, amount: Number(r.amount), next_date: r.next_date })), today)) planned.push(b);

  // 4) Masa Pro berbayar hampir habis atau masa coba berakhir besok.
  const soon = new Date(Date.now() + 4 * 86_400_000).toISOString();
  const { data: subs2 } = await sb.from("user_subscriptions").select("user_id,plan,plan_expires_at,trial_plan,trial_ends_at").or(`plan_expires_at.lte.${soon},trial_ends_at.lte.${soon}`).limit(5000);
  for (const s2 of subs2 ?? []) { const p = proExpiryPush(s2, Date.now()); if (p) planned.push({ userId: s2.user_id, p }); }

  // 5) Pengingat gajian dari Ruby: pagi hari gajian, untuk pengguna yang mengaktifkannya (isi pesan dihitung kode).
  try {
    const { data: pd } = await sb.from("payday_schedule").select("user_id").eq("date", today).is("actual_amount", null).limit(2000);
    const ids = [...new Set((pd ?? []).map((r) => String(r.user_id)))];
    if (ids.length > 0) {
      const { data: on } = await sb.from("user_settings").select("user_id").eq("payday_reminder", true).in("user_id", ids).limit(500);
      for (const row of on ?? []) {
        try {
          const uid = String(row.user_id);
          const sum = await buildFinanceSummary(sb as unknown as SupabaseClient<Database>, today, uid);
          const msg = paydayReminderMsg(sum, today);
          if (msg) planned.push({ userId: uid, p: { kind: "gajian", key: today, msg } });
        } catch (e) {
          console.warn("[cron] pengingat gajian gagal disusun:", e instanceof Error ? e.message : e);
        }
      }
    }
  } catch (e) {
    console.warn("[cron] pengingat gajian dilewati:", e instanceof Error ? e.message : e);
  }

  // 6) Buang yang sudah pernah dikirim, lalu kirim.
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
