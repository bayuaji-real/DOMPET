"use client";

import * as React from "react";
import {
  Sparkles,
  Wallet,
  PiggyBank,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Coins,
  HeartHandshake,
  ArrowRight,
  ShieldCheck,
  Check,
} from "lucide-react";
import { formatRupiah, cn } from "@/lib/utils";
import { WalletIcon } from "@/components/wallet/wallet-icon";
import {
  processPaydayAllocation,
  type PaydaySchedule,
  type PaydayAllocationItem,
} from "@/lib/data/payday";
import type { WalletBalance } from "@/lib/data/wallets";
import type { GoalProgress } from "@/lib/data/goals";

interface PaydayCardProps {
  schedule: PaydaySchedule | null;
  wallets: WalletBalance[];
  goals: GoalProgress[];
  defaultLivingCost?: number;
  defaultWalletId?: string;
  onSuccess?: () => void;
}

export function PaydayCard({
  schedule,
  wallets,
  goals,
  defaultLivingCost = 400000,
  defaultWalletId,
  onSuccess,
}: PaydayCardProps) {
  const [isOpen, setIsOpen] = React.useState(true);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // State Nominal Gaji Masuk
  const initialSalary = schedule?.expected_amount || 8500000;
  const [salaryAmount, setSalaryAmount] = React.useState(initialSalary);
  const [salaryInput, setSalaryInput] = React.useState(
    initialSalary.toLocaleString("id-ID")
  );

  // State Dompet Penerima
  const activeWalletId =
    defaultWalletId ||
    wallets.find((w) => w.name.toLowerCase().includes("bca"))?.id ||
    wallets[0]?.id ||
    "";
  const [selectedWalletId, setSelectedWalletId] = React.useState(activeWalletId);

  // State Biaya Hidup
  const [livingCost, setLivingCost] = React.useState(defaultLivingCost);
  const [livingCostInput, setLivingCostInput] = React.useState(
    defaultLivingCost.toLocaleString("id-ID")
  );

  // State Alokasi Tabungan
  const [allocations, setAllocations] = React.useState<
    Record<string, { amount: number; input: string }>
  >({});

  // Inisialisasi alokasi tabungan sesuai planned_per_payday & prioritas
  React.useEffect(() => {
    if (goals.length > 0) {
      const initialMap: Record<string, { amount: number; input: string }> = {};
      goals.forEach((g) => {
        const planned = g.planned_per_payday || 500000;
        initialMap[g.id] = {
          amount: planned,
          input: planned.toLocaleString("id-ID"),
        };
      });
      setAllocations(initialMap);
    }
  }, [goals]);

  // Perhitungan Real-Time Total Tabungan & Sisa Bebas
  const totalSavingsAllocated = Object.values(allocations).reduce(
    (sum, item) => sum + (item.amount || 0),
    0
  );
  const freeAmount = salaryAmount - livingCost - totalSavingsAllocated;
  const isOverAllocated = freeAmount < 0;

  // Handlers untuk input angka
  const handleSalaryChange = (val: string) => {
    const raw = val.replace(/\D/g, "");
    const num = Number(raw) || 0;
    setSalaryAmount(num);
    setSalaryInput(raw ? num.toLocaleString("id-ID") : "");
  };

  const handleLivingCostChange = (val: string) => {
    const raw = val.replace(/\D/g, "");
    const num = Number(raw) || 0;
    setLivingCost(num);
    setLivingCostInput(raw ? num.toLocaleString("id-ID") : "");
  };

  const handleGoalAllocChange = (goalId: string, val: string) => {
    const raw = val.replace(/\D/g, "");
    const num = Number(raw) || 0;
    setAllocations((prev) => ({
      ...prev,
      [goalId]: {
        amount: num,
        input: raw ? num.toLocaleString("id-ID") : "",
      },
    }));
  };

  // Submit Pembagian Gaji
  const handleBagiSekarang = async () => {
    if (salaryAmount <= 0) {
      setErrorMessage("Nominal gaji harus lebih dari 0 ya!");
      return;
    }
    if (!selectedWalletId) {
      setErrorMessage("Silakan pilih dompet penerima gaji!");
      return;
    }
    if (isOverAllocated) {
      setErrorMessage("Total alokasi melebihi nominal gajimu. Sesuaikan angkanya dulu ya!");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const allocationItems: PaydayAllocationItem[] = goals.map((g) => ({
        goalId: g.id,
        goalName: g.name,
        amount: allocations[g.id]?.amount || 0,
        storageWalletId: g.storage_wallet_id,
      }));

      await processPaydayAllocation({
        scheduleId: schedule?.id,
        walletId: selectedWalletId,
        actualAmount: salaryAmount,
        livingCost: livingCost,
        allocations: allocationItems,
        freeAmount: Math.max(0, freeAmount),
        date: schedule?.date || "2026-11-20",
      });

      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Gagal membagi gaji:", err);
      setErrorMessage(err.message || "Terjadi kendala saat memproses gaji.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedWallet = wallets.find((w) => w.id === selectedWalletId);

  // Jika sudah sukses dibagikan
  if (isSuccess) {
    return (
      <div className="rounded-3xl border border-teal-500/40 bg-teal-500/10 p-4.5 space-y-2.5 animate-in zoom-in-95 shadow-sm text-foreground">
        <div className="flex items-center gap-2.5 text-teal-600 dark:text-teal-400">
          <div className="h-8 w-8 rounded-xl bg-teal-500/20 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-foreground">
              Gaji Berhasil Dibagikan! 🎉
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Pemasukan {formatRupiah(salaryAmount)} telah masuk ke {selectedWallet?.name || "Dompet"} dan setoran tabungan berhasil dicatat.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-teal-500/40 bg-gradient-to-br from-teal-950/40 via-card to-card p-4.5 shadow-lg shadow-teal-950/20 space-y-3.5 transition-all">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 shadow-inner">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-foreground tracking-tight">
                Gajian Hari Ini 🎉
              </span>
              <span className="inline-block rounded-md bg-teal-500/20 px-1.5 py-0.2 text-[10px] font-bold text-teal-300">
                {schedule?.date ? schedule.date : "20 Nov 2026"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {schedule?.note || "Yuk catat & alokasikan pembagiannya secara santai!"}
            </p>
          </div>
        </div>
      </div>

      {/* Form Input Nominal & Dompet */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Nominal Gaji Masuk */}
        <div className="rounded-2xl border border-border/80 bg-background/60 p-3 space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Nominal Gaji Masuk (Rp)
          </label>
          <div className="flex items-center gap-1">
            <span className="text-sm font-extrabold text-teal-600 dark:text-teal-400">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={salaryInput}
              onChange={(e) => handleSalaryChange(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-base font-extrabold text-foreground focus:outline-none tracking-tight"
            />
          </div>
        </div>

        {/* Dompet Penerima */}
        <div className="rounded-2xl border border-border/80 bg-background/60 p-3 space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Masuk ke Dompet
          </label>
          <div className="flex items-center gap-2">
            {selectedWallet && (
              <div
                className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${selectedWallet.color || "#0d9488"}20`, color: selectedWallet.color || "#0d9488" }}
              >
                <WalletIcon icon={selectedWallet.icon} color={selectedWallet.color} size={14} />
              </div>
            )}
            <select
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id} className="bg-card text-foreground">
                  {w.name} ({formatRupiah(w.balance)})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Rincian Alokasi Cerdas */}
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-teal-500" />
            Saran Pembagian Gajian
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            Bisa diedit sesukamu
          </span>
        </div>

        {/* 1. Biaya Hidup */}
        <div className="flex items-center justify-between text-xs gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Biaya Hidup
            </p>
            <p className="text-[10px] text-muted-foreground">Pos belanja pokok & makan</p>
          </div>
          <div className="flex items-center gap-1 shrink-0 w-32 border-b border-border/60 pb-0.5">
            <span className="text-[11px] font-bold text-muted-foreground">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={livingCostInput}
              onChange={(e) => handleLivingCostChange(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-foreground text-right focus:outline-none"
            />
          </div>
        </div>

        {/* 2. Target Tabungan / Goals */}
        {goals.map((g, idx) => (
          <div key={g.id} className="flex items-center justify-between text-xs gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                <span className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                <span className="truncate">{g.name}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground font-bold shrink-0">
                  P{idx + 1}
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                Target: {formatRupiah(g.target_amount)}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0 w-32 border-b border-border/60 pb-0.5">
              <span className="text-[11px] font-bold text-muted-foreground">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={allocations[g.id]?.input || "0"}
                onChange={(e) => handleGoalAllocChange(g.id, e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-foreground text-right focus:outline-none"
              />
            </div>
          </div>
        ))}

        {/* 3. Sisa Dana Bebas */}
        <div
          className={cn(
            "rounded-xl p-2.5 flex items-center justify-between text-xs transition-colors",
            isOverAllocated
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
              : "bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30"
          )}
        >
          <div>
            <span className="font-bold block">
              {isOverAllocated ? "Alokasi Berlebih ⚠️" : "Sisa Dana Bebas ✨"}
            </span>
            <span className="text-[10px] opacity-80">
              {isOverAllocated
                ? "Kurang dari nominal gajimu"
                : "Bebas dipakai untuk jajan & santai"}
            </span>
          </div>
          <span className="text-sm font-extrabold tracking-tight">
            {formatRupiah(Math.abs(freeAmount))}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
          {errorMessage}
        </div>
      )}

      {/* Tombol Eksekusi "Bagi Sekarang" */}
      <button
        type="button"
        onClick={handleBagiSekarang}
        disabled={isSubmitting || isOverAllocated}
        className="w-full h-11 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition-all text-white text-xs font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Memproses Pemasukan & Setoran...</span>
          </>
        ) : (
          <>
            <span>Bagi Sekarang</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}
