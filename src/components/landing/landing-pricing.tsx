"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface LandingPricingProps {
  isLoggedIn?: boolean;
}

export function LandingPricing({ isLoggedIn = false }: LandingPricingProps) {
  const [selectedPlan, setSelectedPlan] = React.useState<"basic" | "1" | "6" | "12">("12");

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

  const plans = [
    {
      id: "basic" as const,
      name: "Basic",
      crown: false,
      tag: "Paket Pemula",
      badge: "Gratis Selamanya",
      price: "Rp0",
      period: "selamanya",
      daily: null,
      description: "Untuk kamu yang baru mau mulai membiasakan diri mencatat aliran uang.",
      features: basicFeatures,
      primaryCta: {
        text: isLoggedIn ? "Buka Dashboard" : "Daftar Gratis",
        href: "/login",
      },
      secondaryCta: null,
    },
    {
      id: "1" as const,
      name: "Pro 1 Bulan",
      crown: true,
      tag: "Fleksibel",
      badge: "Bebas Komitmen",
      price: "Rp15.000",
      period: "/ bulan",
      daily: "Cuma Rp500 / hari, coba dulu sebulan",
      description: "Sangat terjangkau untuk kamu yang ingin mencoba kenyamanan hidup tanpa ribet.",
      features: proFeatures,
      primaryCta: {
        text: "Pilih Pro 1 Bulan",
        href: "/login",
      },
      secondaryCta: {
        text: "Mulai Coba Gratis 7 Hari",
        href: "/login",
      },
    },
    {
      id: "6" as const,
      name: "Pro 6 Bulan",
      crown: true,
      tag: "Setengah Tahun",
      badge: "Hemat 44%",
      price: "Rp50.000",
      period: "/ 6 bulan",
      daily: "Cuma Rp277 / hari",
      description: "Pilihan pas untuk komitmen rencana keuangan setengah tahun yang terarah.",
      features: proFeatures,
      primaryCta: {
        text: "Pilih Pro 6 Bulan",
        href: "/login",
      },
      secondaryCta: {
        text: "Mulai Coba Gratis 7 Hari",
        href: "/login",
      },
    },
    {
      id: "12" as const,
      name: "Pro 12 Bulan",
      crown: true,
      tag: "Akses 1 Tahun",
      badge: "Hemat 45%",
      price: "Rp99.000",
      period: "/ tahun",
      daily: "✨ Cuma Rp271 / hari",
      description: "Paling hemat. Cuma seharga 3 cup kopi untuk ketenangan finansial setahun penuh.",
      features: proFeatures,
      primaryCta: {
        text: "Pilih Pro 12 Bulan",
        href: "/login",
      },
      secondaryCta: {
        text: "Mulai Coba Gratis 7 Hari",
        href: "/login",
      },
    },
  ];

  return (
    <section id="paket" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Investasi Terkecil untuk Ketenangan Finansial Jangka Panjang
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Coba semua fitur Pro gratis 7 hari. Bayar mudah dengan QRIS dari bank atau e-wallet mana saja.
        </p>
      </div>

      {/* 4 Blocks Grid (From Basic leftmost to 12 Bulan rightmost) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 items-stretch">
        {plans.map((p) => {
          const isSelected = selectedPlan === p.id;
          const is12 = p.id === "12";

          return (
            <div
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={cn(
                "rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 cursor-pointer relative",
                isSelected
                  ? "border-2 border-teal-500 bg-gradient-to-b from-teal-500/10 via-card to-card shadow-xl shadow-teal-500/10 scale-[1.01]"
                  : "border border-border/80 bg-card hover:border-teal-500/50 hover:shadow-md hover:bg-card/90"
              )}
            >
              {/* Special Badge for 12 Bulan */}
              {is12 && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-[10px] font-black shadow-md flex items-center gap-1 whitespace-nowrap">
                  <Sparkles className="size-3" />
                  <span>PALING HEMAT & POPULER</span>
                </div>
              )}

              <div>
                {/* Card Sub-Header */}
                <div className="flex items-center justify-between mb-3 mt-1">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      isSelected ? "text-teal-700 dark:text-teal-300" : "text-muted-foreground"
                    )}
                  >
                    {p.tag}
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold",
                      isSelected && is12
                        ? "bg-teal-600 text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {p.badge}
                  </span>
                </div>

                {/* Plan Name */}
                <h3 className="text-xl font-extrabold text-foreground flex items-center gap-1.5">
                  <span>{p.name}</span>
                  {p.crown && <span className="text-sm">👑</span>}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  {p.description}
                </p>

                {/* Price */}
                <div className="mt-5 mb-1">
                  <span className="text-2xl sm:text-3xl font-black text-foreground">
                    {p.price}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">{p.period}</span>
                </div>

                {/* Daily Cost Note */}
                <div className="h-5 mb-4">
                  {p.daily ? (
                    <p
                      className={cn(
                        "text-[11px] font-bold leading-tight",
                        isSelected ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground"
                      )}
                    >
                      {p.daily}
                    </p>
                  ) : (
                    <span className="text-[11px] text-muted-foreground block">
                      Tanpa biaya selamanya
                    </span>
                  )}
                </div>

                {/* Features List */}
                <ul className="space-y-2.5 text-xs text-foreground/85 border-t border-border/60 pt-4">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check
                        className={cn(
                          "size-3.5 shrink-0 mt-0.5",
                          isSelected
                            ? "text-teal-600 dark:text-teal-400"
                            : "text-muted-foreground"
                        )}
                        strokeWidth={2.5}
                      />
                      <span className="leading-tight text-[11px]">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 space-y-2 mt-auto">
                <Link
                  href={p.primaryCta.href}
                  className={cn(
                    "w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl text-xs font-black transition-all active:scale-98 shadow-xs",
                    isSelected
                      ? "bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white shadow-md shadow-teal-700/20"
                      : "bg-muted/70 hover:bg-muted text-foreground border border-border/80"
                  )}
                >
                  {is12 && <Sparkles className="size-3.5" />}
                  <span>{p.primaryCta.text}</span>
                  {isSelected && <ArrowRight className="size-3.5" />}
                </Link>

                {p.secondaryCta && (
                  <Link
                    href={p.secondaryCta.href}
                    className="w-full flex items-center justify-center py-2 text-[11px] font-bold text-teal-700 dark:text-teal-300 hover:underline transition-all"
                  >
                    <span>{p.secondaryCta.text}</span>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
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
