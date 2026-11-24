"use client";

import * as React from "react";
import Link from "next/link";
import { TopHeader } from "@/components/layout/top-header";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/konsultan/money-input";
import { formatRupiah } from "@/lib/utils";
import { getFinanceSnapshot } from "@/lib/data/finance-snapshot";
import { getSavingsGoals } from "@/lib/data/goals";
import { FUND_TYPES, fundPlan } from "@/lib/konsultan/dana-lain";
import { ALLOCATION_RULES, allocate, emergencyFund, pensionPlan, doublingYears, rateToDouble, fireNumber, inflationEffect, PRINSIP, type Household } from "@/lib/konsultan/teori-keuangan";

type Tab = "alokasi" | "darurat" | "pensiun" | "dana" | "bebas" | "prinsip";
const TABS: { id: Tab; label: string }[] = [{ id: "alokasi", label: "Bagi uang" }, { id: "darurat", label: "Darurat" }, { id: "pensiun", label: "Pensiun" }, { id: "dana", label: "Dana lain" }, { id: "bebas", label: "Bebas finansial" }, { id: "prinsip", label: "Prinsip" }];
const selectCls = "h-9 w-full rounded-lg border border-input bg-background px-2 text-sm";
const rp = (n: number) => formatRupiah(Math.round(n));
const dec = (t: string) => Number(t.replace(",", ".")) || 0;
const decInput = (t: string) => t.replace(/[^\d.,]/g, "").slice(0, 6);
const R = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (<div className="flex justify-between gap-2 rounded-lg bg-muted p-2.5 text-sm"><span className="text-muted-foreground">{k}</span><span className={strong ? "font-bold" : "font-medium"}>{v}</span></div>);

