"use client";

import * as React from "react";
import { PageHero } from "@/components/ui/form-kit";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, Plus, Sparkles, Trash2, WalletCards } from "lucide-react";
import { AiChat } from "@/components/ai/ai-chat";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPaydaySchedules } from "@/lib/data/payday";
import { getUserSettings } from "@/lib/data/settings";
import { getRecurringTransactions } from "@/lib/data/recurring";
import { getSavingsGoals } from "@/lib/data/goals";
import { createWallet, getWallets, type WalletBalance } from "@/lib/data/wallets";
import { todayJakarta } from "@/lib/data/sample-mode";
import { buildPlan, generatePaydays, type PlanBill, type PlanNeed, type PlanPayday, type StorageAdvice } from "@/lib/financial-plan";
import { formatRupiah, formatTanggalWIB } from "@/lib/utils";

const EXTRA_KEY = "dompet_rencana_extra";
const MANUAL_KEY = "dompet_rencana_income";
const toNum = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;
const fmtInput = (n: number) => (n > 0 ? n.toLocaleString("id-ID") : "");
const uid = () => Math.random().toString(36).slice(2, 9);

const STORAGE_LABEL: Record<StorageAdvice, string> = {
  bank: "Tabungan bank terpisah (< 3 bulan)",
  rdpu: "RDPU / deposito (3 bln–3 thn)",
  investasi_jangka_panjang: "Reksa dana indeks, bertahap (> 3 thn)",
};

interface AIPlan {
  ringkasan: string;
  saran: string[];
  dompet: { nama: string; jenis: "bank" | "ewallet" | "cash" | "investasi"; tempat: string; untuk: string; alasan: string }[];
}

interface ExtraNeed {
  id: string;
  name: string;
  amount: number;
  deadline: string;
}

