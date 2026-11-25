"use client";

import * as React from "react";
import {
  Wallet,
  Users,
  PiggyBank,
  Calendar,
  PieChart,
  Compass,
  Smartphone,
  Download,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Pause,
  Play,
  Clock,
  FileSpreadsheet,
  Check,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function LandingFeaturesGrid() {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [showBalance, setShowBalance] = React.useState(true);
  const [selectedWallet, setSelectedWallet] = React.useState<"bca" | "gopay" | "mandiri">("bca");

  const AUTO_INTERVAL_MS = 3000;

  const features = [
    {
      id: "multi-dompet",
      icon: Wallet,
      tag: "Multi-Dompet Real-Time",
      title: "Bank, E-Wallet, & Tunai Terhubung Tanpa Password",
      description:
        "Kelola BCA, Mandiri, GoPay, OVO, ShopeePay, hingga dompet tunai dalam satu layar. Dilengkapi tombol 'Sembunyikan Saldo' agar privasimu aman di tempat umum.",
      highlight: "Mode Privasi Sekali Klik",
    },
    {
      id: "split-bill",
      icon: Users,
      tag: "Split Bill Resto",
      title: "Makan Bareng Teman Tanpa Drama Hitung Manual",
      description:
        "Cukup foto struk restoran, pilih siapa yang memesan menu apa. Pajak resto 11% dan service charge 5% otomatis terbagi adil dan proporsional.",
      highlight: "Foto Struk & Otomatis Bagi Pajak",
    },
    {
      id: "target-impian",
      icon: PiggyBank,
      tag: "Target Impian",
      title: "Proyeksi Tanggal Tabungan Tercapai Secara Realistis",
      description:
        "Bikin target tabungan Dana Darurat, Liburan, atau Beli Gadget. Dompetku menghitung setoran per gajian dan tanggal pasti impianmu tercapai.",
      highlight: "Simulasi Berbasis Siklus Gajian",
    },
    {
      id: "tagihan-rutin",
      icon: Calendar,
      tag: "Tagihan Berulang",
      title: "Jangan Pernah Ketinggalan Tagihan Rutin Bulanan",
      description:
        "Catat biaya langganan seperti Wifi, Netflix, Spotify, BPJS, atau uang kos. Saat jatuh tempo, muncul tombol 'Catat' atau 'Lewati' sekali ketuk di Beranda.",
      highlight: "Pengingat Langganan & Cicilan",
    },
    {
      id: "analisis-kas",
      icon: PieChart,
      tag: "Analisis Arus Kas",
      title: "Pahami Pola Belanja Tanpa Pusing Membaca Tabel",
      description:
        "Visualisasi donut chart kategori pengeluaran, perbandingan pemasukan vs pengeluaran, tren harian, serta indikator kesehatan finansial (Sehat, Waspada, atau Kritis).",
      highlight: "Grafik Bersih & Mudah Dipahami",
    },
    {
      id: "perencana-masa-depan",
      icon: Compass,
      tag: "Perencana Masa Depan",
      title: "Kalkulator Financial Freedom, Pensiun, & Zakat",
      description:
        "Hitung berapa aset yang kamu butuhkan untuk pensiun tenang, rencana pelunasan cicilan kartu kredit, simulasi target beli barang, hingga hitungan zakat mal tahunan.",
      highlight: "Modul Lengkap Perencana Keuangan",
    },
    {
      id: "hemat-memori",
      icon: Smartphone,
      tag: "Hemat Memori",
      title: "Enteng, Cepat, & Bisa Dipasang Tanpa App Store",
      description:
        "Cukup tambahkan ke layar utama HP (iOS & Android). Ukuran super hemat di bawah 5MB, tanpa iklan pop-up, dan bekerja cepat.",
      highlight: "Hemat Memori & Baterai HP",
    },
    {
      id: "kontrol-data",
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

      {/* Main Two-Column Interactive Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* LEFT COLUMN: Animated UI Demo (Never Static) */}
        <div
          className="lg:col-span-5 sticky top-24"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="rounded-[2.5rem] p-3 sm:p-4 bg-gradient-to-b from-card via-card/90 to-card border-2 border-teal-500/30 shadow-2xl shadow-teal-900/15 relative overflow-hidden backdrop-blur-xl">
            {/* Top Device Header */}
            <div className="flex items-center justify-between px-3 pt-1 pb-3 text-xs text-muted-foreground border-b border-border/50">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-foreground">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>09:41</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 font-extrabold text-[10px]">
                  Demo Fitur #{activeIndex + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setIsPaused((prev) => !prev)}
                  title={isPaused ? "Lanjutkan Auto-Slide" : "Jeda Demo"}
                  className="size-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isPaused ? <Play className="size-3" /> : <Pause className="size-3" />}
                </button>
              </div>
            </div>

            {/* Simulated App Screen (Dynamic based on activeIndex) */}
            <div className="mt-3 rounded-[1.75rem] bg-background/95 border border-border/70 p-4 sm:p-5 min-h-[460px] sm:min-h-[490px] flex flex-col justify-between relative overflow-hidden">
              {/* FEATURE 0: Multi-Dompet Real-Time */}
              {activeIndex === 0 && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Total Saldo (Semua)
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-2xl font-black text-foreground">
                          {showBalance ? "Rp14.850.000" : "••••••••"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowBalance(!showBalance)}
                          className="size-6 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          {showBalance ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                      Mode Privasi
                    </span>
                  </div>

                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-muted-foreground">Pilih Dompet:</span>
                    <div
                      onClick={() => setSelectedWallet("bca")}
                      className={cn(
                        "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                        selectedWallet === "bca"
                          ? "border-teal-500 bg-teal-500/10 shadow-xs"
                          : "border-border/60 bg-card/60"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-xl bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs">
                          BCA
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">BCA Utama (Gaji)</p>
                          <p className="text-[10px] text-muted-foreground">Tabungan &amp; Operasional</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold font-mono text-foreground">
                        {showBalance ? "Rp8.250.000" : "••••••"}
                      </span>
                    </div>

                    <div
                      onClick={() => setSelectedWallet("gopay")}
                      className={cn(
                        "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                        selectedWallet === "gopay"
                          ? "border-teal-500 bg-teal-500/10 shadow-xs"
                          : "border-border/60 bg-card/60"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-xl bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs">
                          GP
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">GoPay Jajan</p>
                          <p className="text-[10px] text-muted-foreground">Transport &amp; Kopi</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold font-mono text-foreground">
                        {showBalance ? "Rp450.000" : "••••••"}
                      </span>
                    </div>

                    <div
                      onClick={() => setSelectedWallet("mandiri")}
                      className={cn(
                        "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                        selectedWallet === "mandiri"
                          ? "border-teal-500 bg-teal-500/10 shadow-xs"
                          : "border-border/60 bg-card/60"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-xl bg-amber-600/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs">
                          MDR
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Mandiri Darurat</p>
                          <p className="text-[10px] text-muted-foreground">Dana Darurat 6 Bulan</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold font-mono text-foreground">
                        {showBalance ? "Rp6.150.000" : "••••••"}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/60 border border-border/50 text-[10px] text-muted-foreground flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                    <span>100% Bebas Kredensial: Tidak pernah meminta password atau OTP bank.</span>
                  </div>
                </div>
              )}

              {/* FEATURE 1: Split Bill Resto */}
              {activeIndex === 1 && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <div>
                      <p className="text-xs font-extrabold text-foreground">Warung Pasta &amp; Grill</p>
                      <p className="text-[10px] text-muted-foreground">Makan Siang Bareng Kantor</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 text-[10px] font-bold">
                      Struk Terbaca
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground text-[11px]">
                      <span>1x Aglio Olio (Kamu)</span>
                      <span className="font-mono">Rp45.000</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-[11px]">
                      <span>1x Margherita Pizza (Andi &amp; Siti)</span>
                      <span className="font-mono">Rp75.000</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-[11px]">
                      <span>3x Lemon Tea</span>
                      <span className="font-mono">Rp45.000</span>
                    </div>
                    <div className="flex justify-between font-bold text-foreground text-xs pt-1 border-t border-border/40">
                      <span>Pajak Resto 11% + Serv 5%</span>
                      <span className="text-teal-700 dark:text-teal-300 font-mono">+Rp26.400</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 space-y-2">
                    <p className="text-[11px] font-extrabold text-teal-700 dark:text-teal-300">
                      Porsi Tagihan Terbagi Rata Otomatis:
                    </p>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between items-center bg-card/80 px-2 py-1 rounded-lg">
                        <span className="font-medium text-foreground">Kamu (Aglio + 1 Teh)</span>
                        <span className="font-mono font-bold text-teal-700 dark:text-teal-300">Rp69.600 ✓</span>
                      </div>
                      <div className="flex justify-between items-center bg-card/80 px-2 py-1 rounded-lg">
                        <span className="font-medium text-foreground">Andi (1/2 Pizza + Teh)</span>
                        <span className="font-mono font-bold text-foreground">Rp60.900</span>
                      </div>
                      <div className="flex justify-between items-center bg-card/80 px-2 py-1 rounded-lg">
                        <span className="font-medium text-foreground">Siti (1/2 Pizza + Teh)</span>
                        <span className="font-mono font-bold text-foreground">Rp60.900</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-center text-muted-foreground">
                    ⚡ Tidak ada yang nombokin pajak atau pusing hitung manual.
                  </p>
                </div>
              )}

              {/* FEATURE 2: Target Impian */}
              {activeIndex === 2 && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-teal-500/15 via-emerald-500/10 to-card border border-teal-500/30">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                        🛡️ Dana Darurat 6 Bulan
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-600 text-white">
                        65% Tercapai
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between font-mono my-2">
                      <span className="text-lg font-black text-teal-700 dark:text-teal-300">
                        Rp19.500.000
                      </span>
                      <span className="text-xs text-muted-foreground">/ Rp30.000.000</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full w-[65%] rounded-full animate-pulse" />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                      <span>Setoran: Rp1.500.000 / gajian</span>
                      <span className="font-bold text-foreground">Sisa 7x setoran</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl border border-border/70 bg-card/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        ✈️ Liburan ke Labuan Bajo
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">Rp7.2jt / Rp12jt</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className="bg-teal-500 h-full w-[60%] rounded-full" />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[10px] text-teal-700 dark:text-teal-300 flex items-center gap-2 font-medium">
                    <Sparkles className="size-4 shrink-0 text-teal-500" />
                    <span>Proyeksi cerdas: Target Dana Darurat tercapai tepat pada 25 Oktober 2026!</span>
                  </div>
                </div>
              )}

              {/* FEATURE 3: Tagihan Berulang */}
              {activeIndex === 3 && (
                <div className="space-y-3.5 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between pb-1 border-b border-border/60">
                    <span className="text-xs font-extrabold text-foreground">
                      Tagihan Rutin Bulan Ini
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold">
                      2 Mendekati Tempo
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-lg bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold text-[10px]">
                          WIFI
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Indihome 50Mbps</p>
                          <p className="text-[10px] text-rose-500 font-semibold">Jatuh tempo dlm 2 hari</p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-xs text-foreground">Rp385.000</span>
                    </div>
                    <button
                      type="button"
                      className="w-full py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-black tracking-wide transition-all shadow-xs"
                    >
                      Catat Otomatis ke Dompet BCA
                    </button>
                  </div>

                  <div className="p-2.5 rounded-2xl border border-border/70 bg-card/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-red-600/20 text-red-600 flex items-center justify-center font-bold text-[10px]">
                        NFLX
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Netflix 4K Premium</p>
                        <p className="text-[10px] text-muted-foreground">Jatuh tempo 28 Nov</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-xs text-foreground">Rp186.000</span>
                  </div>

                  <div className="p-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold text-[10px]">
                        BPJS
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">BPJS Kesehatan Kelas 1</p>
                        <p className="text-[10px] text-emerald-600 font-semibold">Sudah dibayar ✓</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-xs text-muted-foreground">Rp150.000</span>
                  </div>
                </div>
              )}

              {/* FEATURE 4: Analisis Arus Kas */}
              {activeIndex === 4 && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">Skor Kesehatan Finansial</p>
                      <p className="text-xl font-black text-teal-700 dark:text-teal-300">88 / 100</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                      Kondisi Sehat ✨
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-muted-foreground">
                      <span>Porsi Pengeluaran Terbesar</span>
                      <span>Bulan Ini</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-foreground font-medium">🍔 Makan &amp; Minum (42%)</span>
                          <span className="font-mono text-muted-foreground">Rp3.200.000</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div className="bg-amber-500 h-full w-[42%]" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-foreground font-medium">🛒 Kebutuhan Bulanan (28%)</span>
                          <span className="font-mono text-muted-foreground">Rp2.150.000</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div className="bg-teal-500 h-full w-[28%]" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-foreground font-medium">🛵 Transport &amp; Bensin (18%)</span>
                          <span className="font-mono text-muted-foreground">Rp1.400.000</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div className="bg-blue-500 h-full w-[18%]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-card border border-border/70 text-[10px] text-muted-foreground">
                    💡 <strong className="text-foreground">Insight Ruby:</strong> Pengeluaran kopi harian
                    mengambil 8% cashflowmu. Batasi 1 cup/hari bisa menghemat Rp450rb/bulan!
                  </div>
                </div>
              )}

              {/* FEATURE 5: Perencana Masa Depan */}
              {activeIndex === 5 && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-card to-card border border-indigo-500/30">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                      Target Financial Freedom
                    </span>
                    <div className="my-1.5">
                      <span className="text-xl font-black text-foreground">Rp2.250.000.000</span>
                      <p className="text-[10px] text-muted-foreground">Rule of 25 • Bebas Finansial</p>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden my-2">
                      <div className="bg-gradient-to-r from-indigo-500 to-teal-400 h-full w-[22%]" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Aset terkumpul: <strong className="text-foreground">Rp495.000.000 (22%)</strong>
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl border border-border/70 bg-card/60 space-y-1.5 text-xs">
                    <p className="font-extrabold text-foreground">Kalkulator Zakat &amp; Pensiun</p>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Nisab Zakat Emas (85 gr)</span>
                      <span className="font-mono text-foreground font-bold">Telah Melebihi Nisab</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Kewajiban Zakat Mal (2.5%)</span>
                      <span className="font-mono font-bold text-teal-700 dark:text-teal-300">
                        Rp12.375.000 / thn
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-center text-muted-foreground">
                    Hitungan otomatis disesuaikan dengan harga emas harian dan siklus haul 1 tahun.
                  </p>
                </div>
              )}

              {/* FEATURE 6: Hemat Memori */}
              {activeIndex === 6 && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 text-center py-2">
                  <div className="size-16 rounded-3xl bg-teal-600/15 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center border border-teal-500/25">
                    <Smartphone className="size-8" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-base font-extrabold text-foreground">
                      Ukuran Super Ramping: &lt;5MB
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Tanpa harus unduh 200MB+ dari App Store. Pasang langsung ke beranda HP dalam 2 detik.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-left pt-2">
                    <div className="p-2.5 rounded-xl bg-card border border-border/60">
                      <p className="text-[10px] text-muted-foreground">Kecepatan Buka</p>
                      <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        0.28 Detik
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-card border border-border/60">
                      <p className="text-[10px] text-muted-foreground">Konsumsi RAM</p>
                      <p className="text-sm font-black text-teal-700 dark:text-teal-300 font-mono">
                        Sangat Hemat
                      </p>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-teal-500/10 text-[10px] text-teal-700 dark:text-teal-300 font-semibold">
                    ✓ Bekerja cepat dan responsif bahkan di koneksi internet lemah
                  </div>
                </div>
              )}

              {/* FEATURE 7: Kontrol Data 100% */}
              {activeIndex === 7 && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-center space-y-2">
                    <FileSpreadsheet className="size-8 text-teal-600 dark:text-teal-400 mx-auto" />
                    <div>
                      <p className="text-xs font-extrabold text-foreground">Pusat Ekspor Data Mandiri</p>
                      <p className="text-[10px] text-muted-foreground">
                        Unduh mutasi lengkap kapan saja tanpa batasan
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="p-3 rounded-2xl border border-border/70 bg-card/60 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-foreground">File CSV (Microsoft Excel)</p>
                        <p className="text-[10px] text-muted-foreground">Format UTF-8 BOM rapi tanpa teks rusak</p>
                      </div>
                      <span className="px-2 py-1 rounded-lg bg-teal-600 text-white text-[10px] font-bold">
                        Download
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl border border-border/70 bg-card/60 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-foreground">Backup JSON Penuh</p>
                        <p className="text-[10px] text-muted-foreground">Semua dompet, target, dan tagihan</p>
                      </div>
                      <span className="px-2 py-1 rounded-lg bg-muted text-foreground text-[10px] font-bold">
                        Backup
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-muted/60 text-[10px] text-muted-foreground text-center">
                    🔒 Keamanan database PostgreSQL Row Level Security (RLS) terisolasi.
                  </div>
                </div>
              )}

              {/* Bottom Progress Bar on the Mockup Phone */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-semibold">{features[activeIndex].tag}</span>
                <div className="flex gap-1">
                  {features.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        idx === activeIndex
                          ? "w-6 bg-teal-500"
                          : "w-2 bg-muted hover:bg-muted-foreground/40"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 8 Features List (Clickable & Auto-Advances) */}
        <div className="lg:col-span-7 space-y-3">
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
                    ? "bg-card border-2 border-teal-500 shadow-xl shadow-teal-900/10 p-4 sm:p-5 scale-[1.01]"
                    : "bg-card/40 hover:bg-card/90 border border-border/60 hover:border-teal-500/40 p-3.5 sm:p-4"
                )}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Number Badge */}
                  <div
                    className={cn(
                      "size-8 sm:size-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors",
                      isActive
                        ? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>

                  {/* Title & Content */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            isActive ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground"
                          )}
                        />
                        <span
                          className={cn(
                            "text-xs font-bold uppercase tracking-wider",
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
                        "text-sm sm:text-base font-extrabold leading-snug transition-colors",
                        isActive ? "text-foreground" : "text-foreground/85"
                      )}
                    >
                      {f.title}
                    </h3>

                    {/* Description visible when active or compact on hover */}
                    {isActive ? (
                      <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {f.description}
                        </p>
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-300">
                          <CheckCircle2 className="size-3.5" />
                          <span>{f.highlight}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground line-clamp-1">
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
