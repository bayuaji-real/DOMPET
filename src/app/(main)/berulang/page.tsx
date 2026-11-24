"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/konsultan/money-input";
import { useConfirm } from "@/components/ui/use-confirm";
import { createRecurringTransaction, deleteRecurringTransaction, getRecurringTransactions, processRecurringTransaction, type RecurringTransaction } from "@/lib/data/recurring";
import { getSpendableWallets, type WalletBalance } from "@/lib/data/wallets";
import { getCategories, type Category } from "@/lib/data/categories";
import { todayJakarta } from "@/lib/data/sample-mode";
import { nextDateForDay } from "@/lib/dates";
import { notify } from "@/lib/notify";
import { batasBasicMessage } from "@/lib/plans";
import { formatRupiah } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { PageHero, Cta, FormCard, Field, IconBox, Pill, Notice, EmptyState, Segmented } from "@/components/ui/form-kit";

const dmy = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export default function BerulangPage() {
  const [ask, dialog] = useConfirm();
  const [list, setList] = React.useState<RecurringTransaction[] | null>(null);
  const [wallets, setWallets] = React.useState<WalletBalance[]>([]);
  const [cats, setCats] = React.useState<Category[]>([]);
  const [err, setErr] = React.useState("");
  const [f, setF] = React.useState({ type: "expense" as "expense" | "income", note: "", amount: 0, day: "1", wallet: "", cat: "" });
  const today = todayJakarta();
  const load = React.useCallback(() => getRecurringTransactions().then(setList).catch(() => setErr("Daftar belum bisa dimuat. Coba lagi sebentar.")), []);
  React.useEffect(() => {
    void load();
    getSpendableWallets().then((w) => { const a = w.filter((x) => !x.is_archived); setWallets(a); setF((p) => ({ ...p, wallet: p.wallet || a[0]?.id || "" })); }).catch(() => {});
    getCategories().then(setCats).catch(() => {});
  }, [load]);
  const day = Math.min(Math.max(Number(f.day) || 0, 1), 31);
  const valid = f.note.trim().length > 0 && f.amount > 0 && f.wallet && Number(f.day) >= 1 && Number(f.day) <= 31;
  const catsFor = cats.filter((c) => c.type === f.type);
  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); await load(); notify(ok); } catch (e) { notify(batasBasicMessage(e) ?? "Belum berhasil. Coba lagi sebentar."); } };
  const walletName = (id: string) => wallets.find((w) => w.id === id)?.name ?? "Dompet";

  return (
    <div className="pb-24">
      <TopHeader title="Transaksi Berulang" />
      {dialog}
      <div className="space-y-4 px-4 pt-2">
        <PageHero title="Transaksi Berulang" desc="Tagihan dan pemasukan rutin, tinggal tekan Catat." />
        <Pill icon="🔁">Tagihan atau pemasukan tiap bulan: listrik, cicilan, gaji. Saat jatuh tempo, tinggal tekan Catat sekarang</Pill>
        {err && <Notice tone="rose" emoji="⚠️" role="alert">{err}</Notice>}
        {list === null && !err && <div className="h-20 animate-pulse rounded-3xl bg-muted" aria-busy="true" />}
        {list && list.length === 0 && <EmptyState emoji="🔁">Belum ada transaksi berulang. Tambahkan yang pertama di bawah.</EmptyState>}
        <ul className="space-y-2">
          {(list ?? []).map((r) => {
            const due = r.next_date <= today;
            return (
              <li key={r.id} className={`rounded-3xl border bg-card p-3.5 shadow-xs ${due ? "border-amber-400/60" : "border-border/80"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5"><IconBox tone={r.type === "income" ? "neon" : "rose"}>{r.type === "income" ? "⬇️" : "⬆️"}</IconBox><div className="min-w-0"><p className="truncate text-sm font-extrabold">{r.note || "Tanpa nama"}</p>
                    <p className="text-xs text-muted-foreground">{r.type === "income" ? "Pemasukan" : "Pengeluaran"} · tiap tanggal {r.day_of_month} · {walletName(r.wallet_id)}</p>
                    <Pill tone={due ? "amber" : "slate"} icon={due ? "⏰" : "📅"} className="mt-1">{due ? "Jatuh tempo" : "Berikutnya"}: {dmy(r.next_date)}</Pill></div></div>
                  <div className="text-right"><p className={`font-semibold ${r.type === "income" ? "text-emerald-600" : ""}`}>{r.type === "income" ? "+" : "-"}{formatRupiah(Number(r.amount))}</p>
                    <button type="button" aria-label={`Hapus ${r.note || "item"}`} className="mt-1 text-muted-foreground" onClick={async () => { if (await ask(`Hapus "${r.note || "item ini"}" dari transaksi berulang? Transaksi yang sudah tercatat tidak ikut terhapus.`)) await act(() => deleteRecurringTransaction(r.id), "Dihapus"); }}><Trash2 className="size-4" /></button></div>
                </div>
                {due && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => act(() => processRecurringTransaction(r.id, "record", today), "Tercatat")}>Catat sekarang</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => act(() => processRecurringTransaction(r.id, "skip", today), "Dilewati bulan ini")}>Lewati bulan ini</Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <form aria-label="Tambah transaksi berulang" onSubmit={async (e) => {
          e.preventDefault(); if (!valid) return;
          await act(async () => { await createRecurringTransaction({ type: f.type, amount: f.amount, wallet_id: f.wallet, category_id: f.cat || null, note: f.note.trim(), rule: "monthly", day_of_month: day, next_date: nextDateForDay(day, today), is_active: true }); setF({ ...f, note: "", amount: 0 }); }, "Ditambahkan");
        }}>
          <FormCard title="Tambah baru" desc="Isi sekali, ingatkan tiap bulan." icon="🔁">
          <Segmented label="Jenis" value={f.type} onChange={(t) => setF({ ...f, type: t, cat: "" })} options={[{ value: "expense", label: "Pengeluaran", tone: "rose", icon: "⬆️" }, { value: "income", label: "Pemasukan", tone: "neon", icon: "⬇️" }]} />
          <Input aria-label="Nama" placeholder="Nama, misal Listrik atau Gaji" maxLength={60} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <MoneyInput aria-label="Nominal" value={f.amount} onChange={(n) => setF({ ...f, amount: n })} suffix="Rp" placeholder="Nominal" />
          <label className="block text-xs">Tanggal tiap bulan (1 sampai 31)<Input aria-label="Tanggal tiap bulan" inputMode="numeric" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value.replace(/\D/g, "").slice(0, 2) })} /></label>
          <Select aria-label="Dompet" value={f.wallet} onChange={(e) => setF({ ...f, wallet: e.target.value })}>{wallets.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}</Select>
          <Select aria-label="Kategori" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}><option value="">Tanpa kategori</option>{catsFor.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</Select>
          <Cta type="submit" disabled={!valid}>Tambahkan</Cta>
          {!valid && f.note && <p className="text-xs text-muted-foreground">Isi nominal dan tanggal 1 sampai 31 dulu.</p>}
          </FormCard>
        </form>
      </div>
    </div>
  );
}
