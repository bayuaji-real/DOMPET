"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Sparkles, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import { cn, formatRupiah } from "@/lib/utils";

interface LandingPricingProps {
  isLoggedIn?: boolean;
}

export function LandingPricing({ isLoggedIn = false }: LandingPricingProps) {
  const [selectedDuration, setSelectedDuration] = React.useState<"12" | "6" | "1">("12");

  const plans = [
    {
      months: 1,
      name: "Pro 1 Bulan",
      price: 15000,
      period: "per bulan",
      daily: "Rp500 / hari",
      badge: "Coba Dulu Sebulan",
      highlight: false,
      description: "Sangat terjangkau untuk kamu yang ingin mencoba kenyamanan hidup tanpa ribet nyatet.",
      ctaText: "Pilih 1 Bulan",
    },
    {
      months: 12,
      name: "Pro 12 Bulan (1 Tahun)",
      price: 99000,
      period: "per tahun",
      daily: "Cuma Rp271 / hari",
      badge: "✨ Paling Hemat & Populer (Hemat 45%)",
      highlight: true,
      description: "Pilihan terbaik. Cuma seharga 3 cangkir kopi untuk ketenangan finansial setahun penuh.",
      ctaText: "Mulai Coba Gratis 7 Hari",
    },
    {
      months: 6,
      name: "Pro 6 Bulan",
      price: 50000,
      period: "per 6 bulan",
      daily: "Cuma Rp277 / hari",
      badge: "Hemat 44%",
      highlight: false,
      description: "Pilihan pas untuk komitmen rencana keuangan setengah tahun yang terarah.",
      ctaText: "Pilih 6 Bulan",
    },
  ];

  const proFeatures = [
    "Unlimited catat transaksi pakai foto struk (OCR AI)",
    "Unlimited catat transaksi via pesan suara (Voice Note)",
    "Unlimited konsultasi pribadi dengan Ruby AI",
    "Analisis pola pengeluaran & skor kesehatan finansial",
    "Fitur Split Bill struk resto otomatis bagi pajak",
    "Dompet bersama untuk pasangan atau keluarga",
    "Perencana lengkap: Dana Darurat, Pensiun, Target Beli, & Lunasi Utang",
    "Tanpa batas target tabungan & tagihan rutin",
  ];

  const basicFeatures = [
    "Catat transaksi manual tanpa batas",
    "Multi-dompet (Bank, E-Wallet, Tunai)",
    "Hingga 3 target tabungan & 5 tagihan rutin",
    "Grafik ringkasan arus kas bulanan",
    "Gratis kuota cicip AI Ruby setiap hari",
    "Ekspor mutasi ke CSV untuk Excel",
  ];

  return (
    <section id="paket" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-500/25">
          <Sparkles className="size-3.5" />
          <span>Harga Jujur, Transparan, Tanpa Jebakan</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Investasi Terkecil untuk Ketenangan Finansial Jangka Panjang
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Coba semua fitur Pro gratis 7 hari. Bayar mudah dengan QRIS dari bank atau e-wallet mana saja.
        </p>
      </div>

      {/* Main Pricing Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
        {/* Basic Plan (Free) */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Paket Pemula
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                Gratis Selamanya
              </span>
            </div>

            <h3 className="text-2xl font-extrabold text-foreground">Basic</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Untuk kamu yang baru mau mulai membiasakan diri mencatat aliran uang.
            </p>

            <div className="mt-6 mb-6">
              <span className="text-3xl sm:text-4xl font-black text-foreground">Rp0</span>
              <span className="text-xs text-muted-foreground ml-1.5">selamanya</span>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-foreground/80">
              {basicFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Check className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-8">
            <Link
              href="/login"
              className="w-full flex items-center justify-center py-3.5 rounded-2xl border border-border/80 bg-muted/50 hover:bg-muted text-foreground text-xs font-bold transition-all active:scale-98"
            >
              <span>{isLoggedIn ? "Buka Dashboard" : "Daftar Gratis"}</span>
            </Link>
          </div>
        </div>

        {/* Pro 12 Bulan (The Hero / Main Plan) */}
        <div className="rounded-3xl border-2 border-teal-500 bg-gradient-to-b from-teal-500/10 via-card to-card p-6 sm:p-8 flex flex-col justify-between shadow-xl relative order-first lg:order-none">
          {/* Top Badge */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-[11px] font-extrabold shadow-md flex items-center gap-1.5">
            <Sparkles className="size-3" />
            <span>PALING HEMAT & POPULER</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4 mt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                Akses Penuh 1 Tahun
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-600 text-white">
                Hemat 45%
              </span>
            </div>

            <h3 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              <span>Pro 12 Bulan</span>
              <span className="text-base">👑</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Cuma seharga 3 cup kopi untuk ketenangan finansial setahun penuh.
            </p>

            <div className="mt-6 mb-2">
              <span className="text-3xl sm:text-4xl font-black text-foreground">Rp99.000</span>
              <span className="text-xs text-muted-foreground ml-1.5">/ tahun</span>
            </div>
            <p className="text-xs font-extrabold text-teal-600 dark:text-teal-400 mb-6">
              ✨ Cuma Rp271 per hari
            </p>

            <ul className="space-y-3 text-xs sm:text-sm text-foreground">
              {proFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Check className="size-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="font-medium">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-8 space-y-2">
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white text-xs font-black shadow-lg shadow-teal-700/25 active:scale-98 transition-all"
            >
              <Sparkles className="size-4" />
              <span>Mulai Coba Gratis 7 Hari</span>
              <ArrowRight className="size-4" />
            </Link>
            <p className="text-[10px] text-center text-muted-foreground">
              🎁 Gratis 7 hari pertama. Bisa batalkan kapan saja.
            </p>
          </div>
        </div>

        {/* Pro 1 Bulan & 6 Bulan Options */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Fleksibel & Santai
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                Bebas Komitmen
              </span>
            </div>

            <h3 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              <span>Pro Bulanan</span>
              <span className="text-base">👑</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Bebas pilih masa aktif sesuai anggaran dan kebutuhanmu.
            </p>

            {/* Sub-duration toggle */}
            <div className="mt-5 mb-5 p-1 rounded-2xl bg-muted/80 border border-border/60 grid grid-cols-2 gap-1 text-center">
              <button
                type="button"
                onClick={() => setSelectedDuration("1")}
                className={cn(
                  "py-2 rounded-xl text-xs font-bold transition-all",
                  selectedDuration === "1"
                    ? "bg-card text-foreground shadow-xs border border-border/40"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                1 Bulan (Rp15rb)
              </button>
              <button
                type="button"
                onClick={() => setSelectedDuration("6")}
                className={cn(
                  "py-2 rounded-xl text-xs font-bold transition-all",
                  selectedDuration === "6"
                    ? "bg-card text-foreground shadow-xs border border-border/40"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                6 Bulan (Rp50rb)
              </button>
            </div>

            <div className="mb-6">
              <span className="text-3xl sm:text-4xl font-black text-foreground">
                {selectedDuration === "1" ? "Rp15.000" : "Rp50.000"}
              </span>
              <span className="text-xs text-muted-foreground ml-1.5">
                {selectedDuration === "1" ? "/ bulan" : "/ 6 bulan"}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedDuration === "1"
                  ? "Cuma Rp500 per hari, coba dulu sebulan"
                  : "Cuma Rp277 per hari · Hemat 44%"}
              </p>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-foreground/80">
              <li className="flex items-start gap-2.5">
                <Check className="size-4 text-teal-600 shrink-0 mt-0.5" />
                <span>Semua fitur Pro & AI Ruby aktif tanpa batas</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="size-4 text-teal-600 shrink-0 mt-0.5" />
                <span>Foto struk & pesan suara tanpa batas</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="size-4 text-teal-600 shrink-0 mt-0.5" />
                <span>Bebas perpanjang kapan saja lewat QRIS</span>
              </li>
            </ul>
          </div>

          <div className="pt-8">
            <Link
              href="/login"
              className="w-full flex items-center justify-center py-3.5 rounded-2xl border border-teal-500/50 bg-teal-500/10 hover:bg-teal-500/15 text-teal-700 dark:text-teal-300 text-xs font-bold transition-all active:scale-98"
            >
              <span>Pilih Pro {selectedDuration === "1" ? "1 Bulan" : "6 Bulan"}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Trust & Guarantee Callout */}
      <div className="mt-10 p-5 rounded-3xl bg-muted/40 border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <p className="font-bold text-foreground">Kemudahan Pembayaran QRIS Resmi</p>
            <p>Mendukung BCA, Mandiri, BRI, BNI, GoPay, OVO, ShopeePay, Dana, & LinkAja.</p>
          </div>
        </div>
        <div className="text-center sm:text-right shrink-0">
          <p className="font-bold text-foreground">Tanpa Potongan Langganan Otomatis Liar</p>
          <p>Kamu memegang kendali penuh kapan ingin memperpanjang.</p>
        </div>
      </div>
    </section>
  );
}
