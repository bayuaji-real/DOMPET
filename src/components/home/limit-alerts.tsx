"use client";

import * as React from "react";
import Link from "next/link";
import { getLimitStatuses } from "@/lib/data/limits";
import { limitMessage, type Status } from "@/lib/konsultan/spend-limit";
import { formatRupiah } from "@/lib/utils";

/** Peringatan batas pengeluaran di beranda. Tidak tampil kalau semua aman atau belum ada batas. */
export function LimitAlerts() {
  const [list, setList] = React.useState<Status[]>([]);
  React.useEffect(() => {
    const load = () => { getLimitStatuses().then(setList).catch(() => setList([])); };
    load();
    window.addEventListener("transaction_created", load);
    return () => window.removeEventListener("transaction_created", load);
  }, []);
  const warn = list.filter((s) => s.level !== "aman");
  if (warn.length === 0) return null;
  return (
    <section aria-label="Peringatan batas pengeluaran" className="space-y-2">
      {warn.map((s) => (
        <Link key={s.limit.id} href="/batas-pengeluaran" role="alert" className={`block rounded-2xl p-3 text-xs font-medium ${s.level === "lewat" ? "bg-red-500/10 text-red-700 dark:text-red-300" : "bg-amber-500/10 text-amber-800 dark:text-amber-300"}`}>
          {limitMessage(s, (n) => formatRupiah(Math.round(n)))}
        </Link>
      ))}
    </section>
  );
}
