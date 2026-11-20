"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Eye,
  EyeOff,
  ChevronRight,
  ArrowRight,
  Plus,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { formatRupiah, cn } from "@/lib/utils";
import { WalletIcon } from "@/components/wallet/wallet-icon";
import { PaydayCard } from "./payday-card";
import { DueRecurringCard } from "./due-recurring-card";
import { getWallets, type WalletBalance } from "@/lib/data/wallets";
import { getTransactions, type Transaction } from "@/lib/data/transactions";
import { getSavingsGoals, type GoalProgress } from "@/lib/data/goals";
import {
  getTodayPaydaySchedule,
  SAMPLE_PAYDAY_SCHEDULES,
  type PaydaySchedule,
} from "@/lib/data/payday";
import {
  getDueRecurringTransactions,
  SAMPLE_RECURRING,
  type RecurringTransaction,
} from "@/lib/data/recurring";
import { getUserSettings, type UserSettings } from "@/lib/data/settings";

interface BerandaClientProps {
  initialWallets?: WalletBalance[];
  initialTransactions?: Transaction[];
  initialGoals?: GoalProgress[];
  initialPayday?: PaydaySchedule | null;
  initialDueRecurring?: RecurringTransaction[];
  initialSettings?: UserSettings | null;
}

export function BerandaClient({
  initialWallets = [],
  initialTransactions = [],
  initialGoals = [],
  initialPayday = null,
  initialDueRecurring = [],
  initialSettings = null,
}: BerandaClientProps) {
  // State Sembunyikan Saldo (Part E: Keamanan)
  const [hideBalance, setHideBalance] = React.useState(false);

  // State Data
  const [wallets, setWallets] = React.useState<WalletBalance[]>(initialWallets);
  const [transactions, setTransactions] = React.useState<Transaction[]>(
    initialTransactions
  );
  const [goals, setGoals] = React.useState<GoalProgress[]>(initialGoals);
  const [paydaySchedule, setPaydaySchedule] = React.useState<PaydaySchedule | null>(
    initialPayday
  );
  const [dueRecurring, setDueRecurring] = React.useState<RecurringTransaction[]>(
    initialDueRecurring
  );
  const [settings, setSettings] = React.useState<UserSettings | null>(
    initialSettings
  );

  // State Simulasi Mode Gajian jika sedang di luar jadwal
  const [showSimulatePayday, setShowSimulatePayday] = React.useState(false);

  // Inisialisasi hideBalance dari localStorage
  React.useEffect(() => {
    const savedHide = localStorage.getItem("dompet_hide_balance");
    if (savedHide !== null) {
      setHideBalance(savedHide === "true");
    }
  }, []);

  const toggleHideBalance = () => {
    setHideBalance((prev) => {
      const next = !prev;
      localStorage.setItem("dompet_hide_balance", String(next));
      return next;
    });
  };

  // Muat data live
  const loadDashboardData = React.useCallback(async () => {
    try {
      const [wList, tList, gList, pSched, dRec, sData] = await Promise.all([
        getWallets().catch(() => initialWallets),
        getTransactions({ limit: 5 }).catch(() => initialTransactions),
        getSavingsGoals().catch(() => initialGoals),
        getTodayPaydaySchedule("2026-11-20").catch(() => SAMPLE_PAYDAY_SCHEDULES[0]),
        getDueRecurringTransactions("2026-11-20").catch(() => SAMPLE_RECURRING),
        getUserSettings().catch(() => null),
      ]);

      if (wList && wList.length > 0) setWallets(wList);
      if (tList) setTransactions(tList);
      if (gList && gList.length > 0) setGoals(gList);
      setPaydaySchedule(pSched);
      if (dRec) setDueRecurring(dRec);
      if (sData) setSettings(sData);
    } catch (err) {
      console.warn("Gagal refresh data beranda:", err);
    }
  }, [initialWallets, initialTransactions, initialGoals]);

  React.useEffect(() => {
    loadDashboardData();

    // Dengarkan event transaksi dan gajian
    const handleRefresh = () => loadDashboardData();
    window.addEventListener("transaction_created", handleRefresh);
    window.addEventListener("payday_completed", handleRefresh);
    window.addEventListener("recurring_processed", handleRefresh);

    return () => {
      window.removeEventListener("transaction_created", handleRefresh);
      window.removeEventListener("payday_completed", handleRefresh);
      window.removeEventListener("recurring_processed", handleRefresh);
    };
  }, [loadDashboardData]);

  // Perhitungan Saldo Total & Cashflow Bulan Ini
  const totalSaldo = wallets.reduce(
    (sum, w) => sum + BigInt(Math.round(w.balance || 0)),
    0n
  );

  const fallbackTxs = transactions.length > 0 ? transactions : [];
  const pemasukanBulanIni = fallbackTxs
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + BigInt(Math.round(t.amount || 0)), 0n);

  const pengeluaranBulanIni = fallbackTxs
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + BigInt(Math.round(t.amount || 0)), 0n);

  // Masking Saldo jika hideBalance aktif
  const displayAmount = (amt: bigint | number, isNegative = false) => {
    if (hideBalance) {
      return "••••••••";
    }
    return formatRupiah(amt, { absolute: true });
  };

  return (
    <div className="flex flex-col flex-1 pb-24">
      <TopHeader
        title="Dompetku"
        subtitle="Halo! Keuanganmu terkendali hari ini ✨"
      />

      <div className="space-y-4 p-4">
        {/* 1. Banner Saldo Total Bersih (dengan Toggle Sembunyikan Saldo) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-950 p-5 text-white shadow-xl shadow-teal-900/20">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-teal-200">
                  Total Saldo Bersih
                </span>
                <button
                  type="button"
                  onClick={toggleHideBalance}
                  className="p-1 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                  title={hideBalance ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
                  aria-label={hideBalance ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
                >
                  {hideBalance ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-teal-100 backdrop-blur-md">
                <Sparkles className="h-3 w-3" /> {wallets.length} Dompet Aktif
              </span>
            </div>

            <div className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {displayAmount(totalSaldo)}
            </div>

            {/* Cashflow Bulan Ini */}
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                  <TrendingUp className="h-4 w-4 text-emerald-300" />
                </div>
                <div>
                  <p className="text-[10px] text-teal-200">Pemasukan Bulan Ini</p>
                  <p className="text-xs font-bold text-white">
                    {displayAmount(pemasukanBulanIni)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                  <TrendingDown className="h-4 w-4 text-rose-300" />
                </div>
                <div>
                  <p className="text-[10px] text-teal-200">Pengeluaran Bulan Ini</p>
                  <p className="text-xs font-bold text-white">
                    {displayAmount(pengeluaranBulanIni)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Kartu Gajian Hari Ini (Part A: Mode Gajian) */}
        {(paydaySchedule || showSimulatePayday) && (
          <PaydayCard
            schedule={paydaySchedule || SAMPLE_PAYDAY_SCHEDULES[0]}
            wallets={wallets}
            goals={goals}
            defaultLivingCost={settings?.living_cost_per_payday || 400000}
            defaultWalletId={settings?.default_wallet_id || undefined}
            onSuccess={loadDashboardData}
          />
        )}

        {/* 3. Kartu Tagihan Hari Ini (Part B: Transaksi Berulang Jatuh Tempo) */}
        {dueRecurring.length > 0 && (
          <DueRecurringCard
            dueItems={dueRecurring}
            onActionComplete={loadDashboardData}
          />
        )}

        {/* 4. Daftar Kantong & Rekening Dompet */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Kantong & Dompetmu
            </h3>
            <Link
              href="/tambah"
              className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5"
            >
              + Tambah Dompet
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {wallets.map((dompet) => (
              <div
                key={dompet.id}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-xs hover:border-teal-500/40 transition-colors"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: `${dompet.color || "#0d9488"}15`,
                    color: dompet.color || "#0d9488",
                  }}
                >
                  <WalletIcon icon={dompet.icon} color={dompet.color} size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    {dompet.name}
                  </p>
                  <p className="text-[11px] font-extrabold text-foreground tracking-tight">
                    {displayAmount(dompet.balance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Transaksi Terbaru */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Transaksi Terbaru
            </h3>
            <Link
              href="/transaksi"
              className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5"
            >
              Lihat Semua <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card p-3 shadow-xs divide-y divide-border/40">
            {transactions.length > 0 ? (
              transactions.map((trx) => {
                const isExpense = trx.type === "expense";
                const isIncome = trx.type === "income";

                return (
                  <div
                    key={trx.id}
                    className="flex items-center justify-between py-2.5 first:pt-1 last:pb-1 text-xs gap-3"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-foreground truncate">
                        {trx.note || "Transaksi"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {trx.merchant ? `${trx.merchant} • ` : ""}
                        {trx.date.split("T")[0]}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={cn(
                          "font-extrabold tracking-tight",
                          isExpense
                            ? "text-rose-600 dark:text-rose-400"
                            : isIncome
                              ? "text-teal-600 dark:text-teal-400"
                              : "text-foreground"
                        )}
                      >
                        {displayAmount(trx.amount, isExpense)}
                      </p>
                      <span className="text-[9px] font-semibold text-muted-foreground block capitalize">
                        {trx.source || "manual"}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Belum ada transaksi tercatat.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
