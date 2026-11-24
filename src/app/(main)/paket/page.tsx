"use client";

import * as React from "react";
import { PageHero, Cta, IconBox, Pill, Notice, AURORA, AuroraGlow } from "@/components/ui/form-kit";
import { Check, Sparkles } from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
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
        <div className={`relative overflow-hidden rounded-3xl p-4 text-white shadow-lg shadow-emerald-600/25 ${AURORA}`}>
          <AuroraGlow />
          <p className="relative text-xs font-semibold text-white/90">Paketmu sekarang</p>
          <p className="relative text-lg font-extrabold" data-testid="paket-aktif">{loading ? "..." : PLAN_LABEL[ent.plan]}{ent.source === "trial" && daysLeft > 0 ? ` (uji coba, sisa ${daysLeft} hari)` : ""}</p>
          {ent.plan !== "free" && <p className="relative mt-1 text-xs font-medium text-white/95">Kuota AI bulan ini: {ent.aiRemaining} dari {ent.aiLimit} tersisa.</p>}
        </div>

        {msg && <Notice role="status" tone={msg.ok ? "emerald" : "rose"} emoji={msg.ok ? "🎉" : "⚠️"}>{msg.text}</Notice>}

        {TIERS.map((t) => {
          const current = ent.plan === t.plan;
          const canTrial = t.plan !== "free" && ent.source === "free" && ent.trialAvailable[t.plan as "premium" | "pro"];
          return (
            <section key={t.plan} className={`rounded-3xl border bg-card p-4 shadow-xs ${current ? "border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.3)]" : "border-border/80"}`} aria-label={`Paket ${PLAN_LABEL[t.plan]}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5"><IconBox tone={t.plan === "pro" ? "neon" : t.plan === "premium" ? "violet" : "sky"}>{t.plan === "pro" ? "👑" : t.plan === "premium" ? "⭐" : "🌱"}</IconBox>
                  <div className="min-w-0"><h2 className="text-base font-extrabold">{PLAN_LABEL[t.plan]}</h2><p className="text-[11px] text-muted-foreground">{t.tagline}</p></div></div>
                <Pill tone={t.plan === "free" ? "slate" : "amber"}>{t.harga}</Pill>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {t.fitur.map((f) => (<li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 rounded-full bg-emerald-400/25 p-0.5 text-emerald-600" aria-hidden />{f}</li>))}
              </ul>
              {current && <div className="mt-3"><Pill icon="✅">Paket aktif kamu</Pill></div>}
              {!current && canTrial && (
                <Cta className="mt-3" disabled={busy !== null} onClick={() => mulai(t.plan as "premium" | "pro")}>
                  <Sparkles className="size-4" aria-hidden /> {busy === t.plan ? "Memulai..." : `Coba gratis ${TRIAL_DAYS} hari`}
                </Cta>
              )}
              {!current && t.plan !== "free" && (
                <Button className="mt-2 h-10 w-full rounded-2xl border-emerald-400/60 text-xs font-bold" variant="outline" disabled={busy !== null} onClick={() => minta(t.plan as "premium" | "pro")}>Minta berlangganan</Button>
              )}
              {!current && t.plan !== "free" && !canTrial && ent.source === "free" && <p className="mt-3 text-xs text-muted-foreground">Uji coba paket ini sudah kamu pakai.</p>}
            </section>
          );
        })}
        <p className="text-xs text-muted-foreground">Pembayaran langganan belum dibuka: tekan Minta berlangganan dan kami hubungi kamu begitu siap. Setelah uji coba berakhir, akunmu kembali ke paket Gratis dan semua catatanmu tetap aman.</p>
      </div>
    </div>
  );
}
