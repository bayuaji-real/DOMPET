"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Gauge } from "lucide-react";
import { getHomeLimits, type HomeLimits } from "@/lib/data/limits";
import { splitLimit, type DebtView, type Level, type Period, type Status } from "@/lib/konsultan/spend-limit";
import { todayJakarta } from "@/lib/data/sample-mode";

const n = (v: number) => Math.round(v).toLocaleString("id-ID");
const rp = (v: number) => `Rp${n(v)}`;
const RING: Record<Level, string> = { aman: "stroke-emerald-500", hampir: "stroke-amber-500", lewat: "stroke-rose-500" };
const BAR: Record<Level, string> = { aman: "bg-emerald-500", hampir: "bg-amber-500", lewat: "bg-rose-500" };
const TEXT: Record<Level, string> = { aman: "text-muted-foreground", hampir: "text-amber-600 dark:text-amber-400", lewat: "text-rose-600 dark:text-rose-400" };
const PERIOD_TEXT: Record<Period, string> = { harian: "per hari", mingguan: "per minggu", bulanan: "per bulan" };

type Item = {
  id: string;
  name: string;
  period: Period;
  amount: number;
  spent: number;
  cap: number; // angka pembagi di donat (jatah hari ini setelah dipotong utang, untuk batas harian)
  pct: number;
  level: Level;
  caption: string;
  debt: DebtView | null;
  isMaster: boolean;
  weekly?: Status;
  monthly?: Status;
};

function levelOf(spent: number, cap: number, debtIn: number, warn: number): { pct: number; level: Level } {
  const pct = cap > 0 ? Math.round((spent / cap) * 100) : spent > 0 || debtIn > 0 ? 100 : 0;
  const level: Level = spent > cap || (cap === 0 && debtIn > 0) ? "lewat" : pct >= warn ? "hampir" : "aman";
  return { pct, level };
}

function captionOf(spent: number, cap: number, d: DebtView | null): string {
  const base = `${n(spent)}/${n(cap)}`;
  return d && d.debtAfterToday > 0 ? `${base} (besok jatah ${n(Math.max(0, d.allowance - d.debtAfterToday))})` : base;
}

function buildItems(all: HomeLimits): Item[] {
  const items: Item[] = [];
  if (all.master) {
    const { limit, debt, statuses } = all.master;
    const { pct, level } = levelOf(debt.spentToday, debt.available, debt.debtIn, limit.warn_pct);
    items.push({ id: limit.id, name: limit.name, period: limit.period, amount: limit.amount, spent: debt.spentToday, cap: debt.available, pct, level, caption: captionOf(debt.spentToday, debt.available, debt), debt, isMaster: true, weekly: statuses.mingguan, monthly: statuses.bulanan });
  }
  for (const { status: s, debt } of all.others) {
    if (debt) {
      const { pct, level } = levelOf(debt.spentToday, debt.available, debt.debtIn, s.limit.warn_pct);
      items.push({ id: s.limit.id, name: s.limit.name, period: s.limit.period, amount: s.limit.amount, spent: debt.spentToday, cap: debt.available, pct, level, caption: captionOf(debt.spentToday, debt.available, debt), debt, isMaster: false });
    } else {
      items.push({ id: s.limit.id, name: s.limit.name, period: s.limit.period, amount: s.limit.amount, spent: s.spent, cap: s.limit.amount, pct: s.pct, level: s.level, caption: captionOf(s.spent, s.limit.amount, null), debt: null, isMaster: false });
    }
  }
  return items;
}

const R = 40;
const C = 2 * Math.PI * R;

/** Donat ringan seperti di Analisis Keuangan: abu = jatah, warna = uang yang sudah dipakai. */
function Donut({ pct, level }: { pct: number; level: Level }) {
  const shown = Math.min(100, Math.max(0, pct));
  return (
    <div className="relative size-28 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth="12" className="stroke-muted" />
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth="12" strokeLinecap="round" className={RING[level]} strokeDasharray={C} strokeDashoffset={C * (1 - shown / 100)} />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
        <span className="text-lg font-extrabold">{Math.min(pct, 999)}%</span>
        <span className="text-[9px] font-semibold text-muted-foreground">terpakai</span>
      </span>
    </div>
  );
}

/**
 * Batas pengeluaran di Beranda, gaya Analisis Keuangan: satu donat + tiga baris singkat (Jatah, Uang dipakai, Hutang).
 * Banyak batas: pilih lewat deretan nama di atas donat. Rincian lengkap muncul saat "Lihat rincian" diketuk.
 * Tersembunyi kalau belum ada batas aktif.
 */
