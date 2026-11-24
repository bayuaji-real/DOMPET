"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Disclaimer } from "@/components/plan/disclaimer";
import { Gate } from "@/components/plan/gate";
import { MoneyInput } from "@/components/konsultan/money-input";
import { simulateInvestment } from "@/lib/konsultan/invest-calc";
import { AcuanSection } from "@/components/market/acuan-section";
import { rankSnapshots, summarizePortfolio, type SortKey } from "@/lib/konsultan/portfolio";
import { addHolding, deleteHolding, getHoldings, getSnapshots, updateHoldingPrice, type HoldingRow, type SnapshotRow } from "@/lib/data/invest";
import { formatRupiah } from "@/lib/utils";
import { useConfirm } from "@/components/ui/use-confirm";

type Tab = "kalkulator" | "portofolio" | "pasar";
const SHOW_PASAR = process.env.NEXT_PUBLIC_INFO_PASAR === "on" || process.env.NODE_ENV !== "production";
const TABS: { id: Tab; label: string }[] = [{ id: "kalkulator", label: "Kalkulator" }, { id: "portofolio", label: "Portofolio" }, ...(SHOW_PASAR ? [{ id: "pasar" as Tab, label: "Info Pasar" }] : [])];
const pct = (n: number | null) => (n == null ? "-" : `${n > 0 ? "+" : ""}${n.toFixed(2).replace(".", ",")}%`);
const tone = (n: number | null) => (n == null ? "" : n < 0 ? "text-red-600 dark:text-red-400" : n > 0 ? "text-emerald-600 dark:text-emerald-400" : "");

