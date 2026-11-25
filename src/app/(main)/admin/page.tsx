"use client";

import * as React from "react";
import Link from "next/link";
import { Pill, Stat, IconBox, chipCls, type PillTone } from "@/components/ui/form-kit";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/konsultan/money-input";
import { useConfirm } from "@/components/ui/use-confirm";
import { notify } from "@/lib/notify";
import { formatRupiah } from "@/lib/utils";
import * as A from "@/lib/data/admin";
import * as P from "@/lib/data/payment";
import { getSnapshots, type SnapshotRow } from "@/lib/data/invest";
import { MfaChallenge } from "@/components/security/mfa";
import { AdminAcuanSection } from "./acuan-section";
import { PaymentsTab } from "./payments-tab";
import { apiAlert } from "@/lib/admin-alert";
import { Select } from "@/components/ui/select";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Cpu,
  Settings,
  Inbox,
  TrendingUp,
  FileText,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  MessageSquareText,
  Bug,
  Lightbulb,
  Search,
  Filter,
  Check,
  Image as ImageIcon,
  AlertCircle,
  BarChart3,
  HelpCircle,
  X,
} from "lucide-react";

type Tab = "ringkasan" | "bayar" | "pengguna" | "laporan" | "api" | "pengaturan" | "permintaan" | "pasar" | "catatan";

interface TabDef {
  id: Tab;
  label: string;
  icon: string;
  iconComponent: React.ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
  { id: "ringkasan", label: "Ringkasan", icon: "📊", iconComponent: LayoutDashboard },
  { id: "bayar", label: "Bayar", icon: "💸", iconComponent: CreditCard },
  { id: "pengguna", label: "Pengguna", icon: "👥", iconComponent: Users },
  { id: "laporan", label: "Laporan Pelanggan", icon: "💬", iconComponent: MessageSquareText },
  { id: "api", label: "API", icon: "⚡", iconComponent: Cpu },
  { id: "pengaturan", label: "Pengaturan", icon: "⚙️", iconComponent: Settings },
  { id: "permintaan", label: "Minta", icon: "📨", iconComponent: Inbox },
  { id: "pasar", label: "Pasar", icon: "📈", iconComponent: TrendingUp },
  { id: "catatan", label: "Catatan", icon: "📝", iconComponent: FileText },
];

const FEATURE_LABEL: Record<string, string> = {
  tabungan: "Tabungan",
  konsultasi: "Chat Ruby",
  struk: "Scan struk",
  suara: "Suara",
  insight: "Insight",
  rencana: "Rencana",
  impor: "Impor",
};

const fmtDate = (s: string | null) => (s ? s.slice(0, 10) : "-");

