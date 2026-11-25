"use client";

import * as React from "react";
import Link from "next/link";
import { getMasterView, type MasterView } from "@/lib/data/limits";
import { formatRupiah } from "@/lib/utils";
import type { Level } from "@/lib/konsultan/spend-limit";

const rp = (n: number) => formatRupiah(Math.round(n));
const RING: Record<Level, string> = { aman: "stroke-emerald-500", hampir: "stroke-amber-500", lewat: "stroke-rose-500" };
const BAR: Record<Level, string> = { aman: "bg-emerald-500", hampir: "bg-amber-500", lewat: "bg-rose-500" };

/**
 * Lingkaran kuota pengeluaran hari ini + pengingat utang batas. Tersembunyi kalau pengguna belum
 * mengaktifkan batas pengeluaran (batas aktif tanpa kategori).
 */
export function DailyQuotaCard() {
  const [v, setV] = React.useState<MasterView | null>(null);
  React.useEffect(() => {
    const load = () => { getMasterView().then(setV).catch(() => setV(null)); };
    load();
    window.addEventListener("transaction_created", load);
    return () => window.removeEventListener("transaction_created", load);
  }, []);
  if (!v) return null;

  const { debt, statuses } = v;
  const cap = debt.available; // jatah hari ini setelah dipotong utang
  const used = debt.spentToday;
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : used > 0 || debt.debtIn > 0 ? 100 : 0;
  const level: Level = used > cap || (cap === 0 && debt.debtIn > 0) ? "lewat" : pct >= v.limit.warn_pct ? "hampir" : "aman";
  const R = 34, C = 2 * Math.PI * R;
  const sisa = Math.max(0, cap - used);

  return (
    <section aria-label="Kuota pengeluaran hari ini" className="space-y-2">
      <Link href="/batas-pengeluaran" className="flex items-center gap-4 rounded-3xl border border-border/70 bg-card p-4 shadow-xs transition-all active:scale-[0.99]">
        <div className="relative size-24 shrink-0" role="img" aria-label={`Terpakai ${pct} persen dari jatah hari ini`}>
          <svg viewBox="0 0 80 80" className="size-full -rotate-90">
            <circle cx="40" cy="40" r={R} fill="none" strokeWidth="8" className="stroke-muted" />
            <circle cx="40" cy="40" r={R} fill="none" strokeWidth="8" strokeLinecap="round" className={RING[level]} strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
            <span className="text-base font-extrabold">{pct}%</span>
            <span className="text-[9px] font-semibold text-muted-foreground">terpakai</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Jatah hari ini</p>
            <p className="text-lg font-extrabold leading-tight">{level === "lewat" && used > cap ? `Lebih ${rp(used - cap)}` : `Sisa ${rp(sisa)}`}</p>
            <p className="text-[11px] text-muted-foreground">Terpakai {rp(used)} dari {rp(cap)}{debt.debtIn > 0 ? ` (jatah ${rp(debt.allowance)} dipotong utang batas)` : ""}</p>
          </div>
          {(["mingguan", "bulanan"] as const).map((p) => {
            const s = statuses[p];
            return (
              <div key={p} className="space-y-0.5">
                <div className="flex justify-between text-[10px] font-semibold text-muted-foreground"><span>{p === "mingguan" ? "Minggu ini" : "Bulan ini"}</span><span>{rp(s.spent)} / {rp(s.limit.amount)}</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${BAR[s.level]}`} style={{ width: `${Math.min(100, s.pct)}%` }} /></div>
              </div>
            );
          })}
        </div>
      </Link>
      {debt.debtAfterToday > 0 && (
        <Link href="/batas-pengeluaran" role="status" className="flex items-start gap-2 rounded-2xl border border-amber-400/50 bg-amber-500/10 p-3 text-xs font-semibold text-amber-800 transition-all active:scale-[0.98] dark:text-amber-300">
          <span aria-hidden className="text-base leading-none">🧾</span>
          <span>
            Utang batas {rp(debt.debtAfterToday)}: kelebihan dari batas harianmu yang terbawa. Besok jatahmu {rp(Math.max(0, debt.allowance - debt.debtAfterToday))}
            {debt.daysToClear ? `. Bayar dengan hemat, paling cepat lunas ${debt.daysToClear} hari lagi kalau tidak belanja.` : "."}
          </span>
        </Link>
      )}
    </section>
  );
}
