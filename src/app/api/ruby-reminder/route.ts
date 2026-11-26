import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { verifyServerAuth } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ enabled: z.boolean() });

/** Menyalakan atau mematikan pengingat gajian dari Ruby. Menyalakan butuh notifikasi aktif di minimal satu perangkat. */
export async function POST(request: NextRequest) {
  const auth = await verifyServerAuth(request);
  if (!auth.authenticated && auth.response) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Data tidak valid" }, { status: 400 });

  const supabase = await createClient();
  if (parsed.data.enabled) {
    const { count } = await supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", auth.userId);
    if (!count) return NextResponse.json({ success: false, error: "notif_off" }, { status: 409 });
  }
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: auth.userId, payday_reminder: parsed.data.enabled, payday_reminder_offered_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) {
    console.warn("[ruby-reminder] gagal menyimpan:", error.message);
    return NextResponse.json({ success: false, error: "Belum bisa menyimpan. Coba lagi sebentar." }, { status: 500 });
  }
  return NextResponse.json({ success: true, enabled: parsed.data.enabled });
}
