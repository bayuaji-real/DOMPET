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
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Ambil user auth saat ini
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPath = pathname.startsWith("/login");
  // Mode demo hanya aktif di development lokal (atau kalau ENABLE_DEMO_MODE=true di-set sengaja).
  const demoEnabled =
    process.env.NODE_ENV !== "production" || process.env.ENABLE_DEMO_MODE === "true";
  const isDemoParam = demoEnabled && request.nextUrl.searchParams.get("demo") === "true";
  const hasDevBypass =
    demoEnabled && (request.cookies.get("dompet_dev_mode")?.value === "true" || isDemoParam);

  if (isDemoParam) {
    supabaseResponse.cookies.set("dompet_dev_mode", "true", { path: "/", maxAge: 86400 });
  }

  // Jika user belum login dan mencoba membuka halaman selain /login -> redirect ke /login
  if (!user && !isAuthPath && !hasDevBypass) {
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
