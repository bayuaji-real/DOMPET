"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Cta, IconBox, Pill, Notice, AURORA, AuroraGlow } from "@/components/ui/form-kit";
import { TopHeader } from "@/components/layout/top-header";
import { useEntitlement } from "@/hooks/use-entitlement";
import { startTrial } from "@/lib/data/entitlement";
import { getPrices, type PayPrice } from "@/lib/data/payment";
import { AI_GRATIS, PLAN_LABEL, TRIAL_DAYS, trialDaysLeft } from "@/lib/plans";
import { monthsLabel, savingPct } from "@/lib/payment";
import { formatRupiah } from "@/lib/utils";

/** Apa yang didapat dari Pro: ditulis sebagai hasil untuk pengguna, bukan daftar fitur. */
const MANFAAT: { emoji: string; judul: string; isi: string }[] = [
  { emoji: "📸", judul: "Catat dalam hitungan detik", isi: "Foto struk atau ngomong saja, Ruby yang mengisi. Tanpa jatah harian." },
  { emoji: "🧠", judul: "Asisten keuangan pribadimu", isi: "Tanya Ruby apa saja soal uangmu. Jawabannya dari datamu sendiri, bukan jawaban umum." },
  { emoji: "📊", judul: "Tahu uangmu lari ke mana", isi: "Analisis arus kas dan kategori, plus insight dari Ruby." },
  { emoji: "🩺", judul: "Lihat masalah sebelum terjadi", isi: "Skor kesehatan keuangan, peringatan dini, dan proyeksi saldo 3 bulan ke depan." },
  { emoji: "🎯", judul: "Rencana tanpa batas", isi: "Target tabungan, transaksi berulang, dan Planner Acara sebanyak yang kamu mau." },
  { emoji: "🤝", judul: "Urus uang bareng", isi: "Dompet Bersama, Split Bill dari foto struk, dan simulator cicilan." },
];

