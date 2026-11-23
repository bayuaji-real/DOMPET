"use client";

import * as React from "react";
import { TopHeader } from "@/components/layout/top-header";
import { formatRupiah } from "@/lib/utils";
import { WalletIcon } from "@/components/wallet/wallet-icon";
import { BudgetCard } from "@/components/analytics/budget-card";
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Sparkles,
  Lightbulb,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Calendar,
  Store,
  Wallet,
  Receipt,
  Loader2,
  RefreshCw,
  ChevronRight,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  X,
  Info,
  PieChart as PieIcon,
  BarChart3,
  LineChart as LineIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";
import type {
  AnalyticsPeriod,
  AnalyticsData,
  AIInsightResult,
} from "@/types/analytics";

const PALETTE = ["#0d9488", "#8b5cf6", "#f59e0b", "#f43f5e", "#0ea5e9", "#84cc16", "#ec4899", "#f97316"];

interface AnalisisClientProps {
  initialData: AnalyticsData;
}

export function AnalisisClient({ initialData }: AnalisisClientProps) {
  const [isMounted, setIsMounted] = React.useState(false);
  const [period, setPeriod] = React.useState<AnalyticsPeriod>(
    initialData.period.type || "month"
  );
  const [data, setData] = React.useState<AnalyticsData>(initialData);
  const [isLoading, setIsLoading] = React.useState(true);

  // Custom Date Range State
  const [showCustomModal, setShowCustomModal] = React.useState(false);
  const [customStart, setCustomStart] = React.useState(initialData.period.startDate);
  const [customEnd, setCustomEnd] = React.useState(initialData.period.endDate);

  // Top list tab switcher
  const [catView, setCatView] = React.useState<"donat" | "batang" | "garis">("donat");
  const [flowView, setFlowView] = React.useState<"batang" | "garis">("batang");
  const [topTab, setTopTab] = React.useState<"transactions" | "merchants">("transactions");

  // AI Insight State ("Insight AI")
  const [insight, setInsight] = React.useState<AIInsightResult | null>(null);
  const [isInsightLoading, setIsInsightLoading] = React.useState(false);
  const [insightError, setInsightError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch Analytics Data saat ganti periode
  const fetchData = React.useCallback(
    async (p: AnalyticsPeriod, sDate?: string, eDate?: string) => {
      try {
        const cached = sessionStorage.getItem(`dompet_analisis_${p}_${sDate ?? ""}_${eDate ?? ""}`);
        if (cached) {
          setData(JSON.parse(cached));
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }
      } catch {
        setIsLoading(true);
      }
      try {
        let url = `/api/analytics?period=${p}`;
        if (p === "custom" && sDate && eDate) {
          url += `&startDate=${sDate}&endDate=${eDate}`;
        }
        const res = await fetch(url);
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
          try {
            sessionStorage.setItem(`dompet_analisis_${p}_${sDate ?? ""}_${eDate ?? ""}`, JSON.stringify(json.data));
          } catch {}
        }
      } catch (err) {
        console.error("Gagal memuat data analisis:", err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Data awal dari server tidak membawa sesi login pengguna: selalu muat ulang data asli saat halaman dibuka
  React.useEffect(() => {
    fetchData(initialData.period.type || "month");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePeriodChange = (newPeriod: AnalyticsPeriod) => {
    if (newPeriod === "custom") {
      setShowCustomModal(true);
      return;
    }
    setPeriod(newPeriod);
    setInsight(null);
    fetchData(newPeriod);
  };

  // Request Insight AI (Gemini API)
  const handleRequestInsight = async (force = false) => {
    if (!data || isInsightLoading) return;
    setIsInsightLoading(true);
    setInsightError(null);

    try {
      const res = await fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodKey: `${data.period.startDate}:${data.period.endDate}`,
          periodLabel: data.period.label,
          startDate: data.period.startDate,
          endDate: data.period.endDate,
          summary: data.summary,
          topCategories: data.categories.slice(0, 4).map((c) => ({
            name: c.name,
            nominal: c.nominal,
            percentage: c.percentage,
          })),
          forceRefresh: force,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal membuat wawasan");
      }

      setInsight(json.data);
    } catch (err: any) {
      console.error("Gagal mendapatkan wawasan:", err);
      setInsightError(err.message || "Mohon maaf, jaringan kami sedang padat. Coba sebentar lagi ya.");
    } finally {
      setIsInsightLoading(false);
    }
  };

  const periodOptions: { id: AnalyticsPeriod; label: string }[] = [
    { id: "week", label: "Minggu Ini" },
    { id: "month", label: "Bulan Ini" },
    { id: "last_month", label: "Bulan Lalu" },
    { id: "3months", label: "3 Bulan" },
    { id: "custom", label: "Kustom" },
  ];

  return (
    <div className="flex flex-col flex-1 pb-24">
      <TopHeader
        title="Analisis Keuangan"
        subtitle="Wawasan arus kas & kebiasaan belanjamu"
      />

      <div className="space-y-4 p-4">
        {/* 1. Pemilih Periode Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {periodOptions.map((opt) => {
            const isActive = period === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handlePeriodChange(opt.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Modal Periode Kustom */}
        {showCustomModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-card border border-border/80 shadow-2xl p-4.5 space-y-3.5 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Pilih Rentang Tanggal</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2.5 pt-1 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full h-10 rounded-xl border border-border/70 bg-muted/30 px-3 text-xs text-foreground focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full h-10 rounded-xl border border-border/70 bg-muted/30 px-3 text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="w-1/2 h-10 rounded-xl border border-border/80 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriod("custom");
                    setShowCustomModal(false);
                    setInsight(null);
                    fetchData("custom", customStart, customEnd);
                  }}
                  className="w-1/2 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Spinner saat fetch periode baru */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-teal-600 dark:text-teal-400 font-semibold animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Memuat data terbaru...</span>
          </div>
        )}

        {/* 2. Kartu Kesehatan Keuangan (Health Status) */}
        <div
          className={`rounded-3xl border p-4 space-y-3.5 transition-all shadow-xs ${
            data.financialHealth.overallStatus === "sehat"
              ? "border-teal-500/40 bg-teal-500/10 text-foreground"
              : data.financialHealth.overallStatus === "waspada"
                ? "border-amber-500/40 bg-amber-500/10 text-foreground"
                : "border-rose-500/40 bg-rose-500/10 text-foreground"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 ${
                  data.financialHealth.overallStatus === "sehat"
                    ? "bg-teal-500/20 text-teal-600 dark:text-teal-400"
                    : data.financialHealth.overallStatus === "waspada"
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      : data.financialHealth.overallStatus === "belum"
                        ? "bg-muted text-muted-foreground"
                        : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                }`}
              >
                {data.financialHealth.overallStatus === "sehat" ? (
                  <ShieldCheck className="h-5 w-5" />
                ) : data.financialHealth.overallStatus === "waspada" ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : data.financialHealth.overallStatus === "belum" ? (
                  <Info className="h-5 w-5" />
                ) : (
                  <Flame className="h-5 w-5" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Status Keuangan
                </span>
                <h3 className="text-sm font-extrabold text-foreground">
                  {data.financialHealth.overallStatus === "sehat"
                    ? "Kondisi Sehat ✨"
                    : data.financialHealth.overallStatus === "waspada"
                      ? "Perlu Waspada ⚠️"
                      : data.financialHealth.overallStatus === "belum"
                        ? "Belum Bisa Dinilai"
                        : "Kondisi Kritis 🚨"}
                </h3>
              </div>
            </div>

            <span
              className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                data.financialHealth.overallStatus === "sehat"
                  ? "bg-teal-500/20 text-teal-700 dark:text-teal-300"
                  : data.financialHealth.overallStatus === "waspada"
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                    : data.financialHealth.overallStatus === "belum"
                      ? "bg-muted text-muted-foreground"
                      : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
              }`}
            >
              {data.financialHealth.overallStatus === "belum" ? "belum ada data" : data.financialHealth.overallStatus}
            </span>
          </div>

          {/* 3 Indikator Kesehatan */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40 text-center">
            <div className="bg-background/50 rounded-2xl p-2 space-y-0.5 border border-border/40">
              <p className="text-[9px] text-muted-foreground font-semibold">Rasio Menabung</p>
              <p className="text-xs font-extrabold text-foreground">{data.financialHealth.savingsRate}%</p>
              <span
                className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                  data.financialHealth.savingsRateStatus === "sehat"
                    ? "bg-teal-500/15 text-teal-600 dark:text-teal-400"
                    : data.financialHealth.savingsRateStatus === "waspada"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : data.financialHealth.savingsRateStatus === "belum"
                        ? "bg-muted text-muted-foreground"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                }`}
              >
                {data.financialHealth.savingsRateStatus === "belum" ? "belum ada data" : data.financialHealth.savingsRateStatus}
              </span>
            </div>

            <div className="bg-background/50 rounded-2xl p-2 space-y-0.5 border border-border/40">
              <p className="text-[9px] text-muted-foreground font-semibold">Dana Darurat</p>
              <p className="text-xs font-extrabold text-foreground">{data.financialHealth.emergencyFundMonths} bln</p>
              <span
                className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                  data.financialHealth.emergencyStatus === "sehat"
                    ? "bg-teal-500/15 text-teal-600 dark:text-teal-400"
                    : data.financialHealth.emergencyStatus === "waspada"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : data.financialHealth.emergencyStatus === "belum"
                        ? "bg-muted text-muted-foreground"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                }`}
              >
                {data.financialHealth.emergencyStatus === "belum" ? "belum ada data" : data.financialHealth.emergencyStatus}
              </span>
            </div>

            <div className="bg-background/50 rounded-2xl p-2 space-y-0.5 border border-border/40">
              <p className="text-[9px] text-muted-foreground font-semibold">Tabungan</p>
              <p className="text-xs font-extrabold text-foreground">
                {data.financialHealth.goalsOnTrack ? "Sesuai" : "Telat"}
              </p>
              <span
                className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                  data.financialHealth.goalsOnTrack
                    ? "bg-teal-500/15 text-teal-600 dark:text-teal-400"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                }`}
              >
                {data.financialHealth.goalsOnTrack ? "on-track" : "perlu cek"}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Ringkasan Arus Kas (Grid 2x2: Pemasukan, Pengeluaran, Cashflow, Rasio Tabungan) */}
        <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <div>
              <h3 className="text-xs font-bold text-foreground">Ringkasan Arus Kas</h3>
              <p className="text-[10px] text-muted-foreground">{data.period.label}</p>
            </div>
            <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              {data.period.daysCount} hari
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Pemasukan */}
            <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-3 space-y-1">
              <span className="flex items-center justify-between text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> Pemasukan
                </span>
                {data.summary.incomeChangePct !== 0 && (
                  <span className="text-[9px] font-bold">
                    {data.summary.incomeChangePct > 0 ? "↑" : "↓"} {Math.abs(data.summary.incomeChangePct)}%
                  </span>
                )}
              </span>
              <p className="text-base font-extrabold text-teal-600 dark:text-teal-400 tracking-tight">
                {formatRupiah(data.summary.totalIncome, { absolute: true })}
              </p>
            </div>

            {/* Pengeluaran */}
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3 space-y-1">
              <span className="flex items-center justify-between text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" /> Pengeluaran
                </span>
                {data.summary.expenseChangePct !== 0 && (
                  <span className="text-[9px] font-bold">
                    {data.summary.expenseChangePct > 0 ? "↑" : "↓"} {Math.abs(data.summary.expenseChangePct)}%
                  </span>
                )}
              </span>
              <p className="text-base font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
                {formatRupiah(data.summary.totalExpense, { absolute: true })}
              </p>
            </div>

            {/* Arus Kas Bersih (Sisa) */}
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-3 space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground block">
                Selisih (Cashflow)
              </span>
              <p
                className={`text-base font-extrabold tracking-tight ${
                  data.summary.cashflow >= 0
                    ? "text-teal-600 dark:text-teal-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatRupiah(data.summary.cashflow, { absolute: true })}
              </p>
            </div>

            {/* Rasio Menabung */}
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-3 space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                <PiggyBank className="h-3 w-3 text-teal-500" /> Rasio Menabung
              </span>
              <div className="flex items-baseline gap-1">
                <p className="text-base font-extrabold text-foreground">
                  {data.summary.savingsRate}%
                </p>
                <span className="text-[9px] text-muted-foreground">
                  ({formatRupiah(data.summary.savingsAmount, { absolute: true })})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Insight Otomatis ("Insight AI") */}
        <div className="rounded-3xl border border-teal-500/30 bg-teal-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-foreground">Insight AI ✨</h3>
                <p className="text-[10px] text-muted-foreground">Rangkuman santai & saran hemat</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleRequestInsight(true)}
              disabled={isInsightLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
            >
              {isInsightLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menganalisis...
                </>
              ) : insight ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Perbarui
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Insight AI
                </>
              )}
            </button>
          </div>

          {insightError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {insightError}
            </div>
          )}

          {insight ? (
            <div className="space-y-2.5 pt-1 animate-in fade-in">
              <div className="space-y-1.5">
                {insight.insights.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                    <p>{item}</p>
                  </div>
                ))}
              </div>

              {insight.actionableTip && (
                <div className="rounded-2xl border border-teal-500/40 bg-teal-500/15 p-3 flex items-start gap-2.5 mt-2">
                  <Lightbulb className="h-4 w-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-teal-800 dark:text-teal-200 block text-[11px]">
                      Saran Konkret:
                    </span>
                    <p className="text-foreground leading-relaxed text-[11px]">{insight.actionableTip}</p>
                  </div>
                </div>
              )}
            </div>
          ) : !isInsightLoading ? (
            <div className="rounded-2xl border border-dashed border-teal-500/30 p-3.5 text-center">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ketuk tombol <strong>&ldquo;Insight AI&rdquo;</strong> di atas untuk mendapatkan rangkuman kebiasaan belanjamu dan rekomendasi hemat!
              </p>
            </div>
          ) : (
            <div className="py-4 flex flex-col items-center justify-center gap-2 text-center">
              <Loader2 className="h-6 w-6 text-teal-500 animate-spin" />
              <p className="text-xs text-muted-foreground">Sedang membaca pola dan menghitung tren...</p>
            </div>
          )}
        </div>

        {/* 5. Donut Chart Pengeluaran per Kategori */}
        <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <div>
              <h3 className="text-xs font-bold text-foreground">Pengeluaran per Kategori</h3>
              <p className="text-[10px] text-muted-foreground">Kelompok transaksi periode ini</p>
            </div>
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
              Total: {formatRupiah(data.summary.totalExpense, { absolute: true })}
            </span>
          </div>

          <div className="inline-flex gap-1 rounded-xl bg-muted/50 p-1" role="group" aria-label="Bentuk grafik kategori">
            {([["donat", PieIcon, "Grafik donat"], ["batang", BarChart3, "Grafik batang"], ["garis", LineIcon, "Grafik garis"]] as const).map(([id, Icon, lbl]) => (
              <button
                key={id}
                type="button"
                aria-pressed={catView === id}
                aria-label={lbl}
                title={lbl}
                onClick={() => setCatView(id)}
                className={`flex h-8 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors ${catView === id ? "bg-card text-teal-600 shadow-sm" : "text-muted-foreground"}`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          {isMounted && data.categories.length > 0 ? (
            <div className="space-y-4">
              {/* Donut Chart */}
              {catView === "donat" ? (
              <div className="h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <RechartsTooltip
                      formatter={(value: any) => [
                        formatRupiah(Number(value), { absolute: true }),
                        "Pengeluaran",
                      ]}
                      contentStyle={{
                        backgroundColor: "rgba(24, 24, 27, 0.95)",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        fontSize: "11px",
                        color: "#fff",
                      }}
                    />
                    <Pie
                      data={data.categories}
                      dataKey="nominal"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {data.categories.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              ) : catView === "garis" ? (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.categories.slice(0, 8)} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#71717a" tickLine={false} axisLine={false} interval={0} tickFormatter={(v: string) => (v.length > 6 ? v.slice(0, 6) + "…" : v)} />
                      <YAxis tick={{ fontSize: 9 }} stroke="#71717a" tickLine={false} axisLine={false} tickFormatter={(v: number) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : `${Math.round(v / 1000)}rb`)} />
                      <RechartsTooltip formatter={(value: any) => [formatRupiah(Number(value), { absolute: true }), "Pengeluaran"]} contentStyle={{ backgroundColor: "rgba(24,24,27,0.95)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", fontSize: "11px", color: "#fff" }} />
                      <Line type="monotone" dataKey="nominal" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data.categories.map((cat) => (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-foreground">
                        <span className="truncate">{cat.name}</span>
                        <span>{formatRupiah(cat.nominal, { absolute: true })}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, cat.percentage))}%`, backgroundColor: PALETTE[data.categories.indexOf(cat) % PALETTE.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Daftar Kategori Terurut */}
              <div className="space-y-2 divide-y divide-border/30">
                {data.categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between pt-2 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-3 w-3 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: PALETTE[data.categories.indexOf(cat) % PALETTE.length] }}
                      />
                      <span className="font-semibold text-foreground truncate">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-foreground">
                        {formatRupiah(cat.nominal, { absolute: true })}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground w-11 text-right">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Belum ada data transaksi pengeluaran pada periode ini.
            </div>
          )}
        </div>

        {/* 5B. Anggaran per Kategori (Batas Bulanan & Alert 80%/100%) */}
        <BudgetCard
          categories={data.categories}
          monthLabel={data.period.label}
        />

        {/* 6. Bar Chart Tren Arus Kas 6 Bulan (Pemasukan vs Pengeluaran) */}
        <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <div>
              <h3 className="text-xs font-bold text-foreground">Tren Arus Kas (6 Bulan Terakhir)</h3>
              <p className="text-[10px] text-muted-foreground">Pemasukan vs Pengeluaran per bulan</p>
            </div>
            <div className="flex items-center gap-2.5 text-[10px]">
              <div className="inline-flex gap-0.5 rounded-lg bg-muted/50 p-0.5" role="group" aria-label="Bentuk grafik arus kas">
                {([["batang", BarChart3, "Grafik batang"], ["garis", LineIcon, "Grafik garis"]] as const).map(([id, Icon, lbl]) => (
                  <button key={id} type="button" aria-pressed={flowView === id} aria-label={lbl} title={lbl} onClick={() => setFlowView(id)}
                    className={`flex h-7 w-8 cursor-pointer items-center justify-center rounded-md ${flowView === id ? "bg-card text-teal-600 shadow-sm" : "text-muted-foreground"}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
              <span className="flex items-center gap-1 font-semibold text-teal-600 dark:text-teal-400">
                <span className="h-2 w-2 rounded-full bg-teal-500" /> Masuk
              </span>
              <span className="flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Keluar
              </span>
            </div>
          </div>

          {isMounted && data.monthlyCashflow.length > 0 ? (
            <div className="h-52 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {flowView === "garis" ? (
                <LineChart data={data.monthlyCashflow} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    stroke="#71717a"
                    fontSize={10}
                    interval={0}
                    tickFormatter={(v: string) => String(v).split(" ")[0]}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}jt` : val >= 1000 ? `${Math.round(val / 1000)}rb` : `${val}`)}
                  />
                  <RechartsTooltip
                    formatter={(value: any, name: any) => [
                      formatRupiah(Number(value), { absolute: true }),
                      name === "income" ? "Pemasukan" : "Pengeluaran",
                    ]}
                    contentStyle={{
                      backgroundColor: "rgba(24, 24, 27, 0.95)",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      fontSize: "11px",
                      color: "#fff",
                    }}
                  />
                  <Line type="monotone" dataKey="income" stroke="#0d9488" strokeWidth={3} dot={{ r: 4, fill: "#0d9488", strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: "#f43f5e", strokeWidth: 0 }} />
                </LineChart>
                ) : (
                                <BarChart data={data.monthlyCashflow} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    stroke="#71717a"
                    fontSize={10}
                    interval={0}
                    tickFormatter={(v: string) => String(v).split(" ")[0]}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}jt` : val >= 1000 ? `${Math.round(val / 1000)}rb` : `${val}`)}
                  />
                  <RechartsTooltip
                    formatter={(value: any, name: any) => [
                      formatRupiah(Number(value), { absolute: true }),
                      name === "income" ? "Pemasukan" : "Pengeluaran",
                    ]}
                    contentStyle={{
                      backgroundColor: "rgba(24, 24, 27, 0.95)",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      fontSize: "11px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="income" fill="#14b8a6" radius={[6, 6, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="expense" fill="#fb7185" radius={[6, 6, 0, 0]} maxBarSize={18} />
                </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Memuat grafik tren bulanan...
            </div>
          )}
        </div>

        {/* 7. Area Chart Pengeluaran Harian & Rata-rata per Hari */}
        <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <div>
              <h3 className="text-xs font-bold text-foreground">Pengeluaran Harian</h3>
              <p className="text-[10px] text-muted-foreground">Aktivitas belanja per tanggal</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground block">Rata-rata/hari</span>
              <span className="text-xs font-extrabold text-foreground">
                {formatRupiah(data.dailyAverage, { absolute: true })}
              </span>
            </div>
          </div>

          {isMounted && data.dailyExpenses.length > 0 ? (
            <div className="h-44 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailyExpenses} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    stroke="#71717a"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(0) + "rb" : val}`}
                  />
                  <RechartsTooltip
                    formatter={(val: any) => [
                      formatRupiah(Number(val), { absolute: true }),
                      "Pengeluaran",
                    ]}
                    labelFormatter={(label) => `Tanggal ${label}`}
                    contentStyle={{
                      backgroundColor: "rgba(24, 24, 27, 0.95)",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      fontSize: "11px",
                      color: "#fff",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#expenseGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Memuat grafik harian...
            </div>
          )}
        </div>

        {/* 8. Pengeluaran per Dompet */}
        <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <div>
              <h3 className="text-xs font-bold text-foreground">Pengeluaran per Dompet</h3>
              <p className="text-[10px] text-muted-foreground">Rekening dan dompet yang dipakai belanja</p>
            </div>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="space-y-3">
            {data.wallets.map((w) => (
              <div key={w.walletId} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${w.color}20`, color: w.color }}
                    >
                      <WalletIcon icon={w.icon} color={w.color} size={16} />
                    </div>
                    <span className="font-semibold text-foreground truncate">{w.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-foreground">
                      {formatRupiah(w.nominal, { absolute: true })}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground w-10 text-right">
                      {w.percentage}%
                    </span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, w.percentage))}%`,
                      backgroundColor: w.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 9. Top 5 Transaksi & Toko Paling Sering */}
        <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm space-y-3.5">
          {/* Tab Switcher */}
          <div className="flex rounded-2xl bg-muted/40 p-1 border border-border/50">
            <button
              type="button"
              onClick={() => setTopTab("transactions")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                topTab === "transactions"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Top 5 Terbesar
            </button>
            <button
              type="button"
              onClick={() => setTopTab("merchants")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                topTab === "merchants"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Toko Terbanyak
            </button>
          </div>

          {topTab === "transactions" ? (
            <div className="space-y-2.5 divide-y divide-border/30">
              {data.topTransactions.map((trx, idx) => (
                <div key={trx.id} className="flex items-center justify-between pt-2.5 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="h-6 w-6 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{trx.judul}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {trx.merchant ? `${trx.merchant} • ` : ""}
                        {trx.kategori} • {trx.dompet}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-rose-600 dark:text-rose-400">
                      {formatRupiah(trx.nominal, { absolute: true })}
                    </p>
                    <p className="text-[9px] text-muted-foreground">{trx.tanggal}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5 divide-y divide-border/30">
              {data.topMerchants.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between pt-2.5 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="h-7 w-7 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <Store className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{m.merchant}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {m.visitCount} kali transaksi
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-foreground">
                      {formatRupiah(m.totalSpent, { absolute: true })}
                    </p>
                    <p className="text-[9px] text-muted-foreground">total belanja</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
