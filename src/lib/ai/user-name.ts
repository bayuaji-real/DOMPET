/**
 * Nama panggilan pengguna untuk sapaan Ruby: nama depan dari profil. Bila nama belum dibuat
 * (kosong, atau hanya awalan email), mengembalikan null dan Ruby tidak menyebut nama.
 */
export function firstNameFrom(meta: Record<string, unknown> | null | undefined, email: string | null | undefined): string | null {
  const raw = [meta?.full_name, meta?.name].find((v) => typeof v === "string" && v.trim()) as string | undefined;
  if (!raw) return null;
  const local = String(email ?? "").split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  // Nama yang sama dengan awalan email = nama bawaan, bukan nama yang dibuat pengguna.
  if (local && compact === local) return null;
  const m = /[\p{L}][\p{L}'’-]*/u.exec(raw.trim());
  if (!m) return null;
  const word = m[0].slice(0, 20);
  if (word.length < 2) return null;
  return word === word.toLowerCase() || word === word.toUpperCase() ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word;
}

export function nameToText(name: string | null): string {
  if (!name) return "";
  return `Nama panggilan pengguna: ${name}. Sebut namanya sesekali (paling banyak sekali per jawaban, jangan di setiap kalimat), misalnya saat membuka jawaban atau memberi semangat. Kalau di Memori Ruby pengguna minta dipanggil dengan nama lain, pakai nama itu.`;
}
