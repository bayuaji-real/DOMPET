"use client";

import * as React from "react";
import Image from "next/image";
import {
  Camera,
  Mic,
  Sparkles,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  Receipt,
  Volume2,
  Calendar,
  Wallet,
  ShoppingBag,
  Fuel,
  Coffee,
  Check,
  Zap,
} from "lucide-react";
import { cn, formatRupiah } from "@/lib/utils";

export function LandingInteractiveDemos() {
  const [activeTab, setActiveTab] = React.useState<"struk" | "suara" | "gajian">("struk");

  // State Demo Struk
  const [selectedReceipt, setSelectedReceipt] = React.useState<"indomaret" | "kopi">("indomaret");
  const [scanningReceipt, setScanningReceipt] = React.useState(false);
  const [receiptScanned, setReceiptScanned] = React.useState(true);

  // State Demo Suara
  const [selectedVoiceIdx, setSelectedVoiceIdx] = React.useState(0);
  const [playingVoice, setPlayingVoice] = React.useState(false);
  const [voiceExtracted, setVoiceExtracted] = React.useState(true);

  // State Demo Gajian
  const [gaji, setGaji] = React.useState(8500000);

  const handleScanReceipt = () => {
    setScanningReceipt(true);
    setReceiptScanned(false);
    setTimeout(() => {
      setScanningReceipt(false);
      setReceiptScanned(true);
    }, 1100);
  };

  const voicePresets = [
    {
      id: "v1",
      audioText: "Beli mie ayam 22 ribu tunai sama es teh manis 5 ribu bayar gopay",
      result: [
        {
          name: "Mie Ayam",
          amount: 22000,
          wallet: "Uang Tunai",
          category: "Makanan & Minuman",
          type: "expense",
        },
        {
          name: "Es Teh Manis",
          amount: 5000,
          wallet: "GoPay",
          category: "Makanan & Minuman",
          type: "expense",
        },
      ],
    },
    {
      id: "v2",
      audioText: "Isi bensin Pertamax 50 ribu tunai terus beli pulsa Telkomsel 100 ribu transfer BCA",
      result: [
        {
          name: "Bensin Pertamax",
          amount: 50000,
          wallet: "Uang Tunai",
          category: "Transportasi",
          type: "expense",
        },
        {
          name: "Pulsa Telkomsel",
          amount: 100000,
          wallet: "BCA Utama",
          category: "Tagihan & Pulsa",
          type: "expense",
        },
      ],
    },
    {
      id: "v3",
      audioText: "Dapet transferan komisi desain freelance 1 juta 500 ribu masuk ke rekening BCA",
      result: [
        {
          name: "Komisi Desain Freelance",
          amount: 1500000,
          wallet: "BCA Utama",
          category: "Gaji & Pemasukan",
          type: "income",
        },
      ],
    },
  ];

  const handlePlayVoice = (idx: number) => {
    setSelectedVoiceIdx(idx);
    setPlayingVoice(true);
    setVoiceExtracted(false);
    setTimeout(() => {
      setPlayingVoice(false);
      setVoiceExtracted(true);
    }, 1200);
  };

  // Kalkulasi Alokasi Gajian Dinamis
  const livingCost = Math.round(gaji * 0.45);
  const emergencyAndGoals = Math.round(gaji * 0.25);
  const recurringBills = Math.round(gaji * 0.15);
  const safeGuiltFreeMoney = gaji - livingCost - emergencyAndGoals - recurringBills;

  return (
    <section id="demo-ai" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-500/25">
          <Sparkles className="size-3.5" />
          <span>Demo Interaktif Tanpa Instalasi</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Coba Langsung Kehebatan AI Dompetku di Sini
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Uji bagaimana kecerdasan buatan Dompetku menghemat waktu harianmu dari mencatat manual.
        </p>

        {/* Tab Switcher */}
        <div className="pt-4 flex items-center justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-muted/80 border border-border/80 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("struk")}
              className={cn(
                "flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
                activeTab === "struk"
                  ? "bg-card text-teal-700 dark:text-teal-300 shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Camera className="size-4" />
              <span>1. Scan Struk AI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("suara")}
              className={cn(
                "flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
                activeTab === "suara"
                  ? "bg-card text-teal-700 dark:text-teal-300 shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Mic className="size-4" />
              <span>2. Voice Note AI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("gajian")}
              className={cn(
                "flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
                activeTab === "gajian"
                  ? "bg-card text-teal-700 dark:text-teal-300 shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sliders className="size-4" />
              <span>3. Mode Gajian</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Container */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-8 shadow-lg shadow-teal-900/5">
        {/* TAB 1: SCAN STRUK AI */}
        {activeTab === "struk" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Receipt Preview & Controls */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Pilih Contoh Struk:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedReceipt("indomaret")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-colors",
                      selectedReceipt === "indomaret"
                        ? "bg-teal-600 text-white"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Indomaret
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedReceipt("kopi")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-colors",
                      selectedReceipt === "kopi"
                        ? "bg-teal-600 text-white"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Kopi Kenangan
                  </button>
                </div>
              </div>

              {/* Receipt Image Frame with Scan Line Effect */}
              <div className="relative rounded-2xl overflow-hidden border border-border/80 bg-zinc-950 flex items-center justify-center h-[280px] sm:h-[320px]">
                <Image
                  src={
                    selectedReceipt === "indomaret"
                      ? "/samples/struk-indomaret.jpg"
                      : "/samples/struk-kopi-kenangan.jpg"
                  }
                  alt="Struk Belanjaan"
                  width={320}
                  height={420}
                  className="w-full h-full object-contain filter contrast-105"
                />

                {/* Simulated Laser Scan Line */}
                {scanningReceipt && (
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_15px_#2dd4bf] animate-[bounce_1.2s_infinite]" />
                )}

                {/* Overlay Badge */}
                <div className="absolute bottom-3 left-3 right-3 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md text-white text-[11px] flex items-center justify-between">
                  <span>📸 Foto Kamera HP</span>
                  <span className="text-teal-400 font-bold">Multimodal OCR</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleScanReceipt}
                disabled={scanningReceipt}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md shadow-teal-700/20 active:scale-98 transition-all disabled:opacity-60"
              >
                {scanningReceipt ? (
                  <>
                    <Zap className="size-4 animate-spin" />
                    <span>Gemini AI Sedang Membaca Struk...</span>
                  </>
                ) : (
                  <>
                    <Camera className="size-4" />
                    <span>Pindai Ulang Struk Ini</span>
                  </>
                )}
              </button>
            </div>

            {/* Right: Instant AI Extracted Data Card */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-5 rounded-2xl border border-teal-500/30 bg-teal-500/5 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-foreground">
                        {selectedReceipt === "indomaret"
                          ? "Indomaret Point Tebet Raya"
                          : "Kopi Kenangan Mall Kota Kasablanka"}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        100% Akurat
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      20 Nov 2026 · 14:32 WIB · Kategori: Kebutuhan Harian
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground">Total Belanja</span>
                    <p className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                      {selectedReceipt === "indomaret" ? "Rp82.500" : "Rp68.200"}
                    </p>
                  </div>
                </div>

                {/* Items Breakdown list */}
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Rincian Item yang Terdeteksi Otomatis:
                  </p>

                  {selectedReceipt === "indomaret" ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-card border border-border/60">
                        <span>1x Roti Tawar Gandum</span>
                        <span className="font-bold">Rp19.500</span>
                      </div>
                      <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-card border border-border/60">
                        <span>2x Ultra Milk Full Cream 1L (@19.000)</span>
                        <span className="font-bold">Rp38.000</span>
                      </div>
                      <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-card border border-border/60">
                        <span>2x Kopi Kenangan RTD 220ml (@15.000)</span>
                        <span className="font-bold">Rp30.000</span>
                      </div>
                      <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold">
                        <span>Diskon Promo Member Indomaret</span>
                        <span>-Rp5.000</span>
                      </div>
                      <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-card border border-border/60 text-muted-foreground">
                        <span>PPN 11% (Termasuk)</span>
                        <span>Rp8.175</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-card border border-border/60">
                        <span>2x Kopi Kenangan Mantan (Large / Less Sugar)</span>
                        <span className="font-bold">Rp48.000</span>
                      </div>
                      <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-card border border-border/60">
                        <span>1x Roti Coklat Klasik</span>
                        <span className="font-bold">Rp14.000</span>
                      </div>
                      <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-card border border-border/60 text-muted-foreground">
                        <span>PB1 / Pajak Resto (10%)</span>
                        <span>Rp6.200</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60">
                  <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400 font-bold">
                    <CheckCircle2 className="size-3.5" />
                    Tersimpan langsung ke Dompet BCA Utama
                  </span>
                  <span>OCR Multimodal Gemini</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VOICE NOTE AI */}
        {activeTab === "suara" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pilih Contoh Ucapan Santai (Voice Note):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {voicePresets.map((vp, idx) => (
                  <button
                    key={vp.id}
                    type="button"
                    onClick={() => handlePlayVoice(idx)}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all active:scale-98 flex flex-col justify-between gap-2",
                      selectedVoiceIdx === idx
                        ? "border-teal-500 bg-teal-500/10"
                        : "border-border/80 bg-card hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <Volume2 className="size-3.5 text-teal-600" />
                      <span>Contoh #{idx + 1}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">
                      &quot;{vp.audioText}&quot;
                    </p>
                    <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
                      Putar & Ekstrak →
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Waveform Simulator */}
            <div className="p-4 rounded-2xl bg-zinc-950 text-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-teal-600 flex items-center justify-center text-white shrink-0">
                  <Mic className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-teal-300">
                    {playingVoice ? "AI Mendengarkan & Menganalisis Suara..." : "Rekaman Pesan Suara"}
                  </p>
                  <p className="text-xs text-zinc-300 italic mt-0.5 max-w-xl">
                    &quot;{voicePresets[selectedVoiceIdx].audioText}&quot;
                  </p>
                </div>
              </div>

              {/* Animated Waveform Bars */}
              <div className="flex items-center gap-1 shrink-0 h-6">
                {[4, 12, 20, 16, 24, 10, 18, 8, 22, 14, 6].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: playingVoice ? `${(h * 1.5) % 24 + 4}px` : `${h}px` }}
                    className={cn(
                      "w-1 rounded-full transition-all duration-150",
                      playingVoice ? "bg-teal-400 animate-pulse" : "bg-zinc-600"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Extracted Transactions Grid */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Hasil Pemecahan Transaksi Otomatis (Otomatis Masuk Dompet):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {voicePresets[selectedVoiceIdx].result.map((r, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-1"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "size-10 rounded-xl flex items-center justify-center",
                          r.type === "income"
                            ? "bg-teal-500/15 text-teal-600"
                            : "bg-rose-500/15 text-rose-600"
                        )}
                      >
                        <Wallet className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{r.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground">{r.wallet}</span>
                          <span>•</span>
                          <span>{r.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={cn(
                          "text-sm sm:text-base font-black",
                          r.type === "income"
                            ? "text-teal-600 dark:text-teal-400"
                            : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {r.type === "income" ? "+" : "-"}
                        {formatRupiah(r.amount)}
                      </p>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        ✓ Siap
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MODE GAJIAN & SMART ALOKASI */}
        {activeTab === "gajian" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Geser untuk Menguji Nominal Gajianmu:
                </span>
                <span className="text-xl sm:text-2xl font-black text-teal-700 dark:text-teal-300">
                  {formatRupiah(gaji)} / bulan
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={3000000}
                max={25000000}
                step={500000}
                value={gaji}
                onChange={(e) => setGaji(Number(e.target.value))}
                className="w-full h-2.5 bg-muted rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Rp3.000.000</span>
                <span>Rp14.000.000</span>
                <span>Rp25.000.000</span>
              </div>
            </div>

            {/* Smart Allocation Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Box 1: Living Cost */}
              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    1. Kebutuhan Pokok (45%)
                  </span>
                  <span className="text-xs font-bold text-teal-600">Makan & Sewa</span>
                </div>
                <p className="text-lg font-extrabold text-foreground">{formatRupiah(livingCost)}</p>
                <p className="text-[10px] text-muted-foreground">
                  Alokasi belanja dapur, transportasi harian, dan tempat tinggal.
                </p>
              </div>

              {/* Box 2: Savings & Emergency */}
              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    2. Tabungan & Darurat (25%)
                  </span>
                  <span className="text-xs font-bold text-emerald-600">Masa Depan</span>
                </div>
                <p className="text-lg font-extrabold text-foreground">
                  {formatRupiah(emergencyAndGoals)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Langsung dikunci ke kantong Tabungan Darurat & Impian.
                </p>
              </div>

              {/* Box 3: Recurring */}
              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    3. Tagihan Rutin (15%)
                  </span>
                  <span className="text-xs font-bold text-amber-600">Kewajiban</span>
                </div>
                <p className="text-lg font-extrabold text-foreground">
                  {formatRupiah(recurringBills)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Wifi, BPJS, tagihan listrik, cicilan motor/kartu kredit.
                </p>
              </div>

              {/* Box 4: Safe Guilt-Free Money */}
              <div className="p-4 rounded-2xl border border-teal-500/50 bg-teal-500/10 space-y-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-teal-700 dark:text-teal-300 uppercase">
                    4. Saldo Bebas Jajan (15%)
                  </span>
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                    Aman Foya-Foya!
                  </span>
                </div>
                <p className="text-lg font-black text-teal-700 dark:text-teal-300">
                  {formatRupiah(safeGuiltFreeMoney)}
                </p>
                <p className="text-[10px] text-teal-900/80 dark:text-teal-200/80">
                  Uang yang boleh kamu habiskan untuk nongkrong tanpa rasa bersalah.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/60 border border-border/60 flex items-center gap-3 text-xs text-muted-foreground">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>
                Dengan Mode Gajian Dompetku, kamu tidak perlu lagi menghitung alokasi secara manual
                setiap tanggal 25. Sistem otomatis menaruh uang pada posnya masing-masing.
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
