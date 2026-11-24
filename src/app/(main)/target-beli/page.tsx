"use client";

import * as React from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/konsultan/money-input";
import { useConfirm } from "@/components/ui/use-confirm";
import { notify } from "@/lib/notify";
import { formatRupiah } from "@/lib/utils";
import { getFinanceSnapshot, type FinanceSnapshot } from "@/lib/data/finance-snapshot";
import { getBenchmarks } from "@/lib/data/admin";
import { addPurchase, deletePurchase, getPurchases, updatePurchase, type PurchaseRow } from "@/lib/data/purchase";
import { analyzePurchase, type PurchaseResult } from "@/lib/konsultan/purchase-calc";

const rp = (n: number) => formatRupiah(Math.round(n));
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const TONE: Record<string, string> = { aman: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", pas: "bg-amber-500/10 text-amber-800 dark:text-amber-300", berat: "bg-red-500/10 text-red-700 dark:text-red-300", belum_ada_data: "bg-muted text-muted-foreground" };
const LABEL: Record<string, string> = { aman: "Aman", pas: "Pas-pasan", berat: "Berat", belum_ada_data: "Belum bisa dinilai" };

function analyze(g: PurchaseRow, snap: FinanceSnapshot, infl: number, commitments: number): PurchaseResult {
  return analyzePurchase({ price: Number(g.price), downPayment: Number(g.down_payment), saved: Number(g.saved), mode: g.mode, months: g.months ?? 12, ratePctYear: Number(g.rate_pct ?? 0), targetDate: g.target_date, today: snap.today, income: snap.monthlyIncome, expense: snap.monthlyExpense, commitments, inflationPct: infl });
}

export default function TargetBeliPage() {
  const [list, setList] = React.useState<PurchaseRow[] | null>(null);
  const [snap, setSnap] = React.useState<FinanceSnapshot | null>(null);
  const [infl, setInfl] = React.useState(3);
  const [commit, setCommit] = React.useState(0);
  const [err, setErr] = React.useState("");
  const [ask, dialog] = useConfirm();
  const empty = { name: "", price: 0, mode: "tunai" as "tunai" | "cicilan", dp: 0, months: "12", rate: "10", saved: 0, date: "" };
  const [f, setF] = React.useState(empty);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try { const [l, s] = await Promise.all([getPurchases(), getFinanceSnapshot()]); setList(l); setSnap(s); setErr(""); }
    catch { setErr("Target Beli belum bisa dimuat. Coba lagi sebentar."); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { void load(); getBenchmarks().then((b) => { const x = b.find((r) => r.code === "inflasi_yoy"); if (x) setInfl(Number(x.value)); }).catch(() => {}); }, [load]);

  const months = Math.min(Math.max(Number(f.months) || 0, 0), 360);
  const rate = Number(String(f.rate).replace(",", ".")) || 0;
  const valid = f.name.trim() && f.price > 0 && f.dp <= f.price && (f.mode === "tunai" || (months >= 1 && f.dp < f.price)) && (!f.date || f.date > (snap?.today ?? ""));
  const save = async () => {
    try {
      await addPurchase({ name: f.name.trim(), price: f.price, mode: f.mode, down_payment: f.mode === "cicilan" ? f.dp : 0, months: f.mode === "cicilan" ? months : null, rate_pct: f.mode === "cicilan" ? rate : null, saved: f.saved, target_date: f.date || null });
      setF(empty); setOpen(false); notify("Target beli ditambahkan"); await load();
    } catch { notify("Belum bisa disimpan. Coba lagi sebentar."); }
  };

  return (
    <div className="pb-24">
      {dialog}
      <TopHeader title="Target Beli" />
      <div className="space-y-4 px-4 pt-2">
        <p className="text-sm text-muted-foreground">Mau beli sesuatu? Isi harganya, lalu lihat apakah kamu mampu, berapa yang perlu disisihkan per bulan, dan kapan paling cepat bisa terbeli. Ini berbeda dengan Tabungan: Target Beli menghitung kemampuanmu, tunai maupun cicilan, berdasarkan pemasukan dan pengeluaranmu.</p>
        {snap && snap.monthlyIncome <= 0 && <p className="rounded-lg bg-muted p-3 text-xs">Belum ada pemasukan tercatat 3 bulan terakhir, jadi penilaian belum bisa dihitung. Catat pemasukanmu dulu.</p>}
        {snap && snap.monthlyIncome > 0 && <p className="text-xs text-muted-foreground">Dihitung dari rata-rata 3 bulan: pemasukan {rp(snap.monthlyIncome)}, pengeluaran {rp(snap.monthlyExpense)} per bulan. Kenaikan harga per tahun yang dipakai: {infl}% (inflasi terbaru).</p>}
        <label className="block space-y-1 text-xs">Setoran tabungan lain per bulan (supaya tidak dihitung dua kali)<MoneyInput value={commit} onChange={setCommit} aria-label="Setoran tabungan lain per bulan" suffix="Rp" /></label>
        {err && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{err}</p>}
        <Button className="w-full" onClick={() => setOpen(!open)}>{open ? "Tutup" : "Tambah target beli"}</Button>
        {open && (
          <div className="space-y-2 rounded-xl p-3 ring-1 ring-foreground/10">
            <Input aria-label="Nama barang" placeholder="Contoh: Laptop, motor, kulkas" maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <label className="block space-y-1 text-xs">Harga<MoneyInput value={f.price} onChange={(n) => setF({ ...f, price: n })} aria-label="Harga barang" suffix="Rp" /></label>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Cara beli">
              {(["tunai", "cicilan"] as const).map((m) => (<Button key={m} type="button" variant={f.mode === m ? "default" : "outline"} aria-pressed={f.mode === m} onClick={() => setF({ ...f, mode: m })}>{m === "tunai" ? "Tunai" : "Cicilan"}</Button>))}
            </div>
            {f.mode === "cicilan" && (<>
              <label className="block space-y-1 text-xs">Uang muka (DP)<MoneyInput value={f.dp} onChange={(n) => setF({ ...f, dp: n })} aria-label="Uang muka" suffix="Rp" /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-xs">Lama cicilan (bulan)<Input inputMode="numeric" aria-label="Lama cicilan bulan" value={f.months} onChange={(e) => setF({ ...f, months: e.target.value.replace(/\D/g, "").slice(0, 3) })} /></label>
                <label className="space-y-1 text-xs">Bunga flat per tahun (%)<Input inputMode="decimal" aria-label="Bunga per tahun" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value.replace(/[^\d.,]/g, "") })} /></label>
              </div>
            </>)}
            <label className="block space-y-1 text-xs">Uang yang sudah terkumpul untuk ini<MoneyInput value={f.saved} onChange={(n) => setF({ ...f, saved: n })} aria-label="Uang terkumpul" suffix="Rp" /></label>
            <label className="block space-y-1 text-xs">Ingin terbeli pada (boleh kosong)<Input type="date" aria-label="Tanggal target beli" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
            <Button className="w-full" disabled={!valid} onClick={save}>Simpan dan hitung</Button>
          </div>
        )}
        {!list && !err && <div className="h-24 animate-pulse rounded-xl bg-muted" aria-busy="true" />}
        {list && list.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Belum ada target beli. Coba isi barang yang sedang kamu incar.</p>}
        <ul className="space-y-3">
          {snap && list?.map((g) => {
            const r = analyze(g, snap, infl, commit);
            const fe = r.feasibility;
            return (
              <li key={g.id} className="space-y-2 rounded-xl p-3 ring-1 ring-foreground/10">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="truncate font-medium">{g.name}{g.status === "terbeli" ? " (terbeli)" : ""}</p><p className="text-xs text-muted-foreground">{rp(Number(g.price))} · {g.mode === "cicilan" ? `cicilan ${g.months} bulan` : "tunai"}{g.target_date ? ` · target ${fmtDate(g.target_date)}` : ""}</p></div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[r.verdict]}`}>{LABEL[r.verdict]}</span>
                </div>
                <p className={`rounded-lg p-2 text-xs ${TONE[r.verdict]}`}>{r.headline}</p>
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  <li>{g.mode === "cicilan" ? "Uang muka" : "Harga"} yang perlu disiapkan: {rp(r.cashNeeded)}, terkumpul {rp(Number(g.saved))}, kurang {rp(r.remainingCash)}.</li>
                  {fe.monthlyNeeded !== null && fe.monthlyNeeded > 0 && <li>Sisihkan sekitar {rp(fe.monthlyNeeded)} per bulan sampai tanggal target ({fe.monthsLeft} bulan).</li>}
                  {snap.monthlyIncome > 0 && <li>Sisa uang bulananmu sekarang sekitar {rp(fe.freeMonthly)}{fe.monthsAtFreeRate && r.remainingCash > 0 ? `; kalau semuanya ditabung, terbeli sekitar ${r.buyDate ? fmtDate(r.buyDate) : "-"} (${fe.monthsAtFreeRate} bulan)` : ""}.</li>}
                  {r.installment !== null && <li>Cicilan sekitar {rp(r.installment)} per bulan{r.installmentPctIncome !== null ? ` (${r.installmentPctIncome}% dari pemasukan; pedoman umum sebaiknya tidak lebih dari 30%)` : ""}. Total bunga {rp(r.totalInterest)}, total yang dibayar {rp(r.totalPaid)}.</li>}
                  {r.leftoverAfterInstallment !== null && snap.monthlyIncome > 0 && <li>Sisa uang bulanan setelah cicilan: {rp(r.leftoverAfterInstallment)}.</li>}
                  {r.priceAtTarget !== null && r.priceAtTarget > Number(g.price) && <li>Perkiraan harga pada tanggal target: {rp(r.priceAtTarget)} bila naik {infl}% per tahun.</li>}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <AddFunds onSave={async (n) => { try { await updatePurchase(g.id, { saved: Number(g.saved) + n }); await load(); } catch { notify("Belum bisa disimpan."); } }} />
                  {g.status === "aktif" && <Button size="sm" variant="outline" onClick={async () => { try { await updatePurchase(g.id, { status: "terbeli" }); await load(); } catch { notify("Belum bisa diubah."); } }}>Sudah terbeli</Button>}
                  <Link href="/tabungan" className="inline-flex h-8 items-center rounded-lg border px-3 text-xs">Buat target tabungan</Link>
                  <Button size="sm" variant="outline" aria-label={`Hapus ${g.name}`} onClick={async () => { if (await ask(`Hapus target beli "${g.name}"?`, "Hapus")) { try { await deletePurchase(g.id); await load(); } catch { notify("Belum bisa dihapus."); } } }}><Trash2 className="size-4" /></Button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">Hitungan ini perkiraan dari data yang kamu catat, bukan nasihat keuangan atau tawaran kredit. Bunga cicilan memakai bunga flat sederhana, cek ke penyedia cicilanmu untuk angka pastinya.</p>
      </div>
    </div>
  );
}

function AddFunds({ onSave }: { onSave: (n: number) => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [v, setV] = React.useState(0);
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Tambah dana</Button>;
  return (
    <div className="flex w-full items-center gap-2">
      <div className="min-w-0 flex-1"><MoneyInput value={v} onChange={setV} aria-label="Tambah dana terkumpul" suffix="Rp" /></div>
      <Button size="sm" disabled={v <= 0} onClick={async () => { await onSave(v); setV(0); setOpen(false); }}>Simpan</Button>
      <Button size="sm" variant="outline" onClick={() => { setV(0); setOpen(false); }}>Batal</Button>
    </div>
  );
}
