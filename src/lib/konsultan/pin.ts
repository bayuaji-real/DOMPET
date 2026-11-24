/**
 * Kunci PIN aplikasi: pengaman di perangkat ini saja (menutup layar kalau HP dipinjam), bukan pengganti login.
 * PIN disimpan sebagai hash SHA-256 + garam di penyimpanan lokal perangkat.
 */
export const PIN_KEY = "dompet_pin_v1";
export const PIN_TRIES_KEY = "dompet_pin_tries_v1";
export const MAX_TRIES = 5;
export const LOCKOUT_MS = 60_000;

export function validPinFormat(pin: string): boolean { return /^\d{4,6}$/.test(pin); }

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function hashPin(pin: string, salt: string): Promise<string> { return sha256(`${salt}:${pin}`); }

export interface StoredPin { salt: string; hash: string }
export async function makeStoredPin(pin: string): Promise<StoredPin> {
  const salt = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { salt, hash: await hashPin(pin, salt) };
}
export async function checkPin(pin: string, stored: StoredPin): Promise<boolean> { return (await hashPin(pin, stored.salt)) === stored.hash; }

export interface Tries { count: number; lockedUntil: number }
/** Setelah MAX_TRIES salah berturut-turut, terkunci LOCKOUT_MS. */
export function registerFailure(t: Tries, now: number): Tries {
  const count = t.count + 1;
  return count >= MAX_TRIES ? { count: 0, lockedUntil: now + LOCKOUT_MS } : { count, lockedUntil: t.lockedUntil };
}
export function isLocked(t: Tries, now: number): boolean { return t.lockedUntil > now; }
