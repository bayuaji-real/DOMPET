"use client";

import * as React from "react";
import { TopHeader } from "@/components/layout/top-header";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/konsultan/money-input";
import { Gate } from "@/components/plan/gate";
import { allocateThr, zakatMaal, zakatPenghasilan } from "@/lib/konsultan/zakat";
import { formatRupiah } from "@/lib/utils";

export default function ThrZakatPage() {
  const [gold, setGold] = React.useState(0);
  const [income, setIncome] = React.useState(0);
  const [wealth, setWealth] = React.useState(0);
  const zp = zakatPenghasilan(income, gold), zm = zakatMaal(wealth, gold);
  return (
    <div className="pb-24">
      <TopHeader title="THR & Zakat" />
      <div className="space-y-6 px-4 pt-2">
        <section aria-label="Kalkulator zakat" className="space-y-3">
          <h2 className="text-lg font-bold">Kalkulator zakat</h2>
          <p className="text-sm text-muted-foreground">Isi harga emas per gram hari ini (cek di sumber resmi, misal BAZNAS atau toko emas). Aplikasi tidak menebak harga emas.</p>
          <label className="space-y-1 text-sm">Harga emas per gram<MoneyInput value={gold} onChange={setGold} aria-label="Harga emas per gram" suffix="Rp" /></label>
          <label className="space-y-1 text-sm">Penghasilan per bulan<MoneyInput value={income} onChange={setIncome} aria-label="Penghasilan per bulan" suffix="Rp" /></label>
          <label className="space-y-1 text-sm">Total harta yang sudah dimiliki 1 tahun<MoneyInput value={wealth} onChange={setWealth} aria-label="Total harta" suffix="Rp" /></label>
          {gold <= 0 ? <p className="text-sm text-muted-foreground">Isi harga emas dulu untuk melihat nisab.</p> : (
            <div className="space-y-2">
              <div className="rounded-lg p-3 ring-1 ring-foreground/10"><p className="font-semibold">Zakat penghasilan</p><p className="text-sm">Nisab per bulan {formatRupiah(Math.round(zp.nisab))}. {income <= 0 ? "Isi penghasilan." : zp.wajib ? `Zakat 2,5% = ${formatRupiah(zp.zakat)} per bulan.` : "Penghasilanmu belum mencapai nisab."}</p></div>
              <div className="rounded-lg p-3 ring-1 ring-foreground/10"><p className="font-semibold">Zakat maal</p><p className="text-sm">Nisab {formatRupiah(Math.round(zm.nisab))} (85 gram emas). {wealth <= 0 ? "Isi total harta." : zm.wajib ? `Zakat 2,5% = ${formatRupiah(zm.zakat)}.` : "Hartamu belum mencapai nisab."}</p></div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Ini perhitungan umum sebagai gambaran. Untuk hukum dan rincian yang tepat, tanyakan ke lembaga zakat atau ustaz terpercaya.</p>
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
  const field = (k: keyof typeof p, label: string) => (<label className="space-y-1 text-xs">{label} (%)<Input aria-label={`${label} persen`} inputMode="decimal" value={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.value.replace(/[^\d.,]/g, "") })} /></label>);
  return (
    <section aria-label="Mode THR" className="space-y-3">
      <h2 className="text-lg font-bold">Bagi THR</h2>
      <label className="space-y-1 text-sm">Jumlah THR<MoneyInput value={amount} onChange={setAmount} aria-label="Jumlah THR" suffix="Rp" /></label>
      <div className="grid grid-cols-2 gap-2">{field("zakat", "Zakat/sedekah")}{field("mudik", "Mudik & hari raya")}{field("angpao", "Angpao & hadiah")}{field("tabung", "Tabungan")}</div>
      {totalPct > 100 && <p role="alert" className="text-sm text-amber-600">Total lebih dari 100%, tabungan otomatis dikurangi.</p>}
      {amount <= 0 ? <p className="text-sm text-muted-foreground">Isi jumlah THR untuk melihat pembagiannya.</p> : (
        <ul className="space-y-1 text-sm">
          {[["Zakat/sedekah", s.zakat], ["Mudik & hari raya", s.mudik], ["Angpao & hadiah", s.angpao], ["Tabungan", s.tabung], ["Sisa bebas", s.sisa]].map(([l, v]) => (<li key={l as string} className="flex justify-between rounded-lg p-2.5 ring-1 ring-foreground/10"><span>{l}</span><b>{formatRupiah(v as number)}</b></li>))}
        </ul>
      )}
    </section>
  );
}
