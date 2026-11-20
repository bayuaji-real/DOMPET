"use client";

import * as React from "react";
import { TopHeader } from "@/components/layout/top-header";
import { formatRupiah, cn, triggerHapticFeedback } from "@/lib/utils";
import {
  Wallet,
  Plus,
  ArrowRightLeft,
  Search,
  Eye,
  EyeOff,
  Check,
  TrendingUp,
  Landmark,
  Smartphone,
  Banknote,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Loader2,
  Trash2,
  SlidersHorizontal,
} from "lucide-react";
import {
  getWallets,
  createWallet,
  updateWallet,
  archiveWallet,
  type WalletBalance,
} from "@/lib/data/wallets";
import {
  WALLET_PRESETS,
  searchPresets,
  type WalletPreset,
  type WalletType,
} from "@/lib/wallet-presets";
import { WalletIcon } from "@/components/wallet/wallet-icon";
import { createTransaction } from "@/lib/data/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DompetPage() {
  const [wallets, setWallets] = React.useState<WalletBalance[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedFilter, setSelectedFilter] = React.useState<
    "all" | "bank" | "ewallet" | "cash" | "investasi"
  >("all");
  const [hideBalance, setHideBalance] = React.useState(false);

  // Modal Tambah Dompet
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [addStep, setAddStep] = React.useState<1 | 2>(1);

  // Dibuka dari Beranda ("+ Tambah Dompet" -> /dompet?tambah=1): langsung tampilkan jendela tambah dompet
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tambah") === "1") {
      setAddStep(1);
      setShowAddModal(true);
      window.history.replaceState(null, "", "/dompet");
    }
  }, []);
  const [presetSearch, setPresetSearch] = React.useState("");
  const [presetTab, setPresetTab] = React.useState<
    "all" | "bank" | "ewallet" | "cash" | "investasi"
  >("all");
  const [selectedPreset, setSelectedPreset] = React.useState<WalletPreset | null>(null);
  const [walletName, setWalletName] = React.useState("");
  const [walletType, setWalletType] = React.useState<WalletType>("bank");
  const [walletColor, setWalletColor] = React.useState("#005EB8");
  const [walletIcon, setWalletIcon] = React.useState("brand:bca");
  const [initialBalanceStr, setInitialBalanceStr] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Modal Transfer Antar Dompet
  const [showTransferModal, setShowTransferModal] = React.useState(false);
  const [transferFromId, setTransferFromId] = React.useState("");
  const [transferToId, setTransferToId] = React.useState("");
  const [transferAmountStr, setTransferAmountStr] = React.useState("");
  const [transferNote, setTransferNote] = React.useState("");
  const [isTransferring, setIsTransferring] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Baca preferensi hide balance
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("dompet_hide_balance");
      if (saved === "true") setHideBalance(true);
    } catch {}
  }, []);

  const toggleHideBalance = () => {
    triggerHapticFeedback();
    const next = !hideBalance;
    setHideBalance(next);
    try {
      localStorage.setItem("dompet_hide_balance", String(next));
    } catch {}
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Muat data dompet
  const loadWalletsData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getWallets();
      setWallets(list.filter((w) => !w.is_archived));
    } catch (err) {
      console.warn("Gagal memuat dompet:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadWalletsData();

    const handleCreated = () => loadWalletsData();
    window.addEventListener("wallet_created", handleCreated);
    window.addEventListener("transaction_created", handleCreated);
    return () => {
      window.removeEventListener("wallet_created", handleCreated);
      window.removeEventListener("transaction_created", handleCreated);
    };
  }, [loadWalletsData]);

  // Hitung total saldo
  const totalBalance = React.useMemo(() => {
    return wallets.reduce((acc, w) => acc + (w.balance || 0), 0);
  }, [wallets]);

  // Filter daftar dompet
  const filteredWallets = React.useMemo(() => {
    if (selectedFilter === "all") return wallets;
    return wallets.filter((w) => w.type === selectedFilter);
  }, [wallets, selectedFilter]);

  // Presets terfilter untuk modal tambah dompet
  const filteredPresets = React.useMemo(() => {
    let list = WALLET_PRESETS;
    if (presetTab !== "all") {
      list = list.filter((p) => p.type === presetTab);
    }
    if (presetSearch.trim()) {
      list = searchPresets(presetSearch);
      if (presetTab !== "all") {
        list = list.filter((p) => p.type === presetTab);
      }
    }
    return list;
  }, [presetTab, presetSearch]);

  // Handler Pilih Preset
  const handleSelectPreset = (preset: WalletPreset) => {
    triggerHapticFeedback();
    setSelectedPreset(preset);
    setWalletName(preset.name);
    setWalletType(preset.type);
    setWalletColor(preset.color);
    setWalletIcon(preset.domain ? `brand:${preset.id}` : preset.lucideIcon || "wallet");
    setAddStep(2);
  };

  // Handler Simpan Dompet Baru
  const handleSaveNewWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletName.trim()) return;

    setIsSubmitting(true);
    triggerHapticFeedback();

    const initialNum = initialBalanceStr
      ? parseInt(initialBalanceStr.replace(/\D/g, ""), 10) || 0
      : 0;

    try {
      await createWallet({
        name: walletName.trim(),
        type: walletType,
        color: walletColor,
        icon: walletIcon,
        initial_balance: initialNum,
      });

      setShowAddModal(false);
      setAddStep(1);
      setSelectedPreset(null);
      setWalletName("");
      setInitialBalanceStr("");
      showToast(`Dompet "${walletName.trim()}" berhasil dibuat!`);
      await loadWalletsData();
    } catch (err: any) {
      console.error("Gagal simpan dompet:", err);
      showToast("Gagal menyimpan dompet baru.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Transfer Antar Dompet
  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = transferAmountStr
      ? parseInt(transferAmountStr.replace(/\D/g, ""), 10) || 0
      : 0;

    if (!transferFromId || !transferToId || transferFromId === transferToId) {
      showToast("Pilih dompet asal dan tujuan yang berbeda.");
      return;
    }
    if (amount <= 0) {
      showToast("Nominal transfer harus lebih dari Rp 0.");
      return;
    }

    setIsTransferring(true);
    triggerHapticFeedback();

    try {
      await createTransaction({
        type: "transfer",
        amount,
        wallet_id: transferFromId,
        to_wallet_id: transferToId,
        note: transferNote.trim() || "Pindah Saldo Antar Dompet",
        date: new Date().toISOString().split("T")[0],
      });

      setShowTransferModal(false);
      setTransferAmountStr("");
      setTransferNote("");
      showToast(`Berhasil transfer ${formatRupiah(amount, { absolute: true })}!`);
      await loadWalletsData();
    } catch (err) {
      console.error("Gagal transfer:", err);
      showToast("Terjadi kendala saat melakukan transfer.");
    } finally {
      setIsTransferring(false);
    }
  };

  const getTypeLabel = (t?: string | null) => {
    switch (t) {
      case "bank":
        return "Rekening Bank";
      case "ewallet":
        return "E-Wallet";
      case "cash":
        return "Uang Tunai";
      case "investasi":
        return "Investasi";
      default:
        return "Dompet";
    }
  };

  return (
    <div className="flex flex-col flex-1 pb-28">
      <TopHeader
        title="Dompet Saya"
        subtitle="Kelola rekening, e-wallet, & saldo"
      />

      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-teal-600 text-white px-4 py-2 text-xs font-bold shadow-xl animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      <div className="space-y-4 p-4">
        {/* 1. Kartu Saldo Total & Aksi Cepat */}
        <div className="relative overflow-hidden rounded-3xl border border-teal-500/30 bg-gradient-to-br from-teal-500/15 via-emerald-500/10 to-transparent p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-400">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Total Kekayaan Likuid</p>
                <h2 className="text-2xl font-black tracking-tight text-foreground">
                  {hideBalance ? "••••••••" : formatRupiah(totalBalance, { absolute: true })}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleHideBalance}
              className="h-8 w-8 rounded-full bg-card/60 hover:bg-card border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title={hideBalance ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
            >
              {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback();
                setAddStep(1);
                setShowAddModal(true);
              }}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Tambah Dompet
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback();
                if (wallets.length >= 2) {
                  setTransferFromId(wallets[0].id);
                  setTransferToId(wallets[1].id);
                }
                setShowTransferModal(true);
              }}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-card hover:bg-muted/60 border border-border/80 text-foreground text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowRightLeft className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              Transfer Saldo
            </button>
          </div>
        </div>

        {/* 2. Filter Kategori Dompet */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: `Semua (${wallets.length})` },
            { id: "bank", label: "Bank" },
            { id: "ewallet", label: "E-Wallet" },
            { id: "cash", label: "Tunai" },
            { id: "investasi", label: "Investasi" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                triggerHapticFeedback();
                setSelectedFilter(tab.id as any);
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                selectedFilter === tab.id
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 3. Daftar Kartu Dompet */}
        <div className="space-y-2.5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
              <Loader2 className="h-7 w-7 text-teal-500 animate-spin" />
              <p className="text-xs text-muted-foreground font-medium">Memuat daftar dompet...</p>
            </div>
          ) : filteredWallets.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/80 p-8 text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Wallet className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">Belum ada dompet di kategori ini</p>
                <p className="text-xs text-muted-foreground">
                  Tambahkan rekening bank, e-wallet, atau uang tunai untuk mulai mencatat.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setAddStep(1);
                  setShowAddModal(true);
                }}
                className="rounded-xl bg-teal-600 text-white hover:bg-teal-700 text-xs font-bold"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Tambah Sekarang
              </Button>
            </div>
          ) : (
            filteredWallets.map((w) => (
              <div
                key={w.id}
                className="group relative rounded-3xl border border-border/70 bg-card p-4 shadow-xs hover:border-teal-500/40 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <WalletIcon
                      icon={w.icon}
                      color={w.color}
                      size={44}
                      className="rounded-2xl shadow-xs shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-extrabold text-foreground truncate">
                          {w.name}
                        </h3>
                        {w.sort_order === 1 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-teal-500/15 text-teal-600 dark:text-teal-400">
                            Utama
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {getTypeLabel(w.type)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-foreground tracking-tight">
                      {hideBalance ? "••••••••" : formatRupiah(w.balance, { absolute: true })}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Awal: {hideBalance ? "••••" : formatRupiah(w.initial_balance, { absolute: true })}
                    </p>
                  </div>
                </div>

                {/* Sub-bar Aksi Dompet */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                  <span className="text-[10px] text-muted-foreground">
                    Status: <strong className="text-emerald-600 dark:text-emerald-400">Aktif</strong>
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setTransferFromId(w.id);
                      const other = wallets.find((o) => o.id !== w.id);
                      if (other) setTransferToId(other.id);
                      setShowTransferModal(true);
                    }}
                    className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowRightLeft className="h-3 w-3" />
                    Pindah Saldo
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL TAMBAH DOMPET BARU (Langkah 1: Pilih Preset Brand, Langkah 2: Lengkapi Saldo) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3 animate-in fade-in">
          <div
            className="w-full max-w-sm rounded-3xl bg-card border border-border/80 shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-5 duration-200 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  {addStep === 1 ? "Pilih Bank / E-Wallet" : "Lengkapi Detail Dompet"}
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  {addStep === 1 ? "Langkah 1 dari 2: Pilih preset resmi" : "Langkah 2 dari 2: Atur saldo awal"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="h-7 w-7 rounded-full bg-muted/60 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {addStep === 1 ? (
              <div className="space-y-3">
                {/* Kolom Pencarian Preset */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari BCA, GoPay, Mandiri, Bibit..."
                    value={presetSearch}
                    onChange={(e) => setPresetSearch(e.target.value)}
                    className="h-9 pl-8 text-xs rounded-xl"
                    autoFocus
                  />
                </div>

                {/* Tab Tipe Preset */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                  {[
                    { id: "all", label: "Semua" },
                    { id: "bank", label: "Bank" },
                    { id: "ewallet", label: "E-Wallet" },
                    { id: "cash", label: "Tunai" },
                    { id: "investasi", label: "Investasi" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPresetTab(t.id as any)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all",
                        presetTab === t.id
                          ? "bg-teal-600 text-white"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Grid Pilihan Preset */}
                <div className="grid grid-cols-2 gap-2 max-h-[46vh] overflow-y-auto pr-0.5">
                  {filteredPresets.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => handleSelectPreset(p)}
                      className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-border/70 bg-muted/20 hover:bg-muted/60 hover:border-teal-500/50 text-left transition-all cursor-pointer active:scale-95"
                    >
                      <WalletIcon
                        icon={p.domain ? `brand:${p.id}` : p.lucideIcon || "wallet"}
                        color={p.color}
                        size={32}
                        className="rounded-xl shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground leading-tight truncate">
                          {p.name}
                        </p>
                        <p className="text-[9px] text-muted-foreground capitalize">
                          {p.type}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveNewWallet} className="space-y-3.5">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20">
                  <WalletIcon
                    icon={walletIcon}
                    color={walletColor}
                    size={40}
                    className="rounded-xl shrink-0 shadow-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">{walletName}</p>
                    <p className="text-[10px] text-teal-700 dark:text-teal-300 font-semibold capitalize">
                      {getTypeLabel(walletType)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddStep(1)}
                    className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    Ganti
                  </button>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nama Dompet</Label>
                  <Input
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    placeholder="Contoh: BCA Tabungan Pribadi"
                    required
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Saldo Awal (Rp)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      Rp
                    </span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={initialBalanceStr}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setInitialBalanceStr(raw ? Number(raw).toLocaleString("id-ID") : "");
                      }}
                      placeholder="0"
                      className="h-10 pl-9 text-xs rounded-xl font-bold"
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Saldo saat ini yang ada di rekening / e-wallet kamu.
                  </p>
                </div>

                <div className="pt-2 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddStep(1)}
                    className="flex-1 h-10 text-xs rounded-xl"
                  >
                    Kembali
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !walletName.trim()}
                    className="flex-1 h-10 text-xs rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Dompet"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL TRANSFER CEPAT ANTAR DOMPET */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3 animate-in fade-in">
          <div
            className="w-full max-w-sm rounded-3xl bg-card border border-border/80 shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-5 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <ArrowRightLeft className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">Transfer Saldo</h3>
                  <p className="text-[10px] text-muted-foreground">Pindah saldo antar rekening / dompet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="h-7 w-7 rounded-full bg-muted/60 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Dari Dompet</Label>
                  <select
                    value={transferFromId}
                    onChange={(e) => setTransferFromId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-border/80 bg-background px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({formatRupiah(w.balance, { absolute: true })})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Ke Dompet</Label>
                  <select
                    value={transferToId}
                    onChange={(e) => setTransferToId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-border/80 bg-background px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({formatRupiah(w.balance, { absolute: true })})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nominal Transfer (Rp)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={transferAmountStr}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setTransferAmountStr(raw ? Number(raw).toLocaleString("id-ID") : "");
                    }}
                    placeholder="0"
                    required
                    className="h-11 pl-9 text-base font-extrabold rounded-xl"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Catatan (Opsional)</Label>
                <Input
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Misal: Top up e-wallet, Pindah tabungan"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 h-10 text-xs rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isTransferring}
                  className="flex-1 h-10 text-xs rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  {isTransferring ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirim Sekarang"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
