"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, PieChart as PieIcon } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, XAxis, Tooltip } from "recharts";
import { formatRupiah } from "@/lib/utils";
import type { AnalyticsData, CategoryExpense, DailyExpense, HealthStatus } from "@/types/analytics";
import type { Transaction } from "@/lib/data/transactions";
import { getCategories, type Category } from "@/lib/data/categories";
import { todayJakarta } from "@/lib/data/sample-mode";
import { SavingsWalletAnalysis } from "@/components/tabungan/savings-wallet-analysis";
import type { WalletBalance } from "@/lib/data/wallets";

const PALETTE = ["#0d9488", "#8b5cf6", "#f59e0b", "#f43f5e", "#0ea5e9", "#84cc16"];

const STATUS: Record<HealthStatus, { label: string; cls: string }> = {
  sehat: { label: "Sehat", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  waspada: { label: "Waspada", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  kritis: { label: "Kritis", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  belum: { label: "Belum ada data", cls: "bg-muted text-muted-foreground" },
};

/** Ringkasan garis besar analisis bulan ini. Detail lengkap ada di halaman Analisis. */
/**
 * Donat ringan: ukuran tetap (tanpa ResponsiveContainer yang mengukur ulang terus), tanpa animasi,
 * dan dibungkus memo supaya tidak digambar ulang tiap kartu di Beranda berubah.
 */
const DonutChart = React.memo(function DonutChart({ data }: { data: CategoryExpense[] }) {
  return (
    <PieChart width={112} height={112}>
      <Pie
        data={data}
        dataKey="nominal"
        nameKey="name"
        innerRadius={32}
        outerRadius={52}
        paddingAngle={3}
        stroke="none"
        isAnimationActive={false}
      >
        {data.map((c, i) => (
          <Cell key={c.id ?? i} fill={PALETTE[i % PALETTE.length]} />
        ))}
      </Pie>
    </PieChart>
  );
});

interface AnalisisCardProps {
  /** Dompet terpilih di kartu Total Saldo. Kosong = semua dompet. */
  walletId?: string | null;
  walletName?: string;
  /** Dompet terpilih (lengkap). Bila dompet tabungan, tampil analisis tabungan, bukan analisis pengeluaran. */
  wallet?: WalletBalance | null;
  /** Transaksi bulan ini; dipakai untuk menghitung ringkasan satu dompet. */
  monthTxs?: Transaction[];
}

/** Hitung ringkasan bulan ini untuk SATU dompet dari daftar transaksi. */
function deriveForWallet(txs: Transaction[], walletId: string, cats: Category[]) {
  const mine = txs.filter((t) => t.wallet_id === walletId);
  let income = 0;
  let expense = 0;
  let saved = 0;
  const byCat = new Map<string, number>();
  const byDay = new Map<string, number>();
  for (const t of mine) {
    const amt = Number(t.amount) || 0;
    if (t.type === "income") income += amt;
    else if (t.type === "goal_deposit") saved += amt;
    else if (t.type === "expense") {
      expense += amt;
      const key = t.category_id ?? "lainnya";
      byCat.set(key, (byCat.get(key) ?? 0) + amt);
      const d = String(t.date).split("T")[0];
      byDay.set(d, (byDay.get(d) ?? 0) + amt);
    }
  }
  const categories: CategoryExpense[] = [...byCat.entries()]
    .map(([id, nominal]) => {
      const c = cats.find((x) => x.id === id);
      return {
        id,
        name: c?.name ?? "Lainnya",
        color: c?.color ?? "#64748b",
        nominal,
        percentage: expense > 0 ? (nominal / expense) * 100 : 0,
      };
    })
    .sort((a, b) => b.nominal - a.nominal);
  const today = todayJakarta();
  const lastDay = Number(today.slice(8, 10));
  const dailyExpenses: DailyExpense[] = Array.from({ length: lastDay }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    const date = `${today.slice(0, 7)}-${day}`;
    return { date, day, amount: byDay.get(date) ?? 0 };
  });
  return {
    totalIncome: income,
    totalExpense: expense,
    savingsRate: income > 0 ? (saved / income) * 100 : 0,
    categories,
    dailyExpenses,
  };
}

export function AnalisisCard({ walletId = null, walletName, wallet = null, monthTxs = [] }: AnalisisCardProps = {}) {
  const [allCategories, setAllCategories] = React.useState<Category[]>([]);
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [hide, setHide] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    getCategories().then(setAllCategories).catch(() => {});
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setMounted(true);
    try {
      setHide(localStorage.getItem("dompet_hide_balance") === "true");
    } catch {}
    const load = async () => {
      try {
        const res = await fetch("/api/analytics?period=month");
        const json = await res.json();
        if (cancelled) return;
        if (json.success && json.data) {
          setData(json.data);
          setFailed(false);
        } else setFailed(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    load();
    window.addEventListener("transaction_created", load);
    return () => {
      cancelled = true;
      window.removeEventListener("transaction_created", load);
    };
  }, []);

  const money = (n: number) => (hide ? "••••••" : formatRupiah(n, { absolute: true }));
  const filtering = !!walletId;
  const derived = React.useMemo(
    () => (walletId ? deriveForWallet(monthTxs, walletId, allCategories) : null),
    [walletId, monthTxs, allCategories],
  );
  const s = filtering ? derived ?? undefined : data?.summary;
  const categories = filtering ? derived?.categories ?? [] : data?.categories ?? [];
  const dailyExpenses = filtering ? derived?.dailyExpenses ?? [] : data?.dailyExpenses ?? [];
  // Status kesehatan dihitung untuk semua dompet, jadi disembunyikan saat satu dompet dipilih.
  const health = filtering ? undefined : data?.financialHealth;
  const top = categories[0];
  const hasData = !!s && (s.totalIncome > 0 || s.totalExpense > 0);

  if (wallet && wallet.id && (wallet.type === "tabungan" || wallet.goal_id)) {
    return (
      <section className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-sm">
        <SavingsWalletAnalysis wallet={{ id: wallet.id, name: wallet.name ?? "Tabungan", goal_id: wallet.goal_id, balance: wallet.balance }} hide={hide} />
        <Link
          href="/tabungan"
          className="flex items-center justify-center gap-1 rounded-xl border border-border/70 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted/50"
        >
          Buka Tabungan <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="ringkas-analisis" className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
            <PieIcon className="h-4 w-4" />
          </span>
          <div>
            <h3 id="ringkas-analisis" className="text-sm font-extrabold leading-tight text-foreground">
              Analisis Keuangan
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {data?.period.label ?? "Bulan ini"} · {filtering ? walletName ?? "Satu dompet" : "Semua dompet"}
            </p>
          </div>
        </div>
        {health && (
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS[health.overallStatus].cls}`}>
            {STATUS[health.overallStatus].label}
          </span>
        )}
      </div>

      {!data && !failed && !filtering && <div className="h-20 animate-pulse rounded-2xl bg-muted/50" aria-label="Memuat analisis" />}
      {failed && !filtering && <p className="text-xs text-muted-foreground">Analisis belum bisa dimuat. Coba buka detailnya.</p>}

      {(filtering || data) && s && (
        <>
          {hasData ? (
            <>
              {/* Donat kategori + daftar */}
              {categories.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="h-28 w-28 shrink-0">
                    {mounted && <DonutChart data={categories} />}
                  </div>
                  <ul className="min-w-0 flex-1 space-y-1.5">
                    {categories.slice(0, 4).map((c, i) => (
                      <li key={c.id ?? i} className="flex items-center gap-2 text-[11px]">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                        <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{c.name}</span>
                        <span className="shrink-0 font-bold tabular-nums text-muted-foreground">{Math.round(c.percentage)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Tren pengeluaran harian */}
              {dailyExpenses.length > 1 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold text-muted-foreground">Pengeluaran harian</p>
                  <div className="h-20 w-full">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyExpenses} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                          <defs>
                            <linearGradient id="homeDaily" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.55} />
                              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="day" hide />
                          <Tooltip
                            formatter={(v) => [money(Number(v)), "Keluar"]}
                            labelFormatter={(l) => `Tgl ${l}`}
                            contentStyle={{ borderRadius: 12, fontSize: 11, border: "none", background: "rgba(24,24,27,0.95)", color: "#fff" }}
                          />
                          <Area type="monotone" dataKey="amount" stroke="#f43f5e" strokeWidth={2} fill="url(#homeDaily)" isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground">Masuk</p>
                  <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{money(s.totalIncome)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Keluar</p>
                  <p className="text-xs font-extrabold text-rose-600 dark:text-rose-400">{money(s.totalExpense)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Menabung</p>
                  <p className="text-xs font-extrabold text-foreground">{Math.round(s.savingsRate)}%</p>
                </div>
              </div>
              {top && (
                <p className="text-[11px] text-muted-foreground">
                  Pengeluaran terbesar: <b className="text-foreground">{top.name}</b> ({Math.round(top.percentage)}%)
                </p>
              )}
            </>
          ) : (
            <p className="rounded-2xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">
              {filtering ? "Dompet ini belum punya transaksi bulan ini." : "Belum ada transaksi bulan ini. Catat transaksi pertamamu untuk melihat ringkasan."}
            </p>
          )}
        </>
      )}

      <Link
        href="/analisis"
        className="flex items-center justify-center gap-1 rounded-xl border border-border/70 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted/50"
      >
        Lihat detail analisis <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
