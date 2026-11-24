export interface Reminder { kind: "tagihan" | "gajian"; label: string; date: string; amount: number; daysLeft: number }
const dayDiff = (from: string, to: string) => Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86_400_000);

/** Pengingat dalam aplikasi: tagihan berulang dan gajian yang jatuh tempo dalam `withinDays` hari (termasuk yang sudah lewat 3 hari). */
export function buildReminders(
  today: string,
  recurring: { type: string; amount: number; next_date: string; note: string | null; is_active: boolean }[],
  paydays: { date: string; expected_amount: number; actual_amount: number | null; note: string | null }[],
  withinDays = 7,
): Reminder[] {
  const out: Reminder[] = [];
  for (const r of recurring) {
    if (!r.is_active || r.type !== "expense") continue;
    const d = dayDiff(today, r.next_date);
    if (d >= -3 && d <= withinDays) out.push({ kind: "tagihan", label: r.note || "Tagihan", date: r.next_date, amount: Number(r.amount), daysLeft: d });
  }
  for (const p of paydays) {
    if (p.actual_amount != null) continue; // sudah diterima
    const d = dayDiff(today, p.date);
    if (d >= -3 && d <= withinDays) out.push({ kind: "gajian", label: p.note || "Gajian", date: p.date, amount: Number(p.expected_amount), daysLeft: d });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}
export function reminderText(r: Reminder): string {
  if (r.daysLeft === 0) return "hari ini";
  if (r.daysLeft === 1) return "besok";
  if (r.daysLeft < 0) return `terlewat ${-r.daysLeft} hari`;
  return `${r.daysLeft} hari lagi`;
}
