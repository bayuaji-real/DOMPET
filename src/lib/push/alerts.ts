// Menyusun pesan push (murni, bisa dites). Pengiriman ada di route cron.
import { apiAlert } from "@/lib/admin-alert";
import { limitAlert, type DebtView, type Status } from "@/lib/konsultan/spend-limit";
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
export function limitPushes(statuses: Status[], debts?: Map<string, DebtView>): PlannedPush[] {
  const out: PlannedPush[] = [];
  for (const s of statuses) {
    // Batas utama dan batas harian: pesan memakai jatah setelah dipotong hutang batas, sama dengan Beranda.
    const { level, msg: body } = limitAlert(s, debts?.get(s.limit.id) ?? null, rp);
    if (!body) continue;
    out.push({ kind: "limit", key: `${s.limit.id}:${s.from}:${level}`, msg: { title: level === "lewat" ? "Batas pengeluaran terlewati" : "Batas pengeluaran hampir habis", body, url: "/batas-pengeluaran", tag: `limit-${s.limit.id}` } });
  }
  return out;
}

const dayDiff = (from: string, to: string) => Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86_400_000);

/** Pengingat tagihan berulang yang jatuh tempo hari ini atau besok; sekali per tagihan per tanggal per tingkat. */
export function billPushes(
  rows: { id: string; user_id: string; note: string | null; amount: number; next_date: string }[],
  today: string,
): { userId: string; p: PlannedPush }[] {
  const out: { userId: string; p: PlannedPush }[] = [];
  for (const r of rows) {
    const d = dayDiff(today, r.next_date);
    if (d !== 0 && d !== 1) continue;
    const label = r.note?.trim() || "Tagihan";
    out.push({ userId: r.user_id, p: { kind: "tagihan", key: `${r.id}:${r.next_date}:${d}`, msg: { title: d === 0 ? "Tagihan jatuh tempo hari ini" : "Tagihan jatuh tempo besok", body: `${label}, ${rp(Number(r.amount))}.`, url: "/pengingat", tag: `tagihan-${r.id}` } } });
  }
  return out;
}

/** Peringatan masa Pro berbayar hampir habis (3 hari dan 1 hari sebelumnya) atau masa coba berakhir besok. */
export function proExpiryPush(
  sub: { plan: string; plan_expires_at: string | null; trial_plan: string | null; trial_ends_at: string | null },
  nowMs: number,
): PlannedPush | null {
  const left = (iso: string) => (Date.parse(iso) - nowMs) / 86_400_000;
  if (sub.plan !== "free" && sub.plan_expires_at) {
    const d = left(sub.plan_expires_at);
    if (d > 0 && d <= 3) {
      const days = Math.ceil(d);
      return { kind: "pro_habis", key: `${sub.plan_expires_at.slice(0, 10)}:${days <= 1 ? "1" : "3"}`, msg: { title: "Pro kamu hampir habis", body: `Berakhir ${days <= 1 ? "dalam 1 hari" : `dalam ${days} hari`}. Perpanjang supaya semua fitur Pro tetap terbuka.`, url: "/paket", tag: "pro-habis" } };
    }
    return null;
  }
  if (sub.trial_plan && sub.trial_ends_at) {
    const d = left(sub.trial_ends_at);
    if (d > 0 && d <= 1) return { kind: "coba_habis", key: sub.trial_ends_at.slice(0, 10), msg: { title: "Masa coba Pro berakhir besok", body: "Pilih paket Pro kalau mau lanjut. Catatanmu tetap aman.", url: "/paket", tag: "coba-habis" } };
  }
  return null;
}

/** Info pembayaran untuk pengguna sesudah admin memutuskan. */
export function paymentPush(status: string, months: number, id: string): PlannedPush | null {
  if (status === "dikonfirmasi") return { kind: "bayar", key: `${id}:dikonfirmasi`, msg: { title: "Pembayaran dikonfirmasi", body: `Terima kasih! Pro ${months} bulan sudah aktif.`, url: "/paket", tag: "bayar" } };
  if (status === "ditolak") return { kind: "bayar", key: `${id}:ditolak`, msg: { title: "Pembayaran belum bisa dikonfirmasi", body: "Buktimu belum cocok. Buka halaman Paket untuk melihat alasannya dan coba lagi.", url: "/paket/bayar", tag: "bayar" } };
  return null;
}
