"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { Input } from "@/components/ui/input";
import { Gate } from "@/components/plan/gate";
import { MoneyInput } from "@/components/konsultan/money-input";
import { getFinanceSnapshot, type FinanceSnapshot } from "@/lib/data/finance-snapshot";
import { addDebt, deleteDebt, getDebts, type DebtRow } from "@/lib/data/debts";
import { compareFlat, comparePaylater, annuityPayment } from "@/lib/konsultan/loan-simulator";
import { planPayoff } from "@/lib/konsultan/debt-payoff";
import { formatRupiah } from "@/lib/utils";
import { useConfirm } from "@/components/ui/use-confirm";
import type { FeatureKey } from "@/lib/plans";
import { PageHero, FormCard, Field, Cta, Tabs, Pill, EmptyState, Notice, IconBox, type PillTone } from "@/components/ui/form-kit";

type Tab = "cicilan" | "utang";
const TABS: { id: Tab; label: string; feature: FeatureKey; icon: string }[] = [
  { id: "cicilan", label: "Cicilan", feature: "simulator_cicilan", icon: "🧮" },
  { id: "utang", label: "Utang", feature: "lunasi_utang", icon: "💳" },
];

export default function CicilanUtangPage() {
  const [tab, setTab] = React.useState<Tab>("cicilan");
  const [snap, setSnap] = React.useState<FinanceSnapshot | null>(null);
  const [err, setErr] = React.useState("");
  React.useEffect(() => { getFinanceSnapshot().then(setSnap).catch(() => setErr("Data keuanganmu belum bisa dimuat. Coba lagi sebentar.")); }, []);
  const cur = TABS.find((t) => t.id === tab)!;
  return (
    <div className="pb-24">
      <TopHeader title="Cicilan & Utang" />
      <div className="space-y-4 px-4 pt-2">
        <PageHero title="Cicilan & Utang" desc="Hitung biaya cicilan dan atur urutan melunasi utang." />
        <Tabs value={tab} onChange={setTab} label="Bagian cicilan dan utang" options={TABS.map((t) => ({ value: t.id, label: t.label, icon: t.icon }))} />
        {err && <Notice tone="rose" emoji="⚠️" role="alert">{err}</Notice>}
        <Gate feature={cur.feature} redirect>
          {tab === "cicilan" && <Cicilan />}
          {tab === "utang" && (!snap && !err ? <div className="h-32 animate-pulse rounded-3xl bg-muted" aria-busy="true" /> : snap && <Utang s={snap} />)}
        </Gate>
      </div>
    </div>
  );
}

