"use client";

import * as React from "react";
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  Coins,
  ArrowRight,
} from "lucide-react";
import { formatRupiah, cn } from "@/lib/utils";
import {
  processPaydayAllocation,
  type PaydaySchedule,
  type PaydayAllocationItem,
} from "@/lib/data/payday";
import type { WalletBalance } from "@/lib/data/wallets";
import type { GoalProgress } from "@/lib/data/goals";
import { USE_SAMPLE_DATA, todayJakarta } from "@/lib/data/sample-mode";
import { splitPayday, clampAllocation, orderGoals, type SplitGoal } from "@/lib/payday-split";
import { LIVING_SOURCE_LABEL, type LivingCostAnswer } from "@/lib/living-cost";
import { LivingCostSetup } from "@/components/ai/living-cost-setup";

interface PaydayCardProps {
  schedule: PaydaySchedule | null;
  wallets: WalletBalance[];
  goals: GoalProgress[];
  /** Jawaban biaya hidup yang sudah tersimpan di profil pengguna. null = belum pernah dijawab (ditanya sekali). */
  livingCostAnswer?: LivingCostAnswer | null;
  defaultWalletId?: string;
  onSuccess?: () => void;
}

export function PaydayCard({
  schedule,
  wallets,
  goals,
  livingCostAnswer = null,
  defaultWalletId,
  onSuccess,
}: PaydayCardProps) {
  const [isOpen, setIsOpen] = React.useState(true);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const today = todayJakarta();

  // State Nominal Gaji Masuk (tidak ada angka tebakan: kosong bila jadwal tidak punya nominal)
  const initialSalary = schedule?.expected_amount || 0;
  const [salaryAmount, setSalaryAmount] = React.useState(initialSalary);
  const [salaryInput, setSalaryInput] = React.useState(
    initialSalary ? initialSalary.toLocaleString("id-ID") : ""
  );

  // Dompet penerima: pengaturan dompet utama, kalau belum ada pakai dompet pertama
  const selectedWalletId =
    (defaultWalletId && wallets.some((w) => w.id === defaultWalletId) ? defaultWalletId : wallets[0]?.id) || "";

  // Biaya hidup = jawaban pribadi pengguna yang tersimpan di profilnya. Belum dijawab -> ditanya SEKALI,
  // gajian berikutnya tidak ditanya lagi (hanya bisa diubah lewat tombol "Ubah").
  const [localAnswer, setLocalAnswer] = React.useState<LivingCostAnswer | null>(null);
  const answer = localAnswer ?? livingCostAnswer;
  const [editingLiving, setEditingLiving] = React.useState(false);
  const askLiving = !answer || editingLiving;
  const livingCost: number | null = answer ? answer.perPayday : null;

  // Tujuan tabungan aktif yang masih punya sisa, urut antrean (tenggat terdekat dulu)
  const queue = React.useMemo(() => {
    const active: (SplitGoal & { storageWalletId: string | null })[] = goals
      .filter((g) => g.status === "aktif" && Number(g.remaining) > 0)
      .map((g) => ({
        id: g.id,
        name: g.name,
        remaining: Number(g.remaining),
        target: g.target_amount,
        deadline: g.deadline,
        priority: g.priority,
        storageWalletId: g.storage_wallet_id,
      }));
    return orderGoals(active);
  }, [goals]);

  // Saran pembagian: gaji - biaya hidup, diisi berurutan ke tujuan (tidak pernah melebihi gaji)
  const suggestion = React.useMemo(
    () =>
      splitPayday({ today, salary: salaryAmount, livingCost: livingCost ?? 0, goals: queue }),
    [today, salaryAmount, livingCost, queue]
  );

  // Isian manual berlaku selama gaji / biaya hidup / daftar tujuan tidak berubah; kalau berubah, kembali ke saran
  const suggestionKey = `${salaryAmount}|${livingCost}|${queue.map((g) => g.id).join(",")}`;
  const [manual, setManual] = React.useState<{ key: string; values: Record<string, number> } | null>(null);
  const allocations: Record<string, number> =
    manual && manual.key === suggestionKey ? manual.values : suggestion.amounts;

  const livingAnswered = livingCost !== null && !editingLiving;
  const totalSavingsAllocated = queue.reduce((sum, g) => sum + (allocations[g.id] || 0), 0);
  const freeAmount = livingAnswered ? salaryAmount - (livingCost ?? 0) - totalSavingsAllocated : 0;
  const deficit = livingAnswered ? Math.max(0, (livingCost ?? 0) - salaryAmount) : 0;

  // Handlers untuk input angka
  const handleSalaryChange = (val: string) => {
    const raw = val.replace(/\D/g, "");
    const num = Number(raw) || 0;
    setSalaryAmount(num);
    setSalaryInput(raw ? num.toLocaleString("id-ID") : "");
  };

  const handleGoalAllocChange = (goalId: string, val: string) => {
    const raw = val.replace(/\D/g, "");
    const others = totalSavingsAllocated - (allocations[goalId] || 0);
    const num = clampAllocation(Number(raw) || 0, salaryAmount, livingCost ?? 0, others);
    setManual({ key: suggestionKey, values: { ...allocations, [goalId]: num } });
  };

  // Submit Pembagian Gaji
  const handleBagiSekarang = async () => {
    if (salaryAmount <= 0) {
      setErrorMessage("Nominal gaji harus lebih dari 0 ya!");
      return;
    }
    if (livingCost === null) {
      setErrorMessage("Isi dulu biaya hidupmu sampai gajian berikutnya.");
      return;
    }
    if (deficit > 0) {
      setErrorMessage("Biaya hidup lebih besar dari gaji. Sesuaikan dulu ya!");
      return;
    }
    if (!selectedWalletId) {
      setErrorMessage("Belum ada dompet untuk menerima gaji. Buat dompet dulu ya!");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const allocationItems: PaydayAllocationItem[] = queue.map((g) => ({
        goalId: g.id,
        goalName: g.name,
        amount: allocations[g.id] || 0,
        storageWalletId: g.storageWalletId,
      }));

      await processPaydayAllocation({
        scheduleId: schedule?.id,
        walletId: selectedWalletId,
        actualAmount: salaryAmount,
        livingCost: livingCost,
        allocations: allocationItems,
        freeAmount: Math.max(0, freeAmount),
        date: schedule?.date || today,
      });

      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Gagal membagi gaji:", err);
      setErrorMessage(err instanceof Error && err.message ? err.message : "Terjadi kendala saat memproses gaji.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedWallet = wallets.find((w) => w.id === selectedWalletId);
  const canSubmit = livingAnswered && deficit === 0 && salaryAmount > 0 && !isSubmitting;

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
              Pemasukan {formatRupiah(salaryAmount)} telah masuk ke {selectedWallet?.name || "dompetmu"} dan setoran tabungan berhasil dicatat.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-400/50 bg-gradient-to-br from-emerald-400/20 via-lime-300/10 to-card p-4.5 shadow-lg shadow-emerald-500/10 space-y-3.5 transition-all">
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
                {schedule?.date || today}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {schedule?.note || "Yuk catat & alokasikan pembagiannya secara santai!"}
            </p>
          </div>
        </div>
      </div>

      {/* Form Input Nominal & Dompet */}
      <div className="grid grid-cols-1 gap-3 pt-1">
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

      </div>

      {/* Ruby menanyakan biaya hidup per bulan (sekali). Jawaban tersimpan di profil dan tidak ditanya lagi. */}
      {askLiving && (
        <LivingCostSetup
          initial={answer}
          onSaved={(a) => {
            setLocalAnswer(a);
            setEditingLiving(false);
          }}
          onCancel={answer ? () => setEditingLiving(false) : undefined}
        />
      )}

      {/* Rincian Alokasi Cerdas: muncul setelah biaya hidup dijawab */}
      {livingAnswered && (
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-teal-500" />
              Saran Pembagian Gajian
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              Bisa diedit, total tidak melebihi gaji
            </span>
          </div>

          {/* 1. Biaya Hidup (dari profil, bisa diubah) */}
          <div className="flex items-center justify-between text-xs gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Biaya Hidup
              </p>
              <p className="text-[10px] text-muted-foreground">
                {answer ? LIVING_SOURCE_LABEL[answer.source] : ""}
                {answer && answer.monthly > 0 ? ` (${formatRupiah(answer.monthly)} per bulan)` : ""} ·{" "}
                <button type="button" onClick={() => setEditingLiving(true)} className="font-bold text-teal-600 dark:text-teal-400 cursor-pointer">
                  Ubah
                </button>
              </p>
            </div>
            <span className="shrink-0 text-xs font-bold text-foreground">{formatRupiah(livingCost ?? 0)}</span>
          </div>

          {/* 2. Tujuan Tabungan, urut tenggat terdekat */}
          {queue.map((g, idx) => (
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
                  {(allocations[g.id] || 0) === 0 && deficit === 0
                    ? "Belum kebagian: menunggu tujuan di atasnya terpenuhi"
                    : `Sisa target: ${formatRupiah(g.remaining)}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0 w-32 border-b border-border/60 pb-0.5">
                <span className="text-[11px] font-bold text-muted-foreground">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={(allocations[g.id] || 0).toLocaleString("id-ID")}
                  onChange={(e) => handleGoalAllocChange(g.id, e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-foreground text-right focus:outline-none"
                />
              </div>
            </div>
          ))}

          {queue.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              Belum ada tujuan tabungan aktif, jadi semua sisa gaji jadi dana bebas.
            </p>
          )}

          {/* 3. Sisa Dana Bebas (atau kekurangan bila biaya hidup melebihi gaji) */}
          <div
            className={cn(
              "rounded-xl p-2.5 flex items-center justify-between text-xs transition-colors",
              deficit > 0
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                : "bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30"
            )}
          >
            <div>
              <span className="font-bold block">
                {deficit > 0 ? "Biaya hidup melebihi gaji ⚠️" : "Sisa Dana Bebas ✨"}
              </span>
              <span className="text-[10px] opacity-80">
                {deficit > 0
                  ? "Kecilkan biaya hidup atau perbaiki nominal gaji"
                  : freeAmount > 0
                    ? "Bebas dipakai untuk jajan & santai"
                    : "Seluruh gaji sudah terbagi habis"}
              </span>
            </div>
            <span className="text-sm font-extrabold tracking-tight">
              {formatRupiah(deficit > 0 ? deficit : freeAmount)}
            </span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
          {errorMessage}
        </div>
      )}

      {/* Tombol Eksekusi "Bagi Sekarang" */}
      <button
        type="button"
        onClick={handleBagiSekarang}
        disabled={!canSubmit}
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
