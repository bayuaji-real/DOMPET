"use client";

import * as React from "react";
import Image from "next/image";
import { XCircle, CheckCircle2 } from "lucide-react";

export function LandingRealityCheck() {
  const comparisons = [
    // 1. Struk
    {
      id: "struk",
      screenshot: "/screenshots/scan-struk.png",
      featureTag: "Scan Struk AI",
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
      screenshot: "/screenshots/chat-ruby.png",
      featureTag: "Asisten Ruby AI",
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
      screenshot: "/screenshots/kesehatan.png",
      featureTag: "Kesehatan Finansial",
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
      screenshot: "/screenshots/beranda-wallet.png",
      featureTag: "Mode Gajian & Pos",
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
      screenshot: "/screenshots/split-bill.png",
      featureTag: "Split Bill Resto",
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
      screenshot: "/screenshots/cicilan-utang.png",
      featureTag: "Simulasi Cicilan",
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
              className="rounded-2xl sm:rounded-3xl border border-border/80 bg-card hover:border-teal-500/40 transition-all shadow-xs flex flex-row items-stretch overflow-hidden group min-h-[175px] sm:min-h-[195px]"
            >
              {/* Left Side: Authentic Mobile Phone Mockup */}
              <div className="w-28 sm:w-36 md:w-40 shrink-0 bg-gradient-to-b from-muted/50 to-muted/20 border-r border-border/60 p-2 sm:p-2.5 flex items-center justify-center">
                {/* Mini Phone Chassis */}
                <div className="w-full h-full max-h-[175px] rounded-[1.4rem] sm:rounded-[1.6rem] p-1 sm:p-1.5 bg-neutral-900 border-2 border-neutral-700/80 shadow-md flex flex-col relative overflow-hidden">
                  {/* Dynamic Island / Notch */}
                  <div className="w-9 sm:w-11 h-2 rounded-full bg-black mx-auto mb-1 shrink-0 flex items-center justify-center">
                    <span className="size-1 rounded-full bg-neutral-800" />
                  </div>

                  {/* Phone Screen with Real App UI Screenshot */}
                  <div className="relative flex-1 w-full rounded-[1rem] overflow-hidden bg-background">
                    <Image
                      src={c.screenshot}
                      alt={c.featureTag}
                      fill
                      sizes="(max-width: 768px) 120px, 160px"
                      className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Gradient overlay at bottom with tag */}
                    <div className="absolute inset-x-0 bottom-0 pt-4 pb-1 px-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-center">
                      <span className="text-[8px] sm:text-[9px] font-extrabold text-white/95 leading-none px-1.5 py-0.5 rounded-full bg-teal-600/90 backdrop-blur-xs">
                        {c.featureTag}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Problem (Top) & Solution (Bottom) stacked tightly to the top */}
              <div className="flex-1 p-3 sm:p-4 flex flex-col justify-start gap-2 sm:gap-2.5">
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
