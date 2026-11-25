"use client";

import * as React from "react";
import { Check, Search } from "lucide-react";
import { WalletIcon } from "@/components/wallet/wallet-icon";
import { WALLET_PRESETS, presetToIcon, searchPresets, type WalletPreset } from "@/lib/wallet-presets";

/** Nama tempat simpan lama (sebelum ada pilihan merek) dipetakan ke merek yang sesuai. */
const LEGACY: Record<string, string> = {
  "RDPU Bibit": "bibit",
  "BCA Utama (Tabungan)": "bca",
  "Bank Jago Kantong": "jago",
  "Tunai Celengan": "tunai",
};

/** Cari merek dari teks tempat simpan (nama persis, atau nama lama). */
export function presetFromStorage(text: string): WalletPreset | undefined {
  const t = text.trim().toLowerCase();
  if (!t) return undefined;
  const legacyId = LEGACY[text.trim()];
  return WALLET_PRESETS.find((p) => p.id === legacyId || p.name.toLowerCase() === t);
}

/** Ikon dan warna dompet tabungan menurut tempat simpan. Merek tak dikenal tetap celengan ungu. */
export function walletLookFor(storage: string): { icon: string; color: string } {
  const p = presetFromStorage(storage);
  return p ? { icon: presetToIcon(p), color: p.color } : { icon: "PiggyBank", color: "#8b5cf6" };
}

/**
 * Pilih tempat simpan tabungan (Bank Jago, Bibit, Mandiri, dst). Tabungan tetap dompet biasa;
 * pilihan ini hanya menentukan nama tempat dan logonya.
 */
export function ProviderPicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const [q, setQ] = React.useState("");
  const selected = presetFromStorage(value);
  const list = React.useMemo(() => (q.trim() ? searchPresets(q) : WALLET_PRESETS), [q]);
  const custom = value.trim() && !selected;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari: Jago, Bibit, Mandiri, GoPay..."
          aria-label="Cari tempat penyimpanan"
          className="h-10 w-full rounded-xl border border-border/60 bg-muted/40 pl-9 pr-3 text-xs outline-none focus:border-teal-500"
        />
      </div>
      <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-border/60 p-1" role="listbox" aria-label="Tempat penyimpanan">
        {custom && (
          <button type="button" role="option" aria-selected className="flex w-full items-center gap-2 rounded-lg bg-teal-500/10 p-2 text-left text-xs font-semibold text-teal-700 dark:text-teal-300">
            <WalletIcon icon="PiggyBank" color="#8b5cf6" size={28} />
            <span className="min-w-0 flex-1 truncate">{value}</span>
            <Check className="h-4 w-4" aria-hidden />
          </button>
        )}
        {list.map((p) => {
          const on = selected?.id === p.id;
          return (
            <button
              type="button"
              key={p.id}
              role="option"
              aria-selected={on}
              onClick={() => onChange(p.name)}
              className={`flex w-full items-center gap-2 rounded-lg p-2 text-left text-xs transition-colors ${on ? "bg-teal-500/10 font-semibold text-teal-700 dark:text-teal-300" : "hover:bg-muted"}`}
            >
              <WalletIcon icon={presetToIcon(p)} color={p.color} size={28} />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {on && <Check className="h-4 w-4" aria-hidden />}
            </button>
          );
        })}
        {list.length === 0 && <p className="p-3 text-center text-xs text-muted-foreground">Tidak ketemu. Coba kata lain.</p>}
      </div>
    </div>
  );
}
