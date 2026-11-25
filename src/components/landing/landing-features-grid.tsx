"use client";

import * as React from "react";
import {
  Wallet,
  PiggyBank,
  Receipt,
  PieChart,
  Calendar,
  Lock,
  Smartphone,
  Download,
  Users,
  Compass,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

export function LandingFeaturesGrid() {
  const features = [
    {
      icon: Wallet,
      tag: "Multi-Dompet Real-Time",
      title: "Bank, E-Wallet, & Tunai Terhubung Tanpa Password",
      description:
        "Kelola BCA, Mandiri, GoPay, OVO, ShopeePay, hingga dompet fisik tunai dalam satu layar. Dilengkapi tombol 'Sembunyikan Saldo' agar privasimu aman saat membuka aplikasi di tempat umum.",
      highlight: "Mode Privasi Sekali Klik",
    },
    {
      icon: Users,
      tag: "Split Bill Resto",
      title: "Makan Bareng Teman Tanpa Drama Hitung Manual",
      description:
        "Cukup foto struk restoran, pilih siapa yang memesan menu apa. Pajak restoran 11% dan service charge 5% otomatis terbagi adil dan proporsional.",
      highlight: "Foto Struk & Otomatis Bagi Pajak",
    },
    {
      icon: PiggyBank,
      tag: "Target Impian",
      title: "Proyeksi Tanggal Tabungan Tercapai Secara Realistis",
      description:
        "Bikin target tabungan Dana Darurat, Liburan, atau Beli Gadget. Dompetku menghitung setoran per gajian dan tanggal pasti impianmu tercapai.",
      highlight: "Simulasi Berbasis Siklus Gajian",
    },
    {
      icon: Calendar,
      tag: "Tagihan Berulang",
      title: "Jangan Pernah Ketinggalan Tagihan Rutin Bulanan",
      description:
        "Catat biaya langganan seperti Wifi, Netflix, Spotify, BPJS, atau uang kos. Saat jatuh tempo, muncul tombol 'Catat' atau 'Lewati' sekali ketuk di Beranda.",
      highlight: "Pengingat Langganan & Cicilan",
    },
    {
      icon: PieChart,
      tag: "Analisis Arus Kas",
      title: "Pahami Pola Belanja Tanpa Pusing Membaca Tabel",
      description:
        "Visualisasi donut chart kategori pengeluaran, perbandingan pemasukan vs pengeluaran, tren harian, serta indikator kesehatan finansial (Sehat, Waspada, atau Kritis).",
      highlight: "Grafik Bersih & Mudah Dipahami",
    },
    {
      icon: Compass,
      tag: "Perencana Masa Depan",
      title: "Kalkulator Financial Freedom, Pensiun, & Zakat",
      description:
        "Hitung berapa aset yang kamu butuhkan untuk pensiun tenang, rencana pelunasan cicilan kartu kredit, simulasi target beli barang, hingga hitungan zakat mal tahunan.",
      highlight: "Modul Lengkap Perencana Keuangan",
    },
    {
      icon: Smartphone,
      tag: "Modern PWA",
      title: "Enteng, Cepat, & Bisa Diinstall Tanpa App Store",
      description:
        "Berbasis Progressive Web App (PWA). Cukup tambahkan ke layar utama HP (iOS & Android). Ukuran super hemat di bawah 5MB, tanpa iklan pop-up, dan bekerja offline.",
      highlight: "Hemat Memori & Baterai HP",
    },
    {
      icon: Download,
      tag: "Kontrol Data 100%",
      title: "Datamu Milikmu: Ekspor CSV & Backup JSON Penuh",
      description:
        "Tidak ada data yang dikunci. Unduh riwayat transaksi ke format CSV dengan UTF-8 BOM siap buka rapi di Microsoft Excel/Google Sheets, atau unduh backup JSON kapan saja.",
      highlight: "Bebas Vendor Lock-in",
    },
  ];

  return (
    <section id="fitur" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-500/25">
          <Sparkles className="size-3.5" />
          <span>Fitur Lengkap Dirancang untuk Indonesia</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Semua yang Kamu Butuhkan untuk Mencapai Financial Freedom
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Dibangun khusus dengan memperhatikan kebiasaan masyarakat Indonesia mulai dari kebiasaan
          jajan pinggir jalan, siklus gajian bulanan, hingga urusan split bill makan bareng.
        </p>
      </div>

      {/* Grid of 8 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={i}
              className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:border-teal-500/40 hover:shadow-md transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="size-11 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="size-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {f.tag}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors leading-snug">
                  {f.title}
                </h3>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between text-xs font-bold text-teal-600 dark:text-teal-400">
                <span>{f.highlight}</span>
                <CheckCircle2 className="size-4 text-emerald-500" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
