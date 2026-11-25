"use client";

import * as React from "react";
import Image from "next/image";
import {
  XCircle,
  CheckCircle2,
  Sparkles,
  Camera,
  Bot,
  Activity,
  Sliders,
  Receipt,
  Calculator,
  Check,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function LandingRealityCheck() {
  const comparisons = [
    // 1. Struk
    {
      id: "struk",
      ui: (
        <div className="h-full flex flex-col justify-between p-2.5 rounded-xl bg-card/90 border border-teal-500/20 text-[10px] relative overflow-hidden shadow-inner">
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <span className="font-extrabold text-foreground flex items-center gap-1">
              <Camera className="size-3 text-teal-600 dark:text-teal-400" />
              Scan Struk AI
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
              99.8% Akurat
            </span>
          </div>

          <div className="space-y-1 my-1">
            <div className="flex items-center justify-between text-muted-foreground text-[9px]">
              <span>Indomaret Point</span>
              <span>14:32</span>
            </div>
            <div className="flex items-center justify-between font-mono font-bold text-foreground bg-muted/60 px-1.5 py-1 rounded">
              <span className="truncate max-w-[80px]">Roti + Susu</span>
              <span className="text-teal-700 dark:text-teal-300">Rp82.500</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1 border-t border-border/40">
            <Check className="size-2.5" />
            <span>Tercatat otomatis</span>
          </div>
        </div>
      ),
      problemTitle: "Ribet Input Form 10 Kolom Tiap Belanja",
      problemDesc:
        "Beli kebutuhan bulanan harus ketik manual satu per satu: item, tanggal, nominal, dan kategori. Bikin malas dan cepat menyerah.",
      solutionTitle: "Cukup Foto Struk atau Ngomong 3 Detik",
      solutionDesc:
        "Jepret struk belanjaanmu atau ucapkan voice note santai. AI langsung mencatat otomatis ke dompetmu sampai rincian item.",
    },
    // 2. Asisten pribadi
    {
      id: "ruby",
      ui: (
        <div className="h-full flex flex-col justify-between p-2.5 rounded-xl bg-card/90 border border-teal-500/20 text-[10px] relative overflow-hidden shadow-inner">
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <span className="font-extrabold text-foreground flex items-center gap-1">
              <Bot className="size-3 text-teal-600 dark:text-teal-400" />
              Asisten Ruby
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold">
              Online
            </span>
          </div>

          <div className="space-y-1 my-1">
            <div className="p-1 rounded-md bg-muted/70 text-[9px] text-muted-foreground leading-tight">
              &ldquo;Aman beli sepatu 700rb?&rdquo;
            </div>
            <div className="p-1 rounded-md bg-teal-500/10 border border-teal-500/20 text-[9px] text-teal-700 dark:text-teal-300 font-medium leading-tight">
              &ldquo;Aman, sisa jajan Rp1.2jt ✨&rdquo;
            </div>
          </div>

          <div className="flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1 border-t border-border/40">
            <Sparkles className="size-2.5" />
            <span>Nasihat proaktif harian</span>
          </div>
        </div>
      ),
      problemTitle: "Bingung Evaluasi Keuangan Sendiri Tanpa Pendamping",
      problemDesc:
        "Aplikasi biasa cuma menampilkan angka kaku tanpa ada yang mendampingi dan memberi arahan saat kamu bingung mengelola saldo.",
      solutionTitle: "Didampingi Asisten Pribadi Ruby",
      solutionDesc:
        "Kamu akan dapat asisten pribadi (Ruby) yang siap diajak ngobrol kapan saja, memahami kebiasaanmu, dan memberi saran objektif.",
    },
    // 3. Insight dan Konsultasi keuangan
    {
      id: "insight",
      ui: (
        <div className="h-full flex flex-col justify-between p-2.5 rounded-xl bg-card/90 border border-teal-500/20 text-[10px] relative overflow-hidden shadow-inner">
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <span className="font-extrabold text-foreground flex items-center gap-1">
              <Activity className="size-3 text-teal-600 dark:text-teal-400" />
              Skor Kesehatan
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
              88/100 Sehat
            </span>
          </div>

          <div className="space-y-1 my-1 text-[9px]">
            <div className="flex justify-between text-muted-foreground">
              <span>Rasio Tabungan</span>
              <span className="font-bold text-teal-700 dark:text-teal-300">32% (Ideal)</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div className="bg-teal-500 h-full w-[32%]" />
            </div>
            <p className="text-[8.5px] text-muted-foreground leading-tight">
              Bocor: 12% di Kopi &amp; Camilan
            </p>
          </div>

          <div className="flex items-center gap-1 text-[9px] text-teal-700 dark:text-teal-300 font-semibold pt-1 border-t border-border/40">
            <TrendingUp className="size-2.5" />
            <span>Audit pola belanja real-time</span>
          </div>
        </div>
      ),
      problemTitle: "Sekadar 'Kuburan Angka' Tanpa Nasihat dan Solusi",
      problemDesc:
        "Cuma disuguhi grafik merah yang bikin cemas di akhir bulan tanpa tahu cara menghentikan boncos dan ragu apakah aman belanja.",
      solutionTitle: "Insight dan Konsultasi Keuangan Berdasarkan Datamu",
      solutionDesc:
        "Tanya apa saja ke Ruby. Nasihat, audit kebocoran dana, dan rekomendasi dihitung objektif dari data transaksimu sendiri.",
    },
    // 4. Rencanakan kebutuhan yang disesuaikan pemasukanmu
    {
      id: "gajian",
      ui: (
        <div className="h-full flex flex-col justify-between p-2.5 rounded-xl bg-card/90 border border-teal-500/20 text-[10px] relative overflow-hidden shadow-inner">
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <span className="font-extrabold text-foreground flex items-center gap-1">
              <Sliders className="size-3 text-teal-600 dark:text-teal-400" />
              Mode Gajian
            </span>
            <span className="text-[9px] font-mono font-bold text-foreground">
              Rp8.500.000
            </span>
          </div>

          <div className="space-y-1 my-1 text-[9px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kebutuhan (45%)</span>
              <span className="font-bold text-foreground">Rp3.825.000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tabungan (25%)</span>
              <span className="font-bold text-teal-700 dark:text-teal-300">Rp2.125.000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bebas Jajan (15%)</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Rp1.275.000</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1 border-t border-border/40">
            <Check className="size-2.5" />
            <span>Pos terbagi otomatis</span>
          </div>
        </div>
      ),
      problemTitle: "Gaji Numpang Lewat Tanpa Alokasi Pasti",
      problemDesc:
        "Uang gaji masuk lalu cepat ludes karena tidak dipisahkan sejak awal antara kebutuhan hidup pokok, tabungan, dan uang jajan.",
      solutionTitle: "Rencanakan Kebutuhan yang Disesuaikan Pemasukanmu",
      solutionDesc:
        "Mode Gajian otomatis menghitung dan membagi pos kebutuhan pokok, tabungan impian, tagihan rutin, dan saldo bebas jajan.",
    },
    // 5. Split bill
    {
      id: "split",
      ui: (
        <div className="h-full flex flex-col justify-between p-2.5 rounded-xl bg-card/90 border border-teal-500/20 text-[10px] relative overflow-hidden shadow-inner">
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <span className="font-extrabold text-foreground flex items-center gap-1">
              <Receipt className="size-3 text-teal-600 dark:text-teal-400" />
              Split Bill Resto
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold">
              PPN 11% + Serv 5%
            </span>
          </div>

          <div className="space-y-1 my-1 text-[9px]">
            <div className="flex justify-between items-center bg-muted/60 px-1.5 py-0.5 rounded">
              <span>Kamu</span>
              <span className="font-mono font-bold text-foreground">Rp65.000</span>
            </div>
            <div className="flex justify-between items-center bg-muted/60 px-1.5 py-0.5 rounded">
              <span>Andi &amp; Siti</span>
              <span className="font-mono font-bold text-foreground">Rp100.000</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1 border-t border-border/40">
            <Check className="size-2.5" />
            <span>Porsi pajak adil otomatis</span>
          </div>
        </div>
      ),
      problemTitle: "Drama Split Bill & Hitung Pajak Manual",
      problemDesc:
        "Makan bareng teman, struk resto panjang, lalu repot buka kalkulator untuk membagi diskon, service charge 5%, dan PPN 11%.",
      solutionTitle: "Split Bill Struk Otomatis Sekali Jepret",
      solutionDesc:
        "Foto struk restoran, tandai pesanan masing-masing, sistem membagi porsi pajak dan diskon secara proporsional sampai rupiah terakhir.",
    },
    // 6. Simulasi investasi, cicilan, hingga paylater
    {
      id: "cicilan",
      ui: (
        <div className="h-full flex flex-col justify-between p-2.5 rounded-xl bg-card/90 border border-teal-500/20 text-[10px] relative overflow-hidden shadow-inner">
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <span className="font-extrabold text-foreground flex items-center gap-1">
              <Calculator className="size-3 text-teal-600 dark:text-teal-400" />
              Simulasi Cicilan
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
              Aman Cashflow
            </span>
          </div>

          <div className="space-y-1 my-1 text-[9px]">
            <div className="flex justify-between text-muted-foreground">
              <span>Target Laptop</span>
              <span className="font-bold text-foreground">Rp12.000.000</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-muted-foreground">Beban Tenor 12x</span>
              <span className="font-bold text-teal-700 dark:text-teal-300">Rp1.050.000/bln</span>
            </div>
            <p className="text-[8.5px] text-muted-foreground leading-tight">
              Beban 12% dari gaji bulanan
            </p>
          </div>

          <div className="flex items-center gap-1 text-[9px] text-teal-700 dark:text-teal-300 font-semibold pt-1 border-t border-border/40">
            <Sparkles className="size-2.5" />
            <span>Ketahui bunga sebelum beli</span>
          </div>
        </div>
      ),
      problemTitle: "Terjebak Bunga Cicilan & Paylater Tanpa Perhitungan",
      problemDesc:
        "Asal ambil cicilan atau paylater tanpa tahu total bunga yang menumpuk dan bagaimana dampaknya terhadap kesehatan cashflow bulananmu.",
      solutionTitle: "Simulasi Investasi, Cicilan, hingga Paylater",
      solutionDesc:
        "Simulasikan beban cicilan sebelum membeli, ukur kelayakan target barang impian, dan proyeksikan pertumbuhan aset investasimu secara realistis.",
    },
  ];

  return (
    <section className="py-14 sm:py-20 border-y border-border/80 bg-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-2.5 mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-500/20">
            <span>💡 Kenapa Dompetku Dibuat Berbeda?</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            Bukan Aplikasi Finansial Ribet tapi Asisten & Penasihat Finansial Khususmu
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
            Kamu akan dapat assistant (Ruby) yang bakal ngasih kamu rekomendasi dan nasihat dari
            transaksimu. Jadi keuanganmu akan lebih sehat.
          </p>
        </div>

        {/* 3 Compact Rows x 2 Columns = 6 Feature Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
          {comparisons.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl sm:rounded-3xl border border-border/80 bg-card hover:border-teal-500/40 transition-all shadow-xs flex flex-col sm:flex-row items-stretch overflow-hidden group"
            >
              {/* Left Side: Mock UI Preview stretching top to bottom */}
              <div className="w-full sm:w-44 md:w-48 shrink-0 bg-muted/30 border-b sm:border-b-0 sm:border-r border-border/60 p-3 sm:p-3.5 flex flex-col justify-center">
                {c.ui}
              </div>

              {/* Right Side: Problem (Top) & Solution (Bottom) stacked tightly to the top */}
              <div className="flex-1 p-3.5 sm:p-4 flex flex-col justify-start gap-2.5">
                {/* Problem Side (Red X) */}
                <div className="flex items-start gap-2">
                  <XCircle className="size-4.5 shrink-0 text-rose-500 mt-0.5" />
                  <div className="space-y-0.5">
                    <h3 className="text-xs sm:text-sm font-extrabold text-rose-600 dark:text-rose-400 leading-tight">
                      {c.problemTitle}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {c.problemDesc}
                    </p>
                  </div>
                </div>

                {/* Fine separator line */}
                <div className="border-t border-border/50 my-0.5" />

                {/* Solution Side (Green Checkmark) */}
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4.5 shrink-0 text-emerald-500 mt-0.5" />
                  <div className="space-y-0.5">
                    <h3 className="text-xs sm:text-sm font-extrabold text-teal-700 dark:text-teal-300 leading-tight">
                      {c.solutionTitle}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-foreground/85 leading-relaxed line-clamp-2">
                      {c.solutionDesc}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
