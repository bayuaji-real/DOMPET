"use client";

import * as React from "react";
import { TopHeader } from "@/components/layout/top-header";
import { MoneyBasisGate } from "@/components/plan/money-basis-gate";
import { RubyAdvice } from "@/components/konsultan/ruby-advice";
import { formatRupiah } from "@/lib/utils";
import { Gate } from "@/components/plan/gate";
import { Skor } from "@/components/konsultan/panels";
import { getFinanceSnapshot, type FinanceSnapshot } from "@/lib/data/finance-snapshot";
import { PageHero } from "@/components/ui/form-kit";

export default function Page() {
  const [snap, setSnap] = React.useState<FinanceSnapshot | null>(null);
  const [err, setErr] = React.useState("");
  React.useEffect(() => { getFinanceSnapshot().then(setSnap).catch(() => setErr("Data keuanganmu belum bisa dimuat. Coba lagi sebentar.")); }, []);
  return (
    <div className="pb-24">
      <TopHeader title="Kesehatan Finansial" />
      <div className="space-y-4 px-4 pt-2">
        <PageHero title="Kesehatan Finansial" desc="Skor kondisi keuanganmu." />
        {err && <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">{err}</p>}
        <Gate feature="skor_kesehatan" redirect>
          {!snap && !err ? <div className="h-32 animate-pulse rounded-3xl bg-muted" aria-busy="true" /> : snap && <MoneyBasisGate snap={snap}>{(s) => <><Skor s={s} />{s.hasData && <RubyAdvice question={`Skor kesehatan finansialku di layar dihitung dari angka ini: pemasukan ${formatRupiah(s.monthlyIncome)} per bulan, pengeluaran ${formatRupiah(s.monthlyExpense)} per bulan (${s.basisNote ?? "dari rata-rata catatan"}), uang bebas pakai ${formatRupiah(s.freeCash ?? s.liquidSavings)}. Pakai angka ini, jangan bilang gaji belum diatur. Jelaskan artinya dan beri 3 saran singkat yang paling berpengaruh.`} />}</>}</MoneyBasisGate>}
        </Gate>
      </div>
    </div>
  );
}
