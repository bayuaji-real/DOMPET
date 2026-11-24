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
  teal: "bg-teal-600 text-white shadow-xs",
  rose: "bg-rose-500 text-white shadow-xs",
  sky: "bg-sky-500 text-white shadow-xs",
  amber: "bg-amber-500 text-white shadow-xs",
  violet: "bg-violet-500 text-white shadow-xs",
};

/** Tombol pilihan berdampingan (seperti Pengeluaran / Pemasukan). Satu terpilih, berwarna. */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; tone?: keyof typeof ACTIVE }[]; label?: string }) {
  return (
    <div role="group" aria-label={label} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("cursor-pointer rounded-xl py-2 text-xs font-bold transition-all", value === o.value ? ACTIVE[o.tone ?? "teal"] : "bg-muted text-muted-foreground hover:text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Kelas chip kecil (filter, pilihan ganda). */
export const chipCls = (on: boolean) =>
  cn("cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition-all", on ? "bg-teal-600 text-white shadow-xs" : "bg-muted text-muted-foreground hover:text-foreground");

/** Tombol utama: lebar penuh, teal, bulat. Untuk Simpan, Tambah, Buat. */
export function Cta({ className, ...props }: React.ComponentProps<typeof Button>) {
  return <Button {...props} className={cn("h-10 w-full cursor-pointer rounded-2xl bg-teal-600 text-xs font-bold text-white hover:bg-teal-700", className)} />;
}

/** Kartu judul halaman: gradien hijau bersih seperti kartu atas tab Dompet dan Tabungan. Tanpa ikon atau ilustrasi. */
export function PageHero({ title, desc, className }: { title: string; desc?: string; className?: string }) {
  return (
    <div className={cn("rounded-3xl bg-gradient-to-br from-teal-800 via-teal-900 to-slate-950 p-4 text-white shadow-xl shadow-teal-950/20", className)}>
      <h1 className="text-lg font-extrabold leading-tight tracking-tight">{title}</h1>
      {desc && <p className="mt-0.5 text-xs leading-snug text-teal-100/80">{desc}</p>}
    </div>
  );
}
