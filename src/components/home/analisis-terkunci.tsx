"use client";
import Link from "next/link";
import { ProBadge } from "@/components/plan/pro-badge";

/**
 * Kartu Analisis untuk Basic: tampil buram dengan data TIRUAN (data asli tidak dibaca sama sekali).
 * Ketuk membuka halaman Paket. Keputusan Owner poin 9 dan 12.
 */
export function AnalisisTerkunci() {
  return (
    <Link
      href="/paket"
      aria-label="Analisis Keuangan, fitur Pro terkunci. Ketuk untuk melihat paket"
      className="relative block overflow-hidden rounded-3xl border border-border/70 bg-card p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 text-sm">📊</span>
          <div>
            <h3 className="text-sm font-extrabold leading-tight text-foreground">Analisis Keuangan</h3>
            <p className="text-[11px] text-muted-foreground">Arus kas, kategori, dan insight Ruby</p>
          </div>
        </div>
        <ProBadge locked />
      </div>
      <div aria-hidden className="mt-3 select-none blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-24 w-24 shrink-0 rounded-full border-[14px] border-teal-500/60 border-r-amber-400/70 border-t-violet-500/60" />
          <ul className="min-w-0 flex-1 space-y-1.5 text-[11px] font-semibold text-muted-foreground">
            <li>Makan 35%</li>
            <li>Transportasi 22%</li>
            <li>Belanja 18%</li>
            <li>Lainnya 25%</li>
          </ul>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold">
          <div className="rounded-2xl bg-emerald-500/10 p-2">Masuk Rp0.000.000</div>
          <div className="rounded-2xl bg-rose-500/10 p-2">Keluar Rp0.000.000</div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 top-14 flex flex-col items-center justify-center gap-1 bg-background/40">
        <span className="text-3xl" aria-hidden>🔒</span>
        <span className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 px-3 py-1 text-[11px] font-bold text-white shadow">👑 Buka dengan Pro</span>
      </div>
    </Link>
  );
}
