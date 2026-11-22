/**
 * Pengaman skrip seed: mencegah skrip menulis ke database utama (production).
 * Tidak ada ref/key project yang ditulis di sini. Daftar ref terlarang
 * diambil dari env SEED_BLOCKED_PROJECT_REFS (dipisah koma).
 */

export interface SeedEnv {
  [key: string]: string | undefined;
}

export interface SeedConfig {
  url: string;
  key: string;
}

/** Ambil project ref dari URL Supabase (https://<ref>.supabase.co). */
export function extractProjectRef(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const match = host.match(/^([a-z0-9]+)\.supabase\.(co|in|net)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function parseBlockedRefs(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Validasi env. Melempar Error bila tidak aman. Pesan error tidak
 * menampilkan URL, ref, maupun key.
 */
export function assertSafeSeedEnv(env: SeedEnv): SeedConfig {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL dan key Supabase wajib diisi di .env.staging.local (tanpa nilai bawaan)."
    );
  }

  if (env.SEED_CONFIRM_STAGING !== "yes") {
    throw new Error(
      "Ditolak: set SEED_CONFIRM_STAGING=yes untuk memastikan target adalah database staging."
    );
  }

  const blocked = parseBlockedRefs(env.SEED_BLOCKED_PROJECT_REFS);
  if (blocked.length === 0) {
    throw new Error(
      "Ditolak: SEED_BLOCKED_PROJECT_REFS wajib diisi (daftar ref database utama, dipisah koma)."
    );
  }

  const ref = extractProjectRef(url);
  if (!ref) {
    throw new Error("Ditolak: format NEXT_PUBLIC_SUPABASE_URL tidak dikenali.");
  }

  if (blocked.includes(ref)) {
    throw new Error(
      "Ditolak: URL menunjuk ke database utama (production). Pakai project staging."
    );
  }

  return { url, key };
}
