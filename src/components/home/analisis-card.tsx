"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, PieChart } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import type { AnalyticsData, HealthStatus } from "@/types/analytics";

const STATUS: Record<HealthStatus, { label: string; cls: string }> = {
  sehat: { label: "Sehat", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  waspada: { label: "Waspada", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  kritis: { label: "Kritis", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
};

/** Ringkasan garis besar analisis bulan ini. Detail lengkap ada di halaman Analisis. */
export function AnalisisCard() {
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [hide, setHide] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    try {
      setHide(localStorage.getItem("dompet_hide_balance") === "true");
    } catch {}
    const load = async () => {
      try {
        const res = await fetch("/api/analytics?period=month");
        const json = await res.json();
        if (cancelled) return;
        if (json.success && json.data) {
          setData(json.data);
          setFailed(false);
        } else setFailed(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    load();
    window.addEventListener("transaction_created", load);
    return () => {
      cancelled = true;
      window.removeEventListener("transaction_created", load);
    };
  }, []);

  const money = (n: number) => (hide ? "••••••" : formatRupiah(n, { absolute: true }));
  const s = data?.summary;
  const health = data?.financialHealth;
  const top = data?.categories?.[0];
  const hasData = !!s && (s.totalIncome > 0 || s.totalExpense > 0);
  const total = s ? s.totalIncome + s.totalExpense : 0;
  const incomePct = total > 0 && s ? (s.totalIncome / total) * 100 : 0;

  return (
    <section aria-labelledby="ringkas-analisis" className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
            <PieChart className="h-4 w-4" />
          </span>
          <div>
            <h3 id="ringkas-analisis" className="text-sm font-extrabold leading-tight text-foreground">
              Analisis Keuangan
            </h3>
            <p className="text-[11px] text-muted-foreground">{data?.period.label ?? "Bulan ini"}</p>
          </div>
        </div>
        {health && (
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS[health.overallStatus].cls}`}>
            {STATUS[health.overallStatus].label}
          </span>
        )}
      </div>

      {!data && !failed && <div className="h-20 animate-pulse rounded-2xl bg-muted/50" aria-label="Memuat analisis" />}
      {failed && <p className="text-xs text-muted-foreground">Analisis belum bisa dimuat. Coba buka detailnya.</p>}

      {data && s && (
        <>
          {hasData ? (
            <>
              <div className="h-2 overflow-hidden rounded-full bg-rose-500/30" role="img" aria-label="Perbandingan pemasukan dan pengeluaran">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${incomePct}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground">Masuk</p>
                  <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{money(s.totalIncome)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Keluar</p>
                  <p className="text-xs font-extrabold text-rose-600 dark:text-rose-400">{money(s.totalExpense)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Menabung</p>
                  <p className="text-xs font-extrabold text-foreground">{Math.round(s.savingsRate)}%</p>
                </div>
              </div>
              {top && (
                <p className="text-[11px] text-muted-foreground">
                  Pengeluaran terbesar: <b className="text-foreground">{top.name}</b> ({Math.round(top.percentage)}%)
                </p>
              )}
            </>
          ) : (
            <p className="rounded-2xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">
              Belum ada transaksi bulan ini. Catat transaksi pertamamu untuk melihat ringkasan.
            </p>
          )}
        </>
      )}

      <Link
        href="/analisis"
        className="flex items-center justify-center gap-1 rounded-xl border border-border/70 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted/50"
      >
        Lihat detail analisis <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