export default function IlmuKeuanganPage() {
  const [tab, setTab] = React.useState<Tab>("alokasi");
  return (
    <div className="pb-24">
      <TopHeader title="Ilmu Keuangan" />
      <div className="space-y-4 px-4 pt-2">
        <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">Semua hasil adalah ilustrasi dari angka yang kamu isi, bukan jaminan dan bukan rekomendasi produk. Cek ulang dengan data dan sumber resmi, atau tanya perencana keuangan berlisensi.</p>
        <div role="tablist" aria-label="Bagian ilmu keuangan" className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {TABS.map((t) => (<button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`rounded-lg py-2 text-[11px] font-medium ${tab === t.id ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{t.label}</button>))}
        </div>
        {tab === "alokasi" && <Alokasi />}
        {tab === "darurat" && <Darurat />}
        {tab === "pensiun" && <Pensiun />}
        {tab === "dana" && <DanaLain />}
        {tab === "bebas" && <Bebas />}
        {tab === "prinsip" && <ul className="space-y-2">{PRINSIP.map((p) => (<li key={p.title} className="rounded-xl p-3 ring-1 ring-foreground/10"><p className="text-sm font-semibold">{p.title}</p><p className="text-sm text-muted-foreground">{p.body}</p></li>))}</ul>}
      </div>
    </div>
  );
}

function Alokasi() {
  const [income, setIncome] = React.useState(0);
  const [id, setId] = React.useState(ALLOCATION_RULES[0].id);
  const rule = ALLOCATION_RULES.find((r) => r.id === id)!;
  const rows = allocate(income, rule);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Cara membagi pemasukan bulanan. Yang paling terkenal adalah 50/30/20: 50% kebutuhan, 30% keinginan, 20% tabungan dan investasi.</p>
      <label className="block space-y-1 text-sm">Pemasukan bulanan<MoneyInput value={income} onChange={setIncome} aria-label="Pemasukan bulanan" suffix="Rp" /></label>
      <label className="block space-y-1 text-xs">Pilih cara<select aria-label="Pilih aturan" className={selectCls} value={id} onChange={(e) => setId(e.target.value)}>{ALLOCATION_RULES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      <p className="text-xs text-muted-foreground">{rule.note}</p>
      {income <= 0 ? <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">Isi pemasukan dulu untuk melihat pembagiannya.</p> : (
        <ul className="space-y-2">{rows.map((r) => (<li key={r.label} className="rounded-xl p-3 ring-1 ring-foreground/10"><div className="flex justify-between"><span className="font-medium">{r.label} <span className="text-xs text-muted-foreground">({r.pct}%)</span></span><span className="font-semibold">{rp(r.amount)}</span></div><p className="text-xs text-muted-foreground">{r.hint}</p></li>))}</ul>
      )}
      <p className="text-xs text-muted-foreground">Ini patokan awal. Kalau kebutuhanmu sudah lebih dari 50%, turunkan keinginan lebih dulu, jangan tabungan.</p>
    </div>
  );
}

function Darurat() {
  const [exp, setExp] = React.useState(0);
  const [cur, setCur] = React.useState(0);
  const [kind, setKind] = React.useState<Household>("lajang");
  const [auto, setAuto] = React.useState<{ exp: number; cur: number; found: boolean } | null>(null);
  React.useEffect(() => {
    Promise.all([getFinanceSnapshot(), getSavingsGoals()]).then(([snap, goals]) => {
      const em = goals.filter((g) => (g.is_emergency_fund || /darurat/i.test(g.name)) && g.status !== "dibatalkan");
      setAuto({ exp: snap.monthlyExpense, cur: em.reduce((s, g) => s + Number(g.saved ?? 0), 0), found: em.length > 0 });
    }).catch(() => setAuto(null));
  }, []);
  const e = emergencyFund(exp, kind, cur);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Dana darurat menutup pengeluaran saat kehilangan penghasilan atau ada kejadian mendadak.</p>
      {auto && (auto.exp > 0 || auto.cur > 0) && (
        <button type="button" onClick={() => { setExp(auto.exp); setCur(auto.cur); }} className="w-full rounded-xl bg-primary/10 p-3 text-left text-sm">
          <span className="font-semibold">Pakai data dompetku</span>
          <span className="block text-xs text-muted-foreground">Pengeluaran rata-rata {rp(auto.exp)} per bulan (3 bulan terakhir){auto.found ? `, dana darurat di Tabungan ${rp(auto.cur)}` : ""}</span>
        </button>
      )}
      {auto && !auto.found && <p className="text-xs text-muted-foreground">Belum ada target dana darurat di Tabungan. <Link href="/tabungan" className="underline">Buat target bernama &quot;Dana Darurat&quot;</Link> supaya terhitung otomatis di sini dan di Skor Kesehatan.</p>}
      <label className="block space-y-1 text-sm">Pengeluaran bulanan<MoneyInput value={exp} onChange={setExp} aria-label="Pengeluaran bulanan" suffix="Rp" /></label>
      <label className="block space-y-1 text-sm">Dana darurat yang sudah ada<MoneyInput value={cur} onChange={setCur} aria-label="Dana darurat sekarang" suffix="Rp" /></label>
      <label className="block space-y-1 text-xs">Kondisimu<select aria-label="Kondisi" className={selectCls} value={kind} onChange={(x) => setKind(x.target.value as Household)}><option value="lajang">Lajang, penghasilan tetap</option><option value="menikah">Menikah, belum punya anak</option><option value="menikah_anak">Menikah, punya anak</option><option value="freelance">Penghasilan tidak tetap</option></select></label>
      {exp > 0 && (<div className="space-y-2"><R k="Target minimum" v={`${rp(e.minAmount)} (${e.minMonths} bulan)`} /><R k="Target ideal" v={`${rp(e.maxAmount)} (${e.maxMonths} bulan)`} /><R k="Sekarang cukup untuk" v={`${String(e.coveredMonths).replace(".", ",")} bulan`} /><R k="Kurang ke minimum" v={rp(e.gapToMin)} strong /></div>)}
    </div>
  );
}

function Pensiun() {
  const [f, setF] = React.useState({ age: "30", retire: "55", life: "80", exp: 5_000_000, other: 0, inf: "4", rb: "8", ra: "6", saved: 0 });
  const r = pensionPlan({ age: Number(f.age) || 0, retireAge: Number(f.retire) || 0, lifeExpectancy: Number(f.life) || 0, monthlyExpenseToday: f.exp, otherPensionMonthlyToday: f.other, inflationPct: dec(f.inf), returnBeforePct: dec(f.rb), returnAfterPct: dec(f.ra), currentSavings: f.saved });
  const num = (k: "age" | "retire" | "life", label: string) => (<label className="space-y-1 text-xs">{label}<Input inputMode="numeric" aria-label={label} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value.replace(/\D/g, "").slice(0, 3) })} /></label>);
  const pct = (k: "inf" | "rb" | "ra", label: string) => (<label className="space-y-1 text-xs">{label}<Input inputMode="decimal" aria-label={label} value={f[k]} onChange={(e) => setF({ ...f, [k]: decInput(e.target.value) })} /></label>);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Hitung kira-kira berapa dana yang perlu terkumpul saat pensiun, dan berapa yang disisihkan per bulan. Angka pensiun dari JHT/JP BPJS atau DPLK bisa diisi di kolom pensiun lain.</p>
      <div className="grid grid-cols-3 gap-2">{num("age", "Usia sekarang")}{num("retire", "Usia pensiun")}{num("life", "Perkiraan usia hidup")}</div>
      <label className="block space-y-1 text-sm">Kebutuhan bulanan saat pensiun (harga hari ini)<MoneyInput value={f.exp} onChange={(n) => setF({ ...f, exp: n })} aria-label="Kebutuhan bulanan pensiun" suffix="Rp" /></label>
      <label className="block space-y-1 text-sm">Pensiun lain per bulan (harga hari ini, opsional)<MoneyInput value={f.other} onChange={(n) => setF({ ...f, other: n })} aria-label="Pensiun lain" suffix="Rp" /></label>
      <label className="block space-y-1 text-sm">Dana yang sudah disiapkan untuk pensiun<MoneyInput value={f.saved} onChange={(n) => setF({ ...f, saved: n })} aria-label="Dana pensiun sekarang" suffix="Rp" /></label>
      <div className="grid grid-cols-3 gap-2">{pct("inf", "Inflasi/thn (%)")}{pct("rb", "Imbal hasil sebelum pensiun (%)")}{pct("ra", "Imbal hasil saat pensiun (%)")}</div>
      {!r.valid ? <p role="alert" className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">{r.error}</p> : (
        <div className="space-y-2">
          <R k="Menabung selama" v={`${r.yearsToRetire} tahun`} /><R k="Masa pensiun" v={`${r.yearsInRetirement} tahun`} />
          <R k="Kebutuhan per bulan saat pensiun" v={rp(r.expenseAtRetirementMonthly)} /><R k="Dana yang dibutuhkan saat pensiun" v={rp(r.corpusNeeded)} />
          <R k="Dana sekarang tumbuh jadi" v={rp(r.savingsFutureValue)} /><R k="Kekurangan" v={rp(r.shortfall)} />
          <R k="Perlu disisihkan per bulan" v={rp(r.monthlySaving)} strong />
        </div>
      )}
      <p className="text-xs text-muted-foreground">Asumsi imbal hasil dan inflasi bisa meleset jauh. Imbal hasil tidak dijamin. Perhitungan ini menyederhanakan pajak dan biaya.</p>
    </div>
  );
}

function Bebas() {
  const [exp, setExp] = React.useState(0);
  const [wd, setWd] = React.useState("4");
  const [rate, setRate] = React.useState("8");
  const [amt, setAmt] = React.useState(0);
  const [inf, setInf] = React.useState("4");
  const [yrs, setYrs] = React.useState("10");
  const d = doublingYears(dec(rate));
  const ie = inflationEffect(amt, dec(inf), Number(yrs) || 0);
  return (
    <div className="space-y-4">
      <section className="space-y-2"><p className="font-semibold">Angka kebebasan finansial</p>
        <p className="text-sm text-muted-foreground">Aturan 4%: dana investasi sekitar 25 kali pengeluaran tahunan, dengan menarik 4% per tahun, sering dipakai sebagai patokan awal.</p>
        <label className="block space-y-1 text-sm">Pengeluaran bulanan<MoneyInput value={exp} onChange={setExp} aria-label="Pengeluaran bulanan bebas finansial" suffix="Rp" /></label>
        <label className="block space-y-1 text-xs">Tingkat penarikan per tahun (%)<Input inputMode="decimal" aria-label="Tingkat penarikan" value={wd} onChange={(e) => setWd(decInput(e.target.value))} /></label>
        {exp > 0 && dec(wd) > 0 && <R k="Dana yang dibutuhkan" v={rp(fireNumber(exp, dec(wd)))} strong />}</section>
      <section className="space-y-2"><p className="font-semibold">Aturan 72</p>
        <p className="text-sm text-muted-foreground">72 dibagi imbal hasil tahunan kira-kira sama dengan lama uang berlipat dua.</p>
        <label className="block space-y-1 text-xs">Imbal hasil per tahun (%)<Input inputMode="decimal" aria-label="Imbal hasil per tahun" value={rate} onChange={(e) => setRate(decInput(e.target.value))} /></label>
        {d !== null && <R k="Uang berlipat dua dalam" v={`${d.toFixed(1).replace(".", ",")} tahun`} strong />}
        <R k="Agar berlipat dalam 10 tahun perlu" v={`${(rateToDouble(10) ?? 0).toFixed(1).replace(".", ",")}% per tahun`} /></section>
      <section className="space-y-2"><p className="font-semibold">Efek inflasi</p>
        <label className="block space-y-1 text-sm">Uang atau harga sekarang<MoneyInput value={amt} onChange={setAmt} aria-label="Nilai sekarang" suffix="Rp" /></label>
        <div className="grid grid-cols-2 gap-2"><label className="space-y-1 text-xs">Inflasi per tahun (%)<Input inputMode="decimal" aria-label="Inflasi per tahun" value={inf} onChange={(e) => setInf(decInput(e.target.value))} /></label><label className="space-y-1 text-xs">Lama (tahun)<Input inputMode="numeric" aria-label="Lama tahun" value={yrs} onChange={(e) => setYrs(e.target.value.replace(/\D/g, "").slice(0, 2))} /></label></div>
        {amt > 0 && (<><R k="Harga barang itu nanti" v={rp(ie.futureCost)} /><R k="Daya beli uang itu nanti setara" v={rp(ie.powerLeft)} strong /></>)}</section>
    </div>
  );
}

const FUND_LINK: Record<string, { href: string; text: string }> = {
  nikah: { href: "/planner", text: "Rencanakan acaranya di Planner Acara" },
  rumah: { href: "/target-beli", text: "Hitung tunai atau cicilan di Target Beli" },
  kendaraan: { href: "/target-beli", text: "Hitung tunai atau cicilan di Target Beli" },
  lainnya: { href: "/target-beli", text: "Hitung tunai atau cicilan di Target Beli" },
};

function DanaLain() {
  const [id, setId] = React.useState(FUND_TYPES[0].id);
  const t = FUND_TYPES.find((x) => x.id === id) ?? FUND_TYPES[0];
  const [f, setF] = React.useState({ cost: 0, years: String(t.years), infl: String(t.inflation), ret: String(t.returnPct), saved: 0 });
  const pick = (x: (typeof FUND_TYPES)[number]) => { setId(x.id); setF((p) => ({ ...p, years: String(x.years), infl: String(x.inflation), ret: String(x.returnPct) })); };
  const r = fundPlan({ costNow: f.cost, years: dec(f.years), inflationPct: dec(f.infl), returnPct: dec(f.ret), saved: f.saved });
  const link = FUND_LINK[t.id];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Jenis dana">
        {FUND_TYPES.map((x) => (<button type="button" key={x.id} aria-pressed={x.id === id} onClick={() => pick(x)} className={`rounded-full px-3 py-1 text-xs ${x.id === id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{x.name}</button>))}
      </div>
      <p className="text-sm text-muted-foreground">{t.desc}</p>
      <label className="block space-y-1 text-sm">Perkiraan biayanya kalau dibayar hari ini<MoneyInput value={f.cost} onChange={(n) => setF({ ...f, cost: n })} aria-label="Biaya hari ini" suffix="Rp" /></label>
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1 text-xs">Dibutuhkan (tahun lagi)<Input inputMode="decimal" aria-label="Tahun lagi" value={f.years} onChange={(e) => setF({ ...f, years: e.target.value.replace(/[^\d.,]/g, "") })} /></label>
        <label className="space-y-1 text-xs">Kenaikan biaya per tahun (%)<Input inputMode="decimal" aria-label="Kenaikan biaya" value={f.infl} onChange={(e) => setF({ ...f, infl: e.target.value.replace(/[^\d.,]/g, "") })} /></label>
        <label className="space-y-1 text-xs">Imbal hasil tabungan (% per tahun)<Input inputMode="decimal" aria-label="Imbal hasil" value={f.ret} onChange={(e) => setF({ ...f, ret: e.target.value.replace(/[^\d.,]/g, "") })} /></label>
      </div>
      <label className="block space-y-1 text-sm">Dana yang sudah terkumpul<MoneyInput value={f.saved} onChange={(n) => setF({ ...f, saved: n })} aria-label="Dana terkumpul" suffix="Rp" /></label>
      {r.valid && (
        <div className="space-y-1.5">
          <R k="Perkiraan biaya nanti" v={rp(r.futureCost)} />
          <R k="Dana yang sudah ada, nilai nanti" v={rp(r.savedFuture)} />
          <R k="Masih kurang" v={rp(r.gap)} />
          <R k="Sisihkan per bulan" v={r.monthlySaving > 0 ? rp(r.monthlySaving) : "Sudah cukup"} strong />
        </div>
      )}
      <p className="text-xs text-muted-foreground">Angka kenaikan biaya dan imbal hasil di atas hanya asumsi awal. Ubah sesuai kondisimu. Imbal hasil tidak dijamin.</p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{t.tips.map((x) => (<li key={x}>{x}</li>))}</ul>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/tabungan" className="underline">Simpan jadi target Tabungan</Link>
        {link && <Link href={link.href} className="underline">{link.text}</Link>}
      </div>
    </div>
  );
}
