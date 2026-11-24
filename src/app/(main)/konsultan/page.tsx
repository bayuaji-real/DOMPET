"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Disclaimer } from "@/components/plan/disclaimer";
import { Gate } from "@/components/plan/gate";
import { MoneyInput } from "@/components/konsultan/money-input";
import { getFinanceSnapshot, type FinanceSnapshot } from "@/lib/data/finance-snapshot";
import { addDebt, deleteDebt, getDebts, type DebtRow } from "@/lib/data/debts";
import { earlyWarnings } from "@/lib/konsultan/early-warning";
import { compareFlat, comparePaylater, annuityPayment } from "@/lib/konsultan/loan-simulator";
import { planPayoff } from "@/lib/konsultan/debt-payoff";
import { formatRupiah } from "@/lib/utils";
import { Skor, Proyeksi } from "@/components/konsultan/panels";
import { useConfirm } from "@/components/ui/use-confirm";
import type { FeatureKey } from "@/lib/plans";

type Tab = "skor" | "peringatan" | "cicilan" | "proyeksi" | "utang";
const TABS: { id: Tab; label: string; feature: FeatureKey }[] = [
  { id: "skor", label: "Skor", feature: "skor_kesehatan" },
  { id: "peringatan", label: "Peringatan", feature: "peringatan_dini" },
  { id: "cicilan", label: "Cicilan", feature: "simulator_cicilan" },
  { id: "proyeksi", label: "Proyeksi", feature: "proyeksi_arus_kas" },
  { id: "utang", label: "Utang", feature: "lunasi_utang" },
];

