"use client";

import { PageGate } from "@/components/plan/gate";
import { GuidedChat } from "@/components/ai/guided-chat";
import { DANA_DARURAT } from "@/lib/konsultan/guided";
import { getFinanceSnapshot } from "@/lib/data/finance-snapshot";
import { getSavingsGoals } from "@/lib/data/goals";
import { formatRupiah } from "@/lib/utils";

async function prefill() {
  const [snap, goals] = await Promise.all([getFinanceSnapshot(), getSavingsGoals()]);
  const em = goals.filter((g) => (g.is_emergency_fund || /darurat/i.test(g.name)) && g.status !== "dibatalkan");
  const cur = em.reduce((s, g) => s + Number(g.saved ?? 0), 0);
  if (!(snap.monthlyExpense > 0) && cur <= 0) return null;
  return { label: `pengeluaran rata-rata ${formatRupiah(Math.round(snap.monthlyExpense))} per bulan, dana darurat di Tabungan ${formatRupiah(Math.round(cur))}`, values: { exp: Math.round(snap.monthlyExpense), cur: Math.round(cur) } };
}

export default function Page() {
  return <PageGate feature="dana_darurat" title="Dana daruratku"><GuidedChat flow={DANA_DARURAT} prefill={prefill} /></PageGate>;
}
