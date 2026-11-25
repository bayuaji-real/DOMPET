"use client";

import * as React from "react";
import { XCircle, CheckCircle2, Sparkles, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function LandingRealityCheck() {
  const comparisons = [
    {
      category: "Pencatatan",
      problem: "Form 10 kolom melelahkan",
      solution: "Foto struk & voice note 3 detik",
    },
    {
      category: "AI & Pendamping",
      categoryShort: "AI",
      problem: "Angka kaku tidak sesuai keuanganmu",
      solution: "Didampingi asisten pribadi Ruby AI sesuai keuanganmu",
    },
    {
      category: "Evaluasi",
      problem: "Grafik bikin panik akhir bulan",
      solution: "Insight & audit kebocoran danamu ada di mana",
    },
    {
      category: "Alokasi Gaji",
      problem: "Gaji cepat ludes tanpa pos",
      solution: "Mode Gajian membantumu membagi uangmu",
    },
    {
      category: "Makan Bareng",
      problem: "Pusing hitung pajak & diskon resto",
      solution: "Split bill tinggal foto struk sudah otomatis kebagi ke temenmu",
    },
    {
      category: "Cicilan",
      problem: "Terjebak bunga paylater tanpa sadar",
      solution: "Simulasi cicilan & investasi terukur",
    },
  ];

  return (
    <section className="py-16 sm:py-24 border-y border-border/80 bg-muted/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-500/20">
            <span>💡 Kenapa Dompetku Dibuat Berbeda?</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            Bukan Aplikasi Finansial Ribet tapi Asisten & Penasihat Finansial Khususmu
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Kamu akan dapat assistant (Ruby) yang bakal ngasih kamu rekomendasi dan nasihat dari
            transaksimu. Jadi keuanganmu akan lebih sehat.
          </p>
        </div>

        {/* Side-by-Side Comparison Table (2 Master Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {/* COLUMN 1: Cara Lama / Aplikasi Finansial Biasa (Red Accent) */}
          <div className="rounded-3xl border border-rose-500/20 bg-card/70 p-6 sm:p-8 flex flex-col justify-between shadow-xs">
            <div>
              {/* Header Kolom Kiri */}
              <div className="pb-5 border-b border-border/60">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-black border border-rose-500/20">
                  <XCircle className="size-3.5 shrink-0" />
                  <span>Cara Konvensional</span>
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-foreground mt-3">
                  Aplikasi Finansial Biasa
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Menuntut banyak waktu, kaku, dan bikin malas mencatat setelah 3 hari.
                </p>
              </div>

              {/* 6 Baris Masalah */}
              <div className="divide-y divide-border/50">
                {comparisons.map((c, i) => (
                  <div key={i} className="py-4 sm:py-4.5 space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500/90 dark:text-rose-400/90">
                      {c.category}
                    </span>
                    <div className="flex items-start gap-2.5">
                      <div className="size-5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                        <XCircle className="size-3.5" />
                      </div>
                      <p className="text-sm sm:text-base font-bold text-foreground/90 leading-snug">
                        {c.problem}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-border/50 text-[11px] text-muted-foreground flex items-center gap-2">
              <AlertCircle className="size-3.5 text-rose-500 shrink-0" />
              <span>Seringkali berakhir cuma jadi kuburan angka tanpa solusi nyata.</span>
            </div>
          </div>

          {/* COLUMN 2: Dompetku (Teal / Emerald Glowing Highlight) */}
          <div className="rounded-3xl border-2 border-teal-500 bg-gradient-to-b from-teal-500/10 via-card to-card p-6 sm:p-8 flex flex-col justify-between shadow-2xl shadow-teal-500/10 relative overflow-hidden">
            {/* Top Recommended Tag */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-teal-600 to-emerald-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-2xl shadow-xs">
              Lebih Cepat &amp; Personal
            </div>

            <div>
              {/* Header Kolom Kanan */}
              <div className="pb-5 border-b border-border/60">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 text-xs font-black border border-teal-500/30">
                  <Sparkles className="size-3.5 shrink-0 text-teal-500" />
                  <span>Pendekatan Dompetku</span>
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-foreground mt-3 flex items-center gap-2">
                  <span>Dompetku AI &amp; Assistant</span>
                  <span className="text-sm">✨</span>
                </h3>
                <p className="text-xs sm:text-sm text-teal-700/80 dark:text-teal-300/80 mt-1">
                  Otomatis, personal, dan memberi nasihat finansial nyata sesuai kondisimu.
                </p>
              </div>

              {/* 6 Baris Solusi */}
              <div className="divide-y divide-border/50">
                {comparisons.map((c, i) => (
                  <div key={i} className="py-4 sm:py-4.5 space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                      {c.category}
                    </span>
                    <div className="flex items-start gap-2.5">
                      <div className="size-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <CheckCircle2 className="size-3.5" />
                      </div>
                      <p className="text-sm sm:text-base font-extrabold text-foreground leading-snug">
                        {c.solution}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-border/50 text-[11px] text-teal-700 dark:text-teal-300 font-semibold flex items-center gap-2">
              <Sparkles className="size-3.5 shrink-0 text-teal-500" />
              <span>Semua berjalan otomatis tanpa repot mengetik satu per satu.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
