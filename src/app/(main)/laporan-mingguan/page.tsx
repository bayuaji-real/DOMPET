"use client";

import * as React from "react";
import { TopHeader } from "@/components/layout/top-header";
import { getFinanceSnapshot, type FinanceSnapshot } from "@/lib/data/finance-snapshot";
import { weeklyReport } from "@/lib/konsultan/weekly-report";
import { formatRupiah } from "@/lib/utils";
import { PageHero, Stat, Pill, Notice, EmptyState } from "@/components/ui/form-kit";

export default function LaporanMingguanPage() {
  const [s, setS] = React.useState<FinanceSnapshot | null>(null);
  const [err, setErr] = React.useState("");
  React.useEffect(() => { getFinanceSnapshot().then(setS).catch(() => setErr("Laporan belum bisa dimuat. Coba lagi sebentar.")); }, []);
  const r = s ? weeklyReport(s.txs, s.today) : null;
  return (
    <div className="pb-24">
      <TopHeader title="Laporan Mingguan" />
      <div className="space-y-3 px-4 pt-2">
        <PageHero title="Laporan Mingguan" desc="Ringkasan uangmu 7 hari terakhir." />
        {err && <Notice tone="rose" emoji="⚠️" role="alert">{err}</Notice>}
        {!s && !err && <div className="h-32 animate-pulse rounded-3xl bg-muted" aria-busy="true" />}
        {r && s && (r.count === 0 ? <EmptyState emoji="🗓️">Belum ada transaksi dalam 7 hari terakhir.</EmptyState> : (
          <>
            <Pill icon="📆">7 hari terakhir sampai hari ini</Pill>
            <div className="grid grid-cols-2 gap-2">
              <Stat icon="⬇️" tone="neon" label="Pemasukan" value={formatRupiah(r.income)} valueClass="text-emerald-600 dark:text-emerald-400" />
              <Stat icon="⬆️" tone="rose" label="Pengeluaran" value={formatRupiah(r.expense)} valueClass="text-rose-600 dark:text-rose-400" />
            </div>
            <Notice tone={r.expenseDeltaPct != null && r.expenseDeltaPct > 0 ? "amber" : "emerald"} emoji={r.expenseDeltaPct != null && r.expenseDeltaPct > 0 ? "📈" : "📉"}>{r.expenseDeltaPct == null ? "Belum ada data minggu lalu untuk dibandingkan." : r.expenseDeltaPct > 0 ? `Pengeluaran naik ${Math.round(r.expenseDeltaPct)}% dibanding minggu lalu (${formatRupiah(r.prevExpense)}).` : r.expenseDeltaPct < 0 ? `Pengeluaran turun ${Math.round(Math.abs(r.expenseDeltaPct))}% dibanding minggu lalu (${formatRupiah(r.prevExpense)}).` : "Pengeluaran sama dengan minggu lalu."}</Notice>
            {r.topCategoryId && <Stat icon="🏆" tone="amber" label="Pengeluaran terbesar" value={<>{s.categoryNames[r.topCategoryId] ?? "Kategori lain"} · {formatRupiah(r.topCategoryAmount)}</>} />}
            <Stat icon="💰" tone={r.net < 0 ? "rose" : "neon"} label="Sisa minggu ini" value={formatRupiah(r.net)} valueClass={r.net < 0 ? "text-rose-600 dark:text-rose-400" : ""} />
          </>
        ))}
      </div>
    </div>
  );
}
