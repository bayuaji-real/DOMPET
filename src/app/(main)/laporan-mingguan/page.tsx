"use client";

import * as React from "react";
import { TopHeader } from "@/components/layout/top-header";
import { getFinanceSnapshot, type FinanceSnapshot } from "@/lib/data/finance-snapshot";
import { weeklyReport } from "@/lib/konsultan/weekly-report";
import { formatRupiah } from "@/lib/utils";

export default function LaporanMingguanPage() {
  const [s, setS] = React.useState<FinanceSnapshot | null>(null);
  const [err, setErr] = React.useState("");
  React.useEffect(() => { getFinanceSnapshot().then(setS).catch(() => setErr("Laporan belum bisa dimuat. Coba lagi sebentar.")); }, []);
  const r = s ? weeklyReport(s.txs, s.today) : null;
  return (
    <div className="pb-24">
      <TopHeader title="Laporan Mingguan" />
      <div className="space-y-3 px-4 pt-2">
        {err && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{err}</p>}
        {!s && !err && <div className="h-32 animate-pulse rounded-xl bg-muted" aria-busy="true" />}
        {r && s && (r.count === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Belum ada transaksi dalam 7 hari terakhir.</p> : (
          <>
            <p className="text-sm text-muted-foreground">7 hari terakhir sampai hari ini.</p>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Pemasukan</p><p className="font-semibold text-emerald-600">{formatRupiah(r.income)}</p></div>
              <div className="rounded-lg bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Pengeluaran</p><p className="font-semibold text-red-600">{formatRupiah(r.expense)}</p></div>
            </div>
            <p className="rounded-lg p-3 text-sm ring-1 ring-foreground/10">{r.expenseDeltaPct == null ? "Belum ada data minggu lalu untuk dibandingkan." : r.expenseDeltaPct > 0 ? `Pengeluaran naik ${Math.round(r.expenseDeltaPct)}% dibanding minggu lalu (${formatRupiah(r.prevExpense)}).` : r.expenseDeltaPct < 0 ? `Pengeluaran turun ${Math.round(Math.abs(r.expenseDeltaPct))}% dibanding minggu lalu (${formatRupiah(r.prevExpense)}).` : "Pengeluaran sama dengan minggu lalu."}</p>
            {r.topCategoryId && <p className="rounded-lg p-3 text-sm ring-1 ring-foreground/10">Pengeluaran terbesar: <b>{s.categoryNames[r.topCategoryId] ?? "Kategori lain"}</b> sebesar {formatRupiah(r.topCategoryAmount)}.</p>}
            <p className="text-sm">Sisa minggu ini: <b className={r.net < 0 ? "text-red-600" : ""}>{formatRupiah(r.net)}</b></p>
          </>
        ))}
      </div>
    </div>
  );
}
