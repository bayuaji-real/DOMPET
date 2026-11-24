import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function who() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  return { sb, user };
}
const okEndpoint = (e: unknown): e is string => typeof e === "string" && /^https:\/\//.test(e) && e.length < 1000;

export async function POST(req: Request) {
  const { sb, user } = await who();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const p256dh = b?.keys?.p256dh, auth = b?.keys?.auth;
  if (!b || !okEndpoint(b.endpoint) || typeof p256dh !== "string" || typeof auth !== "string" || p256dh.length > 200 || auth.length > 100) return NextResponse.json({ ok: false }, { status: 400 });
  const { error } = await sb.from("push_subscriptions").upsert({ user_id: user.id, endpoint: b.endpoint, p256dh, auth, user_agent: (req.headers.get("user-agent") ?? "").slice(0, 200) }, { onConflict: "endpoint" });
  return error ? NextResponse.json({ ok: false }, { status: 500 }) : NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { sb, user } = await who();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (!b || !okEndpoint(b.endpoint)) return NextResponse.json({ ok: false }, { status: 400 });
  await sb.from("push_subscriptions").delete().eq("endpoint", b.endpoint).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
