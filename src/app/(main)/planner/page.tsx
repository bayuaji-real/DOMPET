"use client";

import * as React from "react";
import { PageHero } from "@/components/ui/form-kit";
import Link from "next/link";
import { Trash2, Plus, Check } from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/konsultan/money-input";
import { useConfirm } from "@/components/ui/use-confirm";
import { notify } from "@/lib/notify";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { todayJakarta } from "@/lib/data/sample-mode";
import * as P from "@/lib/data/planner";
import { getSavingsGoals, type GoalProgress } from "@/lib/data/goals";
import {
  summarize, paidFor, itemProgressPct, daysUntil, upcoming, monthlySaving, guestTotals, todoProgress,
  STARTER_DOCS, STARTER_VENDORS, STARTER_SESERAHAN, isItemDone, type Side,
} from "@/lib/planner/planner-calc";
import { Select } from "@/components/ui/select";
import { FormCard, IconBox, Field, SectionLabel, Cta, Segmented, chipCls, type Tone } from "@/components/ui/form-kit";

type Tab = "ringkasan" | "vendor" | "seserahan" | "bayar" | "tamu" | "tugas";
const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "ringkasan", label: "Ringkasan", emoji: "💍" }, { id: "vendor", label: "Vendor", emoji: "🏪" }, { id: "seserahan", label: "Seserahan", emoji: "🎁" },
  { id: "bayar", label: "Bayar", emoji: "💸" }, { id: "tamu", label: "Tamu", emoji: "👨‍👩‍👧" }, { id: "tugas", label: "Tugas", emoji: "✅" },
];
const SIDE_LABEL: Record<Side, string> = { umum: "Bersama", pria: "Pihak pria", wanita: "Pihak wanita" };
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
        <PageHero title="Planner Acara" desc="Lamaran, nikah, dan acara: vendor, tamu, dan budget." />
        {err && <p role="alert" className="rounded-2xl bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{err}</p>}
        {!events && !err && <div className="h-32 animate-pulse rounded-3xl bg-muted" aria-busy="true" />}
        {events && !ev && <NewEvent onDone={loadEvents} />}
        {ev && (
          <>
            <div role="tablist" aria-label="Bagian planner" className="grid grid-cols-6 gap-1 rounded-2xl bg-muted p-1">
              {TABS.map((t) => (<button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-bold transition-all active:scale-95 ${tab === t.id ? "border border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold" : "text-muted-foreground hover:text-foreground"}`}><span className="text-sm leading-none" aria-hidden>{t.emoji}</span>{t.label}</button>))}
            </div>
            {!data ? <div className="h-32 animate-pulse rounded-3xl bg-muted" aria-busy="true" /> : (
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
    <div className="space-y-4">
      <FormCard title="Mulai planner acaramu" desc="Catat kebutuhan, harga, dan pembayaran acaramu." icon="💍">
        <Field label="Nama acara"><Input aria-label="Nama acara" value={f.title} maxLength={80} placeholder="Contoh: Nikah cuy" onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Jenis acara">
          <Segmented label="Jenis acara" value={f.type} onChange={(v) => setF({ ...f, type: v })} options={[{ value: "nikah", label: "💒 Nikah", tone: "rose" }, { value: "lamaran", label: "💐 Lamaran", tone: "violet" }, { value: "lainnya", label: "🎉 Lainnya", tone: "amber" }]} />
        </Field>
        <Field label="Tanggal acara"><Input type="date" aria-label="Tanggal acara" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Total budget"><MoneyInput value={f.budget} onChange={(n) => setF({ ...f, budget: n })} aria-label="Total budget" suffix="Rp" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Pihak pria"><Input aria-label="Nama pihak pria" placeholder="Nama" maxLength={60} value={f.a} onChange={(e) => setF({ ...f, a: e.target.value })} /></Field>
          <Field label="Pihak wanita"><Input aria-label="Nama pihak wanita" placeholder="Nama" maxLength={60} value={f.b} onChange={(e) => setF({ ...f, b: e.target.value })} /></Field>
        </div>
        <Cta disabled={!f.title.trim() || busy} onClick={submit}>{busy ? "Menyimpan..." : "💍 Buat planner"}</Cta>
      </FormCard>
      <FormCard title="Pasanganmu sudah buat planner?" desc="Masukkan kode undangan 8 huruf dari pasanganmu." icon="💌">
        <Input aria-label="Kode undangan" placeholder="Kode undangan" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
        <Cta disabled={code.length !== 8 || busy} onClick={async () => { setBusy(true); try { await P.joinPlanner(code); onDone(); } catch (e) { notify(P.shareErrorText(e)); } finally { setBusy(false); } }} className="bg-indigo-600 hover:bg-indigo-700">🤝 Gabung</Cta>
      </FormCard>
    </div>
  );
}

function Stat({ label, value, tone, emoji, color = "teal" }: { label: string; value: string; tone?: "bad" | "good"; emoji?: string; color?: Tone }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
      {emoji && <IconBox tone={color}>{emoji}</IconBox>}
      <div className="min-w-0"><p className="truncate text-[11px] text-muted-foreground">{label}</p><p className={`truncate text-sm font-extrabold ${tone === "bad" ? "text-rose-600 dark:text-rose-400" : tone === "good" ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{value}</p></div>
    </div>
  );
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 p-5 text-white shadow-lg shadow-teal-700/25">
        <span aria-hidden className="absolute -right-2 -top-3 text-7xl opacity-20">💍</span>
        <p className="text-xs font-semibold text-white/90">{ev.title}</p>
        {days === null ? <p className="mt-1 text-base font-extrabold">Tanggal acara belum diisi</p> : days > 0 ? <p className="mt-1 text-3xl font-extrabold">{days} hari lagi</p> : days === 0 ? <p className="mt-1 text-3xl font-extrabold">Hari ini! 🎉</p> : <p className="mt-1 text-base font-extrabold">Acara sudah lewat {Math.abs(days)} hari</p>}
        {ev.event_date && <p className="text-xs text-white/90">{formatTanggal(ev.event_date + "T00:00:00+07:00")}</p>}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-[10px] font-semibold text-white/90"><span>Budget terpakai</span><span>{ev.total_budget > 0 ? Math.min(100, Math.round((s.planned / ev.total_budget) * 100)) : 0}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-white/15"><div className={`h-full rounded-full ${s.overBudget ? "bg-rose-400" : "bg-emerald-400"}`} style={{ width: `${ev.total_budget > 0 ? Math.min(100, Math.round((s.planned / ev.total_budget) * 100)) : 0}%` }} /></div>
        </div>
      </div>
      <SectionLabel>Keuangan</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <Stat emoji="💰" color="teal" label="Total budget" value={formatRupiah(ev.total_budget)} />
        <Stat emoji="🧾" color="indigo" label="Rencana belanja" value={formatRupiah(s.planned)} />
        <Stat emoji="💸" color="rose" label="Uang sudah keluar" value={formatRupiah(s.paid)} />
        <Stat emoji="⏳" color="amber" label="Sisa yang harus dibayar" value={formatRupiah(s.obligation)} />
        <Stat emoji={s.budgetLeft >= 0 ? "🟢" : "🔴"} color={s.budgetLeft >= 0 ? "emerald" : "rose"} label={s.budgetLeft >= 0 ? "Sisa budget" : "Melebihi budget"} value={formatRupiah(Math.abs(s.budgetLeft))} tone={s.overBudget ? "bad" : "good"} />
        <Stat emoji="👛" color="sky" label="Kas budget tersisa" value={formatRupiah(s.cashLeft)} />
      </div>
      {s.overBudget && <p role="alert" className="rounded-2xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300">⚠️ Rencana belanja sudah melebihi budget. Kurangi item atau naikkan budget.</p>}
      {save !== null && <p className="rounded-2xl bg-sky-500/10 p-3 text-xs text-sky-700 dark:text-sky-300">💡 Agar sisa kewajiban {formatRupiah(s.obligation)} terkumpul sebelum acara, sisihkan sekitar {formatRupiah(save)} per bulan. Ini hitungan sederhana. <Link href="/tabungan" className="underline">Buat target di Tabungan</Link></p>}
      <SectionLabel>Persiapan</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <Stat emoji="🏪" color="violet" label="Vendor beres" value={`${vend.filter(isItemDone).length}/${vend.length} (${pct(vend.filter(isItemDone).length, vend.length)}%)`} />
        <Stat emoji="🎁" color="rose" label="Seserahan siap" value={`${ses.filter(isItemDone).length}/${ses.length} (${pct(ses.filter(isItemDone).length, ses.length)}%)`} />
        <Stat emoji="📄" color="sky" label="Berkas lengkap" value={`${docs.done}/${docs.total} (${docs.pct}%)`} />
        <Stat emoji="👨‍👩‍👧" color="amber" label="Tamu" value={`${g.undangan} undangan, ${g.orang} orang`} />
      </div>
      <div className="space-y-1.5">
        <SectionLabel>Perlu diperhatikan (30 hari)</SectionLabel>
        {up.length === 0 ? <p className="rounded-2xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">🎉 Belum ada yang jatuh tempo dalam 30 hari.</p> : (
          <ul className="space-y-1">{up.map((u) => (<li key={u.kind + u.id} className={`flex items-center justify-between gap-2 rounded-2xl border p-3 text-sm font-semibold ${u.overdue ? "border-rose-500/30 bg-rose-500/10" : "border-border/60 bg-muted/40"}`}><span>{u.title} <span className="text-xs text-muted-foreground">({u.kind})</span></span><span className="text-xs">{u.overdue ? `terlambat ${Math.abs(u.days)} hari` : u.days === 0 ? "hari ini" : `${u.days} hari lagi`}</span></li>))}</ul>
        )}
      </div>
      <Share ev={ev} />
      <GoalLink ev={ev} obligation={s.obligation} onSaved={onSaved} />
      {edit ? (
        <FormCard title="Ubah acara" desc="Nama, tanggal, dan total budget." icon="✏️">
          <Field label="Nama acara"><Input aria-label="Nama acara" value={f.title} maxLength={80} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Tanggal acara"><Input type="date" aria-label="Tanggal acara" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Total budget"><MoneyInput value={f.budget} onChange={(n) => setF({ ...f, budget: n })} aria-label="Total budget" suffix="Rp" /></Field>
          <div className="flex gap-2"><Button className="h-10 flex-1 rounded-2xl bg-teal-600 text-xs font-bold text-white hover:bg-teal-700" disabled={!f.title.trim()} onClick={async () => { try { await P.updateEvent(ev.id, { title: f.title.trim(), event_date: f.date || null, total_budget: f.budget }); setEdit(false); onSaved(); notify("Tersimpan"); } catch { notify("Belum bisa disimpan. Coba lagi."); } }}>Simpan</Button><Button variant="outline" className="h-10 rounded-2xl text-xs font-bold" onClick={() => setEdit(false)}>Batal</Button></div>
        </FormCard>
      ) : (<div className="flex gap-2"><Button variant="outline" className="h-10 flex-1 rounded-2xl text-xs font-bold" onClick={() => setEdit(true)}>✏️ Ubah nama, tanggal, budget</Button><Button variant="outline" className="h-10 rounded-2xl text-rose-600" aria-label="Hapus planner" onClick={onDelete}><Trash2 className="size-4" /></Button></div>)}
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
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card p-3 shadow-xs"><div className="flex items-center gap-2.5"><IconBox tone={isV ? "violet" : "rose"}>{isV ? "🏪" : "🎁"}</IconBox><div><p className="text-xs font-extrabold">{shown.length} {isV ? "vendor" : "seserahan"}</p><p className="text-[11px] text-muted-foreground">Estimasi {formatRupiah(total)}</p></div></div><Button size="sm" className="h-9 cursor-pointer rounded-2xl bg-teal-600 px-3 text-xs font-bold text-white hover:bg-teal-700" onClick={() => setOpen(!open)}><Plus className="size-4" /> Tambah</Button></div>
      {!isV && <div className="flex flex-wrap gap-1.5">{(["semua", "pria", "wanita", "umum"] as const).map((x) => (<button key={x} onClick={() => setSide(x)} aria-pressed={side === x} className={chipCls(side === x)}>{x === "semua" ? "Semua" : SIDE_LABEL[x]}</button>))}</div>}
      {open && (
        <FormCard title={isV ? "Tambah vendor" : "Tambah seserahan"} desc={isV ? "Katering, dekor, foto, dan lainnya." : "Barang yang akan diserahkan."} icon={isV ? "🏪" : "🎁"}>
          <Input aria-label={isV ? "Nama vendor" : "Nama barang"} placeholder={isV ? "Nama vendor atau jasa" : "Nama barang"} maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Field label="Harga / biaya"><MoneyInput value={f.cost} onChange={(n) => setF({ ...f, cost: n })} aria-label="Harga" suffix="Rp" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Dibutuhkan tanggal"><Input type="date" aria-label="Dibutuhkan tanggal" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Pihak"><Select aria-label="Pihak" value={f.side} onChange={(e) => setF({ ...f, side: e.target.value as Side })}>{(["umum", "pria", "wanita"] as const).map((x) => <option key={x} value={x}>{SIDE_LABEL[x]}</option>)}</Select></Field>
          </div>
          {isV && <Input aria-label="Kontak" placeholder="Kontak (nomor atau akun)" maxLength={120} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} />}
          <Input aria-label="Catatan" placeholder="Catatan (opsional)" maxLength={300} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <Cta disabled={!f.name.trim()} onClick={() => run(async () => { await P.addItem({ event_id: ev.id, kind, name: f.name.trim(), planned_cost: f.cost, side: f.side, status: statuses[0], needed_date: f.date || null, contact: f.contact.trim() || null, note: f.note.trim() || null }); setF(empty); setOpen(false); }, "Ditambahkan")}>Simpan</Cta>
        </FormCard>
      )}
      {list.length === 0 && !open && (
        <div className="space-y-2 rounded-3xl border border-dashed border-border/70 p-5 text-center text-xs text-muted-foreground">
          <p className="text-3xl">{isV ? "🏪" : "🎁"}</p>
          <p>{isV ? "Belum ada vendor." : "Belum ada seserahan."} Tekan Tambah, atau isi daftar contoh lalu ubah harganya.</p>
          <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold" onClick={() => run(() => P.addItems(starter.map((n) => ({ event_id: ev.id, kind, name: n, status: statuses[0] }))), "Daftar contoh ditambahkan")}>Isi daftar contoh</Button>
        </div>
      )}
      <ul className="space-y-2">
        {shown.map((i) => {
          const paid = paidFor(i.id, d.payments), pct = itemProgressPct(i, d.payments);
          const late = i.needed_date && !isItemDone(i) && daysUntil(i.needed_date, todayJakarta()) < 0;
          return (
            <li key={i.id} className="space-y-2.5 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="truncate text-sm font-extrabold">{i.name}</p><p className="text-xs text-muted-foreground">{SIDE_LABEL[i.side]}{i.needed_date ? ` · butuh ${i.needed_date}` : ""}{late ? " · terlambat" : ""}</p>{i.contact && <p className="text-xs text-muted-foreground">{i.contact}</p>}{i.note && <p className="text-xs text-muted-foreground">{i.note}</p>}</div>
                <p className="shrink-0 text-sm font-extrabold text-teal-700 dark:text-teal-300">{formatRupiah(i.planned_cost)}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400" style={{ width: `${pct}%` }} /></div>
              <p className="text-[11px] text-muted-foreground">Dibayar {formatRupiah(paid)} dari {formatRupiah(i.planned_cost)}</p>
              <div className="flex gap-2">
                <Select aria-label={`Status ${i.name}`} value={i.status} onChange={(e) => run(() => P.updateItem(i.id, { status: e.target.value as typeof i.status }))}>{statuses.map((x) => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}</Select>
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl text-rose-600" aria-label={`Hapus ${i.name}`} onClick={async () => { if (await ask(`Hapus "${i.name}" beserta catatan pembayarannya?`, "Hapus")) void run(() => P.deleteItem(i.id), "Dihapus"); }}><Trash2 className="size-4" /></Button>
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
      <FormCard title="Catat pembayaran" desc="DP, cicilan, atau pelunasan." icon="💸">
        <Select aria-label="Untuk item" value={f.item} onChange={(e) => setF({ ...f, item: e.target.value })}><option value="">Umum (tanpa item)</option>{d.items.map((i) => <option key={i.id} value={i.id}>{i.kind === "vendor" ? "Vendor" : i.kind === "seserahan" ? "Seserahan" : "Lainnya"}: {i.name}</option>)}</Select>
        <MoneyInput value={f.amount} onChange={(n) => setF({ ...f, amount: n })} aria-label="Jumlah dibayar" suffix="Rp" />
        <div className="grid grid-cols-2 gap-2"><Input type="date" aria-label="Tanggal bayar" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /><Input aria-label="Catatan pembayaran" placeholder="Catatan (DP, pelunasan)" maxLength={200} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        <Cta disabled={f.amount <= 0} onClick={submit}>Simpan pembayaran</Cta>
        <p className="text-[11px] text-muted-foreground">Ini hanya catatan di planner. Uang di dompetmu tidak berubah. Catat pengeluarannya juga di Transaksi bila perlu.</p>
      </FormCard>
      <div className="flex flex-wrap gap-1.5">{(["semua", "vendor", "seserahan", "umum"] as const).map((x) => (<button key={x} onClick={() => setFilter(x)} aria-pressed={filter === x} className={chipCls(filter === x)}>{x[0].toUpperCase() + x.slice(1)}</button>))}</div>
      {shown.length === 0 ? <p className="rounded-3xl border border-dashed border-border/70 p-5 text-center text-xs text-muted-foreground"><span className="block text-3xl">💸</span>Belum ada riwayat pembayaran.</p> : (
        <ul className="space-y-2">{shown.map((p) => (<li key={p.id} className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card p-3 shadow-xs"><IconBox tone="emerald">💸</IconBox><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{p.item_id ? byId.get(p.item_id)?.name ?? "Item" : "Umum"}</p><p className="text-[11px] text-muted-foreground">{formatTanggal(p.paid_at + "T00:00:00+07:00")}{p.note ? ` · ${p.note}` : ""}</p></div><div className="flex items-center gap-2"><span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{formatRupiah(p.amount)}</span><Button variant="ghost" size="icon" aria-label="Hapus pembayaran" onClick={async () => { if (await ask("Hapus catatan pembayaran ini?", "Hapus")) void run(() => P.deletePayment(p.id), "Dihapus"); }}><Trash2 className="size-4" /></Button></div></li>))}</ul>
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
      <div className="grid grid-cols-4 gap-2 text-center"><TamuStat emoji="👥" label="Orang" n={t.orang} cls="bg-sky-500/10 text-sky-700 dark:text-sky-300" /><TamuStat emoji="✅" label="Hadir" n={t.hadir} cls="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" /><TamuStat emoji="❌" label="Tidak" n={t.tidak} cls="bg-rose-500/10 text-rose-700 dark:text-rose-300" /><TamuStat emoji="⏳" label="Belum" n={t.belum} cls="bg-amber-500/10 text-amber-700 dark:text-amber-300" /></div>
      <div className="flex flex-wrap gap-1.5">{(["semua", "pria", "wanita", "umum"] as const).map((x) => (<button key={x} onClick={() => setSide(x)} aria-pressed={side === x} className={chipCls(side === x)}>{x === "semua" ? "Semua" : SIDE_LABEL[x]}</button>))}</div>
      <FormCard title="Tambah tamu" desc="Nama, kategori, dan jumlah orang." icon="👨‍👩‍👧">
        <Input aria-label="Nama tamu" placeholder="Nama tamu" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="grid grid-cols-3 gap-2"><Input aria-label="Kategori" placeholder="Kategori" maxLength={40} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /><Input aria-label="Jumlah orang" inputMode="numeric" placeholder="Jml" value={f.pax} onChange={(e) => setF({ ...f, pax: e.target.value.replace(/\D/g, "").slice(0, 2) })} /><Select aria-label="Pihak tamu" value={f.side} onChange={(e) => setF({ ...f, side: e.target.value as Side })}>{(["umum", "pria", "wanita"] as const).map((x) => <option key={x} value={x}>{SIDE_LABEL[x]}</option>)}</Select></div>
        <Input aria-label="Alamat tamu" placeholder="Alamat (opsional)" maxLength={200} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        <Cta disabled={!f.name.trim()} onClick={() => run(async () => { await P.addGuest({ event_id: ev.id, name: f.name.trim(), category: f.category.trim() || null, side: f.side, pax: Math.min(Math.max(Number(f.pax) || 1, 1), 50), address: f.address.trim() || null }); setF({ ...f, name: "", address: "", pax: "1" }); }, "Tamu ditambahkan")}>Tambah tamu</Cta>
      </FormCard>
      {shown.length === 0 ? <p className="rounded-3xl border border-dashed border-border/70 p-5 text-center text-xs text-muted-foreground"><span className="block text-3xl">👨‍👩‍👧</span>Belum ada tamu.</p> : (
        <ul className="space-y-2">{shown.map((g) => (<li key={g.id} className="space-y-2 rounded-2xl border border-border/70 bg-card p-3 shadow-xs"><div className="flex items-start justify-between"><div className="min-w-0"><p className="truncate text-sm font-extrabold">{g.name} <span className="text-xs text-muted-foreground">({g.pax} orang)</span></p><p className="text-xs text-muted-foreground">{[g.category, SIDE_LABEL[g.side], g.address].filter(Boolean).join(" · ")}</p></div><div className="flex"><Button variant="ghost" size="sm" aria-label={`Salin undangan ${g.name}`} onClick={() => { void navigator.clipboard?.writeText(`Halo ${g.name}, kami mengundangmu ke ${ev.title}${ev.event_date ? ` pada ${ev.event_date}` : ""}. Mohon konfirmasi kehadiran ya. Terima kasih.`); notify("Teks undangan disalin"); }}>Salin undangan</Button><Button variant="ghost" size="icon" aria-label={`Hapus ${g.name}`} onClick={async () => { if (await ask(`Hapus tamu "${g.name}"?`, "Hapus")) void run(() => P.deleteGuest(g.id)); }}><Trash2 className="size-4" /></Button></div></div>
          <Select aria-label={`Kehadiran ${g.name}`} value={g.attendance} onChange={(e) => run(() => P.updateGuest(g.id, { attendance: e.target.value as typeof g.attendance }))}><option value="belum">Belum konfirmasi</option><option value="hadir">Hadir</option><option value="tidak">Tidak hadir</option></Select></li>))}</ul>
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
      <Segmented label="Jenis tugas" value={kind} onChange={setKind} options={[{ value: "dokumen", label: "📄 Dokumen & berkas", tone: "sky" }, { value: "jadwal", label: "📅 Jadwal penting", tone: "violet" }]} />
      <div className="space-y-1"><div className="flex justify-between text-[11px] font-semibold text-muted-foreground"><span>{pr.done} dari {pr.total} beres</span><span>{pr.pct}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400" style={{ width: `${pr.pct}%` }} /></div></div>
      <FormCard title={kind === "dokumen" ? "Tambah dokumen" : "Tambah jadwal"} desc={kind === "dokumen" ? "Berkas yang perlu disiapkan." : "Fitting, survei, dan kegiatan lain."} icon={kind === "dokumen" ? "📄" : "📅"}>
        <Input aria-label={kind === "dokumen" ? "Nama dokumen" : "Nama kegiatan"} placeholder={kind === "dokumen" ? "Nama dokumen" : "Nama kegiatan (fitting, survei, dll)"} maxLength={100} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <div className="grid grid-cols-2 gap-2"><Input type="date" aria-label="Batas tanggal" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /><Select aria-label="Pihak tugas" value={f.side} onChange={(e) => setF({ ...f, side: e.target.value as Side })}>{(["umum", "pria", "wanita"] as const).map((x) => <option key={x} value={x}>{SIDE_LABEL[x]}</option>)}</Select></div>
        <Cta disabled={!f.title.trim()} onClick={() => run(async () => { await P.addTodo({ event_id: ev.id, kind, title: f.title.trim(), side: f.side, due_date: f.date || null }); setF({ title: "", date: "", side: "umum" }); }, "Ditambahkan")}>Tambah</Cta>
      </FormCard>
      {list.length === 0 && (<div className="space-y-2 rounded-3xl border border-dashed border-border/70 p-5 text-center text-xs text-muted-foreground"><p className="text-3xl">{kind === "dokumen" ? "📄" : "📅"}</p><p>Belum ada {kind === "dokumen" ? "dokumen" : "jadwal"}.</p>{kind === "dokumen" && <Button variant="outline" size="sm" onClick={() => run(() => P.addTodos(STARTER_DOCS.map((x) => ({ event_id: ev.id, kind: "dokumen" as const, title: x.title, side: x.side }))), "Daftar contoh ditambahkan")}>Isi daftar contoh berkas</Button>}</div>)}
      <ul className="space-y-2">{list.map((t) => {
        const late = t.due_date && !t.done && daysUntil(t.due_date, today) < 0;
        return (<li key={t.id} className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card p-3 shadow-xs"><button role="checkbox" aria-checked={t.done} aria-label={`Tandai ${t.title}`} onClick={() => run(() => P.updateTodo(t.id, { done: !t.done }))} className={`flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 transition-all active:scale-90 ${t.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"}`}>{t.done && <Check className="size-4" />}</button>
          <div className="min-w-0 flex-1"><p className={`truncate text-sm font-bold ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.title}</p><p className="text-xs text-muted-foreground">{SIDE_LABEL[t.side]}{t.due_date ? ` · ${t.due_date}` : ""}{late ? " · terlambat" : ""}</p></div>
          <Button variant="ghost" size="icon" aria-label={`Hapus ${t.title}`} onClick={async () => { if (await ask(`Hapus "${t.title}"?`, "Hapus")) void run(() => P.deleteTodo(t.id)); }}><Trash2 className="size-4" /></Button></li>);
      })}</ul>
    </div>
  );
}

function TamuStat({ emoji, label, n, cls }: { emoji: string; label: string; n: number; cls: string }) {
  return (<div className={`rounded-2xl p-2.5 ${cls}`}><p className="text-base leading-none" aria-hidden>{emoji}</p><p className="mt-1 text-base font-extrabold">{n}</p><p className="text-[10px] font-semibold">{label}</p></div>);
}

function Share({ ev }: { ev: P.EventRow }) {
  const [code, setCode] = React.useState<string | null>(ev.invite_code ?? null);
  const [busy, setBusy] = React.useState(false);
  return (
    <FormCard title="Bagikan ke pasangan" desc="Pasangan bisa ikut mengisi lewat kode undangan. Hanya pemilik yang bisa menghapus." icon="💌">
      {code ? (
        <div className="flex items-center justify-between rounded-2xl bg-teal-500/10 p-3"><span className="font-mono text-lg font-bold tracking-widest text-teal-700 dark:text-teal-300" aria-label="Kode undangan planner">{code}</span>
          <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => { void navigator.clipboard?.writeText(code); notify("Kode disalin"); }}>Salin</Button>
            <Button size="sm" variant="outline" onClick={async () => { try { await P.resetInvite(ev.id); setCode(null); notify("Kode lama dimatikan"); } catch (e) { notify(P.shareErrorText(e)); } }}>Matikan</Button></div></div>
      ) : (
        <Cta disabled={busy} onClick={async () => { setBusy(true); try { setCode(await P.createInvite(ev.id)); } catch (e) { notify(P.shareErrorText(e)); } finally { setBusy(false); } }} className="bg-indigo-600 hover:bg-indigo-700">💌 Buat kode undangan</Cta>
      )}
    </FormCard>
  );
}

function GoalLink({ ev, obligation, onSaved }: { ev: P.EventRow; obligation: number; onSaved: () => void }) {
  const [goals, setGoals] = React.useState<GoalProgress[] | null>(null);
  React.useEffect(() => { getSavingsGoals().then(setGoals).catch(() => setGoals([])); }, []);
  const g = goals?.find((x) => x.id === ev.goal_id);
  return (
    <FormCard title="Tautkan ke target Tabungan" desc="Lihat tabunganmu cukup atau belum untuk acara ini." icon="🐷">
      {goals && goals.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada target Tabungan. <Link href="/tabungan" className="underline">Buat target</Link> lalu tautkan di sini.</p> : (
        <Select aria-label="Target Tabungan" value={ev.goal_id ?? ""} onChange={async (e) => { try { await P.updateEvent(ev.id, { goal_id: e.target.value || null }); onSaved(); } catch { notify("Belum bisa disimpan. Coba lagi."); } }}>
          <option value="">Belum ditautkan</option>{goals?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </Select>
      )}
      {g && (
        <div className="space-y-1 text-sm">
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-300" style={{ width: `${Math.min(100, Math.round(Number(g.percent ?? 0)))}%` }} /></div>
          <p className="text-xs text-muted-foreground">Terkumpul {formatRupiah(Number(g.saved ?? 0))} dari target {formatRupiah(Number(g.target_amount))}.</p>
          {obligation > 0 && <p className="text-xs">{Number(g.saved ?? 0) >= obligation ? "Tabunganmu sudah cukup menutup sisa kewajiban planner." : `Kurang ${formatRupiah(obligation - Number(g.saved ?? 0))} untuk menutup sisa kewajiban planner.`}</p>}
        </div>
      )}
    </FormCard>
  );
}
