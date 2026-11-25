import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const pathname = request.nextUrl.pathname;

  // Izinkan asset statis, manifest, icons, dan favicon selalu bisa diakses tanpa login
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/icons") ||
    pathname.includes("manifest") ||
    pathname === "/sw.js" ||
    pathname.includes("favicon.ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".webp");

  if (isPublicAsset) {
    return supabaseResponse;
  }

  // Jika URL atau Anon Key Supabase belum diisi oleh user di .env.local,
  // jangan lempar runtime fatal error di middleware, arahkan atau biarkan tampil pesan ramah
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("placeholder")) {
    // Biarkan akses ke /login atau halaman setup jika env belum diisi
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, { ...options, sameSite: "lax", secure: process.env.NODE_ENV === "production" })
        );
      },
    },
  });

  // Ambil user auth saat ini
  // Batas waktu 4 detik. Kalau server Supabase lambat/tak terjangkau, jangan biarkan layar
  // pembuka HP menunggu tanpa akhir (penyebab utama "splash nyangkut"). Saat terlambat, pakai
  // sesi dari cookie (tanpa jaringan). Data tetap aman karena RLS di database yang memutuskan.
  let user: { id: string } | null = null;
  try {
    const result = await Promise.race([
      supabase.auth.getUser().then((r) => ({ ok: true as const, user: r.data.user })),
      new Promise<{ ok: false }>((resolve) => setTimeout(() => resolve({ ok: false }), 4000)),
    ]);
    if (result.ok) {
      user = result.user;
    } else {
      const { data } = await supabase.auth.getSession();
      user = data.session?.user ?? null;
    }
  } catch {
    const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    user = data.session?.user ?? null;
  }

  const isAuthPath = pathname.startsWith("/login");
  const isLandingPath = pathname === "/landing" || pathname.startsWith("/landing/");
  // #5 Mode demo HANYA di development lokal. Di production selalu mati (celah ditutup).
  const demoEnabled = process.env.NODE_ENV !== "production";
  const isDemoParam = demoEnabled && request.nextUrl.searchParams.get("demo") === "true";
  const hasDevBypass =
    demoEnabled && (request.cookies.get("dompet_dev_mode")?.value === "true" || isDemoParam);

  if (isDemoParam) {
    supabaseResponse.cookies.set("dompet_dev_mode", "true", { path: "/", maxAge: 86400 });
  }

  // Jika user belum login dan mencoba membuka halaman selain /login atau /landing -> redirect ke /login
  if (!user && !isAuthPath && !isLandingPath && !hasDevBypass) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Jika user sudah login dan mencoba mengakses /login -> redirect ke beranda /
  if (user && isAuthPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