export default function AdminPage() {
  const [role, setRole] = React.useState<"admin" | "superadmin" | null | undefined>(undefined);
  const [tab, setTab] = React.useState<Tab>("ringkasan");
  const [mfa, setMfa] = React.useState<A.MfaStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const reload = React.useCallback(() => {
    setIsRefreshing(true);
    A.getMfaStatus()
      .then((s) => {
        setMfa(s);
        setRole(s.role);
      })
      .catch(() => {
        A.getMyAdminRole().then(setRole);
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload, refreshKey]);

  const locked = !!mfa && mfa.require_mfa && mfa.aal !== "aal2";

  return (
    <div data-admin-root="true" className="min-h-screen w-full bg-slate-50/70 font-sans text-foreground dark:bg-zinc-950">
      {/* 1. Header Bar Khusus Desktop Laptop */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-teal-600 font-black text-white shadow-xs">
              D
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-foreground">DOMPETKU</span>
                <span className="rounded-md bg-teal-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-300">
                  Admin Console
                </span>
                <span className="hidden items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 sm:inline-flex dark:text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Sistem Produksi Aktif
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pusat kendali dan monitoring bisnis untuk Owner
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {role && (
              <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-2.5 py-1 text-xs font-semibold shadow-2xs">
                <ShieldCheck className="size-3.5 text-teal-600 dark:text-teal-400" />
                <span>{role === "superadmin" ? "Superadmin" : "Admin"}</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRefreshKey((k) => k + 1);
                notify("Memperbarui data dashboard...");
              }}
              disabled={isRefreshing}
              className="h-8 gap-1.5 rounded-xl text-xs font-semibold"
            >
              <RotateCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>
            <Link
              href="/beranda"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <span className="hidden sm:inline">Buka Aplikasi</span>
              <ExternalLink className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* 2. Baris Navigasi Tab Desktop */}
        {role && !locked && (
          <div className="border-t border-border/50 bg-background">
            <div className="mx-auto flex max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <nav role="tablist" aria-label="Bagian admin" className="flex gap-1 py-1.5">
                {TABS.map((t) => {
                  const active = tab === t.id;
                  const Icon = t.iconComponent;
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      type="button"
                      aria-selected={active}
                      onClick={() => setTab(t.id)}
                      className={`group flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                        active
                          ? "bg-teal-500/15 text-teal-700 shadow-2xs dark:bg-teal-500/20 dark:text-teal-200"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      }`}
                    >
                      <Icon className={`size-4 transition-transform group-hover:scale-110 ${active ? "text-teal-600 dark:text-teal-300" : "text-muted-foreground"}`} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* 3. Area Konten Utama Desktop (Lebar Maksimal, Lega untuk Laptop) */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {role === undefined && (
          <div className="space-y-4">
            <div className="h-10 w-48 animate-pulse rounded-xl bg-muted" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          </div>
        )}

        {role === null && (
          <div role="alert" className="mx-auto max-w-md rounded-3xl border border-rose-500/30 bg-card p-6 text-center shadow-xs">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-2xl text-rose-600">
              ⛔
            </div>
            <h2 className="text-base font-bold text-foreground">Akses Terbatas</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Halaman ini hanya untuk admin.
            </p>
            <div className="mt-5">
              <Link href="/beranda" className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground">
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        )}

        {role && locked && (
          <MfaChallenge onDone={reload} title="Admin wajib memakai kode MFA. Masukkan kode dari aplikasi authenticator." />
        )}

        {role && !locked && (
          <div className="space-y-6">
            {role === "superadmin" && mfa && (
              <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
                <MfaSwitch status={mfa} onChange={reload} />
              </div>
            )}

            {tab === "ringkasan" && (
              <SummaryTab
                onGoBayar={() => setTab("bayar")}
                onGoPengguna={() => setTab("pengguna")}
                onGoPengaturan={() => setTab("pengaturan")}
                onGoLaporan={() => setTab("laporan")}
              />
            )}
            {tab === "bayar" && <PaymentsTab />}
            {tab === "pengguna" && <UsersTab isSuper={role === "superadmin"} />}
            {tab === "laporan" && <ReportsTab />}
            {tab === "api" && <ApiTab isSuper={role === "superadmin"} />}
            {tab === "pengaturan" && <SettingsTab isSuper={role === "superadmin"} />}
            {tab === "permintaan" && <RequestsTab />}
            {tab === "pasar" && (
              <div className="space-y-6">
                <AdminAcuanSection />
                <MarketTab />
              </div>
            )}
            {tab === "catatan" && <AuditTab />}
          </div>
        )}
      </main>
    </div>
  );
}

function useLoad<T>(fn: () => Promise<T>) {
  const [data, setData] = React.useState<T | null>(null);
  const [err, setErr] = React.useState("");
  const load = React.useCallback(() => {
    fn()
      .then((d) => {
        setData(d);
        setErr("");
      })
      .catch((e) => setErr(A.adminErrorText(e)));
  }, [fn]);
  React.useEffect(() => {
    load();
  }, [load]);
  return { data, err, load };
}

const Err = ({ t }: { t: string }) =>
  t ? (
    <div role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs font-semibold text-rose-800 dark:text-rose-200">
      {t}
    </div>
  ) : null;

const Skel = () => <div className="h-40 animate-pulse rounded-3xl bg-muted" aria-busy="true" />;

async function act(fn: () => Promise<unknown>, ok: string, after: () => void) {
  try {
    await fn();
    notify(ok);
    after();
  } catch (e) {
    notify(A.adminErrorText(e));
  }
}

/**
 * Tab 1: Ringkasan Metrik Dashboard (Executive Laptop Dashboard)
 * Menampilkan seluruh KPI, antrean pembayaran yang perlu verifikasi, dan kontrol cepat dalam satu layar.
 */
function SummaryTab({
  onGoBayar,
  onGoPengguna,
  onGoPengaturan,
  onGoLaporan,
}: {
  onGoBayar: () => void;
  onGoPengguna: () => void;
  onGoPengaturan: () => void;
  onGoLaporan?: () => void;
}) {
  const [range, setRange] = React.useState<"month" | "30d" | "7d" | "today">("month");
  const [donutType, setDonutType] = React.useState<"plans" | "payments">("plans");
  const [ask, dialog] = useConfirm();
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  const getRangeDates = React.useCallback(() => {
    const now = new Date();
    const to = now.toISOString();
    let from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    if (range === "30d") {
      from = new Date(Date.now() - 30 * 86400000).toISOString();
    } else if (range === "7d") {
      from = new Date(Date.now() - 7 * 86400000).toISOString();
    } else if (range === "today") {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    }
    return { from, to };
  }, [range]);

  const fetcher = React.useCallback(() => {
    const { from, to } = getRangeDates();
    return A.getDashboardSummary(from, to);
  }, [getRangeDates]);

  const { data: s, err, load } = useLoad(fetcher);
  const paymentsLoad = useLoad(P.listPayments);
  const usersLoad = useLoad(A.listUsers);
  const controlsLoad = useLoad(A.getAiControls);
  const apiLoad = useLoad(A.getApiUsage);
  const reportsLoad = useLoad(A.listHelpReports);

  React.useEffect(() => {
    load();
  }, [range, load]);

  const reloadAll = React.useCallback(() => {
    load();
    paymentsLoad.load();
    usersLoad.load();
    controlsLoad.load();
    apiLoad.load();
    reportsLoad.load();
  }, [load, paymentsLoad, usersLoad, controlsLoad, apiLoad, reportsLoad]);

  // Filter antrean pending
  const pendingList = (paymentsLoad.data ?? []).filter(
    (p) => p.status === "pro_sementara" || p.status === "menunggu_cek"
  );

  // 5 user terbaru
  const recentUsers = (usersLoad.data ?? []).slice(0, 5);

  const handleConfirmDirect = async (p: P.AdminPayment) => {
    if (processingId) return;
    const ok = await ask(
      `Konfirmasi pembayaran ${formatRupiah(p.amount)} untuk ${p.email}? Masa aktif Pro akan otomatis diperpanjang sesuai kalender resmi.`,
      "Konfirmasi Lunas"
    );
    if (!ok) return;

    setProcessingId(p.id);
    try {
      await P.confirmPayment(p.id);
      notify("Pembayaran berhasil dikonfirmasi Lunas.");
      reloadAll();
    } catch (e) {
      notify(A.adminErrorText(e));
    } finally {
      setProcessingId(null);
    }
  };

  const stickiness = s && s.active_users_30d > 0
    ? Math.round((s.active_users_today / s.active_users_30d) * 100)
    : 0;

  // Perhitungan Data Grafik Garis / Area (14 Hari Terakhir: Kas Masuk vs Biaya AI)
  const timelineData = React.useMemo(() => {
    const daysMap = new Map<string, { label: string; dateKey: string; revenue: number; aiCost: number }>();
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      daysMap.set(dateKey, { label, dateKey, revenue: 0, aiCost: 0 });
    }

    (paymentsLoad.data ?? []).forEach((p) => {
      if (p.status === "dikonfirmasi") {
        const ts = p.confirmed_at || p.created_at;
        if (ts) {
          const key = ts.slice(0, 10);
          if (daysMap.has(key)) {
            daysMap.get(key)!.revenue += Number(p.amount) || 0;
          }
        }
      }
    });

    (apiLoad.data?.daily ?? []).forEach((d) => {
      const key = d.day.slice(0, 10);
      if (daysMap.has(key)) {
        daysMap.get(key)!.aiCost += Math.round(d.cost_idr || 0);
      }
    });

    return Array.from(daysMap.values());
  }, [paymentsLoad.data, apiLoad.data]);

  const totalRev14d = React.useMemo(() => timelineData.reduce((acc, c) => acc + c.revenue, 0), [timelineData]);
  const totalAi14d = React.useMemo(() => timelineData.reduce((acc, c) => acc + c.aiCost, 0), [timelineData]);

  // Perhitungan Donut Chart
  const planStats = React.useMemo(() => {
    const users = usersLoad.data ?? [];
    const proPaid = users.filter((u) => u.plan === "pro" && u.source === "paid").length;
    const proTrial = users.filter((u) => u.source === "trial").length;
    const free = users.filter((u) => (u.plan === "free" || !u.plan) && u.source !== "trial").length;
    return [
      { name: "Pro Berbayar", value: proPaid, color: "#0d9488" },
      { name: "Pro Trial", value: proTrial, color: "#0284c7" },
      { name: "Basic (Free)", value: free, color: "#94a3b8" },
    ];
  }, [usersLoad.data]);

  const paymentStats = React.useMemo(() => {
    const pays = paymentsLoad.data ?? [];
    const lunas = pays.filter((p) => p.status === "dikonfirmasi").length;
    const menunggu = pays.filter((p) => p.status === "menunggu_cek" || p.status === "pro_sementara").length;
    const tolak = pays.filter((p) => p.status === "ditolak" || p.status === "kedaluwarsa").length;
    return [
      { name: "Lunas", value: lunas, color: "#10b981" },
      { name: "Menunggu Cek", value: menunggu, color: "#f59e0b" },
      { name: "Ditolak / Batal", value: tolak, color: "#ef4444" },
    ];
  }, [paymentsLoad.data]);

  const currentDonutData = donutType === "plans" ? planStats : paymentStats;
  const currentDonutTotal = currentDonutData.reduce((acc, cur) => acc + cur.value, 0);

  // Perhitungan Bar Chart Beban Fitur AI
  const featureUsage = React.useMemo(() => {
    const list = apiLoad.data?.by_feature ?? [];
    const colors = ["#0d9488", "#8b5cf6", "#0284c7", "#d97706", "#10b981", "#f43f5e"];
    if (list.length === 0) {
      return [
        { name: "Chat Ruby", calls: 0, cost: 0, color: colors[0] },
        { name: "Scan Struk", calls: 0, cost: 0, color: colors[1] },
        { name: "Suara", calls: 0, cost: 0, color: colors[2] },
        { name: "Insight", calls: 0, cost: 0, color: colors[3] },
        { name: "Tabungan", calls: 0, cost: 0, color: colors[4] },
      ];
    }
    return list
      .map((f, i) => ({
        name: FEATURE_LABEL[f.feature] || f.feature,
        calls: f.calls,
        cost: Math.round(f.cost_idr || 0),
        color: colors[i % colors.length],
      }))
      .sort((a, b) => b.cost - a.cost);
  }, [apiLoad.data]);

  const maxFeatureCost = React.useMemo(
    () => Math.max(1, ...featureUsage.map((f) => f.cost)),
    [featureUsage]
  );

  // Laporan pelanggan terbaru
  const recentReports = (reportsLoad.data ?? []).slice(0, 4);
  const unreadReportsCount = (reportsLoad.data ?? []).filter((r) => r.status === "baru").length;

  if (err) return <Err t={err} />;
  if (!s) return <Skel />;

  return (
    <div className="space-y-6">
      {dialog}

      {/* 1. Baris Filter & Informasi Periode */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-extrabold text-foreground">Ringkasan Operasional & Pendapatan</h2>
          <p className="text-xs text-muted-foreground">
            Data mencakup pertumbuhan akun, keaktifan pencatatan, mutasi QRIS terverifikasi, dan biaya API Gemini.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-semibold text-muted-foreground">Periode:</span>
          <div role="group" aria-label="Pilih rentang waktu" className="flex rounded-xl border border-border/80 bg-background p-1 shadow-2xs">
            {[
              ["month", "Bulan Ini"],
              ["30d", "30 Hari"],
              ["7d", "7 Hari"],
              ["today", "Hari Ini"],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setRange(val as typeof range)}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                  range === val
                    ? "bg-teal-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Banner Perhatian Khusus Antrean Verifikasi (Jika Ada) */}
      {s.pending_payments > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4.5 text-xs shadow-2xs">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-extrabold text-amber-950 dark:text-amber-200">
                {s.pending_payments} pembayaran perlu verifikasi Owner
              </p>
              <p className="mt-0.5 text-muted-foreground">
                Antrean tertua sudah menunggu selama <span className="font-bold text-amber-900 dark:text-amber-100">{s.oldest_pending_minutes} menit</span>. Segera cocokkan dengan mutasi merchant QRIS Anda.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={onGoBayar} className="rounded-xl font-bold">
            Buka Tab Bayar →
          </Button>
        </div>
      )}

      {/* 3. Baris 5 Kartu KPI Utama (Grid 5 Kolom Proporsional di Layar Laptop) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* KPI 1: Basis Pengguna */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Basis Pengguna</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-teal-500/10 text-sm">👥</span>
          </div>
          <div className="my-2">
            <p className="text-3xl font-black text-foreground">{s.total_users ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Total pengguna terdaftar</p>
          </div>
          <div className="border-t border-border/60 pt-2 text-[11px]">
            <span className="font-bold text-teal-600 dark:text-teal-400">+{s.new_users_today ?? 0}</span> pengguna baru hari ini
          </div>
        </div>

        {/* KPI 2: Pengguna Aktif (DAU & MAU) */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Aktivitas Nyata</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sm">⚡</span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground">{s.active_users_today ?? 0}</span>
              <span className="text-xs font-semibold text-muted-foreground">DAU</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Pengguna aktif hari ini (mencatat/AI)</p>
          </div>
          <div className="border-t border-border/60 pt-2 text-[11px]">
            <span className="font-bold text-sky-600 dark:text-sky-400">{s.active_users_30d ?? 0}</span> aktif dalam 30 hari terakhir
          </div>
        </div>

        {/* KPI 3: Kas Masuk Bersih (QRIS Lunas) */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Kas Masuk (Lunas)</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-sm">💸</span>
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-foreground">{formatRupiah(s.cash_in_month ?? 0)}</p>
            <p className="text-[11px] text-muted-foreground">Kas masuk bulan ini</p>
          </div>
          <div className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
            Periode terpilih: <span className="font-bold text-foreground">{formatRupiah(s.cash_in_period ?? 0)}</span>
          </div>
        </div>

        {/* KPI 4: Beban AI Gemini */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Biaya AI Gemini</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-sm">🤖</span>
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-foreground">{formatRupiah(Math.round(s.ai_cost_month ?? 0))}</p>
            <p className="text-[11px] text-muted-foreground">Biaya pemakaian bulan ini</p>
          </div>
          <div className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
            Periode terpilih: <span className="font-bold text-foreground">{formatRupiah(Math.round(s.ai_cost_period ?? 0))}</span>
          </div>
        </div>

        {/* KPI 5: Anggaran & Kecepatan Antrean */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Konsumsi Anggaran AI</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-sm">🎯</span>
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-foreground">
              {s.budget_used_pct !== null ? `${s.budget_used_pct}%` : "Belum diatur"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {s.budget_idr > 0 ? `Dari batas ${formatRupiah(s.budget_idr)}` : "Anggaran bulanan belum diisi"}
            </p>
          </div>
          <div className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
            Peringatan di {s.warn_pct ?? 70}% · Otomatis mati di 100% untuk Basic
          </div>
        </div>
      </div>

      {/* 4. Baris Visual Grafik Dashboard (Area Chart Keuangan vs AI + Donut Chart Komposisi) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Grafik Garis/Area: Tren Kas Masuk QRIS vs Beban Biaya AI 14 Hari */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-2xs xl:col-span-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <BarChart3 className="size-3.5" />
                </span>
                <h3 className="text-sm font-extrabold text-foreground">Tren Kas Masuk QRIS vs Beban Biaya AI</h3>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Memantau arus kas masuk riil terhadap biaya token API Gemini (14 hari terakhir)
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 font-bold text-teal-800 dark:text-teal-200">
                <span className="size-2 rounded-full bg-teal-600" />
                Kas: {formatRupiah(totalRev14d)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 font-bold text-violet-800 dark:text-violet-200">
                <span className="size-2 rounded-full bg-violet-600" />
                AI: {formatRupiah(totalAi14d)}
              </span>
            </div>
          </div>

          <div className="my-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="areaAiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  width={55}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    formatRupiah(Number(val) || 0),
                    name === "revenue" ? "Kas Masuk QRIS" : "Biaya AI Gemini",
                  ]}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#areaRevGrad)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="aiCost"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#areaAiGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-between border-t border-border/60 pt-2.5 text-[11px] text-muted-foreground">
            <span>Selisih Kas Bersih (14 Hari): <strong className="text-foreground">{formatRupiah(Math.max(0, totalRev14d - totalAi14d))}</strong></span>
            <span>Diperbarui otomatis dari mutasi verifikasi & log panggilan model AI</span>
          </div>
        </div>

        {/* Donut Chart: Komposisi Bisnis (Paket Pengguna / Status QRIS) */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-2xs xl:col-span-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-foreground">Komposisi Bisnis</h3>
            <div className="flex rounded-lg border border-border/80 bg-background p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setDonutType("plans")}
                className={`rounded-md px-2 py-0.5 font-bold transition-all ${
                  donutType === "plans" ? "bg-teal-600 text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Paket Akun
              </button>
              <button
                type="button"
                onClick={() => setDonutType("payments")}
                className={`rounded-md px-2 py-0.5 font-bold transition-all ${
                  donutType === "payments" ? "bg-teal-600 text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Status QRIS
              </button>
            </div>
          </div>

          <div className="relative my-2 flex items-center justify-center">
            <div className="h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentDonutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    isAnimationActive={false}
                  >
                    {currentDonutData.map((entry, index) => (
                      <Cell key={`donut-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      `${val} (${currentDonutTotal > 0 ? Math.round((Number(val) / currentDonutTotal) * 100) : 0}%)`,
                      name,
                    ]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-black text-foreground">{currentDonutTotal}</span>
              <span className="text-[10px] font-semibold text-muted-foreground">
                {donutType === "plans" ? "Total Akun" : "Total QRIS"}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-border/60 pt-3 text-xs">
            {currentDonutData.map((d) => {
              const pct = currentDonutTotal > 0 ? Math.round((d.value / currentDonutTotal) * 100) : 0;
              return (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="font-bold text-foreground">
                    {d.value} <span className="font-normal text-muted-foreground">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Baris Beban Fitur AI Gemini & Aspirasi Pelanggan (2 Kolom Proporsional) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Kolom Kiri: Konsumsi Token per Fitur AI (Visual Progress / Bar) */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-2xs xl:col-span-6">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Cpu className="size-3.5" />
                </span>
                <h3 className="text-sm font-extrabold text-foreground">Beban Token per Fitur AI</h3>
              </div>
              <span className="text-xs font-bold text-muted-foreground">
                {apiLoad.data?.calls_month ?? 0} Panggilan Bulan Ini
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Rincian intensitas panggilan dan estimasi biaya per modul kecerdasan buatan
            </p>

            <div className="mt-4 space-y-3">
              {featureUsage.slice(0, 5).map((f) => {
                const pct = Math.max(5, Math.min(100, Math.round((f.cost / maxFeatureCost) * 100)));
                return (
                  <div key={f.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">{f.name}</span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-muted-foreground">{f.calls}x pakai</span>
                        <span className="font-mono font-bold text-foreground">{formatRupiah(f.cost)}</span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: f.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 border-t border-border/60 pt-2.5 text-[11px] text-muted-foreground">
            Batas pengeluaran AI dikontrol otomatis oleh proteksi anggaran di tab Pengaturan
          </div>
        </div>

        {/* Kolom Kanan: Laporan & Aspirasi Pelanggan Terbaru (Pusat Bantuan) */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-2xs xl:col-span-6">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <MessageSquareText className="size-3.5" />
                </span>
                <h3 className="text-sm font-extrabold text-foreground">Laporan Pelanggan Terbaru</h3>
              </div>
              {onGoLaporan && (
                <Button variant="ghost" size="sm" onClick={onGoLaporan} className="h-7 gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400">
                  <span>Buka Semua Laporan</span>
                  <ArrowUpRight className="size-3" />
                </Button>
              )}
            </div>
            <div className="mt-0.5 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Keluhan bug & usul fitur yang masuk langsung dari pengguna
              </p>
              {unreadReportsCount > 0 && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:text-amber-200 animate-pulse">
                  {unreadReportsCount} Perlu Ditinjau
                </span>
              )}
            </div>

            <div className="mt-3 space-y-2.5">
              {recentReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="mb-1 size-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Tidak ada keluhan pelanggan yang belum terselesaikan.</span>
                </div>
              ) : (
                recentReports.map((r) => (
                  <div
                    key={r.id}
                    onClick={onGoLaporan}
                    className="group flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-border/60 bg-background p-3 text-xs transition-all hover:border-teal-500/40 hover:shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                            r.kind === "bug"
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                              : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                          }`}
                        >
                          {r.kind === "bug" ? <Bug className="size-2.5" /> : <Lightbulb className="size-2.5" />}
                          {r.kind === "bug" ? "Bug" : "Usul"}
                        </span>
                        <h4 className="font-bold text-foreground group-hover:text-teal-600 transition-colors line-clamp-1">
                          {r.title}
                        </h4>
                      </div>
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">{r.body}</p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          r.status === "baru"
                            ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                            : r.status === "dibaca"
                            ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                            : r.status === "dikerjakan"
                            ? "bg-purple-500/10 text-purple-700 dark:text-purple-300"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        {r.status === "baru"
                          ? "Baru"
                          : r.status === "dibaca"
                          ? "Dibaca"
                          : r.status === "dikerjakan"
                          ? "Proses"
                          : "Selesai"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {fmtDate(r.created_at)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
            Laporan lengkap dapat dibaca, diubah statusnya, dan ditinjau buktinya di tab Laporan Pelanggan
          </div>
        </div>
      </div>

      {/* 6. Dua Kolom Operasional Inti Desktop Laptop (7 Kolom Antrean + 5 Kolom Status AI) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Kolom Kiri: Live Action Center - Verifikasi Pembayaran Langsung */}
        <div className="space-y-4 xl:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-foreground">Antrean Pembayaran QRIS (Live)</h3>
              <p className="text-xs text-muted-foreground">Pembayaran yang membutuhkan pencocokan mutasi rekening Anda</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onGoBayar} className="h-8 gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400">
              <span>Buka Halaman Pembayaran</span>
              <ArrowUpRight className="size-3.5" />
            </Button>
          </div>

          {pendingList.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/5 p-8 text-center shadow-2xs">
              <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-6" />
              </div>
              <h4 className="text-sm font-bold text-foreground">Semua Pembayaran Bersih</h4>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Tidak ada transfer QRIS yang tertunda saat ini. Setiap bukti transfer baru yang diunggah pengguna akan langsung tampil di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingList.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-border/80 bg-card p-4.5 shadow-2xs transition-all hover:border-teal-500/40 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-foreground">
                        {formatRupiah(p.amount)}
                      </span>
                      <span className="rounded-md bg-teal-500/10 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:text-teal-300">
                        {p.months} Bulan Pro
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                        <Clock className="size-3" />
                        {Math.max(0, Math.floor((Date.now() - new Date(p.created_at).getTime()) / 60000))}m lalu
                      </span>
                    </div>
                    <p className="truncate text-xs font-semibold text-foreground">{p.email}</p>
                    {p.proof_ref && (
                      <p className="text-[11px] text-muted-foreground font-mono">Ref: {p.proof_ref}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleConfirmDirect(p)}
                      disabled={processingId === p.id}
                      className="h-8 rounded-xl bg-teal-600 text-xs font-bold text-white hover:bg-teal-700"
                    >
                      Konfirmasi Lunas
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onGoBayar}
                      className="h-8 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                    >
                      Tolak...
                    </Button>
                  </div>
                </div>
              ))}
              {pendingList.length > 3 && (
                <p className="text-center text-xs text-muted-foreground">
                  +{pendingList.length - 3} pembayaran lainnya menunggu di tab Bayar.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Kolom Kanan: Status Kontrol Bisnis & Mesin AI */}
        <div className="space-y-4 xl:col-span-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-foreground">Status Kontrol Bisnis & AI</h3>
              <p className="text-xs text-muted-foreground">Kesiapan saklar darurat dan batas pemakaian</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onGoPengaturan} className="h-8 gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400">
              <span>Atur di Pengaturan</span>
              <ArrowUpRight className="size-3.5" />
            </Button>
          </div>

          <div className="space-y-3 rounded-2xl border border-border/80 bg-card p-4.5 shadow-2xs">
            {/* Master Switch Status */}
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background p-3 text-xs">
              <div>
                <p className="font-extrabold text-foreground">Saklar Darurat AI (Kill Switch)</p>
                <p className="text-[11px] text-muted-foreground">
                  {controlsLoad.data?.controls?.master_kill_switch
                    ? "🔴 Seluruh AI sedang dinonaktifkan."
                    : "🟢 Seluruh AI beroperasi normal."}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                controlsLoad.data?.controls?.master_kill_switch
                  ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                  : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              }`}>
                {controlsLoad.data?.controls?.master_kill_switch ? "Mati" : "Aktif"}
              </span>
            </div>

            {/* Kurs Acuan */}
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background p-3 text-xs">
              <div>
                <p className="font-extrabold text-foreground">Kurs USD ke Rupiah</p>
                <p className="text-[11px] text-muted-foreground">Dasar konversi token Gemini</p>
              </div>
              <span className="font-mono font-bold text-foreground">
                {formatRupiah(controlsLoad.data?.usd_idr_rate ?? 16000)} / USD
              </span>
            </div>

            {/* Status Fitur-Fitur AI */}
            <div className="rounded-xl border border-border/60 bg-background p-3 text-xs">
              <p className="mb-2 font-extrabold text-foreground">Fitur AI Aktif</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(FEATURE_LABEL).map(([k, label]) => {
                  const on = controlsLoad.data?.controls?.feature_toggles?.[k] !== false;
                  return (
                    <span
                      key={k}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${
                        on
                          ? "bg-teal-500/10 text-teal-700 dark:text-teal-300"
                          : "bg-muted text-muted-foreground line-through"
                      }`}
                    >
                      <Sparkles className="size-2.5" />
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Baris 5 Pengguna Terbaru */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-foreground">Pengguna Terdaftar Terbaru</h3>
            <p className="text-xs text-muted-foreground">Akun terbaru yang mendaftar di aplikasi Dompetku</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onGoPengguna} className="h-8 gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400">
            <span>Kelola Semua Pengguna ({s.total_users})</span>
            <ArrowUpRight className="size-3.5" />
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/70 bg-muted/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Paket</th>
                <th className="px-4 py-3">Pemakaian Ruby</th>
                <th className="px-4 py-3">Tanggal Bergabung</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {recentUsers.map((u) => (
                <tr key={u.user_id} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{u.email}</p>
                    {u.admin_role && (
                      <span className="mt-0.5 inline-block rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:text-indigo-300">
                        {u.admin_role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      u.plan === "pro"
                        ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
                        : "bg-slate-500/15 text-slate-700 dark:text-slate-300"
                    }`}>
                      {u.plan === "pro" ? "👑 Pro" : "🌱 Basic"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground tabular-nums">
                    {u.ai_used} panggilan
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={onGoPengguna} className="h-7 text-[11px] font-bold text-teal-600 hover:text-teal-700">
                      Detail →
                    </Button>
                  </td>
                </tr>
              ))}
              {recentUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                    Belum ada data pengguna yang dimuat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Tab Laporan Pelanggan (Pusat Bantuan)
 * Menampilkan dan mengelola aspirasi, keluhan bug, dan masukan pengguna.
 */
function ReportsTab() {
  const { data: reports, err, load } = useLoad(A.listHelpReports);
  const [filterKind, setFilterKind] = React.useState<"all" | "bug" | "usul">("all");
  const [filterStatus, setFilterStatus] = React.useState<"all" | "baru" | "dibaca" | "dikerjakan" | "selesai">("all");
  const [search, setSearch] = React.useState("");
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [loadingImage, setLoadingImage] = React.useState(false);

  const filtered = React.useMemo(() => {
    return (reports ?? []).filter((r) => {
      if (filterKind !== "all" && r.kind !== filterKind) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchBody = r.body.toLowerCase().includes(q);
        const matchEmail = (r.email || "").toLowerCase().includes(q);
        const matchPage = (r.page || "").toLowerCase().includes(q);
        if (!matchTitle && !matchBody && !matchEmail && !matchPage) return false;
      }
      return true;
    });
  }, [reports, filterKind, filterStatus, search]);

  const stats = React.useMemo(() => {
    const all = reports ?? [];
    return {
      total: all.length,
      baru: all.filter((r) => r.status === "baru").length,
      bug: all.filter((r) => r.kind === "bug").length,
      usul: all.filter((r) => r.kind === "usul").length,
    };
  }, [reports]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await A.updateHelpReportStatus(id, newStatus);
      notify("Status laporan berhasil diperbarui.");
      load();
    } catch (e) {
      notify(A.adminErrorText(e));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleViewAttachment = async (imagePath: string) => {
    setLoadingImage(true);
    try {
      const url = await A.getHelpReportAttachmentUrl(imagePath);
      if (url) {
        setPreviewImage(url);
      } else {
        notify("Gagal membuka screenshot lampiran.");
      }
    } catch {
      notify("Gagal membuka screenshot lampiran.");
    } finally {
      setLoadingImage(false);
    }
  };

  if (err) return <Err t={err} />;

  return (
    <div className="space-y-6">
      {/* Modal Preview Screenshot Lampiran */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl border border-white/20 bg-zinc-950 p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="size-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage} alt="Lampiran screenshot laporan" className="max-h-[82vh] w-auto rounded-xl object-contain" />
          </div>
        </div>
      )}

      {/* Header & Metrik Cepat */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-extrabold text-foreground">Pusat Laporan & Aspirasi Pelanggan</h2>
          <p className="text-xs text-muted-foreground">
            Keluhan bug dan ide perbaikan yang dikirim langsung oleh pengguna melalui fitur Pusat Bantuan.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()} className="gap-1.5 rounded-xl text-xs font-bold">
          <RotateCw className="size-3.5" />
          <span>Segarkan</span>
        </Button>
      </div>

      {/* 4 Kartu Status Ringkas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs">
          <p className="text-xs font-bold text-muted-foreground">Total Laporan Masuk</p>
          <p className="mt-1 text-2xl font-black text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Perlu Ditinjau (Baru)</p>
            <span className="flex size-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <p className="mt-1 text-2xl font-black text-amber-900 dark:text-amber-100">{stats.baru}</p>
        </div>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3.5 shadow-2xs">
          <p className="text-xs font-bold text-rose-700 dark:text-rose-300">Laporan Bug 🐞</p>
          <p className="mt-1 text-2xl font-black text-rose-900 dark:text-rose-100">{stats.bug}</p>
        </div>
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-3.5 shadow-2xs">
          <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Usul Fitur 💡</p>
          <p className="mt-1 text-2xl font-black text-blue-900 dark:text-blue-100">{stats.usul}</p>
        </div>
      </div>

      {/* Toolbar Filter & Pencarian */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari keluhan, email pengguna, halaman..."
            className="h-9 rounded-xl pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Jenis */}
          <div className="flex items-center rounded-xl border border-border/70 bg-background p-1 text-xs">
            <span className="px-2 text-muted-foreground font-semibold">Jenis:</span>
            {[
              ["all", "Semua"],
              ["bug", "Bug"],
              ["usul", "Usul"],
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilterKind(k as any)}
                className={`rounded-lg px-2.5 py-1 font-bold transition-all ${
                  filterKind === k ? "bg-teal-600 text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Filter Status */}
          <div className="flex items-center rounded-xl border border-border/70 bg-background p-1 text-xs">
            <span className="px-2 text-muted-foreground font-semibold">Status:</span>
            {[
              ["all", "Semua"],
              ["baru", "Baru"],
              ["dibaca", "Dibaca"],
              ["dikerjakan", "Proses"],
              ["selesai", "Selesai"],
            ].map(([st, label]) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st as any)}
                className={`rounded-lg px-2.5 py-1 font-bold transition-all ${
                  filterStatus === st ? "bg-teal-600 text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Daftar Laporan Pelanggan */}
      {!reports && !err ? (
        <Skel />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center shadow-2xs">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-foreground">Tidak Ada Laporan yang Cocok</h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {reports?.length === 0
              ? "Belum ada laporan kendala atau usul fitur yang masuk dari pengguna."
              : "Semua laporan sudah sesuai filter yang Anda tentukan atau sudah terselesaikan."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              className={`flex flex-col justify-between gap-4 rounded-2xl border bg-card p-5 shadow-2xs transition-all ${
                r.status === "baru"
                  ? "border-amber-500/50 hover:border-amber-500"
                  : "border-border/80 hover:border-teal-500/30"
              }`}
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-black uppercase tracking-wider ${
                      r.kind === "bug"
                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                        : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                    }`}
                  >
                    {r.kind === "bug" ? <Bug className="size-3" /> : <Lightbulb className="size-3" />}
                    {r.kind === "bug" ? "Laporan Bug" : "Usul Fitur"}
                  </span>

                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      r.status === "baru"
                        ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                        : r.status === "dibaca"
                        ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                        : r.status === "dikerjakan"
                        ? "bg-purple-500/10 text-purple-700 dark:text-purple-300"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {r.status === "baru"
                      ? "Menunggu Tinjauan"
                      : r.status === "dibaca"
                      ? "Sudah Dibaca"
                      : r.status === "dikerjakan"
                      ? "Sedang Dikerjakan"
                      : "Selesai Ditangani"}
                  </span>

                  {r.page && (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      Halaman: <span className="font-semibold text-foreground">{r.page}</span>
                    </span>
                  )}

                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-foreground">{r.title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">{r.body}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                  <span>Pelapor: <strong className="text-foreground">{r.email || r.user_id}</strong></span>
                  {r.image_path && (
                    <button
                      type="button"
                      disabled={loadingImage}
                      onClick={() => handleViewAttachment(r.image_path!)}
                      className="inline-flex items-center gap-1 font-bold text-teal-600 hover:text-teal-700 hover:underline dark:text-teal-400"
                    >
                      <ImageIcon className="size-3.5" />
                      <span>Lihat Screenshot Bukti</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Aksi Pengubahan Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs">
                <span className="font-semibold text-muted-foreground">Ubah Status Tindak Lanjut:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    ["baru", "Baru"],
                    ["dibaca", "Tandai Dibaca"],
                    ["dikerjakan", "Proses"],
                    ["selesai", "Selesai"],
                  ].map(([st, stLabel]) => (
                    <button
                      key={st}
                      type="button"
                      disabled={updatingId === r.id || r.status === st}
                      onClick={() => handleStatusChange(r.id, st)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                        r.status === st
                          ? "bg-slate-900 text-white dark:bg-white dark:text-black cursor-default"
                          : "border border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                      } disabled:opacity-50`}
                    >
                      {stLabel}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApiTab({ isSuper }: { isSuper: boolean }) {
  const { data: u, err, load } = useLoad(A.getApiUsage);
  const [f, setF] = React.useState({ budget: 0, since: new Date().toISOString().slice(0, 10), warn: "70" });

  if (err) return <Err t={err.includes("Belum berhasil") ? "Dashboard API belum aktif di database ini. Minta Pak Slamet memasang migrasi api_budget." : err} />;
  if (!u) return <Skel />;

  const al = apiAlert(u, (n) => formatRupiah(Math.round(n)));
  const cls = {
    ok: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    info: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    warn: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    bad: "bg-red-500/10 text-red-700 dark:text-red-300",
  }[al.tone];
  const max = Math.max(1, ...u.daily.map((d) => d.cost_idr));

  return (
    <div className="space-y-6">
      <div role={al.tone === "bad" || al.tone === "warn" ? "alert" : "status"} className={`rounded-2xl p-4.5 shadow-2xs ${cls}`}>
        <p className="font-extrabold">{al.title}</p>
        <p className="mt-1 text-xs">{al.body}</p>
      </div>
      {u.configured && (
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all ${u.level === "aman" ? "bg-emerald-500" : u.level === "waspada" ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${Math.min(100, u.used_pct ?? 0)}%` }}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6 text-sm">
        {[
          ["Top-up diisi", formatRupiah(u.budget_idr)],
          ["Terpakai sejak " + fmtDate(u.since), formatRupiah(Math.round(u.spent_idr))],
          ["Bulan ini", formatRupiah(Math.round(u.month_spent_idr))],
          ["Hari ini", formatRupiah(Math.round(u.today_spent_idr))],
          ["Panggilan Ruby bulan ini", String(u.calls_month)],
          ["Rata-rata per hari (7 hari)", formatRupiah(Math.round(u.avg_daily_idr))],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="mt-1 font-extrabold text-foreground">{v}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Grafik Biaya Ruby per Hari (30 Hari Terakhir)</p>
        {u.daily.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">Belum ada pemakaian Ruby tercatat.</p>
        ) : (
          <div className="flex h-28 items-end gap-1.5 rounded-xl border border-border/60 bg-background p-3" role="img" aria-label="Grafik biaya Ruby per hari">
            {u.daily.map((d) => (
              <div
                key={d.day}
                title={`${d.day}: ${formatRupiah(Math.round(d.cost_idr))}`}
                className="flex-1 rounded-t-md bg-teal-500/70 hover:bg-teal-600 transition-colors"
                style={{ height: `${Math.max(6, (d.cost_idr / max) * 100)}%` }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Biaya per Fitur (Bulan Ini)</p>
          <ul className="divide-y divide-border/60">
            {u.by_feature.map((x) => (
              <li key={x.feature} className="flex justify-between py-2.5 text-xs">
                <span className="font-semibold text-foreground">
                  {FEATURE_LABEL[x.feature] ?? x.feature} <span className="text-muted-foreground font-normal">({x.calls}x)</span>
                </span>
                <span className="font-mono font-bold text-foreground">{formatRupiah(Math.round(x.cost_idr))}</span>
              </li>
            ))}
            {u.by_feature.length === 0 && <li className="py-2 text-xs text-muted-foreground">Belum ada data pemakaian.</li>}
          </ul>
        </div>

        {isSuper ? (
          <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs">
            <p className="text-sm font-bold text-foreground">Catat Top-Up / Batas Anggaran API</p>
            <label className="block space-y-1.5 text-xs font-semibold">
              Nilai anggaran API (Rupiah)
              <MoneyInput value={f.budget} onChange={(n) => setF({ ...f, budget: n })} aria-label="Nilai top-up" suffix="Rp" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5 text-xs font-semibold">
                Berlaku sejak
                <Input type="date" aria-label="Berlaku sejak" value={f.since} onChange={(e) => setF({ ...f, since: e.target.value })} />
              </label>
              <label className="block space-y-1.5 text-xs font-semibold">
                Peringatkan di (%)
                <Input inputMode="numeric" aria-label="Ambang peringatan" value={f.warn} onChange={(e) => setF({ ...f, warn: e.target.value.replace(/\D/g, "").slice(0, 2) })} />
              </label>
            </div>
            <Button
              className="h-9 w-full rounded-xl text-xs font-bold"
              disabled={f.budget <= 0}
              onClick={() => act(() => A.setApiBudget(f.budget, new Date(f.since + "T00:00:00+07:00").toISOString(), Number(f.warn) || 70), "Tersimpan", load)}
            >
              Simpan
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Hanya Superadmin yang bisa mengubah nilai anggaran.</p>
        )}
      </div>
    </div>
  );
}

const PLAN_PILL: Record<string, { label: string; tone: PillTone; icon: string }> = {
  free: { label: "Basic", tone: "slate", icon: "🌱" },
  pro: { label: "Pro", tone: "neon", icon: "👑" },
};
const planPill = (plan: string) => PLAN_PILL[plan] ?? { label: plan, tone: "slate" as PillTone, icon: "•" };
const fmtShort = (s: string | null) => (s ? new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" }) : "-");

function UsersTab({ isSuper }: { isSuper: boolean }) {
  const { data, err, load } = useLoad(A.listUsers);
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState<string | null>(null);
  const [ask, dialog] = useConfirm();

  const [planTarget, setPlanTarget] = React.useState<"free" | "pro">("pro");
  const [planDays, setPlanDays] = React.useState<string>("30");
  const [planReason, setPlanReason] = React.useState<string>("");

  if (err) return <Err t={err} />;
  if (!data) return <Skel />;

  const list = data.filter((u) => u.email.toLowerCase().includes(q.trim().toLowerCase()));
  const byPlan = (p: string) => data.filter((u) => u.plan === p).length;
  const user = data.find((u) => u.user_id === sel) ?? null;

  const handleSavePlan = async () => {
    if (!user) return;
    if (planReason.trim().length < 5) {
      notify("Alasan perubahan wajib diisi minimal 5 karakter.");
      return;
    }

    const targetUser = user;
    const days = planTarget === "free" ? null : planDays === "unlimited" ? null : Number(planDays);
    const desc = planTarget === "free" ? "Basic" : days ? `Pro ${days} hari` : "Pro tanpa batas";
    const reason = planReason.trim();

    setSel(null);
    const ok = await ask(`Ubah paket ${targetUser.email} menjadi ${desc}? Alasan: "${reason}"`, "Ya, Simpan Paket");
    if (!ok) return;

    void act(() => A.setPlan(targetUser.user_id, planTarget, days, reason), "Paket berhasil diubah.", load);
  };

  const changeRole = async (u: A.AdminUser, role: string) => {
    setSel(null);
    if (await ask(`Ubah peran ${u.email} menjadi ${role === "none" ? "pengguna biasa" : role}?`, "Ubah Peran")) {
      void act(() => A.setRole(u.user_id, role), "Peran diubah", load);
    }
  };

  return (
    <div className="space-y-4">
      {dialog}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Pill tone="sky" className="px-3" icon="👥">{data.length} Total Pengguna</Pill>
          <Pill tone="slate" className="px-3" icon="🌱">{byPlan("free")} Basic</Pill>
          <Pill tone="neon" className="px-3" icon="👑">{byPlan("pro")} Pro</Pill>
        </div>
        <div className="w-full max-w-xs">
          <Input aria-label="Cari email" placeholder="🔎 Cari email pengguna..." className="h-9 rounded-xl" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/70 bg-muted/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Pengguna</th>
              <th className="px-4 py-3">Paket</th>
              <th className="px-4 py-3 text-right">Panggilan Ruby</th>
              <th className="px-4 py-3 text-right">Terdaftar</th>
              <th className="px-4 py-3 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {list.map((u) => {
              const pp = planPill(u.plan);
              return (
                <tr
                  key={u.user_id}
                  className="transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{u.email}</p>
                    {u.admin_role && (
                      <span className="mt-0.5 inline-block rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:text-indigo-300">
                        {u.admin_role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={pp.tone} icon={pp.icon} className="px-2 text-[10px]">{pp.label}</Pill>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">{u.ai_used}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{fmtShort(u.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSel(u.user_id);
                        setPlanTarget(u.plan === "pro" ? "free" : "pro");
                        setPlanDays("30");
                        setPlanReason("");
                      }}
                      aria-label={`Detail ${u.email}`}
                      className="h-7 rounded-xl text-xs font-bold"
                    >
                      Detail
                    </Button>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">Tidak ada pengguna yang cocok dengan pencarian.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={!!user} onOpenChange={(o) => { if (!o) setSel(null); }}>
        <SheetContent side="bottom" showCloseButton overlayClassName="bg-black/50 backdrop-blur-sm" className="mx-auto max-h-[88dvh] max-w-[500px] overflow-y-auto rounded-t-3xl border-border/80 bg-background px-6 pb-6 pt-5 shadow-2xl">
          {user && (() => {
            const pp = planPill(user.plan);
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-border/50 pb-3">
                  <IconBox tone="neon" className="size-11 text-xl">👤</IconBox>
                  <div className="min-w-0">
                    <SheetTitle className="break-all text-sm font-extrabold">{user.email}</SheetTitle>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Pill tone={pp.tone} icon={pp.icon}>{pp.label}</Pill>
                      {user.admin_role && <Pill tone="indigo" icon="🛡️">{user.admin_role}</Pill>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Stat icon="📅" tone="sky" label="Daftar" value={fmtDate(user.created_at)} />
                  <Stat icon="🔑" tone="violet" label="Login terakhir" value={fmtDate(user.last_sign_in_at)} />
                  <Stat icon="🤖" tone="neon" label="Ruby bulan ini" value={user.ai_used} />
                  <Stat icon="🎟️" tone="amber" label="Status paket" value={user.source === "paid" ? (user.plan_expires_at ? `s.d. ${fmtDate(user.plan_expires_at)}` : "tanpa batas") : user.source === "trial" ? `uji coba s.d. ${fmtDate(user.trial_ends_at)}` : "gratis"} />
                </div>

                {isSuper ? (
                  <div role="group" aria-label={`Paket ${user.email}`} className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
                    <p className="text-xs font-bold text-foreground">Ubah Paket Pengguna</p>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold">Pilih Paket</label>
                      <Select
                        aria-label="Pilihan paket"
                        value={planTarget}
                        onChange={(e) => setPlanTarget(e.target.value as "free" | "pro")}
                      >
                        <option value="pro">Pro</option>
                        <option value="free">Basic (Gratis)</option>
                      </Select>
                    </div>

                    {planTarget === "pro" && (
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold">Durasi Paket Pro</label>
                        <Select
                          aria-label="Pilihan durasi"
                          value={planDays}
                          onChange={(e) => setPlanDays(e.target.value)}
                        >
                          <option value="30">30 Hari</option>
                          <option value="90">90 Hari (3 Bulan)</option>
                          <option value="180">180 Hari (6 Bulan)</option>
                          <option value="365">365 Hari (1 Tahun)</option>
                          <option value="unlimited">Tanpa Batas Waktu</option>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold">
                        Alasan Perubahan <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        aria-label="Alasan perubahan paket"
                        placeholder="Wajib minimal 5 karakter..."
                        value={planReason}
                        onChange={(e) => setPlanReason(e.target.value)}
                        maxLength={150}
                      />
                    </div>

                    <Button
                      size="sm"
                      className="w-full rounded-xl font-bold"
                      disabled={planReason.trim().length < 5}
                      onClick={handleSavePlan}
                    >
                      Simpan Paket
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Hanya Superadmin yang berwenang mengubah paket manual.</p>
                )}

                {isSuper && (
                  <div className="space-y-2 border-t border-border/50 pt-3">
                    <p className="text-xs font-semibold">Ubah Peran Admin</p>
                    <div role="group" aria-label={`Peran ${user.email}`} className="flex flex-wrap gap-1.5">
                      {[
                        ["Admin", "admin"],
                        ["Superadmin", "superadmin"],
                        ["Pengguna biasa", "none"],
                      ].map(([label, roleName]) => (
                        <button
                          key={roleName}
                          type="button"
                          className={chipCls(false)}
                          onClick={() => void changeRole(user, roleName)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** Tab 5: Pengaturan Bisnis & Saklar AI */
function SettingsTab({ isSuper }: { isSuper: boolean }) {
  const [ask, dialog] = useConfirm();
  const pricesLoad = useLoad(A.listPrices);
  const controlsLoad = useLoad(A.getAiControls);

  const [editingPrice, setEditingPrice] = React.useState<{ months: number; amount: number } | null>(null);
  const [newAmount, setNewAmount] = React.useState<number>(0);

  const [customAiForm, setCustomAiForm] = React.useState<A.AiControlsData["controls"] | null>(null);
  const [customUsdRate, setCustomUsdRate] = React.useState<number | null>(null);

  const aiForm = customAiForm ?? controlsLoad.data?.controls ?? null;
  const usdRate = customUsdRate ?? controlsLoad.data?.usd_idr_rate ?? 16000;

  const [killSwitchModal, setKillSwitchModal] = React.useState(false);
  const [killConfirmText, setKillConfirmText] = React.useState("");

  const handleEditPrice = (p: A.PriceRow) => {
    setEditingPrice(p);
    setNewAmount(p.amount);
  };

  const handleSavePrice = async () => {
    if (!editingPrice || newAmount <= 0) return;
    const ok = await ask(
      `Ubah harga paket ${editingPrice.months} bulan dari ${formatRupiah(editingPrice.amount)} menjadi ${formatRupiah(newAmount)}? Perubahan harga hanya berlaku untuk permintaan baru; permintaan berjalan dan Pro aktif tidak berubah.`,
      "Ya, Ubah Harga"
    );
    if (!ok) return;

    await act(
      () => A.setPrice(editingPrice.months, newAmount),
      `Harga paket ${editingPrice.months} bulan diperbarui.`,
      () => {
        setEditingPrice(null);
        pricesLoad.load();
      }
    );
  };

  const handleToggleFeature = (featureKey: string) => {
    if (!aiForm) return;
    setCustomAiForm({
      ...aiForm,
      feature_toggles: {
        ...aiForm.feature_toggles,
        [featureKey]: !aiForm.feature_toggles[featureKey],
      },
    });
  };

  const handleMasterKillSwitch = () => {
    if (!aiForm) return;
    if (!aiForm.master_kill_switch) {
      setKillSwitchModal(true);
      setKillConfirmText("");
    } else {
      setCustomAiForm({ ...aiForm, master_kill_switch: false });
    }
  };

  const confirmKillSwitch = () => {
    if (killConfirmText !== "NONAKTIFKAN" || !aiForm) return;
    setCustomAiForm({ ...aiForm, master_kill_switch: true });
    setKillSwitchModal(false);
  };

  const handleSaveAiControls = async () => {
    if (!aiForm) return;
    await act(
      () => A.setAiControls(aiForm, usdRate),
      "Pengaturan saklar AI dan kurs disimpan.",
      () => {
        setCustomAiForm(null);
        setCustomUsdRate(null);
        controlsLoad.load();
      }
    );
  };

  if (pricesLoad.err || controlsLoad.err) return <Err t={pricesLoad.err || controlsLoad.err} />;
  if (!pricesLoad.data || !controlsLoad.data || !aiForm) return <Skel />;

  return (
    <div className="space-y-6">
      {dialog}

      {killSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="kill-title" className="w-full max-w-md space-y-4 rounded-3xl border border-rose-500/50 bg-card p-6 shadow-2xl">
            <h3 id="kill-title" className="text-base font-black text-rose-600 dark:text-rose-400">
              ⚠️ Peringatan: Matikan Seluruh Layanan AI
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tindakan ini akan menghentikan seluruh fitur AI (Chat Ruby, Scan Struk, Suara, dll.) untuk semua pengguna aplikasi.
              Ketik kata <span className="font-mono font-bold text-foreground">NONAKTIFKAN</span> di bawah untuk mengonfirmasi.
            </p>
            <Input
              aria-label="Ketik NONAKTIFKAN"
              placeholder="Ketik NONAKTIFKAN"
              value={killConfirmText}
              onChange={(e) => setKillConfirmText(e.target.value)}
              className="font-mono font-bold"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setKillSwitchModal(false)}>
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={killConfirmText !== "NONAKTIFKAN"}
                onClick={confirmKillSwitch}
              >
                Matikan AI Sekarang
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bagian 1: Pengaturan Harga Paket */}
        <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs">
          <div>
            <h3 className="text-sm font-extrabold text-foreground">Harga Paket Pro</h3>
            <p className="text-xs text-muted-foreground">
              Harga resmi paket langganan. Perubahan hanya berlaku untuk permintaan baru.
            </p>
          </div>

          <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-background">
            {pricesLoad.data.map((p) => (
              <div key={p.months} className="flex items-center justify-between p-3.5 text-xs">
                <div>
                  <p className="font-extrabold text-foreground">Paket {p.months} Bulan</p>
                  <p className="text-muted-foreground">{formatRupiah(p.amount)}</p>
                </div>
                {isSuper && (
                  <Button size="sm" variant="outline" onClick={() => handleEditPrice(p)} className="rounded-xl font-bold">
                    Ubah Harga
                  </Button>
                )}
              </div>
            ))}
          </div>

          {editingPrice && isSuper && (
            <div className="space-y-3 rounded-xl border border-teal-500/40 bg-teal-500/5 p-4 text-xs">
              <p className="font-bold text-foreground">
                Ubah Harga Paket {editingPrice.months} Bulan (Saat ini: {formatRupiah(editingPrice.amount)})
              </p>
              <label className="block space-y-1">
                Nominal Baru (Rupiah)
                <MoneyInput
                  value={newAmount}
                  onChange={(n) => setNewAmount(n)}
                  aria-label="Nominal harga baru"
                  suffix="Rp"
                />
              </label>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSavePrice} disabled={newAmount <= 0} className="rounded-xl font-bold">
                  Simpan Harga
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingPrice(null)} className="rounded-xl">
                  Batal
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Bagian 2: Nilai Tukar Kurs USD ke Rupiah */}
        <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs">
          <div>
            <h3 className="text-sm font-extrabold text-foreground">Kurs USD ke Rupiah</h3>
            <p className="text-xs text-muted-foreground">
              Digunakan untuk mengonversi perkiraan biaya token Gemini API ke Rupiah di log pemakaian.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-full max-w-[220px]">
              <MoneyInput
                value={usdRate}
                onChange={(n) => setCustomUsdRate(n)}
                aria-label="Nilai kurs USD ke Rupiah"
                suffix="Rp"
                disabled={!isSuper}
              />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">per 1 USD</span>
          </div>
        </section>
      </div>

      {/* Bagian 3: Saklar Fitur & Batas Anggaran AI */}
      <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs">
        <div>
          <h3 className="text-sm font-extrabold text-foreground">Saklar Darurat & Fitur AI</h3>
          <p className="text-xs text-muted-foreground">
            Kendalikan pemanggilan API Gemini secara global atau per fitur tanpa mematikan aplikasi.
          </p>
        </div>

        <div className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
          aiForm.master_kill_switch
            ? "border-rose-500/60 bg-rose-500/10 text-rose-900 dark:text-rose-200"
            : "border-border/60 bg-background"
        }`}>
          <div>
            <p className="text-xs font-extrabold">Saklar Darurat AI Global (Master Kill-Switch)</p>
            <p className="text-[11px] text-muted-foreground">
              {aiForm.master_kill_switch
                ? "🔴 AI SEDANG DINONAKTIFKAN TOTAL UNTUK SEMUA USER."
                : "🟢 Layanan AI normal dan aktif."}
            </p>
          </div>
          {isSuper && (
            <Button
              size="sm"
              variant={aiForm.master_kill_switch ? "default" : "destructive"}
              onClick={handleMasterKillSwitch}
              className="rounded-xl font-bold"
            >
              {aiForm.master_kill_switch ? "Aktifkan Kembali AI" : "Matikan AI..."}
            </Button>
          )}
        </div>

        <div className="space-y-2 rounded-xl border border-border/60 bg-background p-4 text-xs">
          <p className="font-extrabold text-foreground">Kebijakan Saat Anggaran 100% Tercapai</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={aiForm.basic_ai_disabled_at_100pct}
              onChange={(e) => setCustomAiForm({ ...aiForm, basic_ai_disabled_at_100pct: e.target.checked })}
              disabled={!isSuper}
              className="size-4 rounded text-teal-600"
            />
            <span>Matikan AI otomatis untuk pengguna <b>Basic</b> (Pengguna Pro tetap berjalan).</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={aiForm.pro_hard_limit_enabled}
              onChange={(e) => setCustomAiForm({ ...aiForm, pro_hard_limit_enabled: e.target.checked })}
              disabled={!isSuper}
              className="size-4 rounded text-rose-600"
            />
            <span className="text-rose-700 dark:text-rose-300">
              <b>Batas Keras Pro:</b> Matikan juga untuk pengguna Pro bila anggaran 100% (Bawaan: nonaktif).
            </span>
          </label>
        </div>

        <div className="space-y-2 text-xs">
          <p className="font-extrabold text-foreground">Saklar per Fitur AI</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Object.entries(FEATURE_LABEL).map(([key, label]) => {
              const active = aiForm.feature_toggles[key] !== false;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-background p-3"
                >
                  <span className="font-semibold text-foreground">{label}</span>
                  {isSuper ? (
                    <button
                      type="button"
                      onClick={() => handleToggleFeature(key)}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors ${
                        active
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground line-through"
                      }`}
                    >
                      {active ? "Aktif" : "Nonaktif"}
                    </button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">{active ? "Aktif" : "Nonaktif"}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {isSuper && (
          <Button onClick={handleSaveAiControls} className="rounded-xl font-bold">
            Simpan Seluruh Pengaturan AI & Kurs
          </Button>
        )}
      </section>
    </div>
  );
}

function RequestsTab() {
  const { data, err, load } = useLoad(A.listRequests);
  const [ask, dialog] = useConfirm();
  if (err) return <Err t={err} />;
  if (!data) return <Skel />;
  if (data.length === 0) return <p className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-xs text-muted-foreground">Belum ada permintaan berlangganan.</p>;
  return (
    <div className="space-y-3">
      {dialog}
      {data.map((r) => (
        <div key={r.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4.5 shadow-2xs sm:flex-row sm:items-center">
          <div>
            <p className="break-all text-sm font-bold text-foreground">{r.email}</p>
            <p className="text-xs text-muted-foreground">
              Minta {r.plan} · {fmtDate(r.created_at)} · Status: <span className="font-semibold text-foreground">{r.status}</span>{r.note ? ` · "${r.note}"` : ""}
            </p>
          </div>
          {(r.status === "baru" || r.status === "diproses") && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  if (await ask(`Aktifkan ${r.plan} 30 hari untuk ${r.email}?`, "Aktifkan")) {
                    void act(() => A.resolveRequest(r.id, "aktif", 30), "Diaktifkan", load);
                  }
                }}
              >
                Aktifkan 30 hari
              </Button>
              <Button size="sm" variant="outline" onClick={() => act(() => A.resolveRequest(r.id, "diproses", 30), "Ditandai diproses", load)}>
                Diproses
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (await ask(`Tolak permintaan ${r.email}?`, "Tolak")) {
                    void act(() => A.resolveRequest(r.id, "ditolak", 30), "Ditolak", load);
                  }
                }}
              >
                Tolak
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MarketTab() {
  const { data, err, load } = useLoad(getSnapshots);
  const [ask, dialog] = useConfirm();
  const empty = { id: null as string | null, name: "", category: "pasar_uang", risk: "rendah", ret_1m: "", ret_ytd: "", ret_1y: "", aum: "", as_of: new Date().toISOString().slice(0, 10), source_url: "" };
  const [f, setF] = React.useState(empty);

  if (err) return <Err t={err} />;
  if (!data) return <Skel />;

  const num = (t: string) => (t.trim() === "" ? null : Number(t.replace(",", ".")));
  const bad = (t: string) => {
    const n = num(t);
    return n !== null && !Number.isFinite(n);
  };
  const valid = f.name.trim() && /^https:\/\//.test(f.source_url) && ![f.ret_1m, f.ret_ytd, f.ret_1y, f.aum].some(bad);
  const field = (k: "ret_1m" | "ret_ytd" | "ret_1y" | "aum", label: string) => (
    <label className="block space-y-1 text-xs font-semibold">
      {label}
      <Input inputMode="decimal" aria-label={label} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value.replace(/[^\d.,-]/g, "") })} />
    </label>
  );

  return (
    <div className="space-y-4">
      {dialog}
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-2xs space-y-3">
        <p className="text-sm font-bold">{f.id ? "Ubah data pasar" : "Tambah data pasar baru"}</p>
        <Input aria-label="Nama produk" placeholder="Nama produk atau kategori" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Select aria-label="Kategori" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            <option value="pasar_uang">Pasar uang</option>
            <option value="pendapatan_tetap">Pendapatan tetap</option>
            <option value="campuran">Campuran</option>
            <option value="saham">Saham</option>
          </Select>
          <Select aria-label="Risiko" value={f.risk} onChange={(e) => setF({ ...f, risk: e.target.value })}>
            <option value="rendah">Risiko rendah</option>
            <option value="sedang">Risiko sedang</option>
            <option value="tinggi">Risiko tinggi</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {field("ret_1m", "Return 1 bulan (%)")}
          {field("ret_ytd", "Return tahun berjalan (%)")}
          {field("ret_1y", "Return 1 tahun (%)")}
          {field("aum", "Dana kelolaan (Rp)")}
        </div>
        <label className="block space-y-1 text-xs font-semibold">
          Tanggal data
          <Input type="date" aria-label="Tanggal data" value={f.as_of} onChange={(e) => setF({ ...f, as_of: e.target.value })} />
        </label>
        <Input aria-label="Alamat sumber" placeholder="https:// alamat factsheet atau sumber resmi" value={f.source_url} onChange={(e) => setF({ ...f, source_url: e.target.value.trim() })} />
        <div className="flex gap-2">
          <Button
            className="rounded-xl font-bold"
            disabled={!valid}
            onClick={() =>
              act(
                () =>
                  A.upsertMarket({
                    id: f.id,
                    name: f.name.trim(),
                    category: f.category,
                    risk: f.risk,
                    ret_1m: num(f.ret_1m),
                    ret_ytd: num(f.ret_ytd),
                    ret_1y: num(f.ret_1y),
                    aum: num(f.aum),
                    as_of: f.as_of,
                    source_url: f.source_url,
                  }),
                "Tersimpan",
                () => {
                  setF(empty);
                  load();
                }
              )
            }
          >
            Simpan
          </Button>
          {f.id && <Button variant="outline" className="rounded-xl" onClick={() => setF(empty)}>Batal</Button>}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {data.map((s: SnapshotRow) => (
          <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.category} · {s.risk} · {s.as_of} · 1th: {s.ret_1y ?? "-"}%</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-8 text-xs"
                onClick={() =>
                  setF({
                    id: s.id,
                    name: s.name,
                    category: s.category,
                    risk: s.risk,
                    ret_1m: s.ret_1m?.toString() ?? "",
                    ret_ytd: s.ret_ytd?.toString() ?? "",
                    ret_1y: s.ret_1y?.toString() ?? "",
                    aum: s.aum?.toString() ?? "",
                    as_of: s.as_of,
                    source_url: s.source_url,
                  })
                }
              >
                Ubah
              </Button>
              <Button
                size="sm"
                variant="outline"
                aria-label={`Hapus ${s.name}`}
                className="rounded-xl h-8 text-xs text-rose-600 hover:text-rose-700"
                onClick={async () => {
                  if (await ask(`Hapus data "${s.name}"?`, "Hapus")) void act(() => A.deleteMarket(s.id), "Dihapus", load);
                }}
              >
                Hapus
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditTab() {
  const { data, err } = useLoad(A.listAudit);
  if (err) return <Err t={err} />;
  if (!data) return <Skel />;
  if (data.length === 0) return <p className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-xs text-muted-foreground">Belum ada aktivitas admin.</p>;
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
      <div className="divide-y divide-border/60">
        {data.map((a) => (
          <div key={a.id} className="flex items-start justify-between p-3.5 text-xs">
            <div>
              <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{a.action}</span>
              <span className="ml-2 text-foreground font-semibold">oleh {a.actor_email ?? "-"}</span>
              {a.target_email && <span className="text-muted-foreground"> untuk {a.target_email}</span>}
              {a.detail && <p className="mt-0.5 text-muted-foreground font-mono text-[11px]">{a.detail}</p>}
            </div>
            <span className="shrink-0 text-muted-foreground text-[11px] tabular-nums">
              {a.created_at.slice(0, 16).replace("T", " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MfaSwitch({ status, onChange }: { status: A.MfaStatus; onChange: () => void }) {
  const [err, setErr] = React.useState("");
  const [needCode, setNeedCode] = React.useState(false);
  const flip = async () => {
    setErr("");
    try {
      await A.setRequireMfa(!status.require_mfa);
      setNeedCode(false);
      onChange();
    } catch (e) {
      if (e instanceof Error && e.message.includes("MFA_BELUM_AKTIF")) setNeedCode(true);
      setErr(A.adminErrorText(e));
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs">
      <div>
        <p className="font-extrabold text-foreground">
          🔐 Kode MFA (TOTP) untuk Akun Admin: <span className={status.require_mfa ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>{status.require_mfa ? "Wajib" : "Opsional"}</span>
        </p>
        <p className="text-muted-foreground mt-0.5">
          {status.require_mfa
            ? "Seluruh admin wajib memasukkan kode authenticator sebelum mengakses halaman admin."
            : "Wajibkan verifikasi 2 langkah untuk mengamankan akses admin."}
        </p>
      </div>
      {err && <p role="alert" className="text-rose-600 font-semibold">{err}</p>}
      {needCode && <MfaChallenge onDone={() => { setNeedCode(false); setErr(""); onChange(); }} />}
      <Button size="sm" variant="outline" className="h-8 rounded-xl font-bold" onClick={flip}>
        {status.require_mfa ? "Matikan Kewajiban" : "Wajibkan MFA Sekarang"}
      </Button>
    </div>
  );
}
