"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, EyeOff, Plus, TrendingDown, TrendingUp, PiggyBank, ChevronRight } from "lucide-react";
import { WalletIcon } from "@/components/wallet/wallet-icon";
import { cn } from "@/lib/utils";
import type { WalletBalance } from "@/lib/data/wallets";

interface TotalSaldoCarouselProps {
  wallets: WalletBalance[];
  hideBalance: boolean;
  onToggleHide: () => void;
  /** Format angka sesuai mode sembunyikan saldo. */
  display: (amount: bigint | number) => string;
  pemasukanBulanIni: bigint;
  pengeluaranBulanIni: bigint;
  onSelectWallet: (wallet: WalletBalance) => void;
}

/**
 * Kartu Total Saldo yang bisa digeser (keputusan Owner D):
 * geseran pertama = Total Saldo semua dompet termasuk tabungan,
 * geseran berikutnya = saldo tiap dompet (tabungan dibedakan warnanya). Ditekan = detail dompet.
 */
export function TotalSaldoCarousel({
  wallets,
  hideBalance,
  onToggleHide,
  display,
  pemasukanBulanIni,
  pengeluaranBulanIni,
  onSelectWallet,
}: TotalSaldoCarouselProps) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [index, setIndex] = React.useState(0);

  const ordered = React.useMemo(() => {
    const normal = wallets.filter((w) => !w.goal_id && w.type !== "tabungan");
    const savings = wallets.filter((w) => w.goal_id || w.type === "tabungan");
    return [...normal, ...savings];
  }, [wallets]);

  const total = wallets.reduce((sum, w) => sum + BigInt(Math.round(w.balance || 0)), 0n);
  const savingsTotal = wallets
    .filter((w) => w.goal_id || w.type === "tabungan")
    .reduce((sum, w) => sum + BigInt(Math.round(w.balance || 0)), 0n);
  const pageCount = ordered.length + 1;

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  const eyeButton = (
    <button
      type="button"
      onClick={onToggleHide}
      className="cursor-pointer rounded-lg p-1.5 text-teal-100 transition-all hover:bg-white/10 hover:text-white active:scale-95"
      title={hideBalance ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
      aria-label={hideBalance ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
    >
      {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="space-y-2.5">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-3xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
        aria-label="Saldo"
      >
        {/* Halaman 1: Total Saldo */}
        <section
          aria-label="Total Saldo"
          className="relative w-full shrink-0 snap-center overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-950 p-5 text-white shadow-xl shadow-teal-900/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-200">Total Saldo</span>
            {eyeButton}
          </div>
          <div className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{display(total)}</div>
          <p className="mt-1 text-[11px] text-teal-200">
            {wallets.length} dompet
            {savingsTotal > 0n ? ` • termasuk tabungan ${display(savingsTotal)}` : ""}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                <TrendingUp className="h-4 w-4 text-emerald-300" />
              </div>
              <div>
                <p className="text-[10px] text-teal-200">Pemasukan Bulan Ini</p>
                <p className="text-xs font-bold">{display(pemasukanBulanIni)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                <TrendingDown className="h-4 w-4 text-rose-300" />
              </div>
              <div>
                <p className="text-[10px] text-teal-200">Pengeluaran Bulan Ini</p>
                <p className="text-xs font-bold">{display(pengeluaranBulanIni)}</p>
              </div>
            </div>
          </div>
          {ordered.length > 0 && (
            <p className="mt-3 text-[10px] text-teal-200/80">Geser untuk melihat tiap dompet →</p>
          )}
        </section>

        {/* Halaman berikutnya: tiap dompet */}
        {ordered.map((w) => {
          const isSavings = Boolean(w.goal_id) || w.type === "tabungan";
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => onSelectWallet(w)}
              aria-label={`Detail dompet ${w.name}`}
              className={cn(
                "relative w-full shrink-0 cursor-pointer snap-center overflow-hidden rounded-3xl p-5 text-left text-white shadow-xl transition-transform active:scale-[0.99]",
                isSavings
                  ? "bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-900 shadow-violet-900/20"
                  : "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 shadow-slate-900/20"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-2.5">
                  <WalletIcon icon={w.icon} color={w.color} size={32} className="rounded-xl" />
                  <span className="truncate text-sm font-bold">{w.name}</span>
                </div>
                {isSavings ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold">
                    <PiggyBank className="h-3 w-3" /> Tabungan
                  </span>
                ) : (
                  w.is_default && (
                    <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold">Bawaan</span>
                  )
                )}
              </div>
              <div className="mt-4 text-2xl font-extrabold tracking-tight">{display(w.balance)}</div>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-white/70">
                Lihat detail, ubah, atau hapus <ChevronRight className="h-3 w-3" />
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Halaman saldo">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={i === 0 ? "Total Saldo" : ordered[i - 1]?.name}
              onClick={() => goTo(i)}
              className={cn(
                "h-1.5 cursor-pointer rounded-full transition-all",
                i === index ? "w-5 bg-teal-600" : "w-1.5 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
        <Link
          href="/dompet?tambah=1"
          className="flex items-center gap-0.5 text-[11px] font-bold text-teal-600 hover:underline dark:text-teal-400"
        >
          <Plus className="h-3 w-3" /> Tambah Dompet
        </Link>
      </div>
    </div>
  );
}
