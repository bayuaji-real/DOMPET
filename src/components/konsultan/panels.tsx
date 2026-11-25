"use client";
import * as React from "react";
import { getDebts } from "@/lib/data/debts";
import { healthScore, explainHealthParts } from "@/lib/konsultan/health-score";
import { forecastCashflow } from "@/lib/konsultan/cashflow-forecast";
import { formatRupiah } from "@/lib/utils";
import type { FinanceSnapshot } from "@/lib/data/finance-snapshot";
import { EmptyState, Notice, Pill, IconBox } from "@/components/ui/form-kit";

export const Empty = () => <EmptyState emoji="📝">Belum ada catatan 3 bulan terakhir. Catat beberapa transaksi dulu supaya hitungannya berarti.</EmptyState>;

export function Skor({ s }: { s: FinanceSnapshot }) {
  const [debt, setDebt] = React.useState(0);
  React.useEffect(() => { getDebts().then((d) => setDebt(d.reduce((x, r) => x + Number(r.min_payment), 0))).catch(() => {}); }, []);
  if (!s.hasData) return <Empty />;
  const r = healthScore({ monthlyIncome: s.monthlyIncome, monthlyExpense: s.monthlyExpense, liquidSavings: s.freeCash ?? s.liquidSavings, monthlyDebtPayment: debt });
  const ex = explainHealthParts({ monthlyIncome: s.monthlyIncome, monthlyExpense: s.monthlyExpense, liquidSavings: s.freeCash ?? s.liquidSavings, monthlyDebtPayment: debt }, r);
  const lvTone = r.level === "sehat" ? "neon" : r.level === "cukup" ? "amber" : "rose";
  const face = r.level === "sehat" ? "😄" : r.level === "cukup" ? "🙂" : "😟";
  const BAR = ["bg-teal-500", "bg-indigo-500", "bg-amber-500", "bg-sky-500", "bg-violet-500"];
  const EMO = ["💸", "🛟", "🏦", "🌊", "⭐"];
  const tone = (p: { score: number; max: number }) => (p.score / p.max >= 0.7 ? "neon" : p.score / p.max >= 0.4 ? "amber" : "rose") as "neon" | "amber" | "rose";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 items-stretch gap-2">
        <div className="col-span-2 flex flex-col items-center justify-center gap-1 rounded-3xl border border-border/80 bg-card p-3 text-center shadow-xs">
          <p className="text-3xl" aria-hidden>{face}</p>
          <p className="text-5xl font-extrabold tabular-nums" data-testid="skor-total">{r.total}</p>
          <p className="text-[11px] font-semibold text-muted-foreground">dari 100</p>
          <Pill tone={lvTone}>Kondisi {r.level}</Pill>
        </div>
        <ul className="col-span-3 grid auto-rows-fr gap-2">
          {r.parts.map((p, i) => (
            <li key={p.key} className="flex flex-col justify-center gap-1.5 rounded-2xl border border-border/70 bg-card px-2.5 py-2 shadow-xs">
              <div className="flex items-center justify-between gap-1.5">
                <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-extrabold leading-tight"><span aria-hidden className="text-sm leading-none">{EMO[i % EMO.length]}</span><span className="truncate">{p.label}</span></span>
                <Pill tone={tone(p)} className="shrink-0 px-1.5 text-[10px]">{p.score}/{p.max}</Pill>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={p.score} aria-valuemin={0} aria-valuemax={p.max} aria-label={p.label}><div className={`h-full rounded-full ${BAR[i % BAR.length]}`} style={{ width: `${(p.score / p.max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      </div>
      <ul className="space-y-1.5">
        {ex.items.map((x, i) => (
          <li key={x.key} className="flex items-start gap-2 rounded-2xl border border-border/70 bg-card p-2.5 text-[11px] shadow-xs"><span aria-hidden className="text-sm leading-none">{EMO[i % EMO.length]}</span><span className="min-w-0"><b className="block text-xs font-extrabold">{x.label} ({x.score}/{x.max})</b><span className="mt-0.5 block leading-relaxed text-muted-foreground">{x.text}</span>{x.action && <span className="mt-1 block leading-relaxed"><b className="font-extrabold text-teal-700 dark:text-teal-300">Langkahnya:</b> {x.action}</span>}</span></li>
        ))}
        <li className="flex items-start gap-2 rounded-2xl border border-teal-500/30 bg-teal-500/10 p-2.5 text-[11px] shadow-xs"><span aria-hidden className="text-sm leading-none">🎯</span><span className="leading-relaxed font-semibold">{ex.closing}</span></li>
      </ul>
      <p className="px-1 text-[10px] text-muted-foreground">Dihitung dari angka keuanganmu, bukan dari AI. Bukan nasihat keuangan profesional.</p>
    </div>
  );
}

export function Proyeksi({ s }: { s: FinanceSnapshot }) {
  if (!s.hasData) return <Empty />;
  const r = forecastCashflow({ startBalance: s.liquidSavings, monthlyIncome: s.monthlyIncome, avgMonthlyExpense: s.monthlyExpense, monthlyFixedBills: 0, months: 3 });
  return (
    <div className="space-y-3">
      <Notice tone="sky" emoji="🔮">Perkiraan 3 bulan ke depan, kalau pemasukan {formatRupiah(s.monthlyIncome)} dan pengeluaran {formatRupiah(s.monthlyExpense)} per bulan berlanjut seperti sekarang. Ini tebakan berbasis pola, bukan kepastian.</Notice>
      {r.firstNegativeMonth ? <Notice tone="rose" emoji="🚨" role="alert">Saldo diperkirakan minus mulai bulan ke-{r.firstNegativeMonth}. Pertimbangkan menekan pengeluaran atau menambah pemasukan.</Notice> : <Notice tone="emerald" emoji="✅">Saldo diperkirakan tetap positif 3 bulan ke depan.</Notice>}
      <Notice tone="sky" emoji="🎯">{r.firstNegativeMonth ? (s.monthlyExpense > s.monthlyIncome ? `Langkahnya: kurangi pengeluaran minimal ${formatRupiah(Math.ceil(s.monthlyExpense - s.monthlyIncome))} per bulan supaya saldo tidak minus.` : "Langkahnya: tambah saldo awal atau tunda pengeluaran besar supaya saldo tidak minus.") : s.monthlyIncome - s.monthlyExpense > 0 ? `Langkahnya: sisihkan sekitar ${formatRupiah(Math.floor((s.monthlyIncome - s.monthlyExpense) / 2 / 1000) * 1000)} per bulan ke tabungan, dalam 3 bulan terkumpul ${formatRupiah(Math.floor((s.monthlyIncome - s.monthlyExpense) / 2 / 1000) * 3000)}. Sisanya untuk kebutuhan tak terduga.` : "Langkahnya: pertahankan pengeluaran supaya saldo tidak berkurang."}</Notice>
      <ul className="space-y-1.5">{r.months.map((m) => (<li key={m.month} className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card p-3 text-sm shadow-xs"><span className="flex items-center gap-2"><IconBox tone={m.negative ? "rose" : "neon"} className="size-8 rounded-xl text-sm">{m.negative ? "📉" : "📈"}</IconBox>Bulan ke-{m.month}</span><Pill tone={m.negative ? "rose" : "neon"}>{formatRupiah(m.balance)}</Pill></li>))}</ul>
      <p className="px-1 text-[11px] text-muted-foreground">Saldo awal {formatRupiah(s.liquidSavings)} · pemasukan {formatRupiah(s.monthlyIncome)}/bulan · pengeluaran {formatRupiah(s.monthlyExpense)}/bulan.</p>
    </div>
  );
}
