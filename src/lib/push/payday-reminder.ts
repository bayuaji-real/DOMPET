// Pesan pengingat gajian dari Ruby (murni, bisa dites). Angka dihitung kode, bukan AI.
import { allocationInputFromSummary, type FinanceSummary } from "@/lib/ai/finance-summary";
import { buildRoadmap } from "@/lib/ai/roadmap";
import type { PushMsg } from "@/lib/push/alerts";

const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
const MAX_LINES = 4;

/** Pembagian gaji hari ini (hanya nominal di atas Rp0). Null bila hari ini bukan gajian berikutnya menurut data. */
export function paydayReminderMsg(s: FinanceSummary, today: string): PushMsg | null {
  if (s.nextPayday !== today) return null;
  const r = buildRoadmap(allocationInputFromSummary(s));
  const step = r.projectable ? r.steps.find((x) => x.date === today) : undefined;
  const gives = (step?.gives ?? []).filter((g) => g.amount > 0);
  const head = s.nextPaydayAmount > 0 ? `Gaji ${rp(s.nextPaydayAmount)} masuk hari ini. ` : "";
  const base = { title: "Hari gajian! Ini pembagian uangmu", url: "/chat", tag: "gajian" };
  if (gives.length === 0) {
    return { ...base, body: `${head}Setelah biaya hidup dan tagihan, belum ada sisa untuk dibagi ke target. Tanya Ruby untuk cek rencanamu.` };
  }
  const shown = gives.slice(0, MAX_LINES).map((g) => `taruh ${rp(g.amount)} ke ${g.name}`);
  const more = gives.length > MAX_LINES ? `, dan ${gives.length - MAX_LINES} target lain` : "";
  return { ...base, body: `${head}${shown.join(", ")}${more}.` };
}
