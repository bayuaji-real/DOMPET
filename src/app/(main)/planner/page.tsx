"use client";

import * as React from "react";
import Link from "next/link";
import { Trash2, Plus, Check } from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/konsultan/money-input";
import { useConfirm } from "@/components/ui/use-confirm";
import { notify } from "@/lib/notify";
import { formatRupiah } from "@/lib/utils";
import { todayJakarta } from "@/lib/data/sample-mode";
import * as P from "@/lib/data/planner";
import { getSavingsGoals, type GoalProgress } from "@/lib/data/goals";
import {
  summarize, paidFor, itemProgressPct, daysUntil, upcoming, monthlySaving, guestTotals, todoProgress,
  STARTER_DOCS, STARTER_VENDORS, STARTER_SESERAHAN, isItemDone, type Side,
} from "@/lib/planner/planner-calc";

type Tab = "ringkasan" | "vendor" | "seserahan" | "bayar" | "tamu" | "tugas";
const TABS: { id: Tab; label: string }[] = [
  { id: "ringkasan", label: "Ringkasan" }, { id: "vendor", label: "Vendor" }, { id: "seserahan", label: "Seserahan" },
  { id: "bayar", label: "Bayar" }, { id: "tamu", label: "Tamu" }, { id: "tugas", label: "Tugas" },
];
const SIDE_LABEL: Record<Side, string> = { umum: "Bersama", pria: "Pihak pria", wanita: "Pihak wanita" };
const selectCls = "h-9 w-full rounded-lg border border-input bg-background px-2 text-sm";
const errText = (e: unknown) => (e instanceof Error && e.message ? "Belum bisa disimpan. Coba lagi sebentar." : "Terjadi gangguan. Coba lagi sebentar.");

