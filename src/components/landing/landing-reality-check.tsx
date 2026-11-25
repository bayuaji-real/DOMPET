"use client";

import * as React from "react";
import { XCircle, CheckCircle2 } from "lucide-react";

export function LandingRealityCheck() {
  const comparisons = [
    // 1. Struk
    {
      problemTitle: "Ribet Input Form 10 Kolom Tiap Belanja",
      problemDesc:
        "Beli kebutuhan bulanan atau jajan harus ketik manual satu per satu: item, tanggal, nominal, kategori. Bikin malas dan cepat berhenti mencatat.",
      solutionTitle: "Cukup Foto Struk atau Ngomong 3 Detik",
      solutionDesc:
        "Jepret struk belanjaanmu atau ucapkan voice note santai. AI otomatis membaca merchant, rincian item belanja, diskon promo, dan total bayar ke dompetmu.",
    },
    // 2. Assisten pribadi
    {
      problemTitle: "Bingung Evaluasi Keuangan Sendiri Tanpa Pendamping",
      problemDesc:
        "Aplikasi biasa cuma menampilkan angka kaku tanpa ada yang mendampingi dan memberi arahan saat kamu bingung mengelola saldo.",
      solutionTitle: "Didampingi Asisten Pribadi Ruby",
      solutionDesc:
        "Kamu akan dapat asisten pribadi (Ruby) yang siap diajak ngobrol kapan saja, memahami kebiasaanmu, dan memberi rekomendasi agar keuanganmu lebih sehat.",
    },
    // 3. Insight dan Konsultasi keuangan
    {
      problemTitle: "Sekadar 'Kuburan Angka' Tanpa Nasihat dan Solusi",
      problemDesc:
        "Cuma disuguhi grafik merah yang bikin cemas di akhir bulan tanpa tahu cara menghentikan boncos dan ragu apakah aman membeli sesuatu.",
      solutionTitle: "Insight dan Konsultasi Keuangan Berdasarkan Datamu",
      solutionDesc:
        "Tanya apa saja ke Ruby: 'Aman gak beli sepatu 700rb?', 'Bulan ini bocor di mana?'. Nasihat dan rekomendasi dihitung objektif dari data transaksimu sendiri.",
    },
    // 4. Rencanakan kebutuhan yang disesuaikan pemasukanmu
    {
      problemTitle: "Gaji Numpang Lewat Tanpa Alokasi Pasti",
      problemDesc:
        "Uang gaji masuk lalu cepat ludes karena tidak dipisahkan sejak awal antara kebutuhan hidup pokok, tabungan, dan uang jajan.",
      solutionTitle: "Rencanakan Kebutuhan yang Disesuaikan Pemasukanmu",
      solutionDesc:
        "Mode Gajian otomatis menghitung dan membagi pos kebutuhan pokok (45%), tabungan impian (25%), tagihan rutin (15%), dan saldo bebas jajan (15%).",
    },
    // 5. Split bill
    {
      problemTitle: "Drama Split Bill & Hitung Pajak Manual",
      problemDesc:
        "Makan bareng teman, struk resto panjang, lalu repot buka kalkulator untuk membagi diskon, service charge 5%, dan PPN 11%.",
      solutionTitle: "Split Bill Struk Otomatis Sekali Jepret",
      solutionDesc:
        "Foto struk restoran, tandai pesanan masing-masing, sistem membagi porsi pajak dan diskon secara proporsional dan adil sampai ke rupiah terakhir.",
    },
    // 6. Simulasi investasi, cicilan, hingga paylater
    {
      problemTitle: "Terjebak Bunga Cicilan & Paylater Tanpa Perhitungan",
      problemDesc:
        "Asal ambil cicilan atau paylater tanpa tahu total bunga yang menumpuk dan bagaimana dampaknya terhadap kesehatan cashflow bulananmu.",
      solutionTitle: "Simulasi Investasi, Cicilan, hingga Paylater",
      solutionDesc:
        "Simulasikan beban cicilan sebelum membeli, ukur kelayakan target barang impian, dan proyeksikan pertumbuhan aset investasimu secara realistis.",
    },
  ];

  return (
    <section className="py-16 sm:py-24 border-y border-border/80 bg-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-500/20">
            <span>💡 Kenapa Dompetku Dibuat Berbeda?</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Bukan Aplikasi Finansial Ribet tapi Asisten & Penasihat Finansial Khususmu
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Kamu akan dapat assistant (Ruby) yang bakal ngasih kamu rekomendasi dan nasihat dari
            transaksimu. Jadi keuanganmu akan lebih sehat.
          </p>
        </div>

        {/* 3 Rows x 2 Columns = 6 Feature Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {comparisons.map((c, i) => (
            <div
              key={i}
              className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:border-teal-500/30 transition-colors"
            >
              {/* Problem Side */}
              <div className="pb-4 border-b border-border/60">
                <div className="flex items-start gap-2.5">
                  <XCircle className="size-5 shrink-0 text-rose-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-rose-600 dark:text-rose-400">
                      {c.problemTitle}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
                      {c.problemDesc}
                    </p>
                  </div>
                </div>
              </div>

              {/* Solution Side */}
              <div className="pt-4">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-teal-700 dark:text-teal-300">
                      {c.solutionTitle}
                    </h3>
                    <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed mt-1">
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
