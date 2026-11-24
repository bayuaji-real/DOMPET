"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { getRecurringTransactions } from "@/lib/data/recurring";
import { getPaydaySchedules } from "@/lib/data/payday";
import { todayJakarta } from "@/lib/data/sample-mode";
import { buildReminders, reminderText, type Reminder } from "@/lib/konsultan/reminders";
import { formatRupiah } from "@/lib/utils";
import { PageHero } from "@/components/ui/form-kit";

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
        <PageHero emoji="⏰" title="Pengingat" desc="Tagihan dan gajian 14 hari ke depan." tone="amber" />
        <p className="text-sm text-muted-foreground">Tagihan dan gajian dalam 14 hari ke depan.</p>
        {err && <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">{err}</p>}
        {!items && !err && <div className="h-20 animate-pulse rounded-3xl bg-muted" aria-busy="true" />}
        {items && items.length === 0 && <p className="rounded-3xl border border-dashed border-border/70 p-5 text-center text-xs text-muted-foreground">Tidak ada tagihan atau gajian dekat-dekat ini. Atur tagihan rutin di <Link href="/berulang" className="underline">Transaksi Berulang</Link>.</p>}
        <ul className="space-y-2">{(items ?? []).map((r, i) => (
          <li key={i} className={`flex items-center gap-3 rounded-xl p-3 ring-1 ${r.daysLeft < 0 ? "ring-red-500/40" : "ring-foreground/10"}`}>
            <CalendarClock className={`size-5 ${r.kind === "gajian" ? "text-emerald-600" : "text-amber-600"}`} aria-hidden />
            <span className="flex-1 text-sm"><b>{r.label}</b><span className="block text-xs text-muted-foreground">{r.kind === "gajian" ? "Gajian" : "Tagihan"} · {reminderText(r)}</span></span>
            <b className="text-sm">{formatRupiah(r.amount)}</b>
          </li>))}</ul>
      </div>
    </div>
  );
}
