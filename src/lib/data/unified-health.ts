"use client";

import * as React from "react";
import { getFinanceSnapshot, type FinanceSnapshot } from "@/lib/data/finance-snapshot";
import { getDebts } from "@/lib/data/debts";
import { loadPlanContext } from "@/lib/data/plan-basis";
import { resolvePlanBasis } from "@/lib/savings-queue";
import { unifyHealth } from "@/lib/konsultan/health-score";
import type { FinancialHealth } from "@/types/analytics";

type Basis = { snap: FinanceSnapshot; debt: number };
let cache: { at: number; p: Promise<Basis> } | null = null;

function loadBasis(): Promise<Basis> {
  if (cache && Date.now() - cache.at < 30_000) return cache.p;
  const p = Promise.all([getFinanceSnapshot(), getDebts().catch(() => [])]).then(async ([snap, d]) => {
    const debt = d.reduce((x, r) => x + Number(r.min_payment), 0);
    // Pakai gaji dan biaya tetap yang sudah tersimpan (Money Planner). Bila belum lengkap, tidak menebak: rata-rata lama tetap dipakai
    // hanya untuk skor ringkas ini, dan halaman Kesehatan Finansial yang menanyakan data yang kurang.
    try {
      const ctx = await loadPlanContext(snap.monthlyExpense);
      const r = resolvePlanBasis(ctx.basisInput, {});
      // Pengeluaran nyata jauh di atas biaya tetap: skor dari biaya tetap saja terlalu optimistis dan pilihannya perlu konfirmasi (di halaman Kesehatan), jadi pakai skor asal.
      if (r.ok && snap.monthlyExpense - Math.max(0, r.fixedMonthly - ctx.basisInput.debtMonthly) < 100_000) return { snap: { ...snap, monthlyIncome: r.incomeMonthly, monthlyExpense: Math.max(0, r.fixedMonthly - ctx.basisInput.debtMonthly) }, debt };
    } catch { /* data rencana belum bisa dimuat */ }
    return { snap, debt };
  });
  cache = { at: Date.now(), p };
  p.catch(() => { cache = null; });
  return p;
}

/** Status kesehatan dengan rumus yang sama di semua halaman (lihat unifyHealth). Sebelum data siap, dipakai nilai asal. */
export function useUnifiedHealth(fh: FinancialHealth | undefined, refreshKey?: unknown): FinancialHealth | undefined {
  const [basis, setBasis] = React.useState<Basis | null>(null);
  React.useEffect(() => {
    let off = false;
    if (refreshKey !== undefined) cache = null;
    loadBasis().then((b) => { if (!off) setBasis(b); }).catch(() => {});
    return () => { off = true; };
  }, [refreshKey]);
  return React.useMemo(() => (fh ? unifyHealth(fh, basis?.snap ?? null, basis?.debt ?? 0) : fh), [fh, basis]);
}
