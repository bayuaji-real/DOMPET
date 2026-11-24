import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return Boolean(
    supabaseUrl &&
      !supabaseUrl.includes("placeholder") &&
      supabaseAnonKey &&
      !supabaseAnonKey.includes("placeholder")
  );
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!isSupabaseConfigured()) {
    // Hindari console.warn berulang jika placeholder
  }

  return createBrowserClient<Database>(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseAnonKey || "placeholder-anon-key",
    {
      // Cookie sesi hanya dikirim lewat HTTPS dan tidak ikut permintaan lintas situs.
      // Tidak HttpOnly: aplikasi membaca data langsung dari browser. Kompensasinya CSP dan header keamanan di next.config.ts.
      cookieOptions: { sameSite: "lax", secure: typeof window !== "undefined" && window.location.protocol === "https:" },
    }
  );
}
