/**
 * Serangan SSRF (poin 5): server mengirim notifikasi ke alamat `endpoint` yang didaftarkan pengguna.
 * Tanpa daftar putih, pengguna bisa menyuruh server memanggil alamat https mana pun.
 * Hanya layanan push resmi browser yang diizinkan.
 */
const HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.push\.services\.mozilla\.com$/,
  /^[a-z0-9.-]+\.notify\.windows\.com$/,
  /^web\.push\.apple\.com$/,
  /^[a-z0-9-]+\.push\.apple\.com$/,
];

export function isAllowedPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length >= 1000) return false;
  let u: URL;
  try { u = new URL(value); } catch { return false; }
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return false;
  return HOSTS.some((re) => re.test(u.hostname.toLowerCase()));
}
