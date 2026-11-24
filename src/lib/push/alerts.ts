// Menyusun pesan push (murni, bisa dites). Pengiriman ada di route cron.
import { apiAlert } from "@/lib/admin-alert";
import { limitMessage, type Status } from "@/lib/konsultan/spend-limit";
import type { ApiUsage } from "@/lib/data/admin";

export type PushMsg = { title: string; body: string; url: string; tag: string };
export type PlannedPush = { kind: string; key: string; msg: PushMsg };

const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

/** Peringatan saldo API untuk admin. Hanya saat waspada, kritis, atau habis; maksimal sekali per hari per tingkat. */
export function apiPush(u: Pick<ApiUsage, "configured" | "level" | "used_pct" | "days_left" | "remaining_idr">, today: string): PlannedPush | null {
  if (!u.configured || !["waspada", "kritis", "habis"].includes(u.level)) return null;
  const a = apiAlert(u, rp);
  return { kind: "api", key: `${u.level}:${today}`, msg: { title: a.title, body: a.body, url: "/admin", tag: "api-saldo" } };
}

/** Peringatan batas pengeluaran yang hampir habis atau terlewati; sekali per batas per periode per tingkat. */
export function limitPushes(statuses: Status[]): PlannedPush[] {
  const out: PlannedPush[] = [];
  for (const s of statuses) {
    const body = limitMessage(s, rp);
    if (!body) continue;
    out.push({ kind: "limit", key: `${s.limit.id}:${s.from}:${s.level}`, msg: { title: s.level === "lewat" ? "Batas pengeluaran terlewati" : "Batas pengeluaran hampir habis", body, url: "/batas-pengeluaran", tag: `limit-${s.limit.id}` } });
  }
  return out;
}
