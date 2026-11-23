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
import { formatRupiah, formatTanggalWIB, cn } from "@/lib/utils";
import { AnalisisCard } from "./analisis-card";
import { TotalSaldoCarousel } from "./total-saldo-carousel";
import { WalletDetailSheet } from "@/components/wallet/wallet-detail-sheet";
import { PaydayCard } from "./payday-card";
import { DueRecurringCard } from "./due-recurring-card";
import { getWallets, ensureDefaultWallet, type WalletBalance } from "@/lib/data/wallets";
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
import { USE_SAMPLE_DATA, todayJakarta } from "@/lib/data/sample-mode";

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
  const [monthTxs, setMonthTxs] = React.useState<Transaction[]>(initialTransactions);
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

  // Dompet yang sedang dibuka detailnya
  const [detailWallet, setDetailWallet] = React.useState<WalletBalance | null>(null);
  // Dompet yang dipilih di kartu Total Saldo (null = semua dompet); dipakai kartu Analisis.
  const [filterWalletId, setFilterWalletId] = React.useState<string | null>(null);

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
      const today = todayJakarta();
      const [wList, tList, gList, pSched, dRec, sData, mList] = await Promise.all([
        getWallets().catch(() => initialWallets),
        getTransactions({ limit: 5 }).catch(() => initialTransactions),
        getSavingsGoals().catch(() => initialGoals),
        getTodayPaydaySchedule(todayJakarta()).catch(() => (USE_SAMPLE_DATA ? SAMPLE_PAYDAY_SCHEDULES[0] : null)),
        getDueRecurringTransactions(todayJakarta()).catch(() => (USE_SAMPLE_DATA ? SAMPLE_RECURRING : [])),
        getUserSettings().catch(() => null),
        getTransactions({ startDate: `${today.slice(0, 7)}-01`, endDate: today }).catch(() => null),
      ]);
      if (mList) setMonthTxs(mList);

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
    // Pastikan dompet Uang Tunai bawaan ada, baru muat data
    ensureDefaultWallet().finally(loadDashboardData);

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

  // Masking Saldo jika hideBalance aktif
  const displayAmount = (amt: bigint | number, isNegative = false) => {
    if (hideBalance) {
      return "••••••••";
    }
    return formatRupiah(amt, { absolute: true });
  };

  return (
    <div className="flex flex-col flex-1 pb-44">
      <TopHeader
        title="Dompetku"
        subtitle="Halo! Keuanganmu terkendali hari ini ✨"
      />

      <div className="space-y-5 px-4 pb-4 pt-5">
        {/* 1. Saldo: pilih Total Saldo atau dompet tertentu lewat menu di kartu */}
        <TotalSaldoCarousel
          wallets={wallets}
          hideBalance={hideBalance}
          onToggleHide={toggleHideBalance}
          display={displayAmount}
          monthTxs={monthTxs}
          onSelectWallet={setDetailWallet}
          onSelectedChange={setFilterWalletId}
        />

        {/* 2. Kartu Gajian Hari Ini (Part A: Mode Gajian) */}
        {(paydaySchedule || (USE_SAMPLE_DATA && showSimulatePayday)) && (
          <PaydayCard
            schedule={paydaySchedule || SAMPLE_PAYDAY_SCHEDULES[0]}
            wallets={wallets.filter((w) => w.type !== "tabungan" && !w.goal_id)}
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

        {/* Menu grid ala Livin' (FeatureMenu) disembunyikan dulu sampai fitur tambahan banyak */}
        <AnalisisCard
          walletId={filterWalletId}
          walletName={wallets.find((w) => w.id === filterWalletId)?.name}
          monthTxs={monthTxs}
        />

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
                  <Link
                    key={trx.id}
                    href={`/transaksi?id=${trx.id}`}
                    aria-label={`Lihat detail transaksi ${trx.note || "Transaksi"}`}
                    className="flex cursor-pointer items-center justify-between gap-3 py-2.5 text-xs transition-colors first:pt-1 last:pb-1 hover:bg-muted/40 active:scale-[0.99]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground truncate">
                        {trx.note || "Transaksi"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {trx.merchant ? `${trx.merchant} • ` : ""}
                        {formatTanggalWIB(trx.date.split("T")[0])}
                      </p>
                    </div>

                    <div className="w-28 shrink-0 text-right tabular-nums">
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
                        {isExpense ? "-" : isIncome ? "+" : ""}
                        {displayAmount(trx.amount, isExpense)}
                      </p>
                      <span className="text-[9px] font-semibold text-muted-foreground block capitalize">
                        {trx.source || "manual"}
                      </span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </Link>
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
      <WalletDetailSheet
        wallet={detailWallet}
        allWallets={wallets}
        hideBalance={hideBalance}
        onClose={() => setDetailWallet(null)}
        onChanged={loadDashboardData}
      />
    </div>
  );
}
