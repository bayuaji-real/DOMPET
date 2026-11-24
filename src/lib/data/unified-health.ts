"use client";

import * as React from "react";
import { getFinanceSnapshot, type FinanceSnapshot } from "@/lib/data/finance-snapshot";
import { getDebts } from "@/lib/data/debts";
import { unifyHealth } from "@/lib/konsultan/health-score";
import type { FinancialHealth } from "@/types/analytics";

type Basis = { snap: FinanceSnapshot; debt: number };
let cache: { at: number; p: Promise<Basis> } | null = null;

function loadBasis(): Promise<Basis> {
  if (cache && Date.now() - cache.at < 30_000) return cache.p;
  const p = Promise.all([getFinanceSnapshot(), getDebts().catch(() => [])]).then(([snap, d]) => ({ snap, debt: d.reduce((x, r) => x + Number(r.min_payment), 0) }));
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