/** Satu sel angka ala tabel: label kecil di atas, angka tebal di dalam pill berbingkai. */
function Cell({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "rose" | "amber" | "sky" | "neon" }) {
  const t = { slate: "border-border/70 bg-muted/50", rose: "border-rose-400/40 bg-rose-500/10 text-rose-700 dark:text-rose-300", amber: "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300", sky: "border-sky-400/40 bg-sky-500/10 text-sky-700 dark:text-sky-300", neon: "border-emerald-400/60 bg-emerald-400/15 text-emerald-700 dark:text-emerald-300" }[tone];
  return (
    <div className={`min-w-0 rounded-2xl border px-2.5 py-2 ${t}`}>
      <p className="truncate text-[10px] font-semibold opacity-80">{label}</p>
      <p className="truncate text-xs font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

const effTone = (pct: number): PillTone => (pct >= 30 ? "rose" : pct >= 15 ? "amber" : "neon");

function Cicilan() {
  const [price, setPrice] = React.useState(3_000_000);
  const [months, setMonths] = React.useState("6");
  const [flat, setFlat] = React.useState("12");
  const [fee, setFee] = React.useState("2,5");
  const n = Math.min(Math.max(Number(months) || 0, 1), 120);
  const num = (t: string) => Number(t.replace(",", ".")) || 0;
  const f = compareFlat(price, num(flat), n), p = comparePaylater(price, num(fee), n);
  const a = annuityPayment(price, num(flat), n);
  const cheaper = f.total <= p.total ? "bunga flat" : "paylater";
  const row = (emoji: string, tone: "sky" | "violet", label: string, c: { payment: number; total: number; interest: number; effectiveAnnualPct: number }, best: boolean) => (
    <div className={`space-y-2.5 rounded-3xl border bg-card p-4 shadow-xs ${best ? "border-emerald-400/70" : "border-border/80"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5"><IconBox tone={tone === "sky" ? "sky" : "violet"}>{emoji}</IconBox><p className="truncate text-sm font-extrabold">{label}</p></div>
        {best && <Pill icon="🏆">Lebih hemat</Pill>}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Cell label="Cicilan / bulan" value={formatRupiah(Math.round(c.payment))} tone="sky" />
        <Cell label="Total bayar" value={formatRupiah(Math.round(c.total))} />
        <Cell label="Bunga / biaya" value={formatRupiah(Math.round(c.interest))} tone="rose" />
      </div>
      <Pill tone={effTone(c.effectiveAnnualPct)} icon="📈">Setara bunga sekitar {c.effectiveAnnualPct.toFixed(1).replace(".", ",")}% per tahun</Pill>
    </div>
  );
  return (
    <div className="space-y-3">
      <FormCard title="Simulasi cicilan" desc="Cek biaya cicilan atau paylater sebelum kamu ambil." icon="🧮">
        <Field label="Harga barang"><MoneyInput value={price} onChange={setPrice} aria-label="Harga barang" suffix="Rp" /></Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Tenor (bulan)"><Input className="h-10 rounded-xl" inputMode="numeric" aria-label="Tenor bulan" value={months} onChange={(e) => setMonths(e.target.value.replace(/\D/g, "").slice(0, 3))} /></Field>
          <Field label="Bunga/thn (%)"><Input className="h-10 rounded-xl" inputMode="decimal" aria-label="Bunga flat per tahun" value={flat} onChange={(e) => setFlat(e.target.value.replace(/[^\d.,]/g, ""))} /></Field>
          <Field label="Paylater/bln (%)"><Input className="h-10 rounded-xl" inputMode="decimal" aria-label="Biaya paylater per bulan" value={fee} onChange={(e) => setFee(e.target.value.replace(/[^\d.,]/g, ""))} /></Field>
        </div>
      </FormCard>
      {price <= 0 ? <EmptyState emoji="🧾">Isi harga barang dulu.</EmptyState> : (<>
        {row("🏷️", "sky", "Cicilan bunga flat", f, cheaper === "bunga flat")}
        {row("📱", "violet", "Paylater", p, cheaper === "paylater")}
        <Notice tone="sky" emoji="💡">Bandingannya, bunga menurun (anuitas) dengan angka yang sama: {formatRupiah(Math.round(a))} per bulan. Semua angka berupa simulasi.</Notice>
      </>)}
    </div>
  );
}

function Utang({ s }: { s: FinanceSnapshot }) {
  const [ask, confirmDialog] = useConfirm();
  const [list, setList] = React.useState<DebtRow[] | null>(null);
  const [err, setErr] = React.useState("");
  const [f, setF] = React.useState({ name: "", balance: 0, rate: "0", min: 0 });
  const [budget, setBudget] = React.useState(0);
  const load = React.useCallback(() => getDebts().then(setList).catch(() => setErr("Daftar utang belum bisa dimuat.")), []);
  React.useEffect(() => { void load(); }, [load]);
  const debts = (list ?? []).map((d) => ({ id: d.id, name: d.name, balance: Number(d.balance), annualRatePct: Number(d.annual_rate), minPayment: Number(d.min_payment) }));
  const minTotal = debts.reduce((x, d) => x + d.minPayment, 0);
  const totalBalance = debts.reduce((x, d) => x + d.balance, 0);
  const eff = budget > 0 ? budget : minTotal;
  const av = planPayoff(debts, eff, "avalanche"), sn = planPayoff(debts, eff, "snowball");
  const valid = f.name.trim() && f.balance > 0;
  const fmtMonths = (m: number) => (m >= 12 ? `${Math.floor(m / 12)} thn ${m % 12} bln` : `${m} bln`);
  const plan = (emoji: string, title: string, r: typeof av, best: boolean) => (
    <div className={`space-y-2.5 rounded-3xl border bg-card p-4 shadow-xs ${best ? "border-emerald-400/70" : "border-border/80"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5"><IconBox tone={best ? "neon" : "amber"}>{emoji}</IconBox><p className="text-sm font-extrabold leading-tight">{title}</p></div>
        {best && <Pill icon="🏆">Paling hemat</Pill>}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Cell label="Lunas dalam" value={fmtMonths(r.months)} tone="sky" />
        <Cell label="Total bunga" value={formatRupiah(r.totalInterest)} tone="rose" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold"><span className="text-muted-foreground">Urutan lunas:</span>{r.order.map((o, i) => (<React.Fragment key={`${o}-${i}`}>{i > 0 && <span aria-hidden className="text-muted-foreground">→</span>}<Pill tone="slate">{o}</Pill></React.Fragment>))}</div>
    </div>
  );
  return (
    <div className="space-y-3">
      {confirmDialog}
      {err && <Notice tone="rose" emoji="⚠️" role="alert">{err}</Notice>}
      {debts.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <Cell label="Total sisa utang" value={formatRupiah(totalBalance)} tone="rose" />
          <Cell label="Cicilan minimum / bulan" value={formatRupiah(minTotal)} tone="amber" />
        </div>
      )}
      <ul className="space-y-2">{debts.map((d) => (
        <li key={d.id} className="space-y-2.5 rounded-3xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5"><IconBox tone="rose">💳</IconBox><p className="truncate text-sm font-extrabold">{d.name}</p></div>
            <button aria-label={`Hapus ${d.name}`} className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 transition-all active:scale-90" onClick={async () => { if (await ask(`Hapus ${d.name}?`)) { await deleteDebt(d.id); await load(); } }}><Trash2 className="size-4" /></button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Cell label="Sisa utang" value={formatRupiah(d.balance)} tone="rose" />
            <Cell label="Bunga / tahun" value={`${d.annualRatePct}%`} tone="amber" />
            <Cell label="Min / bulan" value={formatRupiah(d.minPayment)} tone="sky" />
          </div>
        </li>))}</ul>
      {list && list.length === 0 && <EmptyState emoji="🎉">Belum ada utang tercatat.</EmptyState>}
      <form aria-label="Tambah utang" onSubmit={async (e) => { e.preventDefault(); if (!valid) return; try { await addDebt({ name: f.name.trim(), balance: f.balance, annual_rate: Number(f.rate.replace(",", ".")) || 0, min_payment: f.min }); setF({ name: "", balance: 0, rate: "0", min: 0 }); await load(); } catch { setErr("Belum bisa menyimpan utang."); } }}>
        <FormCard title="Catat utang" desc="Masukkan utangmu, lalu lihat urutan melunasi yang paling hemat bunga." icon="💳">
          <Field label="Nama utang"><Input className="h-10 rounded-xl" aria-label="Nama utang" placeholder="Nama, misal Kartu kredit" maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Sisa utang"><MoneyInput aria-label="Sisa utang" value={f.balance} onChange={(n) => setF({ ...f, balance: n })} placeholder="Sisa utang" suffix="Rp" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Bunga %/tahun"><Input className="h-10 rounded-xl" aria-label="Bunga per tahun" inputMode="decimal" placeholder="Bunga %/thn" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value.replace(/[^\d.,]/g, "") })} /></Field>
            <Field label="Cicilan min/bulan"><MoneyInput aria-label="Cicilan minimum" value={f.min} onChange={(n) => setF({ ...f, min: n })} placeholder="Cicilan min/bln" /></Field>
          </div>
          <Cta type="submit" disabled={!valid}><span aria-hidden>➕</span> Tambah utang</Cta>
        </FormCard>
      </form>
      {debts.length > 0 && (
        <div className="space-y-2.5">
          <FormCard title="Rencana melunasi" desc={`Kosong = pakai cicilan minimum ${formatRupiah(minTotal)}`} icon="🎯">
            <Field label="Dana untuk bayar utang per bulan"><MoneyInput aria-label="Dana bayar utang per bulan" value={budget} onChange={setBudget} suffix="Rp" /></Field>
          </FormCard>
          {!av.feasible ? <Notice tone="amber" emoji="⚠️" role="alert">{eff < minTotal ? "Dana per bulan kurang dari total cicilan minimum." : "Dengan dana ini utang belum bisa lunas dalam 50 tahun. Naikkan dana per bulan."}</Notice> : (
            <>
              {plan("🔥", "Bunga terbesar dulu", av, true)}
              {plan("⛄", "Saldo terkecil dulu (lebih semangat)", sn, false)}
            </>
          )}
          <Notice tone="sky" emoji="💰">Pemasukan rata-rata kamu {formatRupiah(s.monthlyIncome)} per bulan sebagai gambaran.</Notice>
        </div>
      )}
    </div>
  );
}
