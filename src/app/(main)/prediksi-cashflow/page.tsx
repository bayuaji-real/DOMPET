"use client";

import * as React from "react";
import { TopHeader } from "@/components/layout/top-header";
import { Disclaimer } from "@/components/plan/disclaimer";
import { Gate } from "@/components/plan/gate";
import { Proyeksi } from "@/components/konsultan/panels";
import { getFinanceSnapshot, type FinanceSnapshot } from "@/lib/data/finance-snapshot";
import { PageHero } from "@/components/ui/form-kit";

export default function Page() {
  const [snap, setSnap] = React.useState<FinanceSnapshot | null>(null);
  const [err, setErr] = React.useState("");
  React.useEffect(() => { getFinanceSnapshot().then(setSnap).catch(() => setErr("Data keuanganmu belum bisa dimuat. Coba lagi sebentar.")); }, []);
  return (
    <div className="pb-24">
      <TopHeader title="Prediksi Cashflow" />
      <div className="space-y-4 px-4 pt-2">
        <PageHero title="Prediksi Cashflow" desc="Perkiraan saldo 3 bulan ke depan." />
        <Disclaimer />
        {err && <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">{err}</p>}
        <Gate feature="proyeksi_arus_kas">
          {!snap && !err ? <div className="h-32 animate-pulse rounded-3xl bg-muted" aria-busy="true" /> : snap && <Proyeksi s={snap} />}
        </Gate>
      </div>
    </div>
  );
}
