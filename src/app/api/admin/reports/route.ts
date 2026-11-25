import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { verifyServerAuth } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["baru", "dibaca", "dikerjakan", "selesai"]),
});

const postSchema = z.object({
  action: z.enum(["signed_url"]),
  imagePath: z.string().min(1),
});

/**
 * Endpoint Admin untuk melihat dan mengelola laporan pelanggan (Pusat Bantuan).
 * Khusus admin dan superadmin.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyServerAuth(request);
  if (!auth.authenticated && auth.response) return auth.response;

  const supabase = await createClient();
  const { data: role } = await supabase.rpc("my_admin_role");
  if (!role) {
    return NextResponse.json({ success: false, error: "Khusus admin" }, { status: 403 });
  }

  const sb = serviceClient() ?? supabase;

  const { data: reports, error } = await sb
    .from("help_reports")
    .select("id, user_id, kind, title, body, page, status, image_path, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[admin-reports] gagal memuat laporan:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Lengkapi email pengguna jika serviceClient tersedia
  let userMap: Record<string, string> = {};
  const svc = serviceClient();
  if (svc && reports && reports.length > 0) {
    const userIds = Array.from(new Set(reports.map((r) => r.user_id)));
    await Promise.all(
      userIds.map(async (uid) => {
        try {
          const { data } = await svc.auth.admin.getUserById(uid);
          if (data?.user?.email) userMap[uid] = data.user.email;
        } catch {
          // Abaikan jika user tidak ditemukan
        }
      })
    );
  }

  const result = (reports ?? []).map((r) => ({
    ...r,
    email: userMap[r.user_id] ?? null,
  }));

  return NextResponse.json({ success: true, data: result });
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyServerAuth(request);
  if (!auth.authenticated && auth.response) return auth.response;

  const supabase = await createClient();
  const { data: role } = await supabase.rpc("my_admin_role");
  if (!role) {
    return NextResponse.json({ success: false, error: "Khusus admin" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Data tidak valid" }, { status: 400 });
  }

  const sb = serviceClient() ?? supabase;
  const { error } = await sb
    .from("help_reports")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const auth = await verifyServerAuth(request);
  if (!auth.authenticated && auth.response) return auth.response;

  const supabase = await createClient();
  const { data: role } = await supabase.rpc("my_admin_role");
  if (!role) {
    return NextResponse.json({ success: false, error: "Khusus admin" }, { status: 403 });
  }

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Data tidak valid" }, { status: 400 });
  }

  const sb = serviceClient() ?? supabase;
  const { data, error } = await sb.storage
    .from("help-attachments")
    .createSignedUrl(parsed.data.imagePath, 3600);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, signedUrl: data?.signedUrl ?? null });
}
