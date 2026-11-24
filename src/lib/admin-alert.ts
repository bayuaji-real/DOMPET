// Teks peringatan untuk dashboard pemakaian API (murni, bisa dites).
import type { ApiUsage } from "@/lib/data/admin";
export type Alert = { tone: "ok" | "info" | "warn" | "bad"; title: string; body: string };

export function apiAlert(u: Pick<ApiUsage, "configured" | "level" | "used_pct" | "days_left" | "remaining_idr">, fmt: (n: number) => string): Alert {
  if (!u.configured || u.level === "belum_diatur") return { tone: "info", title: "Saldo API belum diatur", body: "Isi nilai top-up terakhir dan tanggalnya, supaya peringatan bisa bekerja." };
  const pct = u.used_pct ?? 0;
  const days = u.days_left != null ? ` Dengan pemakaian 7 hari terakhir, kira-kira cukup ${u.days_left} hari lagi.` : "";
  if (u.level === "habis") return { tone: "bad", title: "Saldo API habis", body: `Pemakaian sudah ${pct}% dari top-up. Top up sekarang supaya fitur Ruby tidak berhenti.` };
  if (u.level === "kritis") return { tone: "bad", title: "Saldo API hampir habis", body: `Terpakai ${pct}%, sisa sekitar ${fmt(u.remaining_idr)}.${days} Segera top up.` };
  if (u.level === "waspada") return { tone: "warn", title: "Saldo API mulai menipis", body: `Terpakai ${pct}%, sisa sekitar ${fmt(u.remaining_idr)}.${days} Siapkan top up.` };
  return { tone: "ok", title: "Saldo API aman", body: `Terpakai ${pct}%, sisa sekitar ${fmt(u.remaining_idr)}.${days}` };
}
