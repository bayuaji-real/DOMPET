"use client";

import * as React from "react";
import { PageHero } from "@/components/ui/form-kit";
import { Check, Sparkles } from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/plan/disclaimer";
import { useEntitlement } from "@/hooks/use-entitlement";
import { requestSubscription, startTrial } from "@/lib/data/entitlement";
import { PLAN_LABEL, TRIAL_DAYS, trialDaysLeft, type Plan } from "@/lib/plans";

const TIERS: { plan: Plan; harga: string; tagline: string; fitur: string[] }[] = [
  { plan: "free", harga: "Gratis", tagline: "Catat manual, tanpa AI", fitur: ["Catat pemasukan & pengeluaran", "Dompet, tabungan, split bill", "Kalkulator investasi & zakat", "Laporan mingguan"] },
  { plan: "premium", harga: "Segera diumumkan", tagline: "Ruby (AI) dengan kuota terbatas", fitur: ["Semua fitur Gratis", "Tanya Ruby, foto struk, catat suara", "Insight & rencana keuangan AI", "Skor kesehatan, peringatan dini, simulator cicilan", "Impor mutasi bank, portofolio investasi"] },
  { plan: "pro", harga: "Segera diumumkan", tagline: "Semua fitur, kuota AI besar", fitur: ["Semua fitur Premium", "Kuota AI jauh lebih besar", "Proyeksi arus kas 3 bulan", "Rencana lunasi utang", "Info pasar & peringkat return"] },
];

export default function PaketPage() {
  const { ent, loading, reload } = useEntitlement();
  const [busy, setBusy] = React.useState<Plan | null>(null);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  const mulai = async (plan: "premium" | "pro") => {
    setBusy(plan); setMsg(null);
    const r = await startTrial(plan);
    setBusy(null);
    if (r.ok) { setMsg({ ok: true, text: `Uji coba ${PLAN_LABEL[plan]} ${TRIAL_DAYS} hari dimulai. Selamat mencoba!` }); await reload(); }
    else setMsg({ ok: false, text: r.message });
  };

  const minta = async (plan: "premium" | "pro") => {
    setBusy(plan); setMsg(null);
    const ok = await requestSubscription(plan, "");
    setBusy(null);
    setMsg(ok ? { ok: true, text: `Permintaan paket ${PLAN_LABEL[plan]} sudah terkirim. Kami hubungi kamu setelah pembayaran dibuka.` } : { ok: false, text: "Permintaan belum terkirim. Coba lagi sebentar." });
  };
  const daysLeft = trialDaysLeft(ent.trialEndsAt);

  return (
    <div className="pb-24">
      <TopHeader title="Paket" />
      <div className="space-y-4 px-4 pt-2">
        <PageHero title="Paket & Uji Coba" desc="Gratis, Premium, atau Pro. Coba gratis 7 hari." />
        <div className="rounded-3xl border border-teal-500/30 bg-teal-500/10 p-4">
          <p className="text-xs text-muted-foreground">Paketmu sekarang</p>
          <p className="text-lg font-bold" data-testid="paket-aktif">{loading ? "..." : PLAN_LABEL[ent.plan]}{ent.source === "trial" && daysLeft > 0 ? ` (uji coba, sisa ${daysLeft} hari)` : ""}</p>
          {ent.plan !== "free" && <p className="mt-1 text-xs text-muted-foreground">Kuota AI bulan ini: {ent.aiRemaining} dari {ent.aiLimit} tersisa.</p>}
        </div>

        {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 text-red-700 dark:text-red-300"}`}>{msg.text}</p>}

        {TIERS.map((t) => {
          const current = ent.plan === t.plan;
          const canTrial = t.plan !== "free" && ent.source === "free" && ent.trialAvailable[t.plan as "premium" | "pro"];
          return (
            <section key={t.plan} className={`rounded-3xl border bg-card p-4 shadow-xs ${current ? "border-teal-500 ring-1 ring-teal-500/40" : "border-border/70"}`} aria-label={`Paket ${PLAN_LABEL[t.plan]}`}>
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-bold">{PLAN_LABEL[t.plan]}</h2>
                <span className="text-xs text-muted-foreground">{t.harga}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t.tagline}</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {t.fitur.map((f) => (<li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />{f}</li>))}
              </ul>
              {current && <p className="mt-3 text-sm font-medium text-primary">Paket aktif kamu</p>}
              {!current && canTrial && (
                <Button className="mt-3 w-full" disabled={busy !== null} onClick={() => mulai(t.plan as "premium" | "pro")}>
                  <Sparkles className="size-4" aria-hidden /> {busy === t.plan ? "Memulai..." : `Coba gratis ${TRIAL_DAYS} hari`}
                </Button>
              )}
              {!current && t.plan !== "free" && (
                <Button className="mt-2 w-full" variant="outline" disabled={busy !== null} onClick={() => minta(t.plan as "premium" | "pro")}>Minta berlangganan</Button>
              )}
              {!current && t.plan !== "free" && !canTrial && ent.source === "free" && <p className="mt-3 text-xs text-muted-foreground">Uji coba paket ini sudah kamu pakai.</p>}
            </section>
          );
        })}
        <p className="text-xs text-muted-foreground">Pembayaran langganan belum dibuka: tekan Minta berlangganan dan kami hubungi kamu begitu siap. Setelah uji coba berakhir, akunmu kembali ke paket Gratis dan semua catatanmu tetap aman.</p>
        <Disclaimer />
      </div>
    </div>
  );
}
