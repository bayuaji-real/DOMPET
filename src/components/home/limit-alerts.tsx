"use client";

import * as React from "react";
import Link from "next/link";
import { getLimitsWithDebt, type LimitWithDebt } from "@/lib/data/limits";
import { limitAlert } from "@/lib/konsultan/spend-limit";
import { formatRupiah } from "@/lib/utils";

/** Peringatan batas pengeluaran di beranda. Tidak tampil kalau semua aman atau belum ada batas. */
export function LimitAlerts() {
  const [list, setList] = React.useState<LimitWithDebt[]>([]);
  React.useEffect(() => {
    const load = () => { getLimitsWithDebt().then(setList).catch(() => setList([])); };
    load();
    window.addEventListener("transaction_created", load);
    return () => window.removeEventListener("transaction_created", load);
  }, []);
  // Batas utama sudah tampil di kartu kuota, jangan diperingatkan dua kali.
  const fmt = (n: number) => formatRupiah(Math.round(n));
  const warn = list.filter((x) => !x.isMaster).map((x) => ({ id: x.status.limit.id, ...limitAlert(x.status, x.debt, fmt) })).filter((x) => x.level !== "aman" && x.msg);
  if (warn.length === 0) return null;
  return (
    <section aria-label="Peringatan batas pengeluaran" className="space-y-2">
      {warn.map((s) => (
        <Link key={s.id} href="/batas-pengeluaran" role="alert" className={`flex items-start gap-2 rounded-2xl border p-3 text-xs font-semibold transition-all active:scale-[0.98] ${s.level === "lewat" ? "border-rose-400/50 bg-rose-500/10 text-rose-700 dark:text-rose-300" : "border-amber-400/50 bg-amber-500/10 text-amber-800 dark:text-amber-300"}`}>
          <span aria-hidden className="text-base leading-none">{s.level === "lewat" ? "🚨" : "⚠️"}</span><span>{s.msg}</span>
        </Link>
      ))}
    </section>
  );
}
