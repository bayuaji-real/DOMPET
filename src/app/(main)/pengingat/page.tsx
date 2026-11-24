"use client";

import * as React from "react";
import Link from "next/link";
import { TopHeader } from "@/components/layout/top-header";
import { getRecurringTransactions } from "@/lib/data/recurring";
import { getPaydaySchedules } from "@/lib/data/payday";
import { todayJakarta } from "@/lib/data/sample-mode";
import { buildReminders, reminderText, type Reminder } from "@/lib/konsultan/reminders";
import { formatRupiah } from "@/lib/utils";
import { PageHero, IconBox, Pill, Notice, EmptyState } from "@/components/ui/form-kit";

export default function PengingatPage() {
  const [items, setItems] = React.useState<Reminder[] | null>(null);
  const [err, setErr] = React.useState("");
  React.useEffect(() => {
    Promise.all([getRecurringTransactions(), getPaydaySchedules(10)])
      .then(([r, p]) => setItems(buildReminders(todayJakarta(), r, p, 14)))
      .catch(() => setErr("Pengingat belum bisa dimuat. Coba lagi sebentar."));
  }, []);
  return (
    <div className="pb-24">
      <TopHeader title="Pengingat" />
      <div className="space-y-3 px-4 pt-2">
        <PageHero title="Pengingat" desc="Tagihan dan gajian 14 hari ke depan." />
        {err && <Notice tone="rose" emoji="⚠️" role="alert">{err}</Notice>}
        {!items && !err && <div className="h-20 animate-pulse rounded-3xl bg-muted" aria-busy="true" />}
        {items && items.length === 0 && <EmptyState emoji="🌤️">Tidak ada tagihan atau gajian dekat-dekat ini. Atur tagihan rutin di <Link href="/berulang" className="font-bold text-emerald-600 underline">Transaksi Berulang</Link>.</EmptyState>}
        <ul className="space-y-2">{(items ?? []).map((r, i) => (
          <li key={i} className={`flex items-center gap-3 rounded-3xl border bg-card p-3.5 shadow-xs ${r.daysLeft < 0 ? "border-rose-400/60" : "border-border/80"}`}>
            <IconBox tone={r.kind === "gajian" ? "neon" : "amber"}>{r.kind === "gajian" ? "💵" : "🧾"}</IconBox>
            <span className="min-w-0 flex-1 text-sm"><b className="block truncate">{r.label}</b>
              <span className="mt-1 flex flex-wrap gap-1"><Pill tone={r.kind === "gajian" ? "neon" : "amber"}>{r.kind === "gajian" ? "Gajian" : "Tagihan"}</Pill><Pill tone={r.daysLeft < 0 ? "rose" : "slate"} icon="⏰">{reminderText(r)}</Pill></span></span>
            <b className="shrink-0 text-sm tabular-nums">{formatRupiah(r.amount)}</b>
          </li>))}</ul>
      </div>
    </div>
  );
}
