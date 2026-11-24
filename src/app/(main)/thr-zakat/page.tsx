"use client";

import * as React from "react";
import { TopHeader } from "@/components/layout/top-header";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/konsultan/money-input";
import { Gate } from "@/components/plan/gate";
import { allocateThr, zakatMaal, zakatPenghasilan } from "@/lib/konsultan/zakat";
import { formatRupiah } from "@/lib/utils";
import { PageHero, FormCard, Field, Pill, IconBox, EmptyState, Notice } from "@/components/ui/form-kit";

export default function ThrZakatPage() {
  const [gold, setGold] = React.useState(0);
  const [income, setIncome] = React.useState(0);
  const [wealth, setWealth] = React.useState(0);
  const zp = zakatPenghasilan(income, gold), zm = zakatMaal(wealth, gold);
  return (
    <div className="pb-24">
      <TopHeader title="THR & Zakat" />
      <div className="space-y-6 px-4 pt-2">
        <PageHero title="THR & Zakat" desc="Hitung zakat dan bagi THR dengan rapi." />
        <section aria-label="Kalkulator zakat" className="space-y-3">
          <FormCard title="Kalkulator zakat" desc="Isi harga emas per gram hari ini (cek di BAZNAS atau toko emas). Aplikasi tidak menebak harga emas." icon="🕌">
            <Field label="Harga emas per gram"><MoneyInput value={gold} onChange={setGold} aria-label="Harga emas per gram" suffix="Rp" /></Field>
            <Field label="Penghasilan per bulan"><MoneyInput value={income} onChange={setIncome} aria-label="Penghasilan per bulan" suffix="Rp" /></Field>
            <Field label="Total harta yang sudah dimiliki 1 tahun"><MoneyInput value={wealth} onChange={setWealth} aria-label="Total harta" suffix="Rp" /></Field>
          </FormCard>
          {gold <= 0 ? <EmptyState emoji="🪙">Isi harga emas dulu untuk melihat nisab.</EmptyState> : (
            <div className="space-y-2">
              <div className="space-y-2 rounded-3xl border border-border/80 bg-card p-4 shadow-xs"><div className="flex items-center gap-2.5"><IconBox tone="neon">💼</IconBox><p className="text-sm font-extrabold">Zakat penghasilan</p></div><Pill tone="sky" icon="⚖️">Nisab per bulan {formatRupiah(Math.round(zp.nisab))}</Pill><p className="text-sm">{income <= 0 ? "Isi penghasilan." : zp.wajib ? `Zakat 2,5% = ${formatRupiah(zp.zakat)} per bulan.` : "Penghasilanmu belum mencapai nisab."}</p></div>
              <div className="space-y-2 rounded-3xl border border-border/80 bg-card p-4 shadow-xs"><div className="flex items-center gap-2.5"><IconBox tone="amber">🏦</IconBox><p className="text-sm font-extrabold">Zakat maal</p></div><Pill tone="sky" icon="⚖️">Nisab {formatRupiah(Math.round(zm.nisab))} (85 gram emas)</Pill><p className="text-sm">{wealth <= 0 ? "Isi total harta." : zm.wajib ? `Zakat 2,5% = ${formatRupiah(zm.zakat)}.` : "Hartamu belum mencapai nisab."}</p></div>
            </div>
          )}
          <Notice tone="sky" emoji="💡">Ini perhitungan umum sebagai gambaran. Untuk hukum dan rincian yang tepat, tanyakan ke lembaga zakat atau ustaz terpercaya.</Notice>
        </section>
        <Gate feature="mode_thr"><Thr /></Gate>
      </div>
    </div>
  );
}

function Thr() {
  const [amount, setAmount] = React.useState(0);
  const [p, setP] = React.useState({ zakat: "2.5", mudik: "30", angpao: "15", tabung: "40" });
  const n = (t: string) => Math.min(Math.max(Number(t.replace(",", ".")) || 0, 0), 100);
  const s = allocateThr(amount, { zakat: n(p.zakat), mudik: n(p.mudik), angpao: n(p.angpao), tabung: n(p.tabung) });
  const totalPct = n(p.zakat) + n(p.mudik) + n(p.angpao) + n(p.tabung);
  const field = (k: keyof typeof p, label: string) => (<Field label={`${label} (%)`}><Input className="h-10 rounded-xl" aria-label={`${label} persen`} inputMode="decimal" value={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.value.replace(/[^\d.,]/g, "") })} /></Field>);
  return (
    <section aria-label="Mode THR" className="space-y-3">
      <FormCard title="Bagi THR" desc="Atur persen pembagian, sisanya jadi uang bebas." icon="🎁">
        <Field label="Jumlah THR"><MoneyInput value={amount} onChange={setAmount} aria-label="Jumlah THR" suffix="Rp" /></Field>
        <div className="grid grid-cols-2 gap-2">{field("zakat", "Zakat/sedekah")}{field("mudik", "Mudik & hari raya")}{field("angpao", "Angpao & hadiah")}{field("tabung", "Tabungan")}</div>
      </FormCard>
      {totalPct > 100 && <Notice tone="amber" emoji="⚠️" role="alert">Total lebih dari 100%, tabungan otomatis dikurangi.</Notice>}
      {amount <= 0 ? <EmptyState emoji="🧧">Isi jumlah THR untuk melihat pembagiannya.</EmptyState> : (
        <ul className="space-y-1.5 text-sm">
          {[["Zakat/sedekah", s.zakat, "🕌"], ["Mudik & hari raya", s.mudik, "🚗"], ["Angpao & hadiah", s.angpao, "🧧"], ["Tabungan", s.tabung, "🐷"], ["Sisa bebas", s.sisa, "✨"]].map(([l, v, e]) => (<li key={l as string} className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card p-2.5 shadow-xs"><span className="flex items-center gap-2"><IconBox className="size-8 rounded-xl text-sm">{e as string}</IconBox>{l}</span><Pill>{formatRupiah(v as number)}</Pill></li>))}
        </ul>
      )}
    </section>
  );
}
