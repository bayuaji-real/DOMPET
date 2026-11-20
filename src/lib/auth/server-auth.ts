import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

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
      // #3 Antrean: batasi permintaan per user agar endpoint AI tidak diserbu.
      const rl = rateLimit(`api:${user.id}`);
      if (!rl.ok) {
        return {
          authenticated: false,
          userId: user.id,
          response: NextResponse.json(
            { success: false, error: "Terlalu banyak permintaan. Coba lagi sebentar." },
            { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
          ),
        };
      }
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
      // #5 Celah demo ditutup di production: hanya aktif saat development / E2E lokal.
      const demoEnabled = process.env.NODE_ENV !== "production";
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
