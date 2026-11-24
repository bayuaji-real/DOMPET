"use client";

import * as React from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

/**
 * Perangkat bentuk Dompetku. Acuannya layar "Tambah Kategori Baru" di More: ceria, berwarna, bulat.
 * Setiap halaman baru memakai ini supaya gaya form, tombol pilihan, dan tombol simpan seragam.
 */

/** Kartu form: judul tebal, keterangan kecil, garis pemisah, isi berjarak rapi. */
export function FormCard({ title, desc, icon, className, children }: { title?: string; desc?: string; icon?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-3.5 rounded-3xl border border-border/80 bg-card p-5 shadow-xs", className)}>
      {title && (
        <div className="flex items-center gap-3 border-b border-border/50 pb-2.5">
          {icon && <IconBox>{icon}</IconBox>}
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-foreground">{title}</h3>
            {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

const TONES = {
  teal: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  indigo: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  neon: "bg-teal-500/10 text-teal-700 ring-1 ring-teal-500/60 dark:text-teal-300",
} as const;
export type Tone = keyof typeof TONES;

/** Kotak ikon bulat berwarna lembut (emoji atau ikon). */
export function IconBox({ tone = "teal", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-base", TONES[tone], className)}>{children}</div>;
}

/** Label isian + isinya. */
export function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/** Label bagian di luar kartu. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{children}</p>;
}

const ACTIVE: Record<string, string> = {
  teal: "bg-teal-600 text-white shadow-md shadow-teal-600/30",
  neon: "border border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold",
  rose: "bg-rose-500 text-white shadow-md shadow-rose-500/30",
  sky: "bg-sky-500 text-white shadow-md shadow-sky-500/30",
  amber: "bg-amber-500 text-white shadow-md shadow-amber-500/30",
  violet: "bg-violet-500 text-white shadow-md shadow-violet-500/30",
  indigo: "bg-indigo-500 text-white shadow-md shadow-indigo-500/30",
};

type SegOption<T extends string> = { value: T; label: string; tone?: keyof typeof ACTIVE; icon?: React.ReactNode; /** Khusus Pro dan paket pengguna belum cukup: tab tidak bisa diklik, bertanda mahkota. */ locked?: boolean };

/** Tombol pilihan berdampingan (seperti Pengeluaran / Pemasukan di Catat Transaksi). Satu terpilih, berwarna, boleh berikon. */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: SegOption<T>[]; label?: string }) {
  return (
    <div role="group" aria-label={label} className="grid gap-1 rounded-2xl bg-muted p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("flex cursor-pointer items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all active:scale-95", value === o.value ? ACTIVE[o.tone ?? "teal"] : "text-muted-foreground hover:text-foreground")}
        >
          {o.icon && <span aria-hidden className="text-sm leading-none">{o.icon}</span>}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Tab halaman (role tab) dengan gaya sama seperti Segmented. Ikon disembunyikan dari pembaca layar. */
export function Tabs<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: SegOption<T>[]; label?: string }) {
  return (
    <div role="tablist" aria-label={label} className="grid gap-1 rounded-2xl bg-muted p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          disabled={o.locked}
          aria-label={o.locked ? `${o.label} (khusus Pro)` : undefined}
          onClick={() => onChange(o.value)}
          className={cn("relative flex items-center justify-center rounded-xl font-bold transition-all", o.locked ? "cursor-not-allowed text-muted-foreground/60" : "cursor-pointer active:scale-95", options.length > 3 ? "flex-col gap-0.5 py-1.5 text-[11px]" : "gap-1.5 py-2 text-xs", value === o.value ? ACTIVE[o.tone ?? "neon"] : o.locked ? "" : "text-muted-foreground hover:text-foreground")}
        >
          {o.icon && <span aria-hidden className={cn("text-sm leading-none", o.locked && "opacity-50")}>{o.icon}</span>}
          {o.label}
          {o.locked && <span aria-hidden className="absolute -right-0.5 -top-1.5 rounded-full border border-amber-400/50 bg-background px-1 text-[9px] leading-4">👑</span>}
        </button>
      ))}
    </div>
  );
}

