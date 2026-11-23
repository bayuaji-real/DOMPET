import { NextResponse, type NextRequest } from "next/server";
import { verifyServerAuth } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { helpReportSchema } from "@/lib/validation";

/** Pusat Bantuan: simpan laporan bug / usul fitur milik pengguna yang sedang login. */
export async function POST(request: NextRequest) {
  const auth = await verifyServerAuth(request);
  if (!auth.authenticated && auth.response) return auth.response;

  const parsed = helpReportSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Judul minimal 3 huruf dan isi minimal 5 huruf." }, { status: 400 });
  }

  const supabase = await createClient();

  // Pengaman spam: maksimal 10 laporan per hari per pengguna
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase.from("help_reports").select("id", { count: "exact", head: true }).gte("created_at", since);
  if ((count ?? 0) >= 10) {
    return NextResponse.json({ success: false, error: "Laporan hari ini sudah banyak. Coba lagi besok ya." }, { status: 429 });
  }

  const { error } = await supabase.from("help_reports").insert({
    kind: parsed.data.kind,
    title: parsed.data.title,
    body: parsed.data.body,
    page: parsed.data.page ?? null,
  });
  if (error) {
    console.error("[help] gagal menyimpan:", error.message);
    return NextResponse.json({ success: false, error: "Gagal menyimpan. Coba lagi." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
