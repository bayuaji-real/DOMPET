/**
 * Pengaman skrip seed: mencegah skrip menulis ke database utama (production).
 * Tidak ada ref/key project yang ditulis di sini.
 *
 * Dua lapis, keduanya wajib:
 * 1. Daftar izin  : SEED_ALLOWED_PROJECT_REF (satu ref staging) harus cocok
 *                   persis dengan ref di URL.
 * 2. Daftar larang: SEED_BLOCKED_PROJECT_REFS (ref database utama, dipisah koma)
 *                   tidak boleh sama dengan ref di URL. Larangan menang atas izin.
 * Gagal tertutup: kalau ada yang kosong, janggal, atau tidak cocok, skrip berhenti.
 *
 * Pesan error sengaja generik (tanpa ref, URL, atau key). Pemanggil dan tes
 * memakai `code`, bukan teks pesan.
 */

export interface SeedEnv {
  [key: string]: string | undefined;
}

export interface SeedConfig {
  url: string;
  key: string;
}

export type SeedGuardCode =
  | "MISSING_CREDENTIALS"
  | "NOT_CONFIRMED"
  | "BLOCKLIST_EMPTY"
  | "ALLOWLIST_MISSING"
  | "ALLOWLIST_INVALID"
  | "URL_INVALID"
  | "REF_BLOCKED"
  | "REF_NOT_ALLOWED";

export class SeedGuardError extends Error {
  readonly code: SeedGuardCode;
  constructor(code: SeedGuardCode, message: string) {
    super(message);
    this.name = "SeedGuardError";
    this.code = code;
  }
}

const REF_PATTERN = /^[a-z0-9]+$/;

/**
 * Ambil project ref dari URL Supabase (https://<ref>.supabase.co).
 * Ketat: hanya https, tanpa user/password, tanpa port, tanpa path selain "/",
 * tanpa query/hash, tanpa subdomain tambahan, tanpa titik di akhir host.
 * Mengembalikan null bila ada yang janggal.
 */
export function extractProjectRef(url: string): string | null {
  try {
    const raw = url.trim();
    if (/\s/.test(raw)) return null;
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    if (u.username || u.password || u.port) return null;
    if (u.pathname !== "/" || u.search || u.hash) return null;
    const match = u.hostname.toLowerCase().match(/^([a-z0-9]+)\.supabase\.(co|in|net)$/);
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

/** Ref izin harus satu nilai, huruf/angka saja. Selain itu null. */
export function parseAllowedRef(raw: string | undefined): string | null {
  const v = (raw ?? "").trim().toLowerCase();
  return REF_PATTERN.test(v) ? v : null;
}

/** Validasi env. Melempar SeedGuardError bila tidak aman. */
export function assertSafeSeedEnv(env: SeedEnv): SeedConfig {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();

  if (!url || !key) {
    throw new SeedGuardError(
      "MISSING_CREDENTIALS",
      "NEXT_PUBLIC_SUPABASE_URL dan key Supabase wajib diisi di .env.staging.local (tanpa nilai bawaan)."
    );
  }

  if (env.SEED_CONFIRM_STAGING !== "yes") {
    throw new SeedGuardError(
      "NOT_CONFIRMED",
      "Ditolak: set SEED_CONFIRM_STAGING=yes untuk memastikan target adalah database staging."
    );
  }

  const blocked = parseBlockedRefs(env.SEED_BLOCKED_PROJECT_REFS);
  if (blocked.length === 0) {
    throw new SeedGuardError(
      "BLOCKLIST_EMPTY",
      "Ditolak: SEED_BLOCKED_PROJECT_REFS wajib diisi (daftar ref database utama, dipisah koma)."
    );
  }

  if (!env.SEED_ALLOWED_PROJECT_REF?.trim()) {
    throw new SeedGuardError(
      "ALLOWLIST_MISSING",
      "Ditolak: SEED_ALLOWED_PROJECT_REF wajib diisi (ref project staging)."
    );
  }
  const allowed = parseAllowedRef(env.SEED_ALLOWED_PROJECT_REF);
  if (!allowed) {
    throw new SeedGuardError(
      "ALLOWLIST_INVALID",
      "Ditolak: format SEED_ALLOWED_PROJECT_REF tidak valid (satu ref, huruf kecil/angka)."
    );
  }

  const ref = extractProjectRef(url);
  if (!ref) {
    throw new SeedGuardError(
      "URL_INVALID",
      "Ditolak: format NEXT_PUBLIC_SUPABASE_URL tidak dikenali."
    );
  }

  if (blocked.includes(ref)) {
    throw new SeedGuardError(
      "REF_BLOCKED",
      "Ditolak: URL menunjuk ke database utama (production). Pakai project staging."
    );
  }

  if (ref !== allowed) {
    throw new SeedGuardError(
      "REF_NOT_ALLOWED",
      "Ditolak: project di URL tidak cocok dengan SEED_ALLOWED_PROJECT_REF."
    );
  }

  return { url, key };
}
