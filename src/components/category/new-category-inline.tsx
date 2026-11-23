"use client";

import * as React from "react";
import { Plus, Loader2 } from "lucide-react";
import { createCategory, getCategoryEmoji, type Category } from "@/lib/data/categories";

const COLORS = ["#0d9488", "#8b5cf6", "#f59e0b", "#f43f5e", "#0ea5e9", "#84cc16"];

/** Tombol "+ Kategori baru" langsung di pilihan kategori. */
export function NewCategoryInline({
  type,
  onCreated,
}: {
  type: "expense" | "income";
  onCreated: (c: Category) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const save = async () => {
    const n = name.trim();
    if (n.length < 2 || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const created = await createCategory({
        name: n,
        type,
        icon: getCategoryEmoji(n, type),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
      if (created) {
        onCreated(created);
        setName("");
        setOpen(false);
      }
    } catch {
      setErr("Gagal membuat kategori. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-dashed border-teal-500/60 px-1 py-2 text-[11px] font-bold text-teal-600 hover:bg-teal-500/10 dark:text-teal-400"
      >
        <Plus className="h-3.5 w-3.5" /> Kategori baru
      </button>
    );
  }
  return (
    <div className="col-span-3 space-y-1.5 rounded-xl border border-teal-500/40 bg-teal-500/5 p-2">
      <div className="flex gap-1.5">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            }
          }}
          maxLength={30}
          placeholder="Nama kategori, misal: Kucing"
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 text-xs outline-none focus:ring-2 focus:ring-teal-500/40"
        />
        <button type="button" onClick={save} disabled={busy || name.trim().length < 2} className="flex h-9 cursor-pointer items-center rounded-lg bg-teal-600 px-3 text-xs font-bold text-white disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-9 cursor-pointer rounded-lg px-2 text-xs text-muted-foreground">Batal</button>
      </div>
      {err && <p className="text-[11px] text-rose-600">{err}</p>}
    </div>
  );
}
