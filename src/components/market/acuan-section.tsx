"use client";

import * as React from "react";
import { getBenchmarks, type Benchmark } from "@/lib/data/admin";
import { formatBenchmark, isStale } from "@/lib/konsultan/acuan";
import { todayJakarta } from "@/lib/data/sample-mode";

const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

/** Acuan pasar: angka resmi tunggal dengan tanggal dan tautan sumber. */
export function AcuanSection() {
  const [rows, setRows] = React.useState<Benchmark[] | null>(null);
  const [err, setErr] = React.useState("");
  React.useEffect(() => { getBenchmarks().then(setRows).catch(() => setErr("Acuan pasar belum bisa dimuat.")); }, []);
  if (err) return <p role="alert" className="text-sm text-red-600">{err}</p>;
  if (!rows) return <div className="h-20 animate-pulse rounded-xl bg-muted" aria-busy="true" />;
  if (rows.length === 0) return null;
  const today = todayJakarta();
  return (
    <section aria-label="Acuan pasar" className="space-y-2">
      <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Acuan pasar</h3>
      <ul className="grid grid-cols-2 gap-2">
        {rows.map((b) => (
          <li key={b.code} className="space-y-0.5 rounded-3xl border border-border/70 bg-card p-3.5 shadow-xs">
            <p className="text-xs text-muted-foreground">{b.name}</p>
            <p className="text-base font-bold">{formatBenchmark(b)}</p>
            <p className="text-[11px] text-muted-foreground">per {fmtDate(b.as_of)}</p>
            {isStale(b.as_of, today) && <p className="text-[11px] text-amber-600">Angka ini sudah lama, mungkin sudah berubah.</p>}
            <a className="text-[11px] underline" href={b.source_url} target="_blank" rel="noopener noreferrer">Sumber: {b.source_name}</a>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">Ini informasi, bukan ajakan membeli atau menjual produk investasi apa pun.</p>
    </section>
  );
}
