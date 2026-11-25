"use client";

import * as React from "react";
import { XCircle, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";

export function LandingRealityCheck() {
  const comparisons = [
    {
      category: "Pencatatan",
      problem: "Form 10 kolom melelahkan",
      solution: "Foto struk & voice note 3 detik",
    },
    {
      category: "AI & Pendamping",
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

        {/* Unified Comparison Table (Pasti Sejajar & Sama Tinggi Row-by-Row) */}
        <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xl">
          {/* Header Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 border-b border-border/80">
            {/* Left Header (Cara Konvensional) */}
            <div className="p-5 sm:p-6 bg-rose-500/5 md:border-r border-border/70 flex flex-col justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-black border border-rose-500/20 w-fit">
                <XCircle className="size-3.5 shrink-0" />
                <span>Cara Konvensional</span>
              </span>
              <div className="mt-3">
                <h3 className="text-lg sm:text-xl font-black text-foreground">
                  Aplikasi Finansial Biasa
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Menuntut banyak waktu, kaku, dan bikin malas mencatat.
                </p>
              </div>
            </div>

            {/* Right Header (Pendekatan Dompetku) */}
            <div className="p-5 sm:p-6 bg-teal-500/10 relative flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 text-xs font-black border border-teal-500/30 w-fit">
                  <Sparkles className="size-3.5 shrink-0 text-teal-500" />
                  <span>Pendekatan Dompetku</span>
                </span>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-teal-600 text-white shadow-xs">
                  Lebih Cepat &amp; Personal
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-lg sm:text-xl font-black text-foreground flex items-center gap-1.5">
                  <span>Dompetku AI &amp; Assistant</span>
                  <span className="text-sm">✨</span>
                </h3>
                <p className="text-xs text-teal-700/80 dark:text-teal-300/80 mt-0.5">
                  Otomatis, personal, dan memberi nasihat finansial nyata.
                </p>
              </div>
            </div>
          </div>

          {/* 6 Paired Comparison Rows: Guaranteed Identical Height */}
          <div className="divide-y divide-border/60">
            {comparisons.map((c, i) => (
              <div
                key={i}
                className="grid grid-cols-1 md:grid-cols-2 items-stretch transition-colors hover:bg-muted/20"
              >
                {/* Left Cell (Red) */}
                <div className="p-4 sm:p-5 md:border-r border-border/70 flex flex-col justify-center space-y-1 bg-rose-500/[0.02]">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-500/90 dark:text-rose-400/90">
                    {c.category}
                  </span>
                  <div className="flex items-start gap-2.5">
                    <div className="size-5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                      <XCircle className="size-3.5" />
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-foreground/90 leading-snug">
                      {c.problem}
                    </p>
                  </div>
                </div>

                {/* Right Cell (Teal) */}
                <div className="p-4 sm:p-5 bg-teal-500/[0.04] flex flex-col justify-center space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-300">
                    {c.category}
                  </span>
                  <div className="flex items-start gap-2.5">
                    <div className="size-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <CheckCircle2 className="size-3.5" />
                    </div>
                    <p className="text-xs sm:text-sm font-extrabold text-foreground leading-snug">
                      {c.solution}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Footnote Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 border-t border-border/80 text-[11px] text-muted-foreground">
            <div className="p-3.5 sm:p-4 bg-muted/30 md:border-r border-border/70 flex items-center gap-2">
              <AlertCircle className="size-3.5 text-rose-500 shrink-0" />
              <span>Seringkali berakhir cuma jadi kuburan angka tanpa solusi nyata.</span>
            </div>
            <div className="p-3.5 sm:p-4 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold flex items-center gap-2">
              <Sparkles className="size-3.5 shrink-0 text-teal-500" />
              <span>Semua berjalan otomatis tanpa repot mengetik satu per satu.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