const PILL = {
  neon: "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold",
  rose: "border-rose-400/50 bg-rose-500/15 text-rose-700 dark:text-rose-300",
  amber: "border-amber-400/50 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  sky: "border-sky-400/50 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  violet: "border-violet-400/50 bg-violet-500/15 text-violet-700 dark:text-violet-300",
  indigo: "border-indigo-400/50 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  slate: "border-border/70 bg-muted text-muted-foreground",
} as const;
export type PillTone = keyof typeof PILL;

/** Pill kecil berbingkai untuk status, angka, dan label. Hijau neon untuk yang baik atau terpilih. */
export function Pill({ tone = "neon", icon, className, children }: { tone?: PillTone; icon?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold leading-tight", PILL[tone], className)}>
      {icon && <span aria-hidden>{icon}</span>}
      {children}
    </span>
  );
}

/** Kotak angka berikon: label kecil, angka tebal. */
export function Stat({ icon, label, value, tone = "neon", valueClass, className }: { icon?: React.ReactNode; label: string; value: React.ReactNode; tone?: Tone; valueClass?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card p-3 shadow-xs", className)}>
      {icon && <IconBox tone={tone}>{icon}</IconBox>}
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-muted-foreground">{label}</p>
        <p className={cn("truncate text-sm font-extrabold tabular-nums text-foreground", valueClass)}>{value}</p>
      </div>
    </div>
  );
}

/** Keadaan kosong: emoji besar di kartu putus-putus. */
export function EmptyState({ emoji = "✨", children, className }: { emoji?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-3xl border border-dashed border-emerald-400/50 bg-emerald-400/5 p-5 text-center", className)}>
      <p aria-hidden className="text-3xl">{emoji}</p>
      <p className="mt-1 text-xs text-muted-foreground">{children}</p>
    </div>
  );
}

/** Pesan peringatan lembut berikon emoji. */
export function Notice({ tone = "amber", emoji, role, className, children }: { tone?: "amber" | "rose" | "sky" | "emerald"; emoji?: string; role?: "alert" | "status"; className?: string; children: React.ReactNode }) {
  const t = { amber: "border-amber-400/40 bg-amber-500/10 text-amber-800 dark:text-amber-300", rose: "border-rose-400/40 bg-rose-500/10 text-rose-700 dark:text-rose-300", sky: "border-sky-400/40 bg-sky-500/10 text-sky-700 dark:text-sky-300", emerald: "border-emerald-400/50 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300" }[tone];
  return (
    <div role={role} className={cn("flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-xs font-semibold leading-relaxed", t, className)}>
      {emoji && <span aria-hidden className="text-base leading-none">{emoji}</span>}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Kelas chip kecil (filter, pilihan ganda): pill berbingkai, terpilih hijau neon bercahaya. */
export const chipCls = (on: boolean) =>
  cn(
    "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-all active:scale-95",
    on ? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold" : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
  );

/** Tombol utama: lebar penuh, gradien hijau, bulat, ada bayangan. Untuk Simpan, Tambah, Buat. */
export function Cta({ className, ...props }: React.ComponentProps<typeof Button>) {
  return <Button {...props} className={cn("h-11 w-full cursor-pointer rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition-all hover:from-emerald-700 hover:to-teal-600 active:scale-[0.98]", className)} />;
}

/** Gradien teal terang (teal-600, teal-700, teal-800). Dipakai kartu judul dan kartu atas (Dompet, Tabungan, Beranda). */
export const AURORA = "bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800";
/** Cahaya lembut di pojok kartu aurora. */
export function AuroraGlow() {
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-white/15 blur-2xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-12 left-1/3 size-32 rounded-full bg-teal-300/20 blur-2xl" />
    </>
  );
}

/** Kartu judul halaman: gradien aurora hijau ke hijau muda. Tanpa ikon atau ilustrasi. */
export function PageHero({ title, desc, className }: { title: string; desc?: string; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl p-4 text-white shadow-lg shadow-teal-700/25", AURORA, className)}>
      <AuroraGlow />
      <h1 className="relative text-lg font-extrabold leading-tight tracking-tight drop-shadow-sm">{title}</h1>
      {desc && <p className="relative mt-0.5 text-xs font-medium leading-snug text-white/95 drop-shadow-sm">{desc}</p>}
    </div>
  );
}
