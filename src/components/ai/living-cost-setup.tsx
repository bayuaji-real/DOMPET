"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn, formatRupiah } from "@/lib/utils";
import {
  LIVING_NEEDS,
  makeAnswer,
  sumNeeds,
  type LivingCostAnswer,
  type LivingCostSource,
} from "@/lib/living-cost";
import { getLivingSuggestion, saveLivingCostAnswer, type LivingSuggestion } from "@/lib/data/living-cost";

const digits = (v: string) => v.replace(/\D/g, "");
const fmt = (v: string) => (digits(v) ? Number(digits(v)).toLocaleString("id-ID") : "");

/**
 * Ruby menanyakan biaya hidup per BULAN (kebutuhan harian: makan, minum, laundry, transport, dll.;
 * di luar tagihan dan langganan). Ditanya sekali, jawabannya disimpan di profil pengguna sendiri.
 * Kalau bingung, Ruby memberi saran dari rata-rata pengeluaran atau menanyakan rincian kebutuhannya.
 */
export function LivingCostSetup({
  onSaved,
  onCancel,
  initial,
}: {
  onSaved: (a: LivingCostAnswer) => void;
  onCancel?: () => void;
  initial?: LivingCostAnswer | null;
}) {
  const [step, setStep] = React.useState<"pilih" | "bantu">("pilih");
  const [choice, setChoice] = React.useState<LivingCostSource | null>(initial?.source ?? null);
  const [typed, setTyped] = React.useState(initial?.source === "diisi" ? initial.monthly.toLocaleString("id-ID") : "");
  const [needs, setNeeds] = React.useState<Record<string, string>>({});
  const [sug, setSug] = React.useState<LivingSuggestion | null | undefined>(undefined); // undefined = memuat
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let off = false;
    getLivingSuggestion()
      .then((r) => { if (!off) setSug(r); })
      .catch(() => { if (!off) setSug(null); });
    return () => { off = true; };
  }, []);

  const perMonth = sug?.perMonth ?? 1;
  const avg = sug?.avgMonthly ?? null;
  const total = sumNeeds(Object.fromEntries(Object.entries(needs).map(([k, v]) => [k, digits(v)])));

  const save = async (source: LivingCostSource, monthly: number) => {
    const a = makeAnswer(source, monthly, perMonth);
    setSaving(true);
    setErr(null);
    try {
      await saveLivingCostAnswer(a);
    } catch {
      setErr("Jawabanmu belum bisa disimpan ke profil, jadi baru dipakai sementara. Coba lagi sebentar ya.");
    }
    setSaving(false);
    onSaved(a);
  };

  const canSave =
    !saving && (choice === "belum_punya" || (choice === "rata_rata" && !!avg) || (choice === "diisi" && digits(typed) !== ""));

  const option = "w-full text-left rounded-xl border p-2.5 transition-colors cursor-pointer";
  const on = "border-teal-500 bg-teal-500/10";
  const off = "border-border/70";

  if (step === "bantu") {
    return (
      <div className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-3.5 text-xs space-y-2.5">
        <p className="font-bold text-foreground">Tenang, kita hitung bareng ya</p>
        <p className="text-muted-foreground">
          Isi perkiraan per BULAN untuk tiap kebutuhan di bawah. Kosongkan yang tidak ada. Tagihan dan langganan jangan dihitung di sini.
        </p>
        {LIVING_NEEDS.map((n) => (
          <div key={n.key} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{n.label}</p>
              <p className="text-[10px] text-muted-foreground">{n.hint}</p>
            </div>
            <div className="flex w-32 shrink-0 items-center gap-1 border-b border-border/60 pb-0.5">
              <span className="text-[11px] font-bold text-muted-foreground">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={needs[n.key] ?? ""}
                onChange={(e) => setNeeds((p) => ({ ...p, [n.key]: fmt(e.target.value) }))}
                className="w-full bg-transparent text-right text-xs font-bold text-foreground focus:outline-none"
              />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-xl bg-teal-500/10 p-2.5">
          <span className="font-bold text-foreground">Total per bulan</span>
          <span className="font-extrabold text-foreground">{formatRupiah(total)}</span>
        </div>
        {avg && (
          <p className="text-[10px] text-muted-foreground">
            Sebagai pembanding, rata-rata pengeluaranmu di luar tagihan rutin sekitar {formatRupiah(avg)} per bulan.
          </p>
        )}
        {err && <p className="text-[10px] text-rose-600 dark:text-rose-400">{err}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => setStep("pilih")} className="h-9 cursor-pointer rounded-xl border border-border/70 px-3 text-[11px] font-bold text-muted-foreground">
            Kembali
          </button>
          <button
            type="button"
            disabled={saving || total <= 0}
            onClick={() => void save("dihitung", total)}
            className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-teal-600 text-[11px] font-extrabold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Pakai total ini
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-3.5 text-xs space-y-2.5">
      <div>
        <p className="font-bold text-foreground">Biaya hidupmu sebulan kira-kira berapa?</p>
        <p className="mt-1 text-muted-foreground">
          Khusus kebutuhan harian seperti makan, minum, laundry, dan transport. Tagihan dan langganan jangan dihitung di sini.
          Cukup dijawab sekali, tersimpan di profilmu dan tidak ditanya lagi tiap gajian.
        </p>
      </div>

      <div role="radiogroup" aria-label="Biaya hidup per bulan" className="space-y-1.5">
        <div className={cn(option, "cursor-default", choice === "diisi" ? on : off)}>
          <button type="button" role="radio" aria-checked={choice === "diisi"} onClick={() => setChoice("diisi")} className="w-full cursor-pointer text-left">
            <span className="block font-bold text-foreground">Isi sendiri</span>
            <span className="text-[10px] text-muted-foreground">Aku tahu budget biaya hidupku per bulan</span>
          </button>
          {choice === "diisi" && (
            <div className="mt-2 flex items-center gap-1 border-b border-border/60 pb-0.5">
              <span className="text-sm font-extrabold text-teal-600 dark:text-teal-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={typed}
                onChange={(e) => setTyped(fmt(e.target.value))}
                placeholder="Biaya hidup per bulan"
                className="w-full bg-transparent text-base font-extrabold tracking-tight text-foreground focus:outline-none"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          role="radio"
          aria-checked={choice === "rata_rata"}
          disabled={!avg}
          onClick={() => setChoice("rata_rata")}
          className={cn(option, "disabled:cursor-not-allowed disabled:opacity-50", choice === "rata_rata" ? on : off)}
        >
          <span className="block font-bold text-foreground">Ambil dari rata-rataku</span>
          <span className="text-[10px] text-muted-foreground">
            {sug === undefined
              ? "Menghitung dari riwayat pengeluaranmu..."
              : avg
                ? `Sekitar ${formatRupiah(avg)} per bulan (rata-rata ${sug?.months ?? 1} bulan data, sudah dikurangi tagihan rutin)`
                : "Belum ada riwayat pengeluaran untuk dihitung"}
          </span>
        </button>

        <button type="button" onClick={() => setStep("bantu")} className={cn(option, off)}>
          <span className="block font-bold text-foreground">Aku bingung, bantu hitung</span>
          <span className="text-[10px] text-muted-foreground">Ruby tanya kebutuhanmu satu per satu, lalu dijumlahkan</span>
        </button>

        <button type="button" role="radio" aria-checked={choice === "belum_punya"} onClick={() => setChoice("belum_punya")} className={cn(option, choice === "belum_punya" ? on : off)}>
          <span className="block font-bold text-foreground">Gatau / belum punya</span>
          <span className="text-[10px] text-muted-foreground">Dihitung Rp0 dulu. Bisa diubah kapan saja.</span>
        </button>
      </div>

      {err && <p className="text-[10px] text-rose-600 dark:text-rose-400">{err}</p>}
      <div className="flex gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-9 cursor-pointer rounded-xl border border-border/70 px-3 text-[11px] font-bold text-muted-foreground">
            Nanti dulu
          </button>
        )}
        <button
          type="button"
          disabled={!canSave}
          onClick={() => {
            if (choice === "diisi") void save("diisi", Number(digits(typed)) || 0);
            else if (choice === "rata_rata" && avg) void save("rata_rata", avg);
            else if (choice === "belum_punya") void save("belum_punya", 0);
          }}
          className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-teal-600 text-[11px] font-extrabold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Simpan jawabanku
        </button>
      </div>
    </div>
  );
}
