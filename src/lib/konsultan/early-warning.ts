export interface BudgetUse { name: string; limit: number; spent: number }
export interface Warning { level: "info" | "waspada" | "bahaya"; text: string }
/** Peringatan dini dari laju belanja bulan berjalan. day = tanggal hari ini, dim = jumlah hari bulan ini. */
export function earlyWarnings(budgets: BudgetUse[], day: number, dim: number): Warning[] {
  const out: Warning[] = [];
  const frac = Math.min(Math.max(day / Math.max(dim, 1), 0.01), 1);
  for (const b of budgets) {
    if (b.limit <= 0) continue;
    const used = b.spent / b.limit;
    if (used >= 1) { out.push({ level: "bahaya", text: `Anggaran ${b.name} sudah terlewati.` }); continue; }
    const projected = b.spent / frac;
    if (day >= 5 && projected > b.limit * 1.1) out.push({ level: "waspada", text: `Dengan laju sekarang, ${b.name} diperkirakan melewati anggaran bulan ini.` });
    else if (used >= 0.8) out.push({ level: "info", text: `Anggaran ${b.name} sudah terpakai ${Math.round(used * 100)}%.` });
  }
  const rank = { bahaya: 0, waspada: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}
