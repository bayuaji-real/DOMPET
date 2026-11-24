import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { verifyServerAuth } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { configurePush, sendPush } from "@/lib/push/send";
import { paymentPush } from "@/lib/push/alerts";

const schema = z.object({ id: z.string().uuid() });

/**
 * Dipanggil layar Admin sesudah konfirmasi atau penolakan. Hanya admin. Status dibaca ulang dari database (bukan dari
 * kiriman browser), lalu pengguna yang bersangkutan diberi tahu lewat notifikasi push (sekali per status).
 */
export async function POST(request: NextRequest) {
  const auth = await verifyServerAuth(request);
  if (!auth.authenticated && auth.response) return auth.response;
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("my_admin_role");
  if (!role) return NextResponse.json({ success: false, error: "Khusus admin" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Data tidak valid" }, { status: 400 });
  const sb = serviceClient();
  if (!sb || !configurePush()) return NextResponse.json({ success: true, sent: 0, note: "Notifikasi belum disiapkan di server" });
  const { data: pr } = await sb.from("payment_requests").select("id,user_id,months,status").eq("id", parsed.data.id).maybeSingle();
  const plan = pr ? paymentPush(pr.status, pr.months, pr.id) : null;
  if (!pr || !plan) return NextResponse.json({ success: true, sent: 0 });
  const { error } = await sb.from("push_log").insert({ user_id: pr.user_id, kind: plan.kind, dedupe_key: plan.key });
  if (error) return NextResponse.json({ success: true, sent: 0 });
  const { data: subs } = await sb.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", pr.user_id);
  let sent = 0;
  for (const s of subs ?? []) {
    const r = await sendPush(s, plan.msg);
    if (r === "ok") sent++; else if (r === "gone") await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
  }
  return NextResponse.json({ success: true, sent });
}
