"use client";

import * as React from "react";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Camera,
  Mic,
  Plus,
  Home,
  PiggyBank,
  Wallet,
  Menu,
  Check,
  ShoppingBag,
  Coffee,
  Fuel,
  ArrowDownLeft,
} from "lucide-react";
import { cn, formatRupiah } from "@/lib/utils";

interface WalletItem {
  id: string;
  name: string;
  type: string;
  balance: number;
  color: string;
  icon: string;
}

const SAMPLE_WALLETS: WalletItem[] = [
  { id: "total", name: "Total Saldo (Semua)", type: "all", balance: 14850000, color: "#0d9488", icon: "wallet" },
  { id: "bca", name: "BCA Utama", type: "bank", balance: 8400000, color: "#0060af", icon: "bca" },
  { id: "gopay", name: "GoPay", type: "ewallet", balance: 450000, color: "#00aad2", icon: "gopay" },
  { id: "cash", name: "Uang Tunai", type: "cash", balance: 350000, color: "#16a34a", icon: "cash" },
  { id: "darurat", name: "Tabungan Darurat", type: "savings", balance: 5650000, color: "#f59e0b", icon: "piggy" },
];

export function LandingPhonePreview() {
  const [selectedWalletId, setSelectedWalletId] = React.useState<string>("total");
  const [hideBalance, setHideBalance] = React.useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = React.useState<boolean>(false);
  const [activeTab, setActiveTab] = React.useState<string>("beranda");
  const [lastAction, setLastAction] = React.useState<string | null>(null);

  const selectedWallet =
    SAMPLE_WALLETS.find((w) => w.id === selectedWalletId) || SAMPLE_WALLETS[0];

  const formatIDR = (val: number) => {
    if (hideBalance) return "••••••••";
    return formatRupiah(val);
  };

  const handleActionClick = (actionName: string) => {
    setLastAction(actionName);
    setTimeout(() => setLastAction(null), 2500);
  };

  return (
    <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[380px] select-none">
      {/* Outer Phone Shell with subtle realistic bezel & shadow */}
      <div className="relative rounded-[44px] sm:rounded-[48px] p-2.5 sm:p-3 bg-zinc-900 shadow-[0_25px_60px_-15px_rgba(13,148,136,0.35),0_12px_24px_-8px_rgba(0,0,0,0.5)] border-[4px] border-zinc-700/80 ring-1 ring-white/15">
        {/* Dynamic Island / Speaker notch */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 h-4 w-24 rounded-full bg-black flex items-center justify-center">
          <div className="size-2 rounded-full bg-zinc-900 border border-zinc-800" />
          <div className="ml-2 size-2.5 rounded-full bg-teal-950/80 border border-teal-800/40" />
        </div>

        {/* Inner Phone Screen */}
        <div className="relative rounded-[36px] sm:rounded-[40px] overflow-hidden bg-background text-foreground flex flex-col h-[560px] sm:h-[620px] border border-border/60">
          {/* Top Status Bar */}
          <div className="px-6 pt-2.5 pb-1 flex items-center justify-between text-[11px] font-semibold text-foreground/80 tracking-tight">
            <span>09:41</span>
            <div className="flex items-center gap-1.5">
              {/* Signal & Battery indicator */}
              <span className="text-[10px]">5G</span>
              <div className="w-5 h-2.5 rounded-sm border border-foreground/70 p-0.5 flex items-center">
                <div className="h-full w-3.5 bg-foreground/80 rounded-2xs" />
              </div>
            </div>
          </div>

          {/* App Top Bar */}
          <div className="px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-teal-600/20 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-xs border border-teal-500/30">
                BY
              </div>
              <div className="leading-tight">
                <p className="text-[10px] text-muted-foreground">Selamat Pagi 👋</p>
                <p className="text-xs font-bold text-foreground">Bayu Aji</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-[10px] font-bold">
                <Sparkles className="size-3" />
                <span>Pro Aktif</span>
              </div>
            </div>
          </div>

          {/* Main Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3.5 no-scrollbar">
            {/* The Iconic Total Saldo Card */}
            <div className="relative rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 p-4 text-white shadow-md shadow-teal-700/25">
              {/* Card Header: Dropdown & Eye */}
              <div className="flex items-center justify-between gap-2 relative">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/20 px-2.5 py-1 text-xs font-bold text-white transition-all active:scale-95"
                  >
                    <span className="truncate max-w-[130px]">{selectedWallet.name}</span>
                    <ChevronDown
                      className={cn("size-3.5 transition-transform", dropdownOpen && "rotate-180")}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 z-40 w-52 rounded-2xl border border-border bg-card p-1 shadow-2xl text-foreground">
                      <p className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        Pilih Tampilan Saldo
                      </p>
                      {SAMPLE_WALLETS.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => {
                            setSelectedWalletId(w.id);
                            setDropdownOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-semibold hover:bg-muted transition-colors",
                            selectedWalletId === w.id && "bg-muted text-teal-600 dark:text-teal-400"
                          )}
                        >
                          <span className="truncate">{w.name}</span>
                          {selectedWalletId === w.id && <Check className="size-3 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setHideBalance(!hideBalance)}
                  className="rounded-lg p-1.5 text-white/90 hover:bg-white/10 active:scale-95 transition-all"
                  aria-label={hideBalance ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
                >
                  {hideBalance ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              {/* Balance Number */}
              <div className="mt-2.5 text-xl sm:text-2xl font-black tracking-tight">
                {formatIDR(selectedWallet.balance)}
              </div>
              <p className="text-[10px] text-white/80 mt-0.5">
                {selectedWalletId === "total"
                  ? "4 Dompet Aktif + 1 Tabungan"
                  : `Dompet ${selectedWallet.name}`}
              </p>

              {/* Income & Expense Month Stats */}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/15 pt-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="size-6 rounded-lg bg-white/15 flex items-center justify-center">
                    <TrendingUp className="size-3 text-emerald-200" />
                  </div>
                  <div>
                    <p className="text-[9px] text-white/75 leading-none">Pemasukan</p>
                    <p className="text-[11px] font-bold text-white mt-0.5">
                      {hideBalance ? "••••" : "Rp8.500.000"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="size-6 rounded-lg bg-white/15 flex items-center justify-center">
                    <TrendingDown className="size-3 text-rose-200" />
                  </div>
                  <div>
                    <p className="text-[9px] text-white/75 leading-none">Pengeluaran</p>
                    <p className="text-[11px] font-bold text-white mt-0.5">
                      {hideBalance ? "••••" : "Rp2.340.000"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleActionClick("Input Manual Cepat")}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-2xl bg-card border border-border/80 hover:border-teal-500/40 hover:bg-muted/50 transition-all active:scale-95"
              >
                <div className="size-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Plus className="size-4" />
                </div>
                <span className="text-[10px] font-bold text-foreground">Catat</span>
              </button>

              <button
                type="button"
                onClick={() => handleActionClick("AI OCR Struk Aktif!")}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-2xl bg-card border border-border/80 hover:border-teal-500/40 hover:bg-muted/50 transition-all active:scale-95"
              >
                <div className="size-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Camera className="size-4" />
                </div>
                <span className="text-[10px] font-bold text-foreground">Scan Struk</span>
              </button>

              <button
                type="button"
                onClick={() => handleActionClick("Catat Suara: Mendengarkan...")}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-2xl bg-card border border-border/80 hover:border-teal-500/40 hover:bg-muted/50 transition-all active:scale-95"
              >
                <div className="size-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Mic className="size-4" />
                </div>
                <span className="text-[10px] font-bold text-foreground">Suara</span>
              </button>

              <button
                type="button"
                onClick={() => handleActionClick("Konsultasi Ruby Siap")}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-2xl bg-gradient-to-br from-teal-500/15 to-emerald-500/25 border border-teal-500/40 hover:bg-muted/50 transition-all active:scale-95"
              >
                <div className="size-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="size-4" />
                </div>
                <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300">Ruby</span>
              </button>
            </div>

            {/* Notification Toast Simulator */}
            {lastAction && (
              <div className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white text-[10px] font-semibold text-center animate-in fade-in slide-in-from-top-1 duration-150 shadow-md">
                ✨ {lastAction}
              </div>
            )}

            {/* Smart Financial Health Widget */}
            <div className="rounded-2xl border border-border/80 bg-card p-3 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                  88
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold text-foreground">Kesehatan Finansial</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      Sehat
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground">Rasio menabung 32% bulan ini</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
                Detail →
              </span>
            </div>

            {/* Recent Transactions List */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-foreground">Transaksi Hari Ini</span>
                <span className="text-[10px] font-semibold text-muted-foreground">Lihat Semua</span>
              </div>

              {/* Tx 1: Scan Indomaret */}
              <div className="flex items-center justify-between p-2 rounded-2xl bg-card border border-border/60 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                    <ShoppingBag className="size-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-bold text-foreground">Indomaret Point</p>
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded-sm bg-teal-500/15 text-teal-700 dark:text-teal-300">
                        📸 Struk
                      </span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">BCA Utama · 4 item belanja</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    {hideBalance ? "••••" : "-Rp142.500"}
                  </p>
                  <p className="text-[9px] text-muted-foreground">13:45</p>
                </div>
              </div>

              {/* Tx 2: Kopi Kenangan */}
              <div className="flex items-center justify-between p-2 rounded-2xl bg-card border border-border/60 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-xl bg-orange-500/15 text-orange-600 flex items-center justify-center">
                    <Coffee className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Kopi Kenangan</p>
                    <p className="text-[9px] text-muted-foreground">GoPay · Kopi Kenangan Mantan</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    {hideBalance ? "••••" : "-Rp22.000"}
                  </p>
                  <p className="text-[9px] text-muted-foreground">10:15</p>
                </div>
              </div>

              {/* Tx 3: Voice Pertalite */}
              <div className="flex items-center justify-between p-2 rounded-2xl bg-card border border-border/60 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
                    <Fuel className="size-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-bold text-foreground">Bensin Pertalite</p>
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded-sm bg-teal-500/15 text-teal-700 dark:text-teal-300">
                        🎙️ Suara
                      </span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">Tunai · Motor Harian</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    {hideBalance ? "••••" : "-Rp30.000"}
                  </p>
                  <p className="text-[9px] text-muted-foreground">Kemarin</p>
                </div>
              </div>

              {/* Tx 4: Salary Transfer */}
              <div className="flex items-center justify-between p-2 rounded-2xl bg-card border border-border/60 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                    <ArrowDownLeft className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Gaji Kantor Bulanan</p>
                    <p className="text-[9px] text-muted-foreground">BCA Utama · Payday Mode</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-teal-600 dark:text-teal-400">
                    {hideBalance ? "••••" : "+Rp8.500.000"}
                  </p>
                  <p className="text-[9px] text-muted-foreground">25 Nov</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom App Navigation Mockup */}
          <div className="px-3 py-2 border-t border-border/80 bg-card/95 backdrop-blur-md flex items-center justify-around">
            <button
              type="button"
              onClick={() => setActiveTab("beranda")}
              className={cn(
                "flex flex-col items-center gap-0.5 text-[9px] font-bold",
                activeTab === "beranda"
                  ? "text-teal-600 dark:text-teal-400"
                  : "text-muted-foreground"
              )}
            >
              <Home className="size-4" />
              <span>Beranda</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("tabungan")}
              className={cn(
                "flex flex-col items-center gap-0.5 text-[9px] font-bold",
                activeTab === "tabungan"
                  ? "text-teal-600 dark:text-teal-400"
                  : "text-muted-foreground"
              )}
            >
              <PiggyBank className="size-4" />
              <span>Tabungan</span>
            </button>

            {/* Ruby AI Center Icon */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("ruby");
                handleActionClick("Buka Tanya Ruby");
              }}
              className="flex flex-col items-center -mt-3.5"
            >
              <div className="size-10 rounded-full bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-teal-700/30">
                <Sparkles className="size-5" />
              </div>
              <span className="text-[8px] font-bold text-teal-700 dark:text-teal-300 mt-0.5">
                Ruby
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("dompet")}
              className={cn(
                "flex flex-col items-center gap-0.5 text-[9px] font-bold",
                activeTab === "dompet"
                  ? "text-teal-600 dark:text-teal-400"
                  : "text-muted-foreground"
              )}
            >
              <Wallet className="size-4" />
              <span>Dompet</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("more")}
              className={cn(
                "flex flex-col items-center gap-0.5 text-[9px] font-bold",
                activeTab === "more"
                  ? "text-teal-600 dark:text-teal-400"
                  : "text-muted-foreground"
              )}
            >
              <Menu className="size-4" />
              <span>More</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Callout Badges around Phone (Anti-slop social proof & feature hooks) */}
      <div className="hidden sm:block absolute -top-4 -left-12 lg:-left-16 z-20 animate-bounce duration-1000">
        <div className="rounded-2xl border border-teal-500/30 bg-background/90 backdrop-blur-md px-3.5 py-2 shadow-lg shadow-teal-500/10 flex items-center gap-2.5">
          <div className="size-7 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-300 flex items-center justify-center">
            <Camera className="size-4" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-foreground leading-tight">
              Scan Struk Otomatis
            </p>
            <p className="text-[9px] text-muted-foreground">Item, diskon & pajak terurai</p>
          </div>
        </div>
      </div>

      <div className="hidden sm:block absolute top-[26%] -right-8 lg:-right-14 z-20">
        <div className="rounded-2xl border border-border/80 bg-background/90 backdrop-blur-md px-3.5 py-2 shadow-lg flex items-center gap-2.5">
          <div className="size-7 rounded-xl bg-teal-600 text-white flex items-center justify-center">
            <Sparkles className="size-4" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-foreground leading-tight">
              Tanya Ruby AI ✨
            </p>
            <p className="text-[9px] text-muted-foreground">Analisis dari datamu sendiri</p>
          </div>
        </div>
      </div>

      <div className="hidden sm:block absolute -bottom-5 -left-8 lg:-left-12 z-20">
        <div className="rounded-2xl border border-border/80 bg-background/90 backdrop-blur-md px-3.5 py-2 shadow-lg flex items-center gap-2.5">
          <div className="size-7 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xs">
            📊
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-foreground leading-tight">
              Rencanakan Kebutuhanmu
            </p>
            <p className="text-[9px] text-muted-foreground">Kami hitung sesuai pemasukanmu</p>
          </div>
        </div>
      </div>
    </div>
  );
}
