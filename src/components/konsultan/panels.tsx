"use client";
import * as React from "react";
import { getDebts } from "@/lib/data/debts";
import { healthScore } from "@/lib/konsultan/health-score";
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
  const hero = r.level === "sehat" ? "from-emerald-800 via-emerald-600 to-lime-300" : r.level === "cukup" ? "from-amber-700 via-amber-500 to-yellow-300" : "from-rose-800 via-rose-600 to-pink-300";
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
            <div className="flex items-center justify-between gap-2 text-sm font-extrabold"><span className="flex items-center gap-2"><span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-xl bg-muted text-sm">{EMO[i % EMO.length]}</span>{p.label}</span><Pill tone={p.score / p.max >= 0.7 ? "neon" : p.score / p.max >= 0.4 ? "amber" : "rose"}>{p.score}/{p.max}</Pill></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={p.score} aria-valuemin={0} aria-valuemax={p.max} aria-label={p.label}><div className={`h-full rounded-full ${BAR[i % BAR.length]}`} style={{ width: `${(p.score / p.max) * 100}%` }} /></div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{p.tip}</p>
          </li>
        ))}
      </ul>
      <Notice tone="sky" emoji="🧮">Dihitung dari rata-rata {s.monthsCovered ?? 3} bulan data: pemasukan {formatRupiah(s.monthlyIncome)}, pengeluaran {formatRupiah(s.monthlyExpense)}, uang bebas pakai {formatRupiah(s.freeCash ?? s.liquidSavings)} (di luar dompet tabungan dan investasi). Cicilan utang dari menu Utang.</Notice>
    </div>
  );
}

export function Proyeksi({ s }: { s: FinanceSnapshot }) {
  if (!s.hasData) return <Empty />;
  const r = forecastCashflow({ startBalance: s.liquidSavings, monthlyIncome: s.monthlyIncome, avgMonthlyExpense: s.monthlyExpense, monthlyFixedBills: 0, months: 3 });
  return (
    <div className="space-y-3">
      <Notice tone="sky" emoji="🔮">Perkiraan saldo 3 bulan ke depan jika pemasukan dan pengeluaranmu mirip rata-rata {s.monthsCovered ?? 3} bulan data. Gaji terjadwal dan tagihan rutin yang belum tercatat belum ikut dihitung. Ini tebakan berbasis pola, bukan kepastian.</Notice>
      {r.firstNegativeMonth ? <Notice tone="rose" emoji="🚨" role="alert">Saldo diperkirakan minus mulai bulan ke-{r.firstNegativeMonth}. Pertimbangkan menekan pengeluaran atau menambah pemasukan.</Notice> : <Notice tone="emerald" emoji="✅">Saldo diperkirakan tetap positif 3 bulan ke depan.</Notice>}
      <ul className="space-y-1.5">{r.months.map((m) => (<li key={m.month} className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card p-3 text-sm shadow-xs"><span className="flex items-center gap-2"><IconBox tone={m.negative ? "rose" : "neon"} className="size-8 rounded-xl text-sm">{m.negative ? "📉" : "📈"}</IconBox>Bulan ke-{m.month}</span><Pill tone={m.negative ? "rose" : "neon"}>{formatRupiah(m.balance)}</Pill></li>))}</ul>
      <p className="px-1 text-[11px] text-muted-foreground">Saldo awal {formatRupiah(s.liquidSavings)} · pemasukan {formatRupiah(s.monthlyIncome)}/bulan · pengeluaran {formatRupiah(s.monthlyExpense)}/bulan.</p>
    </div>
  );
}