export default function RencanaPage() {
  // "hari ini" dibaca setelah halaman terbuka (bukan saat build)
  const [today, setToday] = React.useState("");
  React.useEffect(() => setToday(todayJakarta()), []);
  const [view, setView] = React.useState<"chat" | "hitung">("chat");
  const [loading, setLoading] = React.useState(true);
  const [schedule, setSchedule] = React.useState<PlanPayday[]>([]);
  const [manual, setManual] = React.useState({ amount: 0, frequency: "biweekly" as "biweekly" | "monthly", next: "" });
  const [living, setLiving] = React.useState(0);
  const [bills, setBills] = React.useState<PlanBill[]>([]);
  const [goals, setGoals] = React.useState<PlanNeed[]>([]);
  const [excluded, setExcluded] = React.useState<string[]>([]);
  const [extras, setExtras] = React.useState<ExtraNeed[]>([]);
  const [wallets, setWallets] = React.useState<WalletBalance[]>([]);
  const [showAll, setShowAll] = React.useState(false);
  const [ai, setAi] = React.useState<AIPlan | null>(null);
  const [aiState, setAiState] = React.useState<"idle" | "loading" | "error">("idle");
  const [aiError, setAiError] = React.useState("");
  const [created, setCreated] = React.useState<string[]>([]);
  const [newNeed, setNewNeed] = React.useState({ name: "", amount: 0, deadline: "" });

  React.useEffect(() => {
    if (!today) return;
    try {
      const e = localStorage.getItem(EXTRA_KEY);
      if (e) setExtras(JSON.parse(e));
      const m = localStorage.getItem(MANUAL_KEY);
      if (m) setManual((cur) => ({ ...cur, ...JSON.parse(m) }));
    } catch {}

    (async () => {
      const [pay, settings, rec, gl, wl] = await Promise.allSettled([
        getPaydaySchedules(200),
        getUserSettings(),
        getRecurringTransactions(),
        getSavingsGoals(),
        getWallets(),
      ]);
      if (pay.status === "fulfilled") {
        setSchedule(
          pay.value
            .filter((p) => p.actual_amount == null)
            .map((p) => ({ date: p.date, amount: Number(p.expected_amount) || 0 }))
        );
      }
      if (settings.status === "fulfilled") setLiving(Number(settings.value?.living_cost_per_payday ?? 0));
      if (rec.status === "fulfilled") {
        setBills(
          rec.value
            .filter((r) => r.is_active && r.type === "expense")
            .map((r) => ({ name: r.note || "Tagihan", amount: Number(r.amount), dayOfMonth: r.day_of_month || Number(r.next_date.slice(8, 10)) }))
        );
      }
      if (gl.status === "fulfilled") {
        setGoals(
          gl.value
            .filter((g) => g.status === "aktif" && Number(g.remaining) > 0)
            .map((g) => ({
              id: g.id,
              name: g.name,
              remaining: Number(g.remaining),
              target: Number(g.target_amount),
              deadline: g.deadline,
              priority: g.priority,
            }))
        );
      }
      if (wl.status === "fulfilled") setWallets(wl.value.filter((w) => !w.is_archived));
      setLoading(false);
    })();
  }, [today]);

  React.useEffect(() => {
    try {
      localStorage.setItem(EXTRA_KEY, JSON.stringify(extras));
      localStorage.setItem(MANUAL_KEY, JSON.stringify(manual));
    } catch {}
  }, [extras, manual]);

  const usingSchedule = schedule.length > 0;
  const paydays = React.useMemo(
    () =>
      usingSchedule
        ? schedule
        : manual.amount > 0
          ? generatePaydays(manual.next || today, manual.amount, manual.frequency, manual.frequency === "biweekly" ? 80 : 40)
          : [],
    [usingSchedule, schedule, manual, today]
  );

  const needs: PlanNeed[] = React.useMemo(
    () => [
      ...goals.filter((g) => !excluded.includes(g.id)),
      ...extras.map((e, i) => ({ id: e.id, name: e.name, remaining: e.amount, target: e.amount, deadline: e.deadline || null, priority: 100 + i })),
    ],
    [goals, extras, excluded]
  );

  const plan = React.useMemo(
    () => buildPlan({ today, paydays, livingPerPayday: living, bills, needs }),
    [today, paydays, living, bills, needs]
  );

  // Rencana berubah → saran AI lama tidak berlaku lagi
  React.useEffect(() => {
    setAi(null);
    setAiState("idle");
  }, [plan]);

  const late = plan.needs.filter((n) => n.onTime === false);
  const avgIncome = paydays.length ? Math.round(paydays.slice(0, 6).reduce((a, p) => a + p.amount, 0) / Math.min(6, paydays.length)) : 0;
  const shown = showAll ? plan.allocations : plan.allocations.slice(0, 6);

  const askAI = async () => {
    setAiState("loading");
    setAiError("");
    try {
      const res = await fetch("/api/ai-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          today,
          incomePerPayday: avgIncome,
          paydayCount: plan.allocations.length,
          frequencyLabel: usingSchedule ? "sesuai jadwal gajian di aplikasi" : manual.frequency === "biweekly" ? "tiap 2 minggu" : "tiap bulan",
          livingPerPayday: living,
          bills,
          needs: plan.needs,
          wallets: wallets.map((w) => ({ name: w.name, type: w.type })),
          totals: { totalNeeds: plan.totalNeeds, totalIncome: plan.totalIncome, totalLeftover: plan.totalLeftover, allDoneOn: plan.allDoneOn },
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal");
      setAi(json.data);
      setAiState("idle");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Saran belum bisa dibuat.");
      setAiState("error");
    }
  };

  const makeWallet = async (d: AIPlan["dompet"][number]) => {
    const w = await createWallet({
      name: d.nama.slice(0, 40),
      type: d.jenis,
      color: d.jenis === "investasi" ? "#16a34a" : d.jenis === "ewallet" ? "#0284c7" : d.jenis === "cash" ? "#ca8a04" : "#0d9488",
      icon: d.jenis === "investasi" ? "TrendingUp" : d.jenis === "ewallet" ? "Smartphone" : d.jenis === "cash" ? "Banknote" : "Building2",
      initial_balance: 0,
    });
    if (w) {
      setCreated((c) => [...c, d.nama]);
      setWallets((ws) => [...ws, w]);
    } else {
      setAiError(`Dompet "${d.nama}" gagal dibuat. Coba lagi.`);
    }
  };

  const addExtra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNeed.name.trim() || newNeed.amount <= 0) return;
    setExtras((x) => [...x, { id: `x-${uid()}`, name: newNeed.name.trim().slice(0, 40), amount: newNeed.amount, deadline: newNeed.deadline }]);
    setNewNeed({ name: "", amount: 0, deadline: "" });
  };

  const walletExists = (name: string) => wallets.some((w) => w.name.trim().toLowerCase() === name.trim().toLowerCase());

  if (view === "chat") {
    return (
      <div className="fixed inset-x-0 top-0 z-30 mx-auto flex max-w-[430px] flex-col bg-background" style={{ bottom: "calc(max(env(safe-area-inset-bottom, 0px), 1.25rem) + 3.75rem)" }}>
        <TopHeader title="Rencana Keuangan" subtitle="Ngobrol dengan Ruby" />
        <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-4 py-2">
          <p className="text-[11px] text-muted-foreground">Jawab satu per satu, AI yang menanyakan.</p>
          <button type="button" onClick={() => setView("hitung")} className="cursor-pointer rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold text-foreground hover:bg-muted">
            Hitung manual
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <AiChat
            mode="plan"
            intro={"Aku bantu menyusun rencana uangmu. Supaya akurat, siapkan info ini ya (aku tanyakan satu per satu):\n- Gaji per gajian, contoh: Rp5.000.000\n- Tanggal gajian, contoh: tanggal 25\n- Biaya hidup per gajian, contoh: Rp1.500.000\n- Cicilan atau tagihan rutin, contoh: kos Rp800.000 tanggal 1\n- Target uang, contoh: dana darurat Rp10.000.000 dalam 1 tahun\nMulai yang pertama: berapa gajimu setiap gajian, dan seberapa sering (bulanan atau dua mingguan)?"}
            placeholder="Ketik jawabanmu di sini..."
            suggestions={["Gajiku Rp5.000.000 tiap bulan", "Gajiku Rp2.500.000 dua minggu sekali", "Aku belum punya gaji tetap"]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopHeader title="Rencana Keuangan" />

      <div className="space-y-5 px-4 pb-6 pt-5">
        <PageHero title="Rencana Keuangan" desc="Gaji dikurangi biaya hidup dan tagihan, sisanya diisi ke kebutuhan dengan tenggat paling dekat dulu (kelipatan Rp50.000)." />

        <Button type="button" variant="outline" onClick={() => setView("chat")} className="w-full rounded-xl text-xs">
          <Sparkles className="h-4 w-4 text-fuchsia-600" /> Kembali ke obrolan dengan Ruby
        </Button>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat data keuanganmu…
          </div>
        ) : (
          <>
            {/* 1. Pemasukan & pengeluaran wajib */}
            <section className="space-y-3 rounded-3xl border border-border/70 bg-card p-4">
              <h2 className="text-sm font-bold">1. Pemasukan & pengeluaran wajib</h2>
              {usingSchedule ? (
                <p className="text-xs text-muted-foreground">
                  Memakai <b className="text-foreground">{schedule.length} jadwal gajian</b> dari menu Jadwal Gajian & Biaya Hidup di More (rata-rata {formatRupiah(avgIncome)}, mulai{" "}
                  {formatTanggalWIB(schedule[0].date)}).
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Belum ada jadwal gajian di More, menu Jadwal Gajian & Biaya Hidup. Isi perkiraan dulu:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <MoneyField label="Gaji per gajian" value={manual.amount} onChange={(v) => setManual({ ...manual, amount: v })} />
                    <div className="space-y-1">
                      <Label htmlFor="rc-next" className="text-[11px]">Gajian berikutnya</Label>
                      <Input id="rc-next" type="date" value={manual.next} onChange={(e) => setManual({ ...manual, next: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(["biweekly", "monthly"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        aria-pressed={manual.frequency === f}
                        onClick={() => setManual({ ...manual, frequency: f })}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold ${manual.frequency === f ? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300" : "border-border"}`}
                      >
                        {f === "biweekly" ? "Tiap 2 minggu" : "Tiap bulan"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <MoneyField label="Biaya hidup per gajian" value={living} onChange={setLiving} />
              {bills.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-medium">Tagihan bulanan (dari menu Tagihan & Langganan Rutin di More)</p>
                  {bills.map((b, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {b.name}: <b className="text-foreground">{formatRupiah(b.amount)}</b> tiap tgl {b.dayOfMonth}
                    </p>
                  ))}
                </div>
              )}
            </section>

            {/* 2. Kebutuhan */}
            <section className="space-y-3 rounded-3xl border border-border/70 bg-card p-4">
              <h2 className="text-sm font-bold">2. Kebutuhan & tenggat</h2>
              {goals.length === 0 && extras.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Belum ada. Tambah di bawah atau buat <Link href="/tabungan" className="font-semibold text-teal-600 underline">target tabungan</Link>.
                </p>
              )}
              {goals.map((g) => {
                const on = !excluded.includes(g.id);
                return (
                  <label key={g.id} className="flex items-center justify-between gap-2 rounded-2xl bg-muted/40 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block text-xs font-bold">{g.name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        Kurang {formatRupiah(g.remaining)} {g.deadline ? `· tenggat ${formatTanggalWIB(g.deadline)}` : "· tanpa tenggat"}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setExcluded((x) => (on ? [...x, g.id] : x.filter((id) => id !== g.id)))}
                      className="h-4 w-4 accent-teal-600"
                      aria-label={`Ikutkan ${g.name}`}
                    />
                  </label>
                );
              })}
              {extras.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 rounded-2xl bg-muted/40 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block text-xs font-bold">{e.name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {formatRupiah(e.amount)} {e.deadline ? `· tenggat ${formatTanggalWIB(e.deadline)}` : "· tanpa tenggat"}
                    </span>
                  </span>
                  <button type="button" onClick={() => setExtras((x) => x.filter((y) => y.id !== e.id))} aria-label={`Hapus ${e.name}`} className="p-1.5 text-muted-foreground hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <form onSubmit={addExtra} className="space-y-2 rounded-2xl border border-dashed border-border p-3">
                <p className="text-[11px] font-medium">Tambah kebutuhan lain (mis. servis motor, kado, UKT)</p>
                <Input placeholder="Nama kebutuhan" value={newNeed.name} onChange={(e) => setNewNeed({ ...newNeed, name: e.target.value })} aria-label="Nama kebutuhan" />
                <div className="grid grid-cols-2 gap-2">
                  <MoneyField label="Nominal" value={newNeed.amount} onChange={(v) => setNewNeed({ ...newNeed, amount: v })} />
                  <div className="space-y-1">
                    <Label htmlFor="rc-dl" className="text-[11px]">Tenggat</Label>
                    <Input id="rc-dl" type="date" min={today} value={newNeed.deadline} onChange={(e) => setNewNeed({ ...newNeed, deadline: e.target.value })} />
                  </div>
                </div>
                <Button type="submit" variant="outline" className="w-full rounded-xl" disabled={!newNeed.name.trim() || newNeed.amount <= 0}>
                  <Plus className="h-4 w-4" /> Tambah
                </Button>
              </form>
            </section>

            {/* 3. Hasil */}
            {paydays.length === 0 ? (
              <p className="rounded-2xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">Isi gaji dulu supaya rencananya bisa dihitung.</p>
            ) : (
              <section className="space-y-3" aria-live="polite">
                <div className={`rounded-3xl border p-4 ${late.length ? "border-amber-500/40 bg-amber-500/5" : "border-teal-500/30 bg-teal-500/5"}`}>
                  <div className="flex items-center gap-2">
                    {late.length ? <AlertTriangle className="h-5 w-5 text-amber-600" /> : <CheckCircle2 className="h-5 w-5 text-teal-600" />}
                    <h2 className="text-sm font-extrabold">{late.length ? `${late.length} kebutuhan belum terkejar` : "Semua kebutuhan terkejar"}</h2>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
                    <Stat label="Total kebutuhan" value={formatRupiah(plan.totalNeeds)} />
                    <Stat label="Semua penuh" value={plan.allDoneOn ? formatTanggalWIB(plan.allDoneOn) : "Belum terkejar"} />
                    <Stat label="Biaya hidup + tagihan" value={formatRupiah(plan.totalLiving + plan.totalBills)} />
                    <Stat label="Sisa bebas" value={formatRupiah(plan.totalLeftover)} />
                  </dl>
                  <p className="mt-2 text-[10px] text-muted-foreground">Dihitung sampai {plan.allocations.at(-1) ? formatTanggalWIB(plan.allocations.at(-1)!.date) : "-"} ({plan.allocations.length} gajian).</p>
                </div>

                <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Per kebutuhan</h3>
                {plan.needs.map((n) => (
                  <div key={n.id} className="space-y-1 rounded-2xl border border-border/70 bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold">{n.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          n.onTime === false ? "bg-rose-500/15 text-rose-600" : n.onTime ? "bg-teal-500/15 text-teal-700 dark:text-teal-300" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {n.onTime === false ? "Telat" : n.onTime ? "Tepat waktu" : "Tanpa tenggat"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Kurang {formatRupiah(n.remaining)} · penuh {n.fullOn ? formatTanggalWIB(n.fullOn) : "belum terkejar"}
                      {n.deadline ? ` · tenggat ${formatTanggalWIB(n.deadline)}` : ""}
                    </p>
                    {n.onTime === false && (
                      <p className="text-[11px] font-semibold text-rose-600">
                        Saat tenggat masih kurang {formatRupiah(n.shortfallAtDeadline)}
                        {n.neededPerPayday ? ` (butuh ±${formatRupiah(n.neededPerPayday)} per gajian)` : ""}
                      </p>
                    )}
                    <p className="text-[11px]">
                      Simpan di: <b>{STORAGE_LABEL[n.storage]}</b>
                    </p>
                  </div>
                ))}

                <h3 className="px-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pembagian tiap gajian</h3>
                <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/70 bg-card">
                  {shown.map((a) => (
                    <div key={a.date} className="space-y-1 px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold">{formatTanggalWIB(a.date)}</p>
                        <p className="text-xs font-bold text-teal-700 dark:text-teal-300">+{formatRupiah(a.income)}</p>
                      </div>
                      <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                        <li>Biaya hidup: {formatRupiah(a.living)}</li>
                        {a.bills.map((b, i) => (
                          <li key={i}>
                            {b.name}: {formatRupiah(b.amount)}
                          </li>
                        ))}
                        {a.deposits.map((d) => (
                          <li key={d.needId} className="text-foreground">
                            → {d.name}: <b>{formatRupiah(d.amount)}</b>
                          </li>
                        ))}
                        {a.leftover > 0 && <li>Sisa bebas: {formatRupiah(a.leftover)}</li>}
                        {a.deficit > 0 && <li className="font-semibold text-rose-600">Kurang {formatRupiah(a.deficit)} untuk biaya wajib</li>}
                      </ul>
                    </div>
                  ))}
                </div>
                {plan.allocations.length > 6 && (
                  <Button type="button" variant="outline" className="w-full rounded-xl" onClick={() => setShowAll((s) => !s)}>
                    {showAll ? "Tampilkan lebih sedikit" : `Lihat semua ${plan.allocations.length} gajian`}
                  </Button>
                )}

                {/* 4. Saran AI */}
                <div className="space-y-3 rounded-3xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="flex items-center gap-1.5 text-sm font-extrabold">
                        <Sparkles className="h-4 w-4 text-fuchsia-600" /> Saran & susunan dompet
                      </h2>
                      <p className="text-[11px] text-muted-foreground">Penjelasan sederhana + dompet apa saja yang sebaiknya dibuat.</p>
                    </div>
                  </div>
                  {!ai && (
                    <Button type="button" onClick={askAI} disabled={aiState === "loading"} className="w-full rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700">
                      {aiState === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {aiState === "loading" ? "Menyusun saran…" : "Minta saran"}
                    </Button>
                  )}
                  {aiError && (
                    <p role="alert" className="text-xs font-semibold text-rose-600">
                      {aiError}
                    </p>
                  )}
                  {ai && (
                    <div className="space-y-3">
                      <p className="text-xs leading-relaxed">{ai.ringkasan}</p>
                      <ol className="list-decimal space-y-1 pl-4 text-xs">
                        {ai.saran.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                      <div className="space-y-2">
                        {ai.dompet.map((d) => {
                          const exists = walletExists(d.nama) || created.includes(d.nama);
                          return (
                            <div key={d.nama} className="flex items-start justify-between gap-2 rounded-2xl bg-card p-3">
                              <div className="min-w-0">
                                <p className="flex items-center gap-1.5 text-xs font-bold">
                                  <WalletCards className="h-3.5 w-3.5 text-teal-600" /> {d.nama}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {d.tempat} · untuk {d.untuk}
                                </p>
                                <p className="text-[11px]">{d.alasan}</p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={exists}
                                onClick={() => makeWallet(d)}
                                className="shrink-0 rounded-xl text-[11px]"
                              >
                                {exists ? "Sudah ada" : "Buat"}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                      <Button type="button" variant="outline" onClick={askAI} disabled={aiState === "loading"} className="w-full rounded-xl text-xs">
                        Buat ulang saran
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card px-2 py-2">
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className="text-xs font-extrabold">{value}</dd>
    </div>
  );
}

function MoneyField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const id = React.useId();
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px]">{label}</Label>
      <div className="flex items-center rounded-xl border border-input bg-background px-2.5">
        <span className="text-[11px] font-bold text-muted-foreground">Rp</span>
        <input id={id} inputMode="numeric" value={fmtInput(value)} onChange={(e) => onChange(toNum(e.target.value))} className="h-10 w-full bg-transparent px-1.5 text-sm font-bold outline-none" />
      </div>
    </div>
  );
}
