"use client";

import * as React from "react";
import { XCircle, CheckCircle2, AlertTriangle, Sparkles, Shield, HeartHandshake } from "lucide-react";

export function LandingRealityCheck() {
  const comparisons = [
    {
      problemTitle: "Ribet Input Form 10 Kolom",
      problemDesc:
        "Beli gorengan Rp5.000 atau parkir Rp2.000 harus isi nama, kategori, dompet, tanggal, dan catatan manual. Hasilnya: malas mencatat setelah 3 hari.",
      solutionTitle: "Cukup Foto Struk atau Ngomong 3 Detik",
      solutionDesc:
        "Jepret struk belanjaanmu atau ucapkan voice note: 'Beli bensin 30rb tunai dan kopi 20rb gopay'. AI otomatis memisahkan nominal, dompet, dan kategorinya.",
    },
    {
      problemTitle: "Cemas Minta Login & Password Bank",
      problemDesc:
        "Aplikasi lain memaksa koneksi Open Finance, meminta username dan PIN mobile banking yang berisiko jika server mereka terkena data breach.",
      solutionTitle: "100% Bebas Akses Kredensial Perbankan",
      solutionDesc:
        "Dompetku tidak pernah meminta password rekening atau kode OTP apapun. Keuanganmu tetap rapi tanpa pernah mengorbankan privasi dan keamanan asetmu.",
    },
    {
      problemTitle: "Sekadar 'Kuburan Angka' Tanpa Aksi",
      problemDesc:
        "Cuma disuguhi grafik merah yang bikin cemas di akhir bulan tanpa tahu bagaimana cara menghentikan kebiasaan boncos.",
      solutionTitle: "Asisten Pribadi Ruby & Mode Gajian",
      solutionDesc:
        "Ruby siap ditanya kapan saja: 'Aman gak beli gadget minggu ini?'. Plus Mode Gajian yang otomatis mengalokasikan tabungan sebelum uangmu habis terpakai.",
    },
    {
      problemTitle: "Drama Split Bill & Hitung Pajak Manual",
      problemDesc:
        "Makan bareng teman, struk resto panjang, lalu repot buka kalkulator untuk membagi diskon, service charge 5%, dan PPN 11%.",
      solutionTitle: "Split Bill Struk Otomatis Sekali Jepret",
      solutionDesc:
        "Foto struk restoran, tandai pesanan masing-masing, sistem menghitung porsi pajak dan diskon secara proporsional sampai rupiah terakhir.",
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
            Bukan Aplikasi Finansial Biasa yang Bikin Kamu Malas Nyatet
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Kebanyakan orang gagal mengatur keuangan bukan karena kurang niat, melainkan karena
            alat yang dipakai terlalu rumit dan menuntut waktu.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {comparisons.map((c, i) => (
            <div
              key={i}
              className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:border-teal-500/30 transition-colors"
            >
              {/* Problem Side */}
              <div className="pb-5 border-b border-border/60">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs mb-1.5">
                  <XCircle className="size-4 shrink-0" />
                  <span>Cara Konvensional yang Melelahkan</span>
                </div>
                <h3 className="text-base font-extrabold text-foreground mb-1">
                  {c.problemTitle}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {c.problemDesc}
                </p>
              </div>

              {/* Solution Side */}
              <div className="pt-5">
                <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-xs mb-1.5">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  <span>Pendekatan Dompetku</span>
                </div>
                <h3 className="text-base font-extrabold text-teal-700 dark:text-teal-300 mb-1">
                  {c.solutionTitle}
                </h3>
                <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
                  {c.solutionDesc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
