"use client";

import * as React from "react";
import { TopHeader } from "@/components/layout/top-header";
import { getFinanceSnapshot, type FinanceSnapshot } from "@/lib/data/finance-snapshot";
import { weeklyReport } from "@/lib/konsultan/weekly-report";
import { formatRupiah } from "@/lib/utils";
import { PageHero } from "@/components/ui/form-kit";

export default function LaporanMingguanPage() {
  const [s, setS] = React.useState<FinanceSnapshot | null>(null);
  const [err, setErr] = React.useState("");
  React.useEffect(() => { getFinanceSnapshot().then(setS).catch(() => setErr("Laporan belum bisa dimuat. Coba lagi sebentar.")); }, []);
  const r = s ? weeklyReport(s.txs, s.today) : null;
  return (
    <div className="pb-24">
      <TopHeader title="Laporan Mingguan" />
      <div className="space-y-3 px-4 pt-2">
        <PageHero emoji="📊" title="Laporan Mingguan" desc="Ringkasan uangmu 7 hari terakhir." tone="teal" />
        {err && <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">{err}</p>}
        {!s && !err && <div className="h-32 animate-pulse rounded-3xl bg-muted" aria-busy="true" />}
        {r && s && (r.count === 0 ? <p className="rounded-3xl border border-dashed border-border/70 p-5 text-center text-xs text-muted-foreground">Belum ada transaksi dalam 7 hari terakhir.</p> : (
          <>
            <p className="text-sm text-muted-foreground">7 hari terakhir sampai hari ini.</p>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Pemasukan</p><p className="font-semibold text-emerald-600">{formatRupiah(r.income)}</p></div>
              <div className="rounded-2xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Pengeluaran</p><p className="font-semibold text-red-600">{formatRupiah(r.expense)}</p></div>
            </div>
            <p className="rounded-2xl p-3 text-sm border border-border/70 bg-card shadow-xs">{r.expenseDeltaPct == null ? "Belum ada data minggu lalu untuk dibandingkan." : r.expenseDeltaPct > 0 ? `Pengeluaran naik ${Math.round(r.expenseDeltaPct)}% dibanding minggu lalu (${formatRupiah(r.prevExpense)}).` : r.expenseDeltaPct < 0 ? `Pengeluaran turun ${Math.round(Math.abs(r.expenseDeltaPct))}% dibanding minggu lalu (${formatRupiah(r.prevExpense)}).` : "Pengeluaran sama dengan minggu lalu."}</p>
            {r.topCategoryId && <p className="rounded-2xl p-3 text-sm border border-border/70 bg-card shadow-xs">Pengeluaran terbesar: <b>{s.categoryNames[r.topCategoryId] ?? "Kategori lain"}</b> sebesar {formatRupiah(r.topCategoryAmount)}.</p>}
            <p className="text-sm">Sisa minggu ini: <b className={r.net < 0 ? "text-red-600" : ""}>{formatRupiah(r.net)}</b></p>
          </>
        ))}
      </div>
    </div>
  );
}
