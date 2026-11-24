"use client";
import * as React from "react";
import { getDebts } from "@/lib/data/debts";
import { healthScore } from "@/lib/konsultan/health-score";
import { forecastCashflow } from "@/lib/konsultan/cashflow-forecast";
import { formatRupiah } from "@/lib/utils";
import type { FinanceSnapshot } from "@/lib/data/finance-snapshot";

export const Empty = () => <p className="rounded-3xl border border-dashed border-border/70 p-5 text-center text-xs text-muted-foreground">Belum ada catatan 3 bulan terakhir. Catat beberapa transaksi dulu supaya hitungannya berarti.</p>;

export function Skor({ s }: { s: FinanceSnapshot }) {
  const [debt, setDebt] = React.useState(0);
  React.useEffect(() => { getDebts().then((d) => setDebt(d.reduce((x, r) => x + Number(r.min_payment), 0))).catch(() => {}); }, []);
  if (!s.hasData) return <Empty />;
  const r = healthScore({ monthlyIncome: s.monthlyIncome, monthlyExpense: s.monthlyExpense, liquidSavings: s.freeCash ?? s.liquidSavings, monthlyDebtPayment: debt });
  const hero = r.level === "sehat" ? "from-emerald-600 via-emerald-800 to-slate-950" : r.level === "cukup" ? "from-amber-500 via-amber-700 to-slate-950" : "from-rose-600 via-rose-800 to-slate-950";
  const face = r.level === "sehat" ? "😄" : r.level === "cukup" ? "🙂" : "😟";
  const BAR = ["bg-teal-500", "bg-indigo-500", "bg-amber-500", "bg-sky-500", "bg-violet-500"];
  const EMO = ["💸", "🛟", "🏦", "🌊", "⭐"];
  return (
    <div className="space-y-3">
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${hero} p-5 text-center text-white shadow-lg`}>
        <span aria-hidden className="absolute -right-3 -top-4 text-8xl opacity-15">{face}</span>
        <p className="text-4xl" aria-hidden>{face}</p>
        <p className="mt-1 text-5xl font-extrabold" data-testid="skor-total">{r.total}</p>
        <p className="text-xs font-semibold text-white/80">dari 100 · kondisi {r.level}</p>
      </div>
      <ul className="space-y-2">
        {r.parts.map((p, i) => (
          <li key={p.key} className="rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
            <div className="flex items-center justify-between gap-2 text-sm font-extrabold"><span className="flex items-center gap-2"><span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-xl bg-muted text-sm">{EMO[i % EMO.length]}</span>{p.label}</span><span className="text-xs">{p.score}/{p.max}</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={p.score} aria-valuemin={0} aria-valuemax={p.max} aria-label={p.label}><div className={`h-full rounded-full ${BAR[i % BAR.length]}`} style={{ width: `${(p.score / p.max) * 100}%` }} /></div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{p.tip}</p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Dihitung dari rata-rata {s.monthsCovered ?? 3} bulan data: pemasukan {formatRupiah(s.monthlyIncome)}, pengeluaran {formatRupiah(s.monthlyExpense)}, uang bebas pakai {formatRupiah(s.freeCash ?? s.liquidSavings)} (di luar dompet tabungan dan investasi). Cicilan utang dari menu Utang.</p>
    </div>
  );
}

export function Proyeksi({ s }: { s: FinanceSnapshot }) {
  if (!s.hasData) return <Empty />;
  const r = forecastCashflow({ startBalance: s.liquidSavings, monthlyIncome: s.monthlyIncome, avgMonthlyExpense: s.monthlyExpense, monthlyFixedBills: 0, months: 3 });
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Perkiraan saldo 3 bulan ke depan jika pemasukan dan pengeluaranmu mirip rata-rata {s.monthsCovered ?? 3} bulan data. Gaji terjadwal dan tagihan rutin yang belum tercatat belum ikut dihitung. Ini tebakan berbasis pola, bukan kepastian.</p>
      {r.firstNegativeMonth ? <p role="alert" className="rounded-2xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300">Saldo diperkirakan minus mulai bulan ke-{r.firstNegativeMonth}. Pertimbangkan menekan pengeluaran atau menambah pemasukan.</p> : <p className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">Saldo diperkirakan tetap positif 3 bulan ke depan.</p>}
      <ul className="space-y-1.5">{r.months.map((m) => (<li key={m.month} className="flex justify-between rounded-2xl p-3 border border-border/70 bg-card shadow-xs text-sm"><span>Bulan ke-{m.month}</span><span className={`font-semibold ${m.negative ? "text-red-600" : ""}`}>{formatRupiah(m.balance)}</span></li>))}</ul>
      <p className="text-xs text-muted-foreground">Saldo awal {formatRupiah(s.liquidSavings)} · pemasukan {formatRupiah(s.monthlyIncome)}/bulan · pengeluaran {formatRupiah(s.monthlyExpense)}/bulan.</p>
    </div>
  );
}