const BASIC_FITUR = [
  "Catat pemasukan dan pengeluaran sepuasnya",
  "3 target tabungan, 5 transaksi berulang, 1 Planner Acara",
  "Split Bill manual, rencana lunasi utang, impor CSV",
  "Kalkulator investasi dan zakat, laporan mingguan",
];

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
  const termurah = prices && prices.length > 0 ? Math.min(...prices.map((p) => Math.round(p.amount / p.months))) : 0;

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

        {/* Jualan: apa yang kamu dapat */}
        <section className={`relative overflow-hidden rounded-3xl p-5 text-white shadow-lg shadow-teal-700/25 ${AURORA}`} aria-label="Yang kamu dapat dari Pro">
          <AuroraGlow />
          <p className="relative text-[11px] font-bold uppercase tracking-wider text-white/90">Pro untuk kamu yang mau uangnya beres</p>
          <h1 className="relative mt-1 text-xl font-extrabold leading-tight">Catat lebih cepat, tahu kondisi uang lebih jelas, rencana lebih tenang.</h1>
          <ul className="relative mt-4 space-y-3">
            {MANFAAT.map((m) => (
              <li key={m.judul} className="flex items-start gap-3">
                <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg">{m.emoji}</span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold leading-tight">{m.judul}</p>
                  <p className="mt-0.5 text-xs font-medium leading-snug text-white/90">{m.isi}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Coba gratis 7 hari */}
        {canTrial && (
          <section className="rounded-3xl border border-emerald-400/60 bg-emerald-400/10 p-4 shadow-xs" aria-label="Coba Pro gratis">
            <div className="flex items-start gap-3">
              <IconBox tone="neon"><span aria-hidden>🎁</span></IconBox>
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold">Coba Pro gratis {TRIAL_DAYS} hari</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Semua fitur Pro langsung terbuka. Tanpa bayar, tanpa kartu, tanpa perpanjangan otomatis. Berhenti kapan saja, catatanmu tetap aman.</p>
              </div>
            </div>
            <Cta className="mt-3" disabled={busy} onClick={mulaiCoba}>
              <Sparkles className="size-4" aria-hidden /> {busy ? "Memulai..." : `Mulai coba gratis ${TRIAL_DAYS} hari`}
            </Cta>
          </section>
        )}
        {basic && !ent.trialAvailable.pro && <Notice tone="sky" emoji="ℹ️">Coba gratis {TRIAL_DAYS} hari sudah pernah kamu pakai. Pilih paket Pro di bawah untuk lanjut.</Notice>}

        <h2 className="px-1 pt-1 text-sm font-extrabold">Pilih paketmu</h2>

        {/* Kartu 1: Basic */}
        <section className={`rounded-3xl border bg-card p-4 shadow-xs ${basic ? "border-emerald-400" : "border-border/80"}`} aria-label="Paket Basic">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <IconBox tone="sky"><span aria-hidden>🌱</span></IconBox>
              <div className="min-w-0"><h3 className="text-base font-extrabold">Basic</h3><p className="text-[11px] text-muted-foreground">Cukup untuk mulai mencatat</p></div>
            </div>
            <p className="text-lg font-extrabold">Rp0</p>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {BASIC_FITUR.map((f) => (<li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 rounded-full bg-emerald-400/25 p-0.5 text-emerald-600" aria-hidden />{f}</li>))}
            <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 rounded-full bg-emerald-400/25 p-0.5 text-emerald-600" aria-hidden /><span><b>{AI_GRATIS}</b>: foto struk dan catat suara 2x sehari, Tanya Ruby 5 pesan</span></li>
          </ul>
          {basic && <div className="mt-3"><Pill icon="✅">Paket aktif kamu</Pill></div>}
        </section>

        {/* Kartu 2-4: Pro 1, 6, 12 bulan */}
        {prices === null ? (
          <div className="h-40 animate-pulse rounded-3xl bg-muted" aria-busy="true" />
        ) : prices.length === 0 ? (
          <Notice tone="amber" emoji="🛠️">Harga belum bisa dimuat. Coba lagi sebentar.</Notice>
        ) : (
          prices.map((p) => {
            const hemat = savingPct(p.months, p.amount, monthly);
            const perBulan = Math.round(p.amount / p.months);
            const terbaik = perBulan === termurah && p.months > 1;
            return (
              <section key={p.months} className={`relative rounded-3xl border bg-card p-4 shadow-xs ${terbaik ? "border-amber-400 ring-2 ring-amber-400/30" : "border-border/80"}`} aria-label={`Pro ${monthsLabel(p.months)}`}>
                {terbaik && <span className="absolute -top-2.5 left-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-0.5 text-[10px] font-extrabold text-white shadow">Paling hemat</span>}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <IconBox tone="neon"><span aria-hidden>👑</span></IconBox>
                    <div className="min-w-0"><h3 className="text-base font-extrabold">Pro {monthsLabel(p.months)}</h3><p className="text-[11px] text-muted-foreground">{p.months > 1 ? `Sekitar ${formatRupiah(perBulan)} per bulan` : "Coba dulu sebulan"}</p></div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold tabular-nums">{formatRupiah(p.amount)}</p>
                    {hemat > 0 && <Pill tone="amber">Hemat {hemat}%</Pill>}
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Semua yang ada di Basic, ditambah semua fitur Pro di atas. Bayar sekali lewat QRIS.</p>
                <Link
                  href={`/paket/bayar?bulan=${p.months}`}
                  className={`mt-3 flex h-11 w-full cursor-pointer items-center justify-center rounded-2xl text-xs font-bold text-white shadow-md transition-all active:scale-[0.98] ${terbaik ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600" : "bg-gradient-to-r from-emerald-600 to-teal-500 shadow-emerald-600/25 hover:from-emerald-700 hover:to-teal-600"}`}
                  aria-label={`${paidPro ? "Perpanjang" : "Pilih"} Pro ${monthsLabel(p.months)} ${formatRupiah(p.amount)}`}
                >
                  <span aria-hidden>👑</span>&nbsp;{paidPro ? "Perpanjang" : "Pilih"} {monthsLabel(p.months)}
                </Link>
              </section>
            );
          })
        )}

        <p className="text-xs text-muted-foreground">Dibayar lewat QRIS, sekali di muka, tanpa perpanjangan otomatis. Kalau masa Pro habis, akunmu kembali ke Basic dan semua catatanmu tetap aman.</p>
      </div>
    </div>
  );
}