export default function KonsultanPage() {
  const [tab, setTab] = React.useState<Tab>("skor");
  const [snap, setSnap] = React.useState<FinanceSnapshot | null>(null);
  const [err, setErr] = React.useState("");
  React.useEffect(() => { getFinanceSnapshot().then(setSnap).catch(() => setErr("Data keuanganmu belum bisa dimuat. Coba lagi sebentar.")); }, []);
  const cur = TABS.find((t) => t.id === tab)!;
  return (
    <div className="pb-24">
      <TopHeader title="Konsultan" />
      <div className="space-y-4 px-4 pt-2">
        <Disclaimer />
        <div role="tablist" aria-label="Bagian konsultan" className="grid grid-cols-5 gap-1 rounded-xl bg-muted p-1">
          {TABS.map((t) => (<button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`rounded-lg py-2 text-xs font-medium ${tab === t.id ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{t.label}</button>))}
        </div>
        {err && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{err}</p>}
        <Gate feature={cur.feature}>
          {!snap && !err ? <div className="h-32 animate-pulse rounded-3xl bg-muted" aria-busy="true" /> : snap && (
            <>
              {tab === "skor" && <Skor s={snap} />}
              {tab === "peringatan" && <Peringatan s={snap} />}
              {tab === "cicilan" && <Cicilan />}
              {tab === "proyeksi" && <Proyeksi s={snap} />}
              {tab === "utang" && <Utang s={snap} />}
            </>
          )}
        </Gate>
      </div>
    </div>
  );
}



function Peringatan({ s }: { s: FinanceSnapshot }) {
  const day = Number(s.today.slice(8, 10));
  const dim = new Date(Number(s.today.slice(0, 4)), Number(s.today.slice(5, 7)), 0).getDate();
  const w = earlyWarnings(s.budgets, day, dim);
  if (s.budgets.length === 0) return <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Belum ada anggaran bulan ini. Atur anggaran di menu Analisis supaya peringatan bisa bekerja.</p>;
  if (w.length === 0) return <p className="rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">Semua anggaran masih aman bulan ini. Bagus, pertahankan.</p>;
  const cls = { bahaya: "bg-red-500/10 text-red-700 dark:text-red-300", waspada: "bg-amber-500/10 text-amber-700 dark:text-amber-300", info: "bg-sky-500/10 text-sky-700 dark:text-sky-300" } as const;
  return <ul className="space-y-2">{w.map((x, i) => (<li key={i} className={`rounded-lg p-3 text-sm ${cls[x.level]}`}>{x.text}</li>))}</ul>;
}

function Cicilan() {
  const [price, setPrice] = React.useState(3_000_000);
  const [months, setMonths] = React.useState("6");
  const [flat, setFlat] = React.useState("12");
  const [fee, setFee] = React.useState("2,5");
  const n = Math.min(Math.max(Number(months) || 0, 1), 120);
  const num = (t: string) => Number(t.replace(",", ".")) || 0;
  const f = compareFlat(price, num(flat), n), p = comparePaylater(price, num(fee), n);
  const a = annuityPayment(price, num(flat), n);
  const row = (label: string, c: { payment: number; total: number; interest: number; effectiveAnnualPct: number }) => (
    <div className="rounded-2xl p-3 border border-border/70 bg-card shadow-xs"><p className="font-semibold">{label}</p>
      <p className="text-sm">Cicilan {formatRupiah(Math.round(c.payment))} per bulan</p>
      <p className="text-sm">Total bayar {formatRupiah(Math.round(c.total))} (bunga/biaya {formatRupiah(Math.round(c.interest))})</p>
      <p className="text-xs text-muted-foreground">Setara bunga sekitar {c.effectiveAnnualPct.toFixed(1).replace(".", ",")}% per tahun</p></div>);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Cek berapa sebenarnya biaya cicilan atau paylater sebelum kamu ambil. Angka berupa simulasi.</p>
      <label className="space-y-1 text-sm">Harga barang<MoneyInput value={price} onChange={setPrice} aria-label="Harga barang" suffix="Rp" /></label>
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1 text-xs">Tenor (bulan)<Input inputMode="numeric" aria-label="Tenor bulan" value={months} onChange={(e) => setMonths(e.target.value.replace(/\D/g, "").slice(0, 3))} /></label>
        <label className="space-y-1 text-xs">Bunga flat/thn (%)<Input inputMode="decimal" aria-label="Bunga flat per tahun" value={flat} onChange={(e) => setFlat(e.target.value.replace(/[^\d.,]/g, ""))} /></label>
        <label className="space-y-1 text-xs">Biaya paylater/bln (%)<Input inputMode="decimal" aria-label="Biaya paylater per bulan" value={fee} onChange={(e) => setFee(e.target.value.replace(/[^\d.,]/g, ""))} /></label>
      </div>
      {price <= 0 ? <p className="text-sm text-muted-foreground">Isi harga barang dulu.</p> : (<>{row("Cicilan bunga flat", f)}{row("Paylater", p)}
        <p className="text-xs text-muted-foreground">Bandingannya, bunga menurun (anuitas) dengan angka yang sama: {formatRupiah(Math.round(a))} per bulan.</p></>)}
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
  const eff = budget > 0 ? budget : minTotal;
  const av = planPayoff(debts, eff, "avalanche"), sn = planPayoff(debts, eff, "snowball");
  const valid = f.name.trim() && f.balance > 0;
  const fmtMonths = (m: number) => (m >= 12 ? `${Math.floor(m / 12)} thn ${m % 12} bln` : `${m} bln`);
  return (
    <div className="space-y-3">
      {confirmDialog}
      <p className="text-sm text-muted-foreground">Masukkan utangmu, lalu lihat urutan melunasi yang paling hemat bunga.</p>
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      <ul className="space-y-1.5">{debts.map((d) => (<li key={d.id} className="flex items-center justify-between rounded-2xl p-3 border border-border/70 bg-card shadow-xs text-sm"><span>{d.name}<span className="block text-xs text-muted-foreground">{formatRupiah(d.balance)} · bunga {d.annualRatePct}%/thn · min {formatRupiah(d.minPayment)}</span></span><button aria-label={`Hapus ${d.name}`} onClick={async () => { if (await ask(`Hapus ${d.name}?`)) { await deleteDebt(d.id); await load(); } }}><Trash2 className="size-4 text-muted-foreground" /></button></li>))}</ul>
      {list && list.length === 0 && <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">Belum ada utang tercatat.</p>}
      <form className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs" aria-label="Tambah utang" onSubmit={async (e) => { e.preventDefault(); if (!valid) return; try { await addDebt({ name: f.name.trim(), balance: f.balance, annual_rate: Number(f.rate.replace(",", ".")) || 0, min_payment: f.min }); setF({ name: "", balance: 0, rate: "0", min: 0 }); await load(); } catch { setErr("Belum bisa menyimpan utang."); } }}>
        <Input aria-label="Nama utang" placeholder="Nama, misal Kartu kredit" maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <MoneyInput aria-label="Sisa utang" value={f.balance} onChange={(n) => setF({ ...f, balance: n })} placeholder="Sisa utang" suffix="Rp" />
        <div className="grid grid-cols-2 gap-2"><Input aria-label="Bunga per tahun" inputMode="decimal" placeholder="Bunga %/thn" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value.replace(/[^\d.,]/g, "") })} /><MoneyInput aria-label="Cicilan minimum" value={f.min} onChange={(n) => setF({ ...f, min: n })} placeholder="Cicilan min/bln" /></div>
        <Button type="submit" className="w-full" disabled={!valid}>Tambah utang</Button>
      </form>
      {debts.length > 0 && (
        <div className="space-y-2">
          <label className="space-y-1 text-sm">Dana untuk bayar utang per bulan (kosong = cicilan minimum {formatRupiah(minTotal)})<MoneyInput aria-label="Dana bayar utang per bulan" value={budget} onChange={setBudget} suffix="Rp" /></label>
          {!av.feasible ? <p role="alert" className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">{eff < minTotal ? "Dana per bulan kurang dari total cicilan minimum." : "Dengan dana ini utang belum bisa lunas dalam 50 tahun. Naikkan dana per bulan."}</p> : (
            <>
              <div className="rounded-lg p-3 ring-1 ring-primary"><p className="font-semibold">Bunga terbesar dulu (paling hemat)</p><p className="text-sm">Lunas dalam {fmtMonths(av.months)} · total bunga {formatRupiah(av.totalInterest)}</p><p className="text-xs text-muted-foreground">Urutan lunas: {av.order.join(" → ")}</p></div>
              <div className="rounded-2xl p-3 border border-border/70 bg-card shadow-xs"><p className="font-semibold">Saldo terkecil dulu (lebih semangat)</p><p className="text-sm">Lunas dalam {fmtMonths(sn.months)} · total bunga {formatRupiah(sn.totalInterest)}</p><p className="text-xs text-muted-foreground">Urutan lunas: {sn.order.join(" → ")}</p></div>
            </>
          )}
          <p className="text-xs text-muted-foreground">Pemasukan rata-rata kamu {formatRupiah(s.monthlyIncome)} per bulan sebagai gambaran.</p>
        </div>
      )}
    </div>
  );
}
