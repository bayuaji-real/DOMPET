export interface Holding { id: string; name: string; kind: string; units: number; avg_price: number; last_price: number | null }
export interface HoldingView { id: string; name: string; kind: string; cost: number; value: number; pnl: number; pnlPct: number; hasPrice: boolean }
export interface PortfolioSummary { rows: HoldingView[]; cost: number; value: number; pnl: number; pnlPct: number; missingPrice: number }

export function summarizePortfolio(holdings: Holding[]): PortfolioSummary {
  const rows = holdings.map((h) => {
    const cost = h.units * h.avg_price;
    const hasPrice = h.last_price != null;
    const value = hasPrice ? h.units * (h.last_price as number) : cost; // tanpa harga terbaru: dianggap sama dengan modal
    const pnl = value - cost;
    return { id: h.id, name: h.name, kind: h.kind, cost, value, pnl, pnlPct: cost > 0 ? (pnl / cost) * 100 : 0, hasPrice };
  });
  const cost = rows.reduce((s, r) => s + r.cost, 0);
  const value = rows.reduce((s, r) => s + r.value, 0);
  return { rows, cost, value, pnl: value - cost, pnlPct: cost > 0 ? ((value - cost) / cost) * 100 : 0, missingPrice: rows.filter((r) => !r.hasPrice).length };
}

export interface Snapshot { id: string; name: string; category: string; risk: string; ret_1m: number | null; ret_ytd: number | null; ret_1y: number | null }
export type SortKey = "ret_1m" | "ret_1y";
/** Urutkan dari return terbesar. Data kosong ditaruh paling bawah. Peringkat per kategori, bukan lintas kategori. */
export function rankSnapshots(items: Snapshot[], key: SortKey): Snapshot[] {
  return [...items].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  });
}
