"use client";

import * as React from "react";
import Link from "next/link";
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

const R = 34;
const C = 2 * Math.PI * R;

function Donut({ pct, level }: { pct: number; level: Level }) {
  const shown = Math.min(100, Math.max(0, pct));
  return (
    <div className="relative size-[76px] shrink-0">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={R} fill="none" strokeWidth="9" className="stroke-muted" />
        <circle cx="40" cy="40" r={R} fill="none" strokeWidth="9" strokeLinecap="round" className={RING[level]} strokeDasharray={C} strokeDashoffset={C * (1 - shown / 100)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold">{Math.min(pct, 999)}%</span>
    </div>
  );
}

/**
 * Batas pengeluaran di Beranda: tiap batas aktif jadi donat kecil yang terisi sesuai pemakaian,
 * dibariskan ke samping. Ketuk donat untuk membuka rincian. Tersembunyi kalau belum ada batas aktif.
 */
export function DailyQuotaCard() {
  const [all, setAll] = React.useState<HomeLimits | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);
  React.useEffect(() => {
    const load = () => { getHomeLimits().then(setAll).catch(() => setAll(null)); };
    load();
    window.addEventListener("transaction_created", load);
    return () => window.removeEventListener("transaction_created", load);
  }, []);
  if (!all || (!all.master && all.others.length === 0)) return null;
  const items = buildItems(all);
  const sel = items.find((i) => i.id === open) ?? null;

  return (
    <section aria-label="Batas pengeluaran" className="space-y-2">
      <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((i) => {
          const active = open === i.id;
          return (
            <button
              key={i.id}
              type="button"
              aria-expanded={active}
              aria-label={`${i.name}: ${i.caption}`}
              onClick={() => setOpen(active ? null : i.id)}
              className={`flex w-[108px] shrink-0 snap-start cursor-pointer flex-col items-center gap-1.5 rounded-2xl border bg-card px-2 py-3 text-center shadow-xs transition-all active:scale-[0.97] ${active ? "border-teal-500/70 ring-1 ring-teal-500/30" : "border-border/70"}`}
            >
              <Donut pct={i.pct} level={i.level} />
              <span className="w-full truncate text-[11px] font-extrabold leading-tight">{i.name}</span>
              <span className={`text-[10px] font-semibold leading-tight ${TEXT[i.level]}`}>{i.caption}</span>
            </button>
          );
        })}
      </div>

      {sel && (
        <div className="space-y-2 rounded-2xl border border-border/70 bg-card p-3.5 text-xs shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">{sel.name}</p>
              <p className="text-muted-foreground">{rp(sel.amount)} {PERIOD_TEXT[sel.period]}{sel.isMaster ? " · semua pengeluaran" : ""}</p>
            </div>
            <Link href="/batas-pengeluaran" className="shrink-0 rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-bold">Atur</Link>
          </div>
          <p className={`font-semibold ${TEXT[sel.level]}`}>
            {sel.spent > sel.cap ? `Lebih ${rp(sel.spent - sel.cap)}` : `Sisa ${rp(sel.cap - sel.spent)}`} · terpakai {rp(sel.spent)} dari {rp(sel.cap)}{sel.period === "harian" || sel.isMaster ? " hari ini" : ""}
          </p>
          {sel.debt && sel.debt.debtIn > 0 && <p className="text-muted-foreground">Jatah {rp(sel.debt.allowance)} dipotong utang batas {rp(sel.debt.debtIn)} dari hari sebelumnya.</p>}
          {sel.isMaster && (() => { const a = splitLimit({ period: sel.period, amount: sel.amount }, todayJakarta()); return <p className="text-muted-foreground">Otomatis: {rp(a.harian)} per hari · {rp(a.mingguan)} per minggu · {rp(a.bulanan)} per bulan</p>; })()}
          {sel.isMaster && [sel.weekly, sel.monthly].map((s, idx) => s && (
            <div key={idx} className="space-y-0.5">
              <div className="flex justify-between text-[10px] font-semibold text-muted-foreground"><span>{idx === 0 ? "Minggu ini" : "Bulan ini"}</span><span>{rp(s.spent)} / {rp(s.limit.amount)}</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${BAR[s.level]}`} style={{ width: `${Math.min(100, s.pct)}%` }} /></div>
            </div>
          ))}
          {sel.debt && sel.debt.debtAfterToday > 0 && (
            <p className="rounded-lg bg-amber-500/10 p-2 font-semibold text-amber-800 dark:text-amber-300">
              🧾 Utang batas {rp(sel.debt.debtAfterToday)}: besok jatahmu {rp(Math.max(0, sel.debt.allowance - sel.debt.debtAfterToday))}. Ini bukan utang sungguhan, hanya pengingat dari batas yang kamu buat sendiri.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
