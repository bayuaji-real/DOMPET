import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export interface VerifiedAuth {
  authenticated: boolean;
  userId: string;
  response: NextResponse | null;
}

/**
 * Memverifikasi sesi login pengguna di Server Route.
 * Mengembalikan response 401 jika user belum login di environment production.
 */
export async function verifyServerAuth(
  request?: NextRequest | Request
): Promise<VerifiedAuth> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (user && !error) {
      return {
        authenticated: true,
        userId: user.id,
        response: null,
      };
    }
  } catch (err) {
    console.warn("[Auth] Gagal memeriksa sesi auth Supabase:", err);
  }

  // Cek apakah mode demo/testing diizinkan via header atau query param
  let isDemoAllowed = false;
  if (request) {
    try {
      const url = new URL(request.url);
      const isDemoQuery = url.searchParams.get("demo") === "true";
      const isDemoHeader = request.headers.get("x-demo-mode") === "true";
      // Mode demo HANYA untuk development lokal (npm run dev / tes E2E).
      // Di production (Vercel) selalu mati, kecuali sengaja diaktifkan lewat ENABLE_DEMO_MODE=true.
      const demoEnabled =
        process.env.NODE_ENV !== "production" || process.env.ENABLE_DEMO_MODE === "true";
      if (demoEnabled && (isDemoQuery || isDemoHeader || process.env.NODE_ENV !== "production")) {
        isDemoAllowed = true;
      }
    } catch {
      // Abaikan jika URL parsing gagal
    }
  }

  if (isDemoAllowed) {
    return {
      authenticated: true,
      userId: "demo-user",
      response: null,
    };
  }

  return {
    authenticated: false,
    userId: "",
    response: NextResponse.json(
      {
        success: false,
        error: "Sesi login telah berakhir atau Anda belum masuk. Silakan login terlebih dahulu.",
      },
      { status: 401 }
    ),
  };
}