export function DailyQuotaCard() {
  const [all, setAll] = React.useState<HomeLimits | null>(null);
  const [pick, setPick] = React.useState<string | null>(null);
  const [more, setMore] = React.useState(false);
  React.useEffect(() => {
    const load = () => { getHomeLimits().then(setAll).catch(() => setAll(null)); };
    load();
    window.addEventListener("transaction_created", load);
    return () => window.removeEventListener("transaction_created", load);
  }, []);
  if (!all || (!all.master && all.others.length === 0)) return null;
  const items = buildItems(all);
  const sel = items.find((i) => i.id === pick) ?? items[0];
  const hutang = sel.debt ? sel.debt.debtAfterToday : 0;
  const over = sel.spent > sel.cap;
  const besok = sel.debt && hutang > 0 ? Math.max(0, sel.debt.allowance - hutang) : null;

  return (
    <section aria-labelledby="ringkas-batas" className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400"><Gauge className="h-4 w-4" /></span>
        <div>
          <h3 id="ringkas-batas" className="text-sm font-extrabold leading-tight text-foreground">Batas Pengeluaran</h3>
          <p className="text-[11px] text-muted-foreground">{sel.period === "harian" || sel.isMaster ? "Hari ini" : sel.period === "mingguan" ? "Minggu ini" : "Bulan ini"} · {sel.name}</p>
        </div>
      </div>

      {items.length > 1 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((i) => (
            <button key={i.id} type="button" aria-pressed={i.id === sel.id} onClick={() => setPick(i.id)}
              className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all active:scale-95 ${i.id === sel.id ? "border-teal-500/70 bg-teal-500/10 text-teal-700 dark:text-teal-300" : "border-border/70 text-muted-foreground"}`}>
              <span className={`size-2 rounded-full ${i.level === "lewat" ? "bg-rose-500" : i.level === "hampir" ? "bg-amber-500" : "bg-emerald-500"}`} />
              {i.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Donut pct={sel.pct} level={sel.level} />
        <ul className="min-w-0 flex-1 space-y-2">
          <li className="flex items-center gap-2 text-[11px]">
            <span className="size-2.5 shrink-0 rounded-full bg-muted-foreground/40" />
            <span className="min-w-0 flex-1 truncate font-semibold">Jatah</span>
            <span className="shrink-0 font-bold tabular-nums">{rp(sel.cap)}</span>
          </li>
          <li className="flex items-center gap-2 text-[11px]">
            <span className={`size-2.5 shrink-0 rounded-full ${sel.level === "lewat" ? "bg-rose-500" : sel.level === "hampir" ? "bg-amber-500" : "bg-emerald-500"}`} />
            <span className="min-w-0 flex-1 truncate font-semibold">Uang dipakai</span>
            <span className={`shrink-0 font-bold tabular-nums ${TEXT[sel.level]}`}>{rp(sel.spent)}</span>
          </li>
          <li className="flex items-center gap-2 text-[11px]">
            <span className={`size-2.5 shrink-0 rounded-full ${over ? "bg-rose-500" : "bg-teal-500"}`} />
            <span className="min-w-0 flex-1 truncate font-semibold">{over ? "Lebih" : "Sisa"}</span>
            <span className={`shrink-0 font-bold tabular-nums ${over ? "text-rose-600 dark:text-rose-400" : ""}`}>{rp(over ? sel.spent - sel.cap : sel.cap - sel.spent)}</span>
          </li>
          {besok !== null && <li className="pl-[18px] text-[10px] font-semibold text-muted-foreground">Besok jatah {rp(besok)}</li>}
        </ul>
      </div>

      <button type="button" aria-expanded={more} onClick={() => setMore(!more)}
        className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-2xl border border-border/70 py-2 text-xs font-bold text-muted-foreground transition-all active:scale-95">
        {more ? "Tutup rincian" : "Lihat rincian"} <ChevronDown className={`size-4 transition-transform ${more ? "rotate-180" : ""}`} />
      </button>

      {more && (
        <div className="space-y-2 rounded-2xl bg-muted/40 p-3 text-xs">
          <p className="text-muted-foreground">Batas {rp(sel.amount)} {PERIOD_TEXT[sel.period]}{sel.isMaster ? " untuk semua pengeluaran" : ""}.</p>
          <p className={`font-semibold ${TEXT[sel.level]}`}>{sel.spent > sel.cap ? `Lebih ${rp(sel.spent - sel.cap)}` : `Sisa ${rp(sel.cap - sel.spent)}`} dari jatah{sel.period === "harian" || sel.isMaster ? " hari ini" : ""}.</p>
          {sel.debt && sel.debt.debtIn > 0 && <p className="text-muted-foreground">Jatah {rp(sel.debt.allowance)} dipotong hutang {rp(sel.debt.debtIn)} dari hari sebelumnya.</p>}
          {sel.isMaster && (() => { const a = splitLimit({ period: sel.period, amount: sel.amount }, todayJakarta()); return <p className="text-muted-foreground">Otomatis: {rp(a.harian)} per hari · {rp(a.mingguan)} per minggu · {rp(a.bulanan)} per bulan</p>; })()}
          {sel.isMaster && [sel.weekly, sel.monthly].map((w, idx) => w && (
            <div key={idx} className="space-y-0.5">
              <div className="flex justify-between text-[10px] font-semibold text-muted-foreground"><span>{idx === 0 ? "Minggu ini" : "Bulan ini"}</span><span>{rp(w.spent)} / {rp(w.limit.amount)}</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${BAR[w.level]}`} style={{ width: `${Math.min(100, w.pct)}%` }} /></div>
            </div>
          ))}
          {hutang > 0 && <p className="rounded-lg bg-amber-500/10 p-2 font-semibold text-amber-800 dark:text-amber-300">🧾 Hutang batas {rp(hutang)}: dipotong dari jatah besok sampai lunas. Ini bukan hutang sungguhan, hanya pengingat dari batas yang kamu buat sendiri.</p>}
          <Link href="/batas-pengeluaran" className="block rounded-xl border border-border/70 py-1.5 text-center text-[11px] font-bold">Atur batas</Link>
        </div>
      )}
    </section>
  );
}