export default function InvestasiPage() {
  const [tab, setTab] = React.useState<Tab>("kalkulator");
  return (
    <div className="pb-24">
      <TopHeader title="Investasi" />
      <div className="px-4 pt-2">
        <div role="tablist" aria-label="Bagian investasi" className="mb-4 grid gap-1 rounded-2xl bg-muted p-1" style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}>
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`rounded-xl py-2 text-xs font-semibold ${tab === t.id ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{t.label}</button>
          ))}
        </div>
        {tab === "kalkulator" && <Kalkulator />}
        {tab === "portofolio" && <Gate feature="portofolio"><Portofolio /></Gate>}
        {SHOW_PASAR && tab === "pasar" && <Gate feature="info_pasar"><Pasar /></Gate>}
        <Disclaimer kind="invest" className="mt-4" />
      </div>
    </div>
  );
}

function Kalkulator() {
  const [initial, setInitial] = React.useState(0);
  const [monthly, setMonthly] = React.useState(500_000);
  const [ret, setRet] = React.useState("6");
  const [years, setYears] = React.useState("5");
  const [view, setView] = React.useState<"bulan" | "tahun">("tahun");
  const retNum = Number(ret.replace(",", ".")) || 0;
  const res = React.useMemo(() => simulateInvestment({ initial, monthly, annualReturnPct: retNum, years: Number(years) || 0 }), [initial, monthly, retNum, years]);
  const rows = view === "tahun" ? res.years : res.months;
  return (
    <div className="space-y-4 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
      <p className="text-xs text-muted-foreground">Simulasi sederhana, bukan janji keuntungan.</p>
      <div className="grid gap-3">
        <label className="space-y-1 text-sm">Uang awal<MoneyInput value={initial} onChange={setInitial} aria-label="Uang awal" placeholder="0" suffix="Rp" /></label>
        <label className="space-y-1 text-sm">Setoran tiap bulan<MoneyInput value={monthly} onChange={setMonthly} aria-label="Setoran tiap bulan" suffix="Rp" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">Perkiraan return per tahun (%)<Input inputMode="decimal" aria-label="Return per tahun" value={ret} onChange={(e) => setRet(e.target.value.replace(/[^\d.,-]/g, ""))} /></label>
          <label className="space-y-1 text-sm">Lama (tahun)<Input inputMode="numeric" aria-label="Lama tahun" value={years} onChange={(e) => setYears(e.target.value.replace(/\D/g, "").slice(0, 2))} /></label>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Total setoran" value={formatRupiah(res.contributed)} />
        <Stat label="Perkiraan nilai akhir" value={formatRupiah(res.finalValue)} strong />
        <Stat label="Selisih" value={formatRupiah(res.gain)} neg={res.gain < 0} />
      </div>
      <div className="flex gap-2" role="group" aria-label="Tampilan hasil">
        {(["tahun", "bulan"] as const).map((v) => (<Button key={v} size="sm" variant={view === v ? "default" : "outline"} onClick={() => setView(v)} aria-pressed={view === v}>Per {v}</Button>))}
      </div>
      {rows.length === 0 ? <p className="text-xs text-muted-foreground">Isi lama investasi minimal 1 tahun untuk melihat tabel.</p> : (
        <div className="max-h-96 overflow-auto rounded-2xl border border-border/70 bg-card shadow-xs">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-left"><tr><th className="p-2">{view === "tahun" ? "Tahun" : "Bulan"}</th><th className="p-2 text-right">Setoran</th><th className="p-2 text-right">Nilai</th></tr></thead>
            <tbody>{rows.map((r) => (<tr key={r.month} className="border-t"><td className="p-2">{view === "tahun" ? r.month / 12 : r.month}</td><td className="p-2 text-right">{formatRupiah(r.contributed)}</td><td className="p-2 text-right font-medium">{formatRupiah(r.value)}</td></tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, strong, neg }: { label: string; value: string; strong?: boolean; neg?: boolean }) {
  return (<div className="rounded-lg bg-muted/60 p-2"><p className="text-[11px] text-muted-foreground">{label}</p><p className={`text-sm ${strong ? "font-bold" : "font-semibold"} ${neg ? "text-red-600" : ""}`}>{value}</p></div>);
}

function Portofolio() {
  const [ask, confirmDialog] = useConfirm();
  const [list, setList] = React.useState<HoldingRow[] | null>(null);
  const [err, setErr] = React.useState("");
  const [f, setF] = React.useState({ name: "", kind: "reksa_dana" as HoldingRow["kind"], units: "", avg: 0, last: 0 });
  const load = React.useCallback(() => getHoldings().then(setList).catch(() => setErr("Portofolio belum bisa dimuat. Coba lagi sebentar.")), []);
  React.useEffect(() => { void load(); }, [load]);
  const sum = React.useMemo(() => summarizePortfolio((list ?? []).map((h) => ({ id: h.id, name: h.name, kind: h.kind, units: Number(h.units), avg_price: Number(h.avg_price), last_price: h.last_price == null ? null : Number(h.last_price) }))), [list]);
  const units = Number(f.units.replace(",", ".")) || 0;
  const valid = f.name.trim().length > 0 && units > 0 && f.avg > 0;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!valid) return; setErr("");
    try { await addHolding({ name: f.name.trim(), kind: f.kind, units, avg_price: f.avg, last_price: f.last > 0 ? f.last : null }); setF({ name: "", kind: f.kind, units: "", avg: 0, last: 0 }); await load(); }
    catch { setErr("Belum bisa menyimpan. Coba lagi sebentar."); }
  };
  return (
    <div className="space-y-4">
      {confirmDialog}
      <p className="text-xs text-muted-foreground">Isi sendiri aset investasimu. Harga terbaru diperbarui manual karena aplikasi belum tersambung ke broker atau Bibit.</p>
      {err && <p role="alert" className="rounded-2xl bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{err}</p>}
      {list && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Modal" value={formatRupiah(sum.cost)} /><Stat label="Nilai sekarang" value={formatRupiah(sum.value)} strong /><Stat label="Untung/rugi" value={`${formatRupiah(sum.pnl)} (${pct(sum.pnlPct)})`} neg={sum.pnl < 0} />
        </div>
      )}
      {sum.missingPrice > 0 && <p className="text-xs text-muted-foreground">{sum.missingPrice} aset belum diisi harga terbaru, jadi nilainya sementara dianggap sama dengan modal.</p>}
      {list === null && !err && <div className="h-20 animate-pulse rounded-3xl bg-muted" aria-busy="true" />}
      {list && list.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Belum ada aset. Tambahkan yang pertama di bawah.</p>}
      <ul className="space-y-2">
        {sum.rows.map((r) => (
          <li key={r.id} className="rounded-2xl p-3 border border-border/70 bg-card shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">Modal {formatRupiah(r.cost)} · nilai {formatRupiah(r.value)}</p></div>
              <div className="text-right"><p className={`text-sm font-semibold ${tone(r.pnl)}`}>{pct(r.pnlPct)}</p>
                <button aria-label={`Hapus ${r.name}`} className="mt-1 text-muted-foreground" onClick={async () => { if (await ask(`Hapus ${r.name} dari portofolio?`)) { await deleteHolding(r.id); await load(); } }}><Trash2 className="size-4" /></button></div>
            </div>
            <PriceUpdate onSave={async (p) => { await updateHoldingPrice(r.id, p); await load(); }} />
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="space-y-3 rounded-2xl p-3 border border-border/70 bg-card shadow-xs" aria-label="Tambah aset">
        <p className="font-semibold">Tambah aset</p>
        <Input aria-label="Nama aset" placeholder="Nama, misal Insight Money atau BBCA" value={f.name} maxLength={80} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <select aria-label="Jenis aset" className="h-9 w-full rounded-lg border bg-background px-2 text-sm" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as HoldingRow["kind"] })}>
          <option value="reksa_dana">Reksa dana</option><option value="saham">Saham</option><option value="emas">Emas</option><option value="lainnya">Lainnya</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <Input aria-label="Jumlah unit" inputMode="decimal" placeholder="Jumlah unit/lembar" value={f.units} onChange={(e) => setF({ ...f, units: e.target.value.replace(/[^\d.,]/g, "") })} />
          <MoneyInput aria-label="Harga beli rata-rata" value={f.avg} onChange={(n) => setF({ ...f, avg: n })} placeholder="Harga beli/unit" decimals />
        </div>
        <MoneyInput aria-label="Harga terbaru" value={f.last} onChange={(n) => setF({ ...f, last: n })} placeholder="Harga terbaru/unit (boleh kosong)" decimals />
        <Button type="submit" disabled={!valid} className="w-full">Simpan aset</Button>
        {!valid && (f.name || f.units) && <p className="text-xs text-muted-foreground">Lengkapi nama, jumlah unit, dan harga beli dulu.</p>}
      </form>
    </div>
  );
}

function PriceUpdate({ onSave }: { onSave: (p: number) => Promise<void> }) {
  const [v, setV] = React.useState(0);
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex-1"><MoneyInput aria-label="Perbarui harga terbaru" value={v} onChange={setV} placeholder="Perbarui harga terbaru" decimals /></div>
      <Button size="sm" variant="outline" disabled={v <= 0} onClick={async () => { await onSave(v); setV(0); }}>Simpan</Button>
    </div>
  );
}

const CAT_LABEL: Record<string, string> = { pasar_uang: "Pasar uang", pendapatan_tetap: "Pendapatan tetap", campuran: "Campuran", saham: "Saham & indeks" };
const RISK_LABEL: Record<string, string> = { rendah: "Risiko rendah", sedang: "Risiko sedang", tinggi: "Risiko tinggi" };

function Pasar() {
  const [data, setData] = React.useState<SnapshotRow[] | null>(null);
  const [err, setErr] = React.useState("");
  const [key, setKey] = React.useState<SortKey>("ret_1y");
  React.useEffect(() => { getSnapshots().then(setData).catch(() => setErr("Data pasar belum bisa dimuat.")); }, []);
  if (err) return <p role="alert" className="text-sm text-red-600">{err}</p>;
  if (!data) return <div className="h-24 animate-pulse rounded-3xl bg-muted" aria-busy="true" />;
  const asOf = data[0]?.as_of; const src = data[0]?.source_url;
  return (
    <div className="space-y-4">
      <AcuanSection />
      {data.length === 0 && <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">Data per produk reksa dana belum tersedia. Acuan pasar di atas bersumber dari lembaga resmi.</p>}
      <p className="text-xs text-muted-foreground">Diurutkan per jenis. Return tinggi biasanya berisiko tinggi.</p>
      <div className="flex gap-2" role="group" aria-label="Urutkan berdasarkan">
        {([["ret_1y", "Return 1 tahun"], ["ret_1m", "Return 1 bulan"]] as [SortKey, string][]).map(([k, l]) => (<Button key={k} size="sm" variant={key === k ? "default" : "outline"} aria-pressed={key === k} onClick={() => setKey(k)}>{l}</Button>))}
      </div>
      {Object.keys(CAT_LABEL).map((c) => {
        const items = rankSnapshots(data.filter((d) => d.category === c), key);
        if (items.length === 0) return null;
        return (
          <section key={c} aria-label={CAT_LABEL[c]}>
            <h3 className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{CAT_LABEL[c]} <span className="text-xs font-normal text-muted-foreground">· {RISK_LABEL[items[0]?.risk ?? "sedang"]}</span></h3>
            <ol className="space-y-1.5">
              {items.map((s, i) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-2xl p-3 border border-border/70 bg-card shadow-xs">
                  <span className="text-sm"><span className="mr-2 text-muted-foreground">{i + 1}.</span>{s.name}</span>
                  <span className="text-right text-xs"><span className={`block text-sm font-semibold ${tone(s[key])}`}>{pct(s[key])}</span>{key === "ret_1y" ? "1 tahun" : "1 bulan"}</span>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
      <p className="text-xs text-muted-foreground">Sumber resmi sesuai tautan, kinerja per {asOf ? new Date(asOf + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}. {src && <a className="underline" href={src} target="_blank" rel="noopener noreferrer">Buka sumber</a>}</p>
    </div>
  );
}
