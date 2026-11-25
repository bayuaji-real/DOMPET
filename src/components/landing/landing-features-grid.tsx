"use client";

import * as React from "react";
import Image from "next/image";
import {
  Wallet,
  Users,
  PiggyBank,
  Calendar,
  PieChart,
  Compass,
  Smartphone,
  Download,
  CheckCircle2,
  Sparkles,
  Pause,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function LandingFeaturesGrid() {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);

  const AUTO_INTERVAL_MS = 3000;

  const features = [
    {
      id: "multi-dompet",
      screenshot: "/screenshots/dompet.png",
      icon: Wallet,
      tag: "Multi-Dompet Real-Time",
      title: "Bank, E-Wallet, & Tunai Terhubung Tanpa Password",
      description:
        "Kelola BCA, Mandiri, GoPay, OVO, ShopeePay, hingga dompet tunai dalam satu layar. Dilengkapi tombol 'Sembunyikan Saldo' agar privasimu aman di tempat umum.",
      highlight: "Mode Privasi Sekali Klik",
    },
    {
      id: "split-bill",
      screenshot: "/screenshots/split-bill.png",
      icon: Users,
      tag: "Split Bill Resto",
      title: "Makan Bareng Teman Tanpa Drama Hitung Manual",
      description:
        "Cukup foto struk restoran, pilih siapa yang memesan menu apa. Pajak resto 11% dan service charge 5% otomatis terbagi adil dan proporsional.",
      highlight: "Foto Struk & Otomatis Bagi Pajak",
    },
    {
      id: "target-impian",
      screenshot: "/screenshots/tabungan.png",
      icon: PiggyBank,
      tag: "Target Impian",
      title: "Proyeksi Tanggal Tabungan Tercapai Secara Realistis",
      description:
        "Bikin target tabungan Dana Darurat, Liburan, atau Beli Gadget. Dompetku menghitung setoran per gajian dan tanggal pasti impianmu tercapai.",
      highlight: "Simulasi Berbasis Siklus Gajian",
    },
    {
      id: "tagihan-rutin",
      screenshot: "/screenshots/berulang.png",
      icon: Calendar,
      tag: "Tagihan Berulang",
      title: "Jangan Pernah Ketinggalan Tagihan Rutin Bulanan",
      description:
        "Catat biaya langganan seperti Wifi, Netflix, Spotify, BPJS, atau uang kos. Saat jatuh tempo, muncul tombol 'Catat' atau 'Lewati' sekali ketuk di Beranda.",
      highlight: "Pengingat Langganan & Cicilan",
    },
    {
      id: "analisis-kas",
      screenshot: "/screenshots/analisis.png",
      icon: PieChart,
      tag: "Analisis Arus Kas",
      title: "Pahami Pola Belanja Tanpa Pusing Membaca Tabel",
      description:
        "Visualisasi donut chart kategori pengeluaran, perbandingan pemasukan vs pengeluaran, tren harian, serta indikator kesehatan finansial (Sehat, Waspada, atau Kritis).",
      highlight: "Grafik Bersih & Mudah Dipahami",
    },
    {
      id: "perencana-masa-depan",
      screenshot: "/screenshots/financial-freedom.png",
      icon: Compass,
      tag: "Perencana Masa Depan",
      title: "Kalkulator Financial Freedom, Pensiun, & Zakat",
      description:
        "Hitung berapa aset yang kamu butuhkan untuk pensiun tenang, rencana pelunasan cicilan kartu kredit, simulasi target beli barang, hingga hitungan zakat mal tahunan.",
      highlight: "Modul Lengkap Perencana Keuangan",
    },
    {
      id: "hemat-memori",
      screenshot: "/screenshots/beranda-wallet.png",
      icon: Smartphone,
      tag: "Hemat Memori",
      title: "Enteng, Cepat, & Bisa Dipasang Tanpa App Store",
      description:
        "Cukup tambahkan ke layar utama HP (iOS & Android). Ukuran super hemat di bawah 5MB, tanpa iklan pop-up, dan bekerja cepat.",
      highlight: "Hemat Memori & Baterai HP",
    },
    {
      id: "kontrol-data",
      screenshot: "/screenshots/pengaturan-ekspor.png",
      icon: Download,
      tag: "Kontrol Data 100%",
      title: "Datamu Milikmu: Ekspor CSV & Backup JSON Penuh",
      description:
        "Tidak ada data yang dikunci. Unduh riwayat transaksi ke format CSV dengan UTF-8 BOM siap buka rapi di Microsoft Excel/Google Sheets, atau unduh backup JSON kapan saja.",
      highlight: "Bebas Vendor Lock-in",
    },
  ];

  // Auto-slide every 3 seconds
  React.useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features.length);
    }, AUTO_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isPaused, features.length]);

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

      {/* Main Two-Column Showcase: Left = Phone Mockup aligned from #1 to #8 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
        {/* LEFT COLUMN: Real Phone Mockup Matching Height with Right List (aligned top to bottom) */}
        <div
          className="lg:col-span-5 flex flex-col justify-center items-center"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Smartphone Chassis with true full phone aspect ratio (390:844) */}
          <div className="relative w-full max-w-[340px] sm:max-w-[370px] aspect-[390/844] rounded-[3rem] p-2.5 sm:p-3 bg-gradient-to-b from-neutral-800 via-neutral-900 to-neutral-950 border-[3.5px] border-neutral-700/90 shadow-2xl shadow-teal-950/50 flex flex-col overflow-hidden">
            {/* Dynamic Island / Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 rounded-full bg-black z-30 flex items-center justify-between px-2.5 shadow-sm">
              <span className="size-2 rounded-full bg-neutral-900 border border-neutral-800" />
              <span className="size-1.5 rounded-full bg-teal-500/60" />
            </div>

            {/* Inner Phone Screen displaying Full Screen without cutting off bottom navigation */}
            <div className="relative flex-1 w-full rounded-[2.3rem] overflow-hidden bg-background border border-neutral-800/80">
              {features.map((f, idx) => (
                <div
                  key={f.id}
                  className={cn(
                    "absolute inset-0 transition-opacity duration-300",
                    idx === activeIndex
                      ? "opacity-100 z-10"
                      : "opacity-0 pointer-events-none z-0"
                  )}
                >
                  <Image
                    src={f.screenshot}
                    alt={f.title}
                    fill
                    unoptimized
                    sizes="(max-width: 1024px) 100vw, 420px"
                    className="object-contain object-top"
                    priority={idx === 0}
                  />
                </div>
              ))}

              {/* Bottom Subtle Glass Indicator Bar */}
              <div className="absolute inset-x-0 bottom-2.5 px-3 z-30 pointer-events-none">
                <div className="p-2 rounded-2xl bg-black/75 backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-between text-white text-[11px] pointer-events-auto">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-extrabold px-2 py-0.5 rounded-full bg-teal-600 text-[10px] shrink-0">
                      #{activeIndex + 1}
                    </span>
                    <span className="font-bold text-[11px] truncate">
                      {features[activeIndex].tag}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Dots indicator */}
                    <div className="flex gap-1">
                      {features.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveIndex(idx)}
                          className={cn(
                            "h-1.5 rounded-full transition-all",
                            idx === activeIndex
                              ? "w-4 bg-teal-400"
                              : "w-1.5 bg-white/30 hover:bg-white/60"
                          )}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPaused((prev) => !prev)}
                      title={isPaused ? "Lanjutkan Auto-Slide" : "Jeda Demo"}
                      className="size-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    >
                      {isPaused ? <Play className="size-3" /> : <Pause className="size-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 8 Features List (Clickable & Synchronized from #1 to #8) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-2.5">
          {features.map((f, i) => {
            const isActive = i === activeIndex;
            const Icon = f.icon;

            return (
              <div
                key={f.id}
                onClick={() => {
                  setActiveIndex(i);
                  setIsPaused(false);
                }}
                className={cn(
                  "rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden relative",
                  isActive
                    ? "bg-card border-2 border-teal-500 shadow-xl shadow-teal-900/10 p-3.5 sm:p-4 scale-[1.01]"
                    : "bg-card/40 hover:bg-card/90 border border-border/60 hover:border-teal-500/40 p-2.5 sm:p-3"
                )}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Number Badge */}
                  <div
                    className={cn(
                      "size-7 sm:size-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors",
                      isActive
                        ? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>

                  {/* Title & Content */}
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Icon
                          className={cn(
                            "size-3.5 shrink-0",
                            isActive ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground"
                          )}
                        />
                        <span
                          className={cn(
                            "text-[10px] sm:text-[11px] font-bold uppercase tracking-wider",
                            isActive
                              ? "text-teal-700 dark:text-teal-300 font-extrabold"
                              : "text-muted-foreground"
                          )}
                        >
                          {f.tag}
                        </span>
                      </div>

                      {/* Active Pill Badge */}
                      {isActive && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 text-[10px] font-extrabold">
                          <span className="size-1.5 rounded-full bg-teal-500 animate-pulse" />
                          Sedang Ditampilkan
                        </span>
                      )}
                    </div>

                    <h3
                      className={cn(
                        "text-xs sm:text-sm font-extrabold leading-tight transition-colors",
                        isActive ? "text-foreground" : "text-foreground/85"
                      )}
                    >
                      {f.title}
                    </h3>

                    {/* Description visible when active */}
                    {isActive ? (
                      <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                        <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                          {f.description}
                        </p>
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-700 dark:text-teal-300">
                          <CheckCircle2 className="size-3" />
                          <span>{f.highlight}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {f.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Animated timer indicator on active card */}
                {isActive && !isPaused && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted overflow-hidden">
                    <div
                      key={`timer-${activeIndex}`}
                      className="h-full bg-teal-500 animate-feature-progress"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
