/**
 * Antrean sederhana (rate limit) in-memory per-proses.
 * Tujuan: mencegah satu user menyerbu endpoint AI (Gemini) berkali-kali
 * sehingga boros biaya/kuota. Best-effort: di serverless tiap instance
 * punya hitungan sendiri, jadi ini lapisan pertahanan ringan, bukan kuota ketat.
 * Untuk kuota global yang kuat, nanti ganti ke Upstash Redis.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfter: number; // detik
}

export function rateLimit(key: string, limit = 30, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count, retryAfter: 0 };
}