export default function PlannerPage() {
  const [events, setEvents] = React.useState<P.EventRow[] | null>(null);
  const [data, setData] = React.useState<P.PlannerData | null>(null);
  const [tab, setTab] = React.useState<Tab>("ringkasan");
  const [err, setErr] = React.useState("");
  const [ask, dialog] = useConfirm();
  const today = todayJakarta();

  const loadEvents = React.useCallback(() => P.getEvents().then(setEvents).catch(() => setErr("Planner belum bisa dimuat. Coba lagi sebentar.")), []);
  React.useEffect(() => { void loadEvents(); }, [loadEvents]);
  const ev = events?.[0] ?? null;
  const evId = ev?.id;
  const reload = React.useCallback(async () => { if (evId) { try { setData(await P.getPlannerData(evId)); } catch { setErr("Data planner belum bisa dimuat. Coba lagi sebentar."); } } }, [evId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { void reload(); }, [reload]);
  const run = async (fn: () => Promise<unknown>, okMsg?: string) => {
    try { await fn(); await reload(); if (okMsg) notify(okMsg); } catch (e) { notify(errText(e)); }
  };

  return (
    <div className="pb-24">
      {dialog}
      <TopHeader title="Planner Acara" />
      <div className="space-y-4 px-4 pt-2">
        {err && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{err}</p>}
        {!events && !err && <div className="h-32 animate-pulse rounded-xl bg-muted" aria-busy="true" />}
        {events && !ev && <NewEvent onDone={loadEvents} />}
        {ev && (
          <>
            <div role="tablist" aria-label="Bagian planner" className="grid grid-cols-6 gap-1 rounded-xl bg-muted p-1">
              {TABS.map((t) => (<button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`rounded-lg py-2 text-[11px] font-medium ${tab === t.id ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{t.label}</button>))}
            </div>
            {!data ? <div className="h-32 animate-pulse rounded-xl bg-muted" aria-busy="true" /> : (
              <>
                {tab === "ringkasan" && <Ringkasan ev={ev} d={data} today={today} onSaved={loadEvents} onDelete={async () => { if (await ask("Hapus seluruh planner ini beserta vendor, pembayaran, tamu, dan tugasnya? Tidak bisa dibatalkan.", "Hapus")) { await P.deleteEvent(ev.id).then(() => { setData(null); return loadEvents(); }).catch(() => notify("Belum bisa dihapus. Coba lagi.")); } }} />}
                {(tab === "vendor" || tab === "seserahan") && <Belanja key={tab} kind={tab} ev={ev} d={data} run={run} ask={ask} />}
                {tab === "bayar" && <Bayar ev={ev} d={data} run={run} ask={ask} today={today} />}
                {tab === "tamu" && <Tamu ev={ev} d={data} run={run} ask={ask} />}
                {tab === "tugas" && <Tugas ev={ev} d={data} run={run} ask={ask} today={today} />}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

type Run = (fn: () => Promise<unknown>, okMsg?: string) => Promise<void>;
type Ask = (text: string, yes?: string) => Promise<boolean>;

function NewEvent({ onDone }: { onDone: () => void }) {
  const [f, setF] = React.useState({ title: "", type: "nikah" as "lamaran" | "nikah" | "lainnya", date: "", budget: 0, a: "", b: "" });
  const [busy, setBusy] = React.useState(false);
  const [code, setCode] = React.useState("");
  const submit = async () => {
    if (!f.title.trim()) return;
    setBusy(true);
    try { await P.createEvent({ title: f.title.trim(), event_type: f.type, event_date: f.date || null, total_budget: f.budget, partner_a: f.a.trim() || null, partner_b: f.b.trim() || null }); onDone(); }
    catch { notify("Belum bisa membuat planner. Coba lagi sebentar."); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-3 rounded-xl p-4 ring-1 ring-foreground/10">
      <p className="font-semibold">Mulai planner acaramu</p>
      <p className="text-sm text-muted-foreground">Catat semua kebutuhan lamaran, pernikahan, atau acara lain: apa saja, berapa harganya, kapan dibutuhkan, dan sudah dibayar berapa.</p>
      <label className="block space-y-1 text-sm">Nama acara<Input aria-label="Nama acara" value={f.title} maxLength={80} placeholder="Contoh: Pernikahan Bayu & Intan" onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-xs">Jenis<select aria-label="Jenis acara" className={selectCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as typeof f.type })}><option value="nikah">Pernikahan</option><option value="lamaran">Lamaran</option><option value="lainnya">Lainnya</option></select></label>
        <label className="space-y-1 text-xs">Tanggal acara<Input type="date" aria-label="Tanggal acara" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
      </div>
      <label className="block space-y-1 text-sm">Total budget<MoneyInput value={f.budget} onChange={(n) => setF({ ...f, budget: n })} aria-label="Total budget" suffix="Rp" /></label>
      <div className="grid grid-cols-2 gap-2">
        <Input aria-label="Nama pihak pria" placeholder="Nama pihak pria" maxLength={60} value={f.a} onChange={(e) => setF({ ...f, a: e.target.value })} />
        <Input aria-label="Nama pihak wanita" placeholder="Nama pihak wanita" maxLength={60} value={f.b} onChange={(e) => setF({ ...f, b: e.target.value })} />
      </div>
      <Button className="w-full" disabled={!f.title.trim() || busy} onClick={submit}>{busy ? "Menyimpan..." : "Buat planner"}</Button>
      <div className="space-y-2 border-t pt-3">
        <p className="text-sm font-semibold">Pasanganmu sudah membuat planner?</p>
        <Input aria-label="Kode undangan" placeholder="Masukkan kode undangan (8 huruf)" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
        <Button variant="outline" className="w-full" disabled={code.length !== 8 || busy} onClick={async () => { setBusy(true); try { await P.joinPlanner(code); onDone(); } catch (e) { notify(P.shareErrorText(e)); } finally { setBusy(false); } }}>Gabung</Button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "bad" | "good" }) {
  return (<div className="rounded-lg p-3 ring-1 ring-foreground/10"><p className="text-xs text-muted-foreground">{label}</p><p className={`font-semibold ${tone === "bad" ? "text-red-600 dark:text-red-400" : tone === "good" ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{value}</p></div>);
}

function Ringkasan({ ev, d, today, onSaved, onDelete }: { ev: P.EventRow; d: P.PlannerData; today: string; onSaved: () => void; onDelete: () => void }) {
  const s = summarize(d.items, d.payments, ev.total_budget);
  const days = ev.event_date ? daysUntil(ev.event_date, today) : null;
  const save = monthlySaving(s.obligation, ev.event_date, today);
  const docs = todoProgress(d.todos.filter((t) => t.kind === "dokumen"));
  const vend = d.items.filter((i) => i.kind === "vendor"), ses = d.items.filter((i) => i.kind === "seserahan");
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const g = guestTotals(d.guests);
  const up = upcoming(d.items, d.todos, today, 30).slice(0, 6);
  const [edit, setEdit] = React.useState(false);
  const [f, setF] = React.useState({ title: ev.title, date: ev.event_date ?? "", budget: ev.total_budget });
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-primary/10 p-4">
        <p className="text-sm text-muted-foreground">{ev.title}</p>
        {days === null ? <p className="font-semibold">Tanggal acara belum diisi</p> : days > 0 ? <p className="text-2xl font-bold">{days} hari lagi</p> : days === 0 ? <p className="text-2xl font-bold">Hari ini!</p> : <p className="font-semibold">Acara sudah lewat {Math.abs(days)} hari</p>}
        {ev.event_date && <p className="text-xs text-muted-foreground">{ev.event_date}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Total budget" value={formatRupiah(ev.total_budget)} />
        <Stat label="Rencana belanja" value={formatRupiah(s.planned)} />
        <Stat label="Uang sudah keluar" value={formatRupiah(s.paid)} />
        <Stat label="Sisa yang harus dibayar" value={formatRupiah(s.obligation)} />
        <Stat label={s.budgetLeft >= 0 ? "Sisa budget" : "Melebihi budget"} value={formatRupiah(Math.abs(s.budgetLeft))} tone={s.overBudget ? "bad" : "good"} />
        <Stat label="Kas budget tersisa" value={formatRupiah(s.cashLeft)} />
      </div>
      {s.overBudget && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">Rencana belanja sudah melebihi budget. Kurangi item atau naikkan budget.</p>}
      {save !== null && <p className="rounded-lg bg-sky-500/10 p-3 text-sm text-sky-700 dark:text-sky-300">Agar sisa kewajiban {formatRupiah(s.obligation)} terkumpul sebelum acara, sisihkan sekitar {formatRupiah(save)} per bulan. Ini hitungan sederhana. <Link href="/tabungan" className="underline">Buat target di Tabungan</Link></p>}
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Vendor beres" value={`${vend.filter(isItemDone).length}/${vend.length} (${pct(vend.filter(isItemDone).length, vend.length)}%)`} />
        <Stat label="Seserahan siap" value={`${ses.filter(isItemDone).length}/${ses.length} (${pct(ses.filter(isItemDone).length, ses.length)}%)`} />
        <Stat label="Berkas lengkap" value={`${docs.done}/${docs.total} (${docs.pct}%)`} />
        <Stat label="Tamu" value={`${g.undangan} undangan, ${g.orang} orang`} />
      </div>
      <div>
        <p className="mb-1 text-sm font-semibold">Perlu diperhatikan (30 hari)</p>
        {up.length === 0 ? <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">Belum ada yang jatuh tempo dalam 30 hari.</p> : (
          <ul className="space-y-1">{up.map((u) => (<li key={u.kind + u.id} className={`flex justify-between rounded-lg p-2 text-sm ${u.overdue ? "bg-red-500/10" : "bg-muted"}`}><span>{u.title} <span className="text-xs text-muted-foreground">({u.kind})</span></span><span className="text-xs">{u.overdue ? `terlambat ${Math.abs(u.days)} hari` : u.days === 0 ? "hari ini" : `${u.days} hari lagi`}</span></li>))}</ul>
        )}
      </div>
      <Share ev={ev} />
      <GoalLink ev={ev} obligation={s.obligation} onSaved={onSaved} />
      {edit ? (
        <div className="space-y-2 rounded-xl p-3 ring-1 ring-foreground/10">
          <Input aria-label="Nama acara" value={f.title} maxLength={80} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <Input type="date" aria-label="Tanggal acara" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          <MoneyInput value={f.budget} onChange={(n) => setF({ ...f, budget: n })} aria-label="Total budget" suffix="Rp" />
          <div className="flex gap-2"><Button className="flex-1" disabled={!f.title.trim()} onClick={async () => { try { await P.updateEvent(ev.id, { title: f.title.trim(), event_date: f.date || null, total_budget: f.budget }); setEdit(false); onSaved(); notify("Tersimpan"); } catch { notify("Belum bisa disimpan. Coba lagi."); } }}>Simpan</Button><Button variant="outline" onClick={() => setEdit(false)}>Batal</Button></div>
        </div>
      ) : (<div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setEdit(true)}>Ubah nama, tanggal, budget</Button><Button variant="outline" aria-label="Hapus planner" onClick={onDelete}><Trash2 className="size-4" /></Button></div>)}
      <p className="text-xs text-muted-foreground">Daftar contoh berkas di tab Tugas hanya panduan umum. Syarat resmi nikah tanyakan ke KUA atau instansi setempat.</p>
    </div>
  );
}

function Belanja({ kind, ev, d, run, ask }: { kind: "vendor" | "seserahan"; ev: P.EventRow; d: P.PlannerData; run: Run; ask: Ask }) {
  const isV = kind === "vendor";
  const list = d.items.filter((i) => i.kind === kind);
  const statuses = isV ? (["tinjau", "booking", "lunas"] as const) : (["belum", "proses", "selesai"] as const);
  const [side, setSide] = React.useState<"semua" | Side>("semua");
  const [open, setOpen] = React.useState(false);
  const empty = { name: "", cost: 0, side: "umum" as Side, date: "", contact: "", note: "" };
  const [f, setF] = React.useState(empty);
  const shown = list.filter((i) => side === "semua" || i.side === side);
  const total = shown.reduce((s, i) => s + i.planned_cost, 0);
  const starter = isV ? STARTER_VENDORS : STARTER_SESERAHAN;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{shown.length} item, estimasi {formatRupiah(total)}</p><Button size="sm" onClick={() => setOpen(!open)}><Plus className="size-4" /> Tambah</Button></div>
      {!isV && <div className="flex gap-1">{(["semua", "pria", "wanita", "umum"] as const).map((x) => (<button key={x} onClick={() => setSide(x)} aria-pressed={side === x} className={`rounded-full px-3 py-1 text-xs ${side === x ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{x === "semua" ? "Semua" : SIDE_LABEL[x]}</button>))}</div>}
      {open && (
        <div className="space-y-2 rounded-xl p-3 ring-1 ring-foreground/10">
          <Input aria-label={isV ? "Nama vendor" : "Nama barang"} placeholder={isV ? "Nama vendor atau jasa" : "Nama barang"} maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <label className="block space-y-1 text-xs">Harga / biaya<MoneyInput value={f.cost} onChange={(n) => setF({ ...f, cost: n })} aria-label="Harga" suffix="Rp" /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs">Dibutuhkan tanggal<Input type="date" aria-label="Dibutuhkan tanggal" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
            <label className="space-y-1 text-xs">Pihak<select aria-label="Pihak" className={selectCls} value={f.side} onChange={(e) => setF({ ...f, side: e.target.value as Side })}>{(["umum", "pria", "wanita"] as const).map((x) => <option key={x} value={x}>{SIDE_LABEL[x]}</option>)}</select></label>
          </div>
          {isV && <Input aria-label="Kontak" placeholder="Kontak (nomor atau akun)" maxLength={120} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} />}
          <Input aria-label="Catatan" placeholder="Catatan (opsional)" maxLength={300} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <Button className="w-full" disabled={!f.name.trim()} onClick={() => run(async () => { await P.addItem({ event_id: ev.id, kind, name: f.name.trim(), planned_cost: f.cost, side: f.side, status: statuses[0], needed_date: f.date || null, contact: f.contact.trim() || null, note: f.note.trim() || null }); setF(empty); setOpen(false); }, "Ditambahkan")}>Simpan</Button>
        </div>
      )}
      {list.length === 0 && !open && (
        <div className="space-y-2 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          <p>{isV ? "Belum ada vendor." : "Belum ada seserahan."} Tekan Tambah, atau isi daftar contoh lalu ubah harganya.</p>
          <Button variant="outline" size="sm" onClick={() => run(() => P.addItems(starter.map((n) => ({ event_id: ev.id, kind, name: n, status: statuses[0] }))), "Daftar contoh ditambahkan")}>Isi daftar contoh</Button>
        </div>
      )}
      <ul className="space-y-2">
        {shown.map((i) => {
          const paid = paidFor(i.id, d.payments), pct = itemProgressPct(i, d.payments);
          const late = i.needed_date && !isItemDone(i) && daysUntil(i.needed_date, todayJakarta()) < 0;
          return (
            <li key={i.id} className="space-y-2 rounded-xl p-3 ring-1 ring-foreground/10">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="truncate font-medium">{i.name}</p><p className="text-xs text-muted-foreground">{SIDE_LABEL[i.side]}{i.needed_date ? ` · butuh ${i.needed_date}` : ""}{late ? " · terlambat" : ""}</p>{i.contact && <p className="text-xs text-muted-foreground">{i.contact}</p>}{i.note && <p className="text-xs text-muted-foreground">{i.note}</p>}</div>
                <p className="shrink-0 text-sm font-semibold">{formatRupiah(i.planned_cost)}</p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
              <p className="text-xs text-muted-foreground">Dibayar {formatRupiah(paid)} dari {formatRupiah(i.planned_cost)}</p>
              <div className="flex gap-2">
                <select aria-label={`Status ${i.name}`} className={selectCls} value={i.status} onChange={(e) => run(() => P.updateItem(i.id, { status: e.target.value as typeof i.status }))}>{statuses.map((x) => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}</select>
                <Button variant="outline" size="icon" aria-label={`Hapus ${i.name}`} onClick={async () => { if (await ask(`Hapus "${i.name}" beserta catatan pembayarannya?`, "Hapus")) void run(() => P.deleteItem(i.id), "Dihapus"); }}><Trash2 className="size-4" /></Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Bayar({ ev, d, run, ask, today }: { ev: P.EventRow; d: P.PlannerData; run: Run; ask: Ask; today: string }) {
  const [filter, setFilter] = React.useState<"semua" | "vendor" | "seserahan" | "umum">("semua");
  const [f, setF] = React.useState({ item: "", amount: 0, date: today, note: "" });
  const byId = new Map(d.items.map((i) => [i.id, i]));
  const shown = d.payments.filter((p) => filter === "semua" || (filter === "umum" ? !p.item_id : byId.get(p.item_id ?? "")?.kind === filter));
  const submit = () => run(async () => {
    const item = f.item ? byId.get(f.item) : undefined;
    await P.addPayment({ event_id: ev.id, item_id: f.item || null, amount: f.amount, paid_at: f.date || today, note: f.note.trim() || null });
    if (item && item.planned_cost > 0 && paidFor(item.id, d.payments) + f.amount >= item.planned_cost) await P.updateItem(item.id, { status: item.kind === "vendor" ? "lunas" : "selesai" });
    setF({ item: "", amount: 0, date: today, note: "" });
  }, "Pembayaran dicatat");
  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-xl p-3 ring-1 ring-foreground/10">
        <p className="text-sm font-semibold">Catat pembayaran</p>
        <select aria-label="Untuk item" className={selectCls} value={f.item} onChange={(e) => setF({ ...f, item: e.target.value })}><option value="">Umum (tanpa item)</option>{d.items.map((i) => <option key={i.id} value={i.id}>{i.kind === "vendor" ? "Vendor" : i.kind === "seserahan" ? "Seserahan" : "Lainnya"}: {i.name}</option>)}</select>
        <MoneyInput value={f.amount} onChange={(n) => setF({ ...f, amount: n })} aria-label="Jumlah dibayar" suffix="Rp" />
        <div className="grid grid-cols-2 gap-2"><Input type="date" aria-label="Tanggal bayar" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /><Input aria-label="Catatan pembayaran" placeholder="Catatan (DP, pelunasan)" maxLength={200} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        <Button className="w-full" disabled={f.amount <= 0} onClick={submit}>Simpan pembayaran</Button>
        <p className="text-xs text-muted-foreground">Ini hanya catatan di planner. Uang di dompetmu tidak berubah. Catat pengeluarannya juga di Transaksi bila perlu.</p>
      </div>
      <div className="flex gap-1">{(["semua", "vendor", "seserahan", "umum"] as const).map((x) => (<button key={x} onClick={() => setFilter(x)} aria-pressed={filter === x} className={`rounded-full px-3 py-1 text-xs ${filter === x ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{x[0].toUpperCase() + x.slice(1)}</button>))}</div>
      {shown.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Belum ada riwayat pembayaran.</p> : (
        <ul className="space-y-2">{shown.map((p) => (<li key={p.id} className="flex items-center justify-between gap-2 rounded-lg p-3 ring-1 ring-foreground/10"><div className="min-w-0"><p className="truncate text-sm font-medium">{p.item_id ? byId.get(p.item_id)?.name ?? "Item" : "Umum"}</p><p className="text-xs text-muted-foreground">{p.paid_at}{p.note ? ` · ${p.note}` : ""}</p></div><div className="flex items-center gap-2"><span className="text-sm font-semibold">{formatRupiah(p.amount)}</span><Button variant="ghost" size="icon" aria-label="Hapus pembayaran" onClick={async () => { if (await ask("Hapus catatan pembayaran ini?", "Hapus")) void run(() => P.deletePayment(p.id), "Dihapus"); }}><Trash2 className="size-4" /></Button></div></li>))}</ul>
      )}
    </div>
  );
}

function Tamu({ ev, d, run, ask }: { ev: P.EventRow; d: P.PlannerData; run: Run; ask: Ask }) {
  const [side, setSide] = React.useState<"semua" | Side>("semua");
  const [f, setF] = React.useState({ name: "", category: "", side: "umum" as Side, pax: "1", address: "" });
  const shown = d.guests.filter((g) => side === "semua" || g.side === side);
  const t = guestTotals(shown);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2 text-center text-xs"><Stat label="Orang" value={String(t.orang)} /><Stat label="Hadir" value={String(t.hadir)} /><Stat label="Tidak" value={String(t.tidak)} /><Stat label="Belum" value={String(t.belum)} /></div>
      <div className="flex gap-1">{(["semua", "pria", "wanita", "umum"] as const).map((x) => (<button key={x} onClick={() => setSide(x)} aria-pressed={side === x} className={`rounded-full px-3 py-1 text-xs ${side === x ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{x === "semua" ? "Semua" : SIDE_LABEL[x]}</button>))}</div>
      <div className="space-y-2 rounded-xl p-3 ring-1 ring-foreground/10">
        <Input aria-label="Nama tamu" placeholder="Nama tamu" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="grid grid-cols-3 gap-2"><Input aria-label="Kategori" placeholder="Kategori" maxLength={40} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /><Input aria-label="Jumlah orang" inputMode="numeric" placeholder="Jml" value={f.pax} onChange={(e) => setF({ ...f, pax: e.target.value.replace(/\D/g, "").slice(0, 2) })} /><select aria-label="Pihak tamu" className={selectCls} value={f.side} onChange={(e) => setF({ ...f, side: e.target.value as Side })}>{(["umum", "pria", "wanita"] as const).map((x) => <option key={x} value={x}>{SIDE_LABEL[x]}</option>)}</select></div>
        <Input aria-label="Alamat tamu" placeholder="Alamat (opsional)" maxLength={200} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        <Button className="w-full" disabled={!f.name.trim()} onClick={() => run(async () => { await P.addGuest({ event_id: ev.id, name: f.name.trim(), category: f.category.trim() || null, side: f.side, pax: Math.min(Math.max(Number(f.pax) || 1, 1), 50), address: f.address.trim() || null }); setF({ ...f, name: "", address: "", pax: "1" }); }, "Tamu ditambahkan")}>Tambah tamu</Button>
      </div>
      {shown.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Belum ada tamu.</p> : (
        <ul className="space-y-2">{shown.map((g) => (<li key={g.id} className="space-y-1 rounded-lg p-3 ring-1 ring-foreground/10"><div className="flex items-start justify-between"><div className="min-w-0"><p className="truncate font-medium">{g.name} <span className="text-xs text-muted-foreground">({g.pax} orang)</span></p><p className="text-xs text-muted-foreground">{[g.category, SIDE_LABEL[g.side], g.address].filter(Boolean).join(" · ")}</p></div><div className="flex"><Button variant="ghost" size="sm" aria-label={`Salin undangan ${g.name}`} onClick={() => { void navigator.clipboard?.writeText(`Halo ${g.name}, kami mengundangmu ke ${ev.title}${ev.event_date ? ` pada ${ev.event_date}` : ""}. Mohon konfirmasi kehadiran ya. Terima kasih.`); notify("Teks undangan disalin"); }}>Salin undangan</Button><Button variant="ghost" size="icon" aria-label={`Hapus ${g.name}`} onClick={async () => { if (await ask(`Hapus tamu "${g.name}"?`, "Hapus")) void run(() => P.deleteGuest(g.id)); }}><Trash2 className="size-4" /></Button></div></div>
          <select aria-label={`Kehadiran ${g.name}`} className={selectCls} value={g.attendance} onChange={(e) => run(() => P.updateGuest(g.id, { attendance: e.target.value as typeof g.attendance }))}><option value="belum">Belum konfirmasi</option><option value="hadir">Hadir</option><option value="tidak">Tidak hadir</option></select></li>))}</ul>
      )}
    </div>
  );
}

function Tugas({ ev, d, run, ask, today }: { ev: P.EventRow; d: P.PlannerData; run: Run; ask: Ask; today: string }) {
  const [kind, setKind] = React.useState<"dokumen" | "jadwal">("dokumen");
  const [f, setF] = React.useState({ title: "", date: "", side: "umum" as Side });
  const list = d.todos.filter((t) => t.kind === kind);
  const pr = todoProgress(list);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">{(["dokumen", "jadwal"] as const).map((k) => (<button key={k} aria-pressed={kind === k} onClick={() => setKind(k)} className={`rounded-lg py-2 text-xs font-medium ${kind === k ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{k === "dokumen" ? "Dokumen & berkas" : "Jadwal penting"}</button>))}</div>
      <p className="text-sm text-muted-foreground">{pr.done} dari {pr.total} beres ({pr.pct}%)</p>
      <div className="space-y-2 rounded-xl p-3 ring-1 ring-foreground/10">
        <Input aria-label={kind === "dokumen" ? "Nama dokumen" : "Nama kegiatan"} placeholder={kind === "dokumen" ? "Nama dokumen" : "Nama kegiatan (fitting, survei, dll)"} maxLength={100} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <div className="grid grid-cols-2 gap-2"><Input type="date" aria-label="Batas tanggal" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /><select aria-label="Pihak tugas" className={selectCls} value={f.side} onChange={(e) => setF({ ...f, side: e.target.value as Side })}>{(["umum", "pria", "wanita"] as const).map((x) => <option key={x} value={x}>{SIDE_LABEL[x]}</option>)}</select></div>
        <Button className="w-full" disabled={!f.title.trim()} onClick={() => run(async () => { await P.addTodo({ event_id: ev.id, kind, title: f.title.trim(), side: f.side, due_date: f.date || null }); setF({ title: "", date: "", side: "umum" }); }, "Ditambahkan")}>Tambah</Button>
      </div>
      {list.length === 0 && (<div className="space-y-2 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground"><p>Belum ada {kind === "dokumen" ? "dokumen" : "jadwal"}.</p>{kind === "dokumen" && <Button variant="outline" size="sm" onClick={() => run(() => P.addTodos(STARTER_DOCS.map((x) => ({ event_id: ev.id, kind: "dokumen" as const, title: x.title, side: x.side }))), "Daftar contoh ditambahkan")}>Isi daftar contoh berkas</Button>}</div>)}
      <ul className="space-y-2">{list.map((t) => {
        const late = t.due_date && !t.done && daysUntil(t.due_date, today) < 0;
        return (<li key={t.id} className="flex items-center gap-2 rounded-lg p-3 ring-1 ring-foreground/10"><button role="checkbox" aria-checked={t.done} aria-label={`Tandai ${t.title}`} onClick={() => run(() => P.updateTodo(t.id, { done: !t.done }))} className={`flex size-6 shrink-0 items-center justify-center rounded-md border ${t.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-input"}`}>{t.done && <Check className="size-4" />}</button>
          <div className="min-w-0 flex-1"><p className={`truncate text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.title}</p><p className="text-xs text-muted-foreground">{SIDE_LABEL[t.side]}{t.due_date ? ` · ${t.due_date}` : ""}{late ? " · terlambat" : ""}</p></div>
          <Button variant="ghost" size="icon" aria-label={`Hapus ${t.title}`} onClick={async () => { if (await ask(`Hapus "${t.title}"?`, "Hapus")) void run(() => P.deleteTodo(t.id)); }}><Trash2 className="size-4" /></Button></li>);
      })}</ul>
    </div>
  );
}

function Share({ ev }: { ev: P.EventRow }) {
  const [code, setCode] = React.useState<string | null>(ev.invite_code ?? null);
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="space-y-2 rounded-xl p-3 ring-1 ring-foreground/10">
      <p className="text-sm font-semibold">Bagikan ke pasangan</p>
      <p className="text-xs text-muted-foreground">Pasanganmu bisa melihat dan mengisi planner yang sama dengan kode undangan. Hanya kamu sebagai pemilik yang bisa menghapus planner.</p>
      {code ? (
        <div className="flex items-center justify-between rounded-lg bg-muted p-3"><span className="font-mono text-lg tracking-widest" aria-label="Kode undangan planner">{code}</span>
          <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => { void navigator.clipboard?.writeText(code); notify("Kode disalin"); }}>Salin</Button>
            <Button size="sm" variant="outline" onClick={async () => { try { await P.resetInvite(ev.id); setCode(null); notify("Kode lama dimatikan"); } catch (e) { notify(P.shareErrorText(e)); } }}>Matikan</Button></div></div>
      ) : (
        <Button variant="outline" className="w-full" disabled={busy} onClick={async () => { setBusy(true); try { setCode(await P.createInvite(ev.id)); } catch (e) { notify(P.shareErrorText(e)); } finally { setBusy(false); } }}>Buat kode undangan</Button>
      )}
    </div>
  );
}

function GoalLink({ ev, obligation, onSaved }: { ev: P.EventRow; obligation: number; onSaved: () => void }) {
  const [goals, setGoals] = React.useState<GoalProgress[] | null>(null);
  React.useEffect(() => { getSavingsGoals().then(setGoals).catch(() => setGoals([])); }, []);
  const g = goals?.find((x) => x.id === ev.goal_id);
  return (
    <div className="space-y-2 rounded-xl p-3 ring-1 ring-foreground/10">
      <p className="text-sm font-semibold">Tautkan ke target Tabungan</p>
      {goals && goals.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada target Tabungan. <Link href="/tabungan" className="underline">Buat target</Link> lalu tautkan di sini.</p> : (
        <select aria-label="Target Tabungan" className={selectCls} value={ev.goal_id ?? ""} onChange={async (e) => { try { await P.updateEvent(ev.id, { goal_id: e.target.value || null }); onSaved(); } catch { notify("Belum bisa disimpan. Coba lagi."); } }}>
          <option value="">Belum ditautkan</option>{goals?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      )}
      {g && (
        <div className="space-y-1 text-sm">
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, Math.round(Number(g.percent ?? 0)))}%` }} /></div>
          <p className="text-xs text-muted-foreground">Terkumpul {formatRupiah(Number(g.saved ?? 0))} dari target {formatRupiah(Number(g.target_amount))}.</p>
          {obligation > 0 && <p className="text-xs">{Number(g.saved ?? 0) >= obligation ? "Tabunganmu sudah cukup menutup sisa kewajiban planner." : `Kurang ${formatRupiah(obligation - Number(g.saved ?? 0))} untuk menutup sisa kewajiban planner.`}</p>}
        </div>
      )}
    </div>
  );
}
