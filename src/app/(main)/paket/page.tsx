"use client";

import * as React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { IconBox, Notice } from "@/components/ui/form-kit";
import { TopHeader } from "@/components/layout/top-header";
import { useEntitlement } from "@/hooks/use-entitlement";
import { startTrial } from "@/lib/data/entitlement";
import { getPrices, type PayPrice } from "@/lib/data/payment";
import { PLAN_LABEL, TRIAL_DAYS, trialDaysLeft } from "@/lib/plans";
import { monthsLabel, savingPct } from "@/lib/payment";
import { formatRupiah } from "@/lib/utils";

/** Apa yang didapat dari Pro: teks biasa, copy dari Owner. */
const MANFAAT = [
  "Unlimited catat keuangan pakai foto dan voice note anti ribet",
  "Unlimited Personal AI Ruby assistant menggunakan datamu sendiri dan lebih personal",
  "Unlimited insight keuanganmu dari Ruby",
  "Unlimited analisis keuanganmu",
  "Unlimited planner untuk segala kebutuhanmu",
  "Free dompet bersama dengan pasanganmu",
  "Free split bill pakai foto struk anti ribet",
  "Dan masih banyak lagi",
];

/** Harga per hari (12 bulan = 365 hari, lainnya 30 hari per bulan). */
const perHari = (amount: number, months: number) => Math.round(amount / (months === 12 ? 365 : months * 30));

