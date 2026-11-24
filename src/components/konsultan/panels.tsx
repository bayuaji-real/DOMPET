"use client";
import * as React from "react";
import { getDebts } from "@/lib/data/debts";
import { healthScore } from "@/lib/konsultan/health-score";
import { forecastCashflow } from "@/lib/konsultan/cashflow-forecast";
import { formatRupiah } from "@/lib/utils";
import type { FinanceSnapshot } from "@/lib/data/finance-snapshot";

export const Empty = () => <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Belum ada catatan 3 bulan terakhir. Catat beberapa transaksi dulu supaya hitungannya berarti.</p>;

export function Skor({ s }: { s: FinanceSnapshot }) {
  const [debt, setDebt] = React.useState(0);
  React.useEffect(() => { getDebts().then((d) => setDebt(d.reduce((x, r) => x + Number(r.min_payment), 0))).catch(() => {}); }, []);
  if (!s.hasData) return <Empty />;
  const r = healthScore({ monthlyIncome: s.monthlyIncome, monthlyExpense: s.monthlyExpense, liquidSavings: s.liquidSavings, monthlyDebtPayment: debt });
  const color = r.level === "sehat" ? "text-emerald-600" : r.level === "cukup" ? "text-amber-600" : "text-red-600";
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-muted/60 p-4 text-center">
        <p className={`text-5xl font-bold ${color}`} data-testid="skor-total">{r.total}</p>
        <p className="text-sm text-muted-foreground">dari 100 · kondisi {r.level}</p>
      </div>
      <ul className="space-y-2">
        {r.parts.map((p) => (
          <li key={p.key} className="rounded-lg p-3 ring-1 ring-foreground/10">
            <div className="flex justify-between text-sm font-medium"><span>{p.label}</span><span>{p.score}/{p.max}</span></div>
            <div className="mt-1 h-1.5 rounded bg-muted" role="progressbar" aria-valuenow={p.score} aria-valuemin={0} aria-valuemax={p.max} aria-label={p.label}><div className="h-full rounded bg-primary" style={{ width: `${(p.score / p.max) * 100}%` }} /></div>
            <p className="mt-1 text-xs text-muted-foreground">{p.tip}</p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Dihitung dari rata-rata 3 bulan terakhir: pemasukan {formatRupiah(s.monthlyIncome)}, pengeluaran {formatRupiah(s.monthlyExpense)}, uang tersedia {formatRupiah(s.liquidSavings)}. Cicilan utang dari menu Utang.</p>
    </div>
  );
}

export function Proyeksi({ s }: { s: FinanceSnapshot }) {
  if (!s.hasData) return <Empty />;
  const r = forecastCashflow({ startBalance: s.liquidSavings, monthlyIncome: s.monthlyIncome, avgMonthlyExpense: s.monthlyExpense, monthlyFixedBills: 0, months: 3 });
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Perkiraan saldo 3 bulan ke depan jika pemasukan dan pengeluaranmu mirip rata-rata 3 bulan terakhir. Ini tebakan berbasis pola, bukan kepastian.</p>
      {r.firstNegativeMonth ? <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">Saldo diperkirakan minus mulai bulan ke-{r.firstNegativeMonth}. Pertimbangkan menekan pengeluaran atau menambah pemasukan.</p> : <p className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">Saldo diperkirakan tetap positif 3 bulan ke depan.</p>}
      <ul className="space-y-1.5">{r.months.map((m) => (<li key={m.month} className="flex justify-between rounded-lg p-3 ring-1 ring-foreground/10 text-sm"><span>Bulan ke-{m.month}</span><span className={`font-semibold ${m.negative ? "text-red-600" : ""}`}>{formatRupiah(m.balance)}</span></li>))}</ul>
      <p className="text-xs text-muted-foreground">Saldo awal {formatRupiah(s.liquidSavings)} · pemasukan {formatRupiah(s.monthlyIncome)}/bulan · pengeluaran {formatRupiah(s.monthlyExpense)}/bulan.</p>
    </div>
  );
}
