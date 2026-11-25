"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { loadPlanContext, persistPlanAnswers, type PlanContext } from "@/lib/data/plan-basis";
import { resolvePlanBasis, type PlanHints, type PlanBasis } from "@/lib/savings-queue";
import { parseBasisAnswer } from "@/lib/savings-answer";
import type { FinanceSnapshot } from "@/lib/data/finance-snapshot";
import { formatRupiah } from "@/lib/utils";

type Ask = Extract<PlanBasis, { ok: false }>["ask"];

/**
 * Dasar hitung Money Planner untuk halaman yang butuh pemasukan dan pengeluaran bulanan (Kesehatan, Prediksi).
 * Pemasukan = gaji dari jadwal, pengeluaran = biaya hidup + tagihan + cicilan + komitmen rutin.
 * Bagian yang kosong ditanyakan; rata-rata hanya dipakai kalau pengguna memilihnya sendiri.
 */
export function MoneyBasisGate({ snap, children }: { snap: FinanceSnapshot; children: (s: FinanceSnapshot) => React.ReactNode }) {
  const [ctx, setCtx] = React.useState<PlanContext | null>(null);
  const [hints, setHints] = React.useState<PlanHints>({});
  const [incomeAvg, setIncomeAvg] = React.useState(false);
  const [text, setText] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const saved = React.useRef(false);

  React.useEffect(() => { loadPlanContext(snap.monthlyExpense).then(setCtx).catch(() => setMsg("Data rencanamu belum bisa dimuat.")); }, [snap.monthlyExpense]);

  const res = React.useMemo<PlanBasis | null>(() => {
    if (!ctx) return null;
    const b = { ...ctx.basisInput };
    if ((!b.payday || b.scheduleIncomeMonthly <= 0) && incomeAvg && snap.monthlyIncome > 0) {
      b.payday = { first: b.today, amount: Math.round(snap.monthlyIncome), frequency: "monthly" };
      b.scheduleIncomeMonthly = Math.round(snap.monthlyIncome);
    }
    return resolvePlanBasis(b, hints);
  }, [ctx, hints, incomeAvg, snap.monthlyIncome]);

  React.useEffect(() => {
    if (!res || !res.ok || saved.current) return;
    saved.current = true;
    persistPlanAnswers({
      newPayday: incomeAvg ? null : res.newPayday ? res.payday : null,
      livingMonthly: res.livingSource === "rencana" ? null : res.livingMonthly,
      otherFixedMonthly: res.otherFixedNew ? res.otherFixedMonthly : null,
    }).catch(() => {});
  }, [res, incomeAvg]);

  if (msg) return <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">{msg}</p>;
  if (!ctx || !res) return <div className="h-32 animate-pulse rounded-3xl bg-muted" aria-busy="true" />;

  if (res.ok) {
    const label = incomeAvg ? "Pemasukan dari rata-rata pilihanmu" : "Pemasukan dari gaji di Rencana";
    const living = res.livingSource === "rata-rata" ? "biaya hidup dari rata-rata pilihanmu" : "biaya hidup yang kamu isi";
    return <>{children({ ...snap, monthlyIncome: res.incomeMonthly, monthlyExpense: Math.max(0, res.fixedMonthly - ctx.basisInput.debtMonthly), basisNote: `${label}, ${living}, tagihan, cicilan, dan komitmen rutin` })}</>;
  }

  const ask: Ask = res.ask;
  const answer = (t: string) => {
    const h = parseBasisAnswer(ask, t, ask === "biaya_hidup" && ctx.basisInput.avgMonthlyExpense > 0);
    if (!h) { setMsg("Jawabannya belum terbaca. Tulis angkanya, misalnya 3 juta."); return; }
    setMsg(""); setText("");
    setHints((p) => ({ ...p, ...h }));
  };
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (text.trim()) answer(text.trim()); };

  return (
    <div className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
      <p className="text-sm font-semibold">{res.question}</p>
      <div className="flex flex-wrap gap-2">
        {ask === "gaji" && snap.monthlyIncome > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={() => setIncomeAvg(true)}>Pakai rata-rata pemasukan ({formatRupiah(snap.monthlyIncome)})</Button>
        )}
        {ask === "biaya_hidup" && ctx.basisInput.avgMonthlyExpense > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={() => setHints((p) => ({ ...p, living_use_average: true }))}>Pakai rata-rata ({formatRupiah(ctx.basisInput.avgMonthlyExpense)})</Button>
        )}
        {ask === "komitmen_rutin" && (
          <Button type="button" variant="outline" size="sm" onClick={() => setHints((p) => ({ ...p, other_fixed_monthly: 0 }))}>Tidak ada</Button>
        )}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} aria-label="Jawabanmu" placeholder="Tulis jawabanmu" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" />
        <Button type="submit" size="sm">Kirim</Button>
      </form>
      {msg && <p role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-300">{msg}</p>}
    </div>
  );
}