export default function PaketPage() {
  const { ent, loading, reload } = useEntitlement();
  const [prices, setPrices] = React.useState<PayPrice[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  React.useEffect(() => {
    let on = true;
    getPrices().then((p) => { if (on) setPrices(p); }).catch(() => { if (on) setPrices([]); });
    return () => { on = false; };
  }, []);

  const mulaiCoba = async () => {
    setBusy(true); setMsg(null);
    const r = await startTrial("pro");
    setBusy(false);
    if (r.ok) { setMsg({ ok: true, text: `Coba Pro ${TRIAL_DAYS} hari dimulai. Selamat mencoba!` }); await reload(); }
    else setMsg({ ok: false, text: r.message });
  };

  const daysLeft = trialDaysLeft(ent.trialEndsAt);
  const basic = !loading && ent.plan === "free";
  const pro = !loading && ent.plan !== "free";
  const paidPro = pro && ent.source === "paid";
  const canTrial = basic && ent.trialAvailable.pro;
  const monthly = prices?.find((p) => p.months === 1)?.amount ?? 0;
  const urut = React.useMemo(() => (prices ? [...prices].sort((x, y) => y.months - x.months) : []), [prices]);
  const termurah = urut.length > 0 ? Math.min(...urut.map((p) => perHari(p.amount, p.months))) : 0;
  const [pilih, setPilih] = React.useState<number | null>(null);
  const terpilih = urut.find((p) => p.months === pilih) ?? urut[0];

  return (
    <div className="pb-24">
      <TopHeader title="Paket" />
      <div className="space-y-4 px-4 pt-2">
        {pro && (
          <Notice tone="emerald" emoji="👑">
            <span data-testid="paket-aktif">{PLAN_LABEL[ent.plan]}{ent.source === "trial" && daysLeft > 0 ? ` (coba gratis, sisa ${daysLeft} hari)` : " aktif"}</span>
            {" · "}Kuota Ruby bulan ini: {ent.aiRemaining} dari {ent.aiLimit} tersisa.
          </Notice>
        )}
        {msg && <Notice role="status" tone={msg.ok ? "emerald" : "rose"} emoji={msg.ok ? "🎉" : "⚠️"}>{msg.text}</Notice>}

        <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs" aria-label="Yang kamu dapat dari Pro">
          <div className="flex flex-col items-center gap-2.5 border-b border-border/80 pb-4">
            <IconBox tone="amber" className="size-14 rounded-[20px] text-3xl"><span aria-hidden>👑</span></IconBox>
            <h1 className="text-xl font-extrabold">{pro ? "Pro aktif" : "Upgrade ke Pro"}</h1>
          </div>
          <ul className="mt-4 space-y-3">
            {MANFAAT.map((m) => (
              <li key={m} className="flex items-start gap-2.5 text-sm leading-snug">
                <Check className="mt-0.5 size-5 shrink-0 rounded-full bg-teal-500/15 p-1 text-teal-500" aria-hidden />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </section>

        <h2 className="px-1 pt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Pilih paketmu</h2>

        {prices === null ? (
          <div className="h-40 animate-pulse rounded-3xl bg-muted" aria-busy="true" />
        ) : urut.length === 0 ? (
          <Notice tone="amber" emoji="🛠️">Harga belum bisa dimuat. Coba lagi sebentar.</Notice>
        ) : (
          <>
            <div role="radiogroup" aria-label="Pilih paket Pro" className="space-y-3">
              {urut.map((p) => {
                const hemat = savingPct(p.months, p.amount, monthly);
                const hari = perHari(p.amount, p.months);
                const terbaik = hari === termurah && p.months > 1;
                const on = terpilih?.months === p.months;
                return (
                  <button
                    key={p.months}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`Pro ${monthsLabel(p.months)}`}
                    onClick={() => setPilih(p.months)}
                    className={`relative flex w-full cursor-pointer items-center justify-between gap-3 rounded-3xl border p-5 text-left transition-all active:scale-[0.98] ${on ? "border-teal-500 bg-teal-500/10" : "border-border/80 bg-card"}`}
                  >
                    {terbaik && <span className="absolute -top-2.5 right-4 rounded-full bg-teal-600 px-3 py-0.5 text-[11px] font-extrabold text-white"><span aria-hidden>✨ </span>Paling hemat</span>}
                    <span className="flex min-w-0 flex-col gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-bold"><span aria-hidden>👑</span>Pro {monthsLabel(p.months)}</span>
                      <span className="text-2xl font-extrabold tabular-nums leading-tight">{formatRupiah(p.amount)}</span>
                      <span className="mt-0.5 text-xs leading-snug text-muted-foreground">{p.months === 1 ? `${formatRupiah(hari)} per hari, coba dulu sebulan` : `Cuma ${formatRupiah(hari)} per hari${hemat > 0 ? ` · Hemat ${hemat}%` : ""}`}</span>
                    </span>
                    <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-teal-500 bg-teal-400" : "border-muted-foreground/40"}`} aria-hidden>
                      {on && <Check className="size-3.5 text-teal-950" strokeWidth={3.5} />}
                    </span>
                  </button>
                );
              })}
            </div>

            {terpilih && (
              <Link
                href={`/paket/bayar?bulan=${terpilih.months}`}
                className="flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-sm font-extrabold text-white shadow-md shadow-emerald-600/25 transition-all active:scale-[0.98] hover:from-emerald-700 hover:to-teal-600"
              >
                <span aria-hidden>👑</span>{paidPro ? "Perpanjang" : "Beli"} Pro {monthsLabel(terpilih.months)} sekarang
              </Link>
            )}
          </>
        )}

        {canTrial && (
          <button
            type="button"
            disabled={busy}
            onClick={mulaiCoba}
            className="flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-teal-500 text-sm font-bold text-teal-600 transition-all active:scale-[0.98] disabled:opacity-60 dark:text-teal-300"
          >
            <span aria-hidden>🎁</span>{busy ? "Memulai..." : `Mulai coba gratis ${TRIAL_DAYS} hari`}
          </button>
        )}
        {basic && !ent.trialAvailable.pro && <Notice tone="sky" emoji="ℹ️">Coba gratis {TRIAL_DAYS} hari sudah pernah kamu pakai. Pilih paket Pro di atas untuk lanjut.</Notice>}
      </div>
    </div>
  );
}
