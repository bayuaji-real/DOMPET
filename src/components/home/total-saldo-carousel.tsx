"use client";

import * as React from "react";
import { Check, ChevronDown, ChevronRight, Eye, EyeOff, TrendingDown, TrendingUp } from "lucide-react";
import { WalletIcon } from "@/components/wallet/wallet-icon";
import { cn } from "@/lib/utils";
import type { WalletBalance } from "@/lib/data/wallets";
import type { Transaction } from "@/lib/data/transactions";

interface TotalSaldoCardProps {
  wallets: WalletBalance[];
  hideBalance: boolean;
  onToggleHide: () => void;
  /** Format angka sesuai mode sembunyikan saldo. */
  display: (amount: bigint | number) => string;
  /** Transaksi bulan ini, dipakai untuk hitung masuk/keluar per dompet. */
  monthTxs: Transaction[];
  onSelectWallet: (wallet: WalletBalance) => void;
}

const STORAGE_KEY = "dompet_saldo_pilihan";
const isSavings = (w: WalletBalance) => Boolean(w.goal_id) || w.type === "tabungan";

/**
 * Kartu saldo dengan satu tampilan yang sama. Pilihan "Total Saldo" atau dompet tertentu
 * dipilih lewat menu di kiri atas kartu (menggantikan geseran).
 */
export function TotalSaldoCarousel({
  wallets,
  hideBalance,
  onToggleHide,
  display,
  monthTxs,
  onSelectWallet,
}: TotalSaldoCardProps) {
  const [selectedId, setSelectedId] = React.useState<string>("total");
  const [open, setOpen] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSelectedId(saved);
    } catch {}
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const normal = React.useMemo(() => wallets.filter((w) => !isSavings(w)), [wallets]);
  const savings = React.useMemo(() => wallets.filter(isSavings), [wallets]);
  const selected = wallets.find((w) => w.id === selectedId) ?? null;

  const choose = (id: string) => {
    setSelectedId(id);
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  };

  const total = wallets.reduce((sum, w) => sum + BigInt(Math.round(w.balance || 0)), 0n);
  const savingsTotal = savings.reduce((sum, w) => sum + BigInt(Math.round(w.balance || 0)), 0n);

  // Masuk/keluar bulan ini untuk pilihan saat ini
  let masuk = 0n;
  let keluar = 0n;
  for (const t of monthTxs) {
    const amt = BigInt(Math.round(t.amount || 0));
    if (!selected) {
      if (t.type === "income") masuk += amt;
      else if (t.type === "expense") keluar += amt;
    } else {
      const id = selected.id;
      if (t.wallet_id === id) {
        if (t.type === "income" || t.type === "goal_withdraw") masuk += amt;
        else keluar += amt;
      } else if (t.to_wallet_id === id) {
        if (t.type === "goal_withdraw") keluar += amt;
        else masuk += amt;
      }
    }
  }

  const heading = selected ? selected.name : "Total Saldo";
  const amount = selected ? BigInt(Math.round(selected.balance || 0)) : total;
  const subtitle = selected
    ? isSavings(selected)
      ? "Tabungan"
      : selected.is_default
        ? "Dompet bawaan"
        : "Dompet"
    : `${wallets.length} dompet${savingsTotal > 0n ? ` • termasuk tabungan ${display(savingsTotal)}` : ""}`;

  const option = (id: string, label: string, w?: WalletBalance) => (
    <button
      key={id}
      type="button"
      role="option"
      aria-selected={selectedId === id}
      onClick={() => choose(id)}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted",
        selectedId === id && "bg-muted"
      )}
    >
      {w ? <WalletIcon icon={w.icon} color={w.color} size={24} className="rounded-lg" /> : <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-600 text-[10px] font-extrabold text-white">Σ</span>}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {w && <span className="shrink-0 text-[10px] font-medium text-muted-foreground">{display(w.balance)}</span>}
      {selectedId === id && <Check className="h-3.5 w-3.5 shrink-0 text-teal-600" />}
    </button>
  );

  return (
    <section
      aria-label="Saldo"
      className="relative rounded-3xl bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-950 p-5 text-white shadow-xl shadow-teal-900/20"
    >
      <div className="flex items-center justify-between gap-2">
        <div ref={boxRef} className="relative min-w-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={open}
            className="flex max-w-full cursor-pointer items-center gap-1.5 rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20 active:scale-95"
          >
            <span className="truncate">{heading}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
          </button>
          {open && (
            <div
              role="listbox"
              aria-label="Pilih dompet"
              className="absolute left-0 top-full z-30 mt-1.5 max-h-72 w-72 max-w-[80vw] overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-2xl"
            >
              {option("total", "Total Saldo (semua dompet)")}
              {normal.length > 0 && (
                <p className="px-2.5 pb-0.5 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dompet</p>
              )}
              {normal.map((w) => option(w.id, w.name, w))}
              {savings.length > 0 && (
                <p className="px-2.5 pb-0.5 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tabungan</p>
              )}
              {savings.map((w) => option(w.id, w.name, w))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleHide}
          className="cursor-pointer rounded-lg p-1.5 text-teal-100 transition-all hover:bg-white/10 hover:text-white active:scale-95"
          title={hideBalance ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
          aria-label={hideBalance ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
        >
          {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{display(amount)}</div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-[11px] text-teal-200">{subtitle}</p>
        {selected && (
          <button
            type="button"
            onClick={() => onSelectWallet(selected)}
            className="flex cursor-pointer items-center gap-0.5 text-[11px] font-bold text-teal-100 hover:text-white"
          >
            Detail <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
            <TrendingUp className="h-4 w-4 text-emerald-300" />
          </div>
          <div>
            <p className="text-[10px] text-teal-200">Pemasukan Bulan Ini</p>
            <p className="text-xs font-bold">{display(masuk)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
            <TrendingDown className="h-4 w-4 text-rose-300" />
          </div>
          <div>
            <p className="text-[10px] text-teal-200">Pengeluaran Bulan Ini</p>
            <p className="text-xs font-bold">{display(keluar)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
