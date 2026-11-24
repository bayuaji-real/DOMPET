"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/konsultan/money-input";
import { useConfirm } from "@/components/ui/use-confirm";
import { notify } from "@/lib/notify";
import { formatRupiah } from "@/lib/utils";
import { addLimit, deleteLimit, getLimits, updateLimit, getLimitStatuses } from "@/lib/data/limits";
import { getCategories, type Category } from "@/lib/data/categories";
import { limitMessage, type Period, type Status } from "@/lib/konsultan/spend-limit";
import { Select } from "@/components/ui/select";
import { PageHero } from "@/components/ui/form-kit";

const PERIOD_LABEL: Record<Period, string> = { harian: "per hari", mingguan: "per minggu", bulanan: "per bulan" };
const rp = (n: number) => formatRupiah(Math.round(n));

export default function BatasPengeluaranPage() {
  const [list, setList] = React.useState<Status[] | null>(null);
  const [inactive, setInactive] = React.useState<{ id: string; name: string }[]>([]);
  const [cats, setCats] = React.useState<Category[]>([]);
  const [err, setErr] = React.useState("");
  const [ask, dialog] = useConfirm();
  const empty = { name: "", period: "harian" as Period, amount: 0, warn: "80", cats: [] as string[] };
  const [f, setF] = React.useState(empty);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [s, all] = await Promise.all([getLimitStatuses(), getLimits()]);
      setList(s); setInactive(all.filter((x) => !x.is_active).map((x) => ({ id: x.id, name: x.name }))); setErr("");
    } catch { setErr("Batas pengeluaran belum bisa dimuat. Coba lagi sebentar."); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { void load(); getCategories("expense").then(setCats).catch(() => setCats([])); }, [load]);

  const save = async () => {
    try {
      await addLimit({ name: f.name.trim(), period: f.period, amount: f.amount, category_ids: f.cats, warn_pct: Math.min(Math.max(Number(f.warn) || 80, 10), 99) });
      setF(empty); setOpen(false); notify("Batas ditambahkan"); await load();
    } catch { notify("Belum bisa disimpan. Coba lagi sebentar."); }
  };
  const toggleCat = (id: string) => setF((p) => ({ ...p, cats: p.cats.includes(id) ? p.cats.filter((x) => x !== id) : [...p.cats, id] }));

  return (
    <div className="pb-24">
      {dialog}
      <TopHeader title="Batas Pengeluaran" />
      <div className="space-y-4 px-4 pt-2">
        <PageHero emoji="🚧" title="Batas Pengeluaran" desc="Atur batas belanja, kamu diingatkan saat hampir habis." tone="amber" />
        <p className="text-xs text-muted-foreground">Atur batas per hari, minggu, atau bulan, boleh khusus kategori tertentu. Kamu diperingatkan saat hampir habis.</p>
        {err && <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">{err}</p>}
        <Button className="h-10 w-full rounded-2xl text-xs" onClick={() => setOpen(!open)}>{open ? "Tutup" : "Tambah batas"}</Button>
        {open && (
          <div className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
            <Input aria-label="Nama batas" placeholder="Contoh: Makan dan main" maxLength={40} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1 text-xs font-semibold">Periode<Select aria-label="Periode" value={f.period} onChange={(e) => setF({ ...f, period: e.target.value as Period })}><option value="harian">Per hari</option><option value="mingguan">Per minggu (Senin-Minggu)</option><option value="bulanan">Per bulan</option></Select></label>
              <label className="block space-y-1 text-xs font-semibold">Peringatkan di (%)<Input inputMode="numeric" aria-label="Peringatkan di persen" value={f.warn} onChange={(e) => setF({ ...f, warn: e.target.value.replace(/\D/g, "").slice(0, 2) })} /></label>
            </div>
            <label className="block space-y-1 text-xs">Batas jumlah<MoneyInput value={f.amount} onChange={(n) => setF({ ...f, amount: n })} aria-label="Batas jumlah" suffix="Rp" /></label>
            <div><p className="mb-1 text-xs">Kategori yang dihitung (kosongkan untuk semua pengeluaran)</p>
              <div className="flex flex-wrap gap-1.5">{cats.map((c) => (<button type="button" key={c.id} aria-pressed={f.cats.includes(c.id)} onClick={() => toggleCat(c.id)} className={`rounded-full px-3 py-1 text-xs ${f.cats.includes(c.id) ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{c.name}</button>))}{cats.length === 0 && <span className="text-xs text-muted-foreground">Belum ada kategori.</span>}</div></div>
            <Button className="h-10 w-full rounded-2xl text-xs" disabled={!f.name.trim() || f.amount <= 0} onClick={save}>Simpan batas</Button>
          </div>
        )}
        {!list && !err && <div className="h-24 animate-pulse rounded-3xl bg-muted" aria-busy="true" />}
        {list && list.length === 0 && inactive.length === 0 && <p className="rounded-3xl border border-dashed border-border/70 p-5 text-center text-xs text-muted-foreground">Belum ada batas. Contoh: 50 ribu per hari untuk makan dan hiburan, atau 100 ribu per minggu untuk hiburan.</p>}
        <ul className="space-y-2">{list?.map((s) => {
          const l = s.limit, msg = limitMessage(s, rp);
          const catNames = l.category_ids.map((id) => cats.find((c) => c.id === id)?.name).filter(Boolean).join(", ");
          return (
            <li key={l.id} className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
              <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-medium">{l.name}</p><p className="text-xs text-muted-foreground">{rp(l.amount)} {PERIOD_LABEL[l.period]} · {catNames || "semua pengeluaran"}</p></div>
                <p className={`shrink-0 text-sm font-semibold ${s.level === "lewat" ? "text-red-600 dark:text-red-400" : s.level === "hampir" ? "text-amber-600 dark:text-amber-400" : ""}`}>{s.pct}%</p></div>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full ${s.level === "lewat" ? "bg-red-500" : s.level === "hampir" ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, s.pct)}%` }} /></div>
              <p className="text-xs text-muted-foreground">Terpakai {rp(s.spent)}{s.remaining >= 0 ? `, sisa ${rp(s.remaining)}` : `, lebih ${rp(-s.remaining)}`}</p>
              {msg && <p role="alert" className={`rounded-lg p-2 text-xs ${s.level === "lewat" ? "bg-red-500/10 text-red-700 dark:text-red-300" : "bg-amber-500/10 text-amber-800 dark:text-amber-300"}`}>{msg}</p>}
              <div className="flex gap-2"><Button size="sm" variant="outline" className="flex-1" onClick={async () => { try { await updateLimit(l.id, { is_active: false }); await load(); } catch { notify("Belum bisa diubah."); } }}>Nonaktifkan</Button>
                <Button size="sm" variant="outline" aria-label={`Hapus ${l.name}`} onClick={async () => { if (await ask(`Hapus batas "${l.name}"?`, "Hapus")) { try { await deleteLimit(l.id); await load(); } catch { notify("Belum bisa dihapus."); } } }}><Trash2 className="size-4" /></Button></div>
            </li>);
        })}</ul>
        {inactive.length > 0 && (<div><p className="mb-1 text-sm font-semibold">Nonaktif</p><ul className="space-y-1">{inactive.map((x) => (<li key={x.id} className="flex items-center justify-between rounded-lg bg-muted p-2 text-sm"><span>{x.name}</span><Button size="sm" variant="outline" onClick={async () => { try { await updateLimit(x.id, { is_active: true }); await load(); } catch { notify("Belum bisa diubah."); } }}>Aktifkan</Button></li>))}</ul></div>)}
        <p className="text-xs text-muted-foreground">Peringatan muncul di Beranda dan sesaat setelah kamu mencatat pengeluaran. Batas ini pengingat, bukan pemblokir: transaksi tetap bisa dicatat.</p>
      </div>
    </div>
  );
}
