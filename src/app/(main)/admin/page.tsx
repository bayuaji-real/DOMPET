"use client";

import * as React from "react";
import Link from "next/link";
import { PageHero, Tabs, Pill, Stat, IconBox, chipCls, type PillTone } from "@/components/ui/form-kit";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/konsultan/money-input";
import { useConfirm } from "@/components/ui/use-confirm";
import { notify } from "@/lib/notify";
import { formatRupiah } from "@/lib/utils";
import * as A from "@/lib/data/admin";
import { getSnapshots, type SnapshotRow } from "@/lib/data/invest";
import { MfaChallenge } from "@/components/security/mfa";
import { AdminAcuanSection } from "./acuan-section";
import { PaymentsTab } from "./payments-tab";
import { apiAlert } from "@/lib/admin-alert";
import { Select } from "@/components/ui/select";

type Tab = "ringkasan" | "bayar" | "pengguna" | "api" | "pengaturan" | "permintaan" | "pasar" | "catatan";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "ringkasan", label: "Ringkasan", icon: "📊" },
  { id: "bayar", label: "Bayar", icon: "💸" },
  { id: "pengguna", label: "Pengguna", icon: "👥" },
  { id: "api", label: "API", icon: "⚡" },
  { id: "pengaturan", label: "Pengaturan", icon: "⚙️" },
  { id: "permintaan", label: "Minta", icon: "📨" },
  { id: "pasar", label: "Pasar", icon: "📈" },
  { id: "catatan", label: "Catatan", icon: "📝" },
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

  const reload = React.useCallback(() => {
    A.getMfaStatus()
      .then((s) => {
        setMfa(s);
        setRole(s.role);
      })
      .catch(() => {
        A.getMyAdminRole().then(setRole);
      });
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const locked = !!mfa && mfa.require_mfa && mfa.aal !== "aal2";

  return (
    <div className="pb-24">
      <TopHeader title="Admin" />
      <div className="space-y-4 px-4 pt-2">
        <PageHero title="Dashboard Admin" desc="Pantau pertumbuhan pengguna, pendapatan, biaya AI, dan kelola kontrol bisnis." />
        {role === undefined && <div className="h-32 animate-pulse rounded-3xl bg-muted" aria-busy="true" />}
        {role === null && (
          <p role="alert" className="rounded-2xl bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
            Halaman ini hanya untuk admin.
          </p>
        )}
        {role && locked && (
          <MfaChallenge onDone={reload} title="Admin wajib memakai kode MFA. Masukkan kode dari aplikasi authenticator." />
        )}
        {role && !locked && (
          <>
            {role === "superadmin" && mfa && <MfaSwitch status={mfa} onChange={reload} />}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <p>Peranmu: <span className="font-bold text-foreground">{role === "superadmin" ? "Superadmin" : "Admin"}</span>. Semua tindakan dicatat di log audit.</p>
              <Link href="/admin/performa-marketing" className="font-bold text-teal-600 hover:underline dark:text-teal-400">
                Performa marketing · Creative →
              </Link>
            </div>
            <Tabs
              value={tab}
              onChange={setTab}
              label="Bagian admin"
              options={TABS.map((t) => ({ value: t.id, label: t.label, icon: t.icon }))}
            />
            {tab === "ringkasan" && <SummaryTab onGoBayar={() => setTab("bayar")} />}
            {tab === "bayar" && <PaymentsTab />}
            {tab === "pengguna" && <UsersTab isSuper={role === "superadmin"} />}
            {tab === "api" && <ApiTab isSuper={role === "superadmin"} />}
            {tab === "pengaturan" && <SettingsTab isSuper={role === "superadmin"} />}
            {tab === "permintaan" && <RequestsTab />}
            {tab === "pasar" && (
              <div className="space-y-4">
                <AdminAcuanSection />
                <MarketTab />
              </div>
            )}
            {tab === "catatan" && <AuditTab />}
          </>
        )}
      </div>
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
    <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
      {t}
    </p>
  ) : null;

const Skel = () => <div className="h-32 animate-pulse rounded-3xl bg-muted" aria-busy="true" />;

async function act(fn: () => Promise<unknown>, ok: string, after: () => void) {
  try {
    await fn();
    notify(ok);
    after();
  } catch (e) {
    notify(A.adminErrorText(e));
  }
}

/** Tab 1: Ringkasan Metrik Dashboard */
function SummaryTab({ onGoBayar }: { onGoBayar: () => void }) {
  const [range, setRange] = React.useState<"month" | "30d" | "7d" | "today">("month");

  const getRangeDates = React.useCallback(() => {
    const now = new Date();
    const to = now.toISOString();
    let from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString(); // awal bulan WIB
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

  React.useEffect(() => {
    load();
  }, [range, load]);

  if (err) return <Err t={err} />;
  if (!s) return <Skel />;

  return (
    <div className="space-y-4">
      {/* Filter Periode */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">Periode Data:</p>
        <div role="group" aria-label="Pilih rentang waktu" className="flex flex-wrap gap-1">
          {[
            ["month", "Bulan Ini"],
            ["30d", "30 Hari"],
            ["7d", "7 Hari"],
            ["today", "Hari Ini"],
          ].map(([val, label]) => (
            <button
              key={val}
              type="button"
              className={chipCls(range === val)}
              onClick={() => setRange(val as typeof range)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Baris Kartu Antrean Perhatian Owner */}
      {s.pending_payments > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-amber-500/50 bg-amber-500/10 p-4 text-xs">
          <div>
            <p className="font-bold text-amber-900 dark:text-amber-200">
              ⚠️ {s.pending_payments} pembayaran perlu verifikasi Owner
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Antrean tertua sudah menunggu selama {s.oldest_pending_minutes} menit.
            </p>
          </div>
          <Button size="sm" onClick={onGoBayar} className="rounded-xl font-bold">
            Buka Tab Bayar →
          </Button>
        </div>
      )}

      {/* Kartu Ringkasan Metrik KPI */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Pengguna & Baru */}
        <div className="space-y-2 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Basis Pengguna</span>
            <span className="text-lg">👥</span>
          </div>
          <div>
            <p className="text-2xl font-black text-foreground">{s.total_users ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total pengguna terdaftar</p>
          </div>
          <div className="border-t border-border/50 pt-2 text-xs">
            <span className="font-bold text-teal-600 dark:text-teal-400">+{s.new_users_today ?? 0}</span> pengguna baru hari ini
          </div>
        </div>

        {/* Pengguna Aktif (DAU & MAU) */}
        <div className="space-y-2 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Aktivitas Nyata</span>
            <span className="text-lg">⚡</span>
          </div>
          <div>
            <p className="text-2xl font-black text-foreground">{s.active_users_today ?? 0}</p>
            <p className="text-xs text-muted-foreground">Pengguna aktif hari ini (mencatat/AI)</p>
          </div>
          <div className="border-t border-border/50 pt-2 text-xs">
            <span className="font-bold text-sky-600 dark:text-sky-400">{s.active_users_30d ?? 0}</span> aktif dalam 30 hari terakhir
          </div>
        </div>

        {/* Kas Masuk (Cash Inflow) */}
        <div className="space-y-2 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Kas Masuk (Lunas)</span>
            <span className="text-lg">💸</span>
          </div>
          <div>
            <p className="text-2xl font-black text-foreground">{formatRupiah(s.cash_in_month ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Kas masuk bulan ini</p>
          </div>
          <div className="border-t border-border/50 pt-2 text-xs">
            Periode terpilih: <span className="font-bold">{formatRupiah(s.cash_in_period ?? 0)}</span>
          </div>
        </div>

        {/* Beban Biaya AI Gemini */}
        <div className="space-y-2 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Biaya AI Gemini</span>
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <p className="text-2xl font-black text-foreground">{formatRupiah(Math.round(s.ai_cost_month ?? 0))}</p>
            <p className="text-xs text-muted-foreground">Biaya pemakaian bulan ini</p>
          </div>
          <div className="border-t border-border/50 pt-2 text-xs">
            Periode terpilih: <span className="font-bold">{formatRupiah(Math.round(s.ai_cost_period ?? 0))}</span>
          </div>
        </div>

        {/* Anggaran AI & Persentase */}
        <div className="space-y-2 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Konsumsi Anggaran AI</span>
            <span className="text-lg">🎯</span>
          </div>
          <div>
            <p className="text-2xl font-black text-foreground">
              {s.budget_used_pct !== null ? `${s.budget_used_pct}%` : "Belum diatur"}
            </p>
            <p className="text-xs text-muted-foreground">
              {s.budget_idr > 0 ? `Dari batas ${formatRupiah(s.budget_idr)}` : "Anggaran bulanan belum diisi"}
            </p>
          </div>
          <div className="border-t border-border/50 pt-2 text-xs text-muted-foreground">
            Peringatan di {s.warn_pct ?? 70}% · Otomatis mati di 100% untuk Basic
          </div>
        </div>

        {/* Waktu Tunggu Antrean */}
        <div className="space-y-2 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Kecepatan Verifikasi</span>
            <span className="text-lg">⏱️</span>
          </div>
          <div>
            <p className="text-2xl font-black text-foreground">
              {s.pending_payments === 0 ? "0 antrean" : `${s.oldest_pending_minutes} mnt`}
            </p>
            <p className="text-xs text-muted-foreground">
              {s.pending_payments === 0 ? "Semua pembayaran sudah diproses" : "Waktu tunggu antrean terlama"}
            </p>
          </div>
          <div className="border-t border-border/50 pt-2 text-xs">
            Target verifikasi: <span className="font-bold text-emerald-600 dark:text-emerald-400">&lt; 15 menit</span>
          </div>
        </div>
      </div>
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
    <div className="space-y-3">
      <div role={al.tone === "bad" || al.tone === "warn" ? "alert" : "status"} className={`rounded-2xl p-4 ${cls}`}>
        <p className="font-semibold">{al.title}</p>
        <p className="text-sm">{al.body}</p>
      </div>
      {u.configured && (
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full ${u.level === "aman" ? "bg-emerald-500" : u.level === "waspada" ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${Math.min(100, u.used_pct ?? 0)}%` }}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {[
          ["Top-up diisi", formatRupiah(u.budget_idr)],
          ["Terpakai sejak " + fmtDate(u.since), formatRupiah(Math.round(u.spent_idr))],
          ["Bulan ini", formatRupiah(Math.round(u.month_spent_idr))],
          ["Hari ini", formatRupiah(Math.round(u.today_spent_idr))],
          ["Panggilan Ruby bulan ini", String(u.calls_month)],
          ["Rata-rata per hari (7 hari)", formatRupiah(Math.round(u.avg_daily_idr))],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Biaya per hari (30 hari)</p>
        {u.daily.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-3 text-center text-xs text-muted-foreground">Belum ada pemakaian Ruby.</p>
        ) : (
          <div className="flex h-20 items-end gap-1 rounded-2xl border border-border/70 bg-card p-3 shadow-xs" role="img" aria-label="Grafik biaya Ruby per hari">
            {u.daily.map((d) => (
              <div
                key={d.day}
                title={`${d.day}: ${formatRupiah(Math.round(d.cost_idr))}`}
                className="max-w-6 flex-1 rounded-t-md bg-teal-500/70"
                style={{ height: `${Math.max(4, (d.cost_idr / max) * 100)}%` }}
              />
            ))}
          </div>
        )}
      </div>
      <div>
        <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Per fitur (bulan ini)</p>
        <ul className="space-y-1">
          {u.by_feature.map((x) => (
            <li key={x.feature} className="flex justify-between rounded-lg bg-muted p-2 text-sm">
              <span>
                {FEATURE_LABEL[x.feature] ?? x.feature} <span className="text-xs text-muted-foreground">({x.calls}x)</span>
              </span>
              <span>{formatRupiah(Math.round(x.cost_idr))}</span>
            </li>
          ))}
          {u.by_feature.length === 0 && <li className="text-xs text-muted-foreground">Belum ada data.</li>}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">Biaya adalah perkiraan. Cocokkan dengan tagihan asli di Google AI Studio.</p>
      {isSuper ? (
        <div className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
          <p className="text-sm font-semibold">Catat top-up / anggaran API</p>
          <label className="block space-y-1 text-xs">
            Nilai anggaran API (Rupiah)
            <MoneyInput value={f.budget} onChange={(n) => setF({ ...f, budget: n })} aria-label="Nilai top-up" suffix="Rp" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1 text-xs font-semibold">
              Berlaku sejak
              <Input type="date" aria-label="Berlaku sejak" value={f.since} onChange={(e) => setF({ ...f, since: e.target.value })} />
            </label>
            <label className="block space-y-1 text-xs font-semibold">
              Peringatkan di (%)
              <Input inputMode="numeric" aria-label="Ambang peringatan" value={f.warn} onChange={(e) => setF({ ...f, warn: e.target.value.replace(/\D/g, "").slice(0, 2) })} />
            </label>
          </div>
          <Button
            className="h-10 w-full rounded-2xl text-xs"
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

  // State untuk form ubah paket manual dengan alasan wajib
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

    setSel(null); // Tutup sheet terlebih dahulu agar dialog konfirmasi tidak tertutup portal
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
    <div className="space-y-3">
      {dialog}
      <div className="grid grid-cols-3 gap-1.5">
        <Pill tone="sky" className="justify-center" icon="👥">{data.length} total</Pill>
        <Pill tone="slate" className="justify-center" icon="🌱">{byPlan("free")} Basic</Pill>
        <Pill tone="neon" className="justify-center" icon="👑">{byPlan("pro")} Pro</Pill>
      </div>

      <Input aria-label="Cari email" placeholder="🔎 Cari email pengguna..." className="h-10 rounded-xl" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-xs">
        <table className="w-full table-fixed text-left text-xs">
          <thead className="bg-muted/70 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Pengguna</th>
              <th className="w-[78px] px-1 py-2">Paket</th>
              <th className="w-11 px-1 py-2 text-right">Ruby</th>
              <th className="w-[74px] px-2 py-2 text-right">Daftar</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => {
              const pp = planPill(u.plan);
              return (
                <tr
                  key={u.user_id}
                  onClick={() => {
                    setSel(u.user_id);
                    setPlanTarget(u.plan === "pro" ? "free" : "pro");
                    setPlanDays("30");
                    setPlanReason("");
                  }}
                  className="cursor-pointer border-t border-border/50 transition-colors hover:bg-emerald-400/10 active:bg-emerald-400/20"
                >
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSel(u.user_id);
                        setPlanTarget(u.plan === "pro" ? "free" : "pro");
                        setPlanDays("30");
                        setPlanReason("");
                      }}
                      aria-label={`Detail ${u.email}`}
                      className="block w-full cursor-pointer truncate text-left font-semibold"
                    >
                      {u.email}
                    </button>
                    {u.admin_role && (
                      <span className="mt-0.5 inline-block rounded-full bg-indigo-500/15 px-1.5 text-[9px] font-bold text-indigo-600 dark:text-indigo-300">
                        {u.admin_role}
                      </span>
                    )}
                  </td>
                  <td className="px-1 py-2.5">
                    <Pill tone={pp.tone} icon={pp.icon} className="px-1.5 text-[10px]">{pp.label}</Pill>
                  </td>
                  <td className="px-1 py-2.5 text-right font-bold tabular-nums">{u.ai_used}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right text-[11px] tabular-nums text-muted-foreground">{fmtShort(u.created_at)}</td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-5 text-center text-xs text-muted-foreground">Tidak ada pengguna yang cocok.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="px-1 text-[11px] text-muted-foreground">Ketuk baris pengguna untuk melihat detail dan mengubah paket.</p>

      {/* Modal Detail & Ubah Paket Pengguna */}
      <Sheet open={!!user} onOpenChange={(o) => { if (!o) setSel(null); }}>
        <SheetContent side="bottom" showCloseButton overlayClassName="bg-black/50 backdrop-blur-sm" className="mx-auto max-h-[88dvh] max-w-[480px] overflow-y-auto rounded-t-3xl border-border/80 bg-background px-5 pb-6 pt-4 shadow-2xl">
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

                <div className="grid grid-cols-2 gap-2">
                  <Stat icon="📅" tone="sky" label="Daftar" value={fmtDate(user.created_at)} />
                  <Stat icon="🔑" tone="violet" label="Login terakhir" value={fmtDate(user.last_sign_in_at)} />
                  <Stat icon="🤖" tone="neon" label="Ruby bulan ini" value={user.ai_used} />
                  <Stat icon="🎟️" tone="amber" label="Status paket" value={user.source === "paid" ? (user.plan_expires_at ? `s.d. ${fmtDate(user.plan_expires_at)}` : "tanpa batas") : user.source === "trial" ? `uji coba s.d. ${fmtDate(user.trial_ends_at)}` : "gratis"} />
                </div>

                {isSuper ? (
                  <div role="group" aria-label={`Paket ${user.email}`} className="space-y-3 rounded-2xl border border-border/70 bg-card p-3.5 shadow-xs">
                    <p className="text-xs font-bold text-foreground">Ubah Paket Pengguna</p>
                    <div className="grid grid-cols-2 gap-2">
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
                        placeholder="Wajib minimal 5 karakter (misal: Kompensasi gangguan)..."
                        value={planReason}
                        onChange={(e) => setPlanReason(e.target.value)}
                        maxLength={150}
                      />
                      <p className="text-[10px] text-muted-foreground">Alasan ini akan disimpan di log audit.</p>
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
                  <div className="space-y-2 border-t border-border/50 pt-2">
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

  // State untuk form edit harga
  const [editingPrice, setEditingPrice] = React.useState<{ months: number; amount: number } | null>(null);
  const [newAmount, setNewAmount] = React.useState<number>(0);

  // State untuk form saklar AI & kurs (simpan perubahan lokal pengguna)
  const [customAiForm, setCustomAiForm] = React.useState<A.AiControlsData["controls"] | null>(null);
  const [customUsdRate, setCustomUsdRate] = React.useState<number | null>(null);

  const aiForm = customAiForm ?? controlsLoad.data?.controls ?? null;
  const usdRate = customUsdRate ?? controlsLoad.data?.usd_idr_rate ?? 16000;

  // Modal konfirmasi ketik NONAKTIFKAN untuk master kill switch
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
      // Mau mematikan -> wajib konfirmasi ketik NONAKTIFKAN
      setKillSwitchModal(true);
      setKillConfirmText("");
    } else {
      // Mau menyalakan kembali -> langsung nyalakan
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

      {/* Modal Dialog Ketik NONAKTIFKAN untuk Master Kill Switch */}
      {killSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="kill-title" className="w-full max-w-md space-y-4 rounded-3xl border border-rose-500/50 bg-card p-5 shadow-2xl">
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

      {/* Bagian 1: Pengaturan Harga Paket */}
      <section className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-foreground">Harga Paket Pro</h3>
          <p className="text-xs text-muted-foreground">
            Harga resmi paket langganan. Perubahan hanya berlaku untuk permintaan pembayaran baru.
          </p>
        </div>

        <div className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-background">
          {pricesLoad.data.map((p) => (
            <div key={p.months} className="flex items-center justify-between p-3 text-xs">
              <div>
                <p className="font-extrabold text-foreground">Paket {p.months} Bulan</p>
                <p className="text-muted-foreground">{formatRupiah(p.amount)}</p>
              </div>
              {isSuper && (
                <Button size="sm" variant="outline" onClick={() => handleEditPrice(p)} className="rounded-xl">
                  Ubah Harga
                </Button>
              )}
            </div>
          ))}
        </div>

        {editingPrice && isSuper && (
          <div className="space-y-3 rounded-2xl border border-teal-500/40 bg-teal-500/5 p-3.5 text-xs">
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
      <section className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-foreground">Kurs USD ke Rupiah</h3>
          <p className="text-xs text-muted-foreground">
            Digunakan untuk mengonversi perkiraan biaya token Gemini API ke Rupiah di log pemakaian.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="max-w-[200px]">
            <MoneyInput
              value={usdRate}
              onChange={(n) => setCustomUsdRate(n)}
              aria-label="Nilai kurs USD ke Rupiah"
              suffix="Rp"
              disabled={!isSuper}
            />
          </div>
          <span className="text-xs text-muted-foreground">per 1 USD</span>
        </div>
      </section>

      {/* Bagian 3: Saklar Fitur & Batas Anggaran AI */}
      <section className="space-y-4 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-foreground">Saklar Darurat & Fitur AI</h3>
          <p className="text-xs text-muted-foreground">
            Kendalikan pemanggilan API Gemini secara global atau per fitur tanpa mematikan aplikasi.
          </p>
        </div>

        {/* Master Kill Switch */}
        <div className={`flex items-center justify-between rounded-2xl border p-3.5 transition-colors ${
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

        {/* Saklar Batas Anggaran 100% */}
        <div className="space-y-2 rounded-2xl border border-border/60 bg-background p-3.5 text-xs">
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

        {/* Saklar Per Fitur */}
        <div className="space-y-2 text-xs">
          <p className="font-extrabold text-foreground">Saklar per Fitur AI</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Object.entries(FEATURE_LABEL).map(([key, label]) => {
              const active = aiForm.feature_toggles[key] !== false;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-background p-2.5"
                >
                  <span className="font-medium text-foreground">{label}</span>
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
          <Button onClick={handleSaveAiControls} className="w-full rounded-2xl font-bold">
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
  if (data.length === 0) return <p className="rounded-3xl border border-dashed border-border/70 p-5 text-center text-xs text-muted-foreground">Belum ada permintaan berlangganan.</p>;
  return (
    <ul className="space-y-2">
      {dialog}
      {data.map((r) => (
        <li key={r.id} className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
          <p className="break-all text-sm font-medium">{r.email}</p>
          <p className="text-xs text-muted-foreground">
            Minta {r.plan} · {fmtDate(r.created_at)} · status {r.status}{r.note ? ` · "${r.note}"` : ""}
          </p>
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
        </li>
      ))}
    </ul>
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
    <div className="space-y-3">
      {dialog}
      <p className="text-xs text-muted-foreground">Isi dari sumber resmi. Wajib ada tanggal dan alamat sumber https.</p>
      <div className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
        <p className="text-sm font-semibold">{f.id ? "Ubah data" : "Tambah data"}</p>
        <Input aria-label="Nama produk" placeholder="Nama produk atau kategori" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
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
        <div className="grid grid-cols-2 gap-2">
          {field("ret_1m", "Return 1 bulan (%)")}
          {field("ret_ytd", "Return tahun berjalan (%)")}
          {field("ret_1y", "Return 1 tahun (%)")}
          {field("aum", "Dana kelolaan (Rp)")}
        </div>
        <label className="block space-y-1 text-xs">
          Tanggal data
          <Input type="date" aria-label="Tanggal data" value={f.as_of} onChange={(e) => setF({ ...f, as_of: e.target.value })} />
        </label>
        <Input aria-label="Alamat sumber" placeholder="https:// alamat factsheet atau sumber resmi" value={f.source_url} onChange={(e) => setF({ ...f, source_url: e.target.value.trim() })} />
        <div className="flex gap-2">
          <Button
            className="flex-1"
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
          {f.id && <Button variant="outline" onClick={() => setF(empty)}>Batal</Button>}
        </div>
      </div>
      <ul className="space-y-2">
        {data.map((s: SnapshotRow) => (
          <li key={s.id} className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.category} · {s.risk} · {s.as_of} · 1th {s.ret_1y ?? "-"}%</p>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
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
                onClick={async () => {
                  if (await ask(`Hapus data "${s.name}"?`, "Hapus")) void act(() => A.deleteMarket(s.id), "Dihapus", load);
                }}
              >
                Hapus
              </Button>
            </div>
          </li>
        ))}
        {data.length === 0 && <li className="rounded-2xl border border-dashed p-3 text-center text-xs text-muted-foreground">Belum ada data pasar.</li>}
      </ul>
    </div>
  );
}

function AuditTab() {
  const { data, err } = useLoad(A.listAudit);
  if (err) return <Err t={err} />;
  if (!data) return <Skel />;
  if (data.length === 0) return <p className="rounded-3xl border border-dashed border-border/70 p-5 text-center text-xs text-muted-foreground">Belum ada aktivitas admin.</p>;
  return (
    <ul className="space-y-1">
      {data.map((a) => (
        <li key={a.id} className="rounded-lg bg-muted p-2 text-xs">
          <b>{a.action}</b> oleh {a.actor_email ?? "-"}{a.target_email ? ` untuk ${a.target_email}` : ""}{a.detail ? ` (${a.detail})` : ""} · {a.created_at.slice(0, 16).replace("T", " ")}
        </li>
      ))}
    </ul>
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
    <div className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
      <p className="text-sm font-extrabold">
        <span aria-hidden>🔐 </span>Kode MFA wajib untuk admin: {status.require_mfa ? "Aktif" : "Belum aktif"}
      </p>
      <p className="text-xs text-muted-foreground">
        {status.require_mfa
          ? "Semua admin harus memasukkan kode dari aplikasi authenticator sebelum memakai halaman Admin."
          : "Daftarkan MFA-mu dulu di menu Keamanan, masukkan kodenya di sini, lalu wajibkan. Dengan begitu kamu tidak terkunci."}
      </p>
      {err && <p role="alert" className="text-xs text-red-600">{err}</p>}
      {needCode && <MfaChallenge onDone={() => { setNeedCode(false); setErr(""); onChange(); }} />}
      <Button size="sm" variant="outline" className="h-9 rounded-2xl border-emerald-400/60 text-xs font-bold" onClick={flip}>
        {status.require_mfa ? "Matikan kewajiban" : "Wajibkan MFA untuk admin"}
      </Button>
    </div>
  );
}
