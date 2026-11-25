"use client";

import * as React from "react";
import Image from "next/image";
import { Sparkles, Send, Bot, User, CheckCircle2, ChevronRight, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatScenario {
  id: string;
  prompt: string;
  userQuestion: string;
  rubyAnswer: {
    verdict: string;
    verdictBadge: "aman" | "waspada" | "strategis";
    content: string;
    metrics?: { label: string; value: string }[];
    actionPlan: string[];
  };
}

const SCENARIOS: ChatScenario[] = [
  {
    id: "gadget",
    prompt: "Aman gak beli HP 3,5 juta?",
    userQuestion: "Ruby, aman gak kalau aku beli smartphone baru harga 3,5 juta minggu ini?",
    rubyAnswer: {
      verdict: "Kurang disarankan minggu ini (Waspada)",
      verdictBadge: "waspada",
      content:
        "Berdasarkan sisa saldo bebas jajanmu bulan ini (Rp1.450.000) dan masih ada 2 tagihan rutin sebelum tanggal gajian (Wifi Rp350.000 & Asuransi Rp400.000), cashflowmu bakal defisit sekitar Rp2.800.000 kalau beli sekarang secara tunai.",
      metrics: [
        { label: "Saldo Bebas Jajan", value: "Rp1.450.000" },
        { label: "Sisa Tagihan Rutin", value: "Rp750.000" },
        { label: "Hari ke Gajian", value: "11 hari lagi" },
      ],
      actionPlan: [
        "Tunggu sampai tanggal 25 saat gaji masuk.",
        "Gunakan fitur Target Beli di Dompetku dengan setoran Rp875.000/bulan selama 4 bulan.",
        "Jangan gunakan paylater berbunga tinggi ya!",
      ],
    },
  },
  {
    id: "boncos",
    prompt: "Bulan ini boncos di mana?",
    userQuestion: "Ruby, coba cek dataku, bulan ini pengeluaran terbesarku bocor di mana?",
    rubyAnswer: {
      verdict: "Kategori Makanan & Nongkrong Naik 42%",
      verdictBadge: "waspada",
      content:
        "Aku menemukan pos belanja yang paling signifikan melompat adalah Kopi & Pesan Makanan Online (total Rp1.820.000 dari 24 transaksi). Rata-rata kamu memesan Rp75.000 per pesanan.",
      metrics: [
        { label: "Total Makanan/Kopi", value: "Rp1.820.000" },
        { label: "Frekuensi Order", value: "24x / bulan" },
        { label: "Batas Anggaran", value: "Rp1.200.000 (Over 51%)" },
      ],
      actionPlan: [
        "Batasi pesan antar makanan maksimal 2x seminggu.",
        "Aktifkan notifikasi batas pengeluaran kategori Makanan di Dompetku.",
      ],
    },
  },
  {
    id: "darurat",
    prompt: "Mulai Dana Darurat 30 Juta",
    userQuestion: "Gimana cara realistis mengumpulkan Dana Darurat Rp30.000.000 dengan gajiku?",
    rubyAnswer: {
      verdict: "Target Realistis: 15 Bulan Tercapai",
      verdictBadge: "strategis",
      content:
        "Dengan pengeluaran bulananmu saat ini sekitar Rp5.000.000, target Rp30.000.000 setara dengan 6 bulan biaya hidup (standar sangat aman). Kamu bisa menyisihkan Rp2.000.000 setiap periode gajian.",
      metrics: [
        { label: "Target Total", value: "Rp30.000.000" },
        { label: "Setoran per Gajian", value: "Rp2.000.000" },
        { label: "Estimasi Tercapai", value: "Februari 2028" },
      ],
      actionPlan: [
        "Kunci alokasi di Mode Gajian otomatis ke dompet 'Tabungan Darurat'.",
        "Simpan di instrumen likuid dan aman seperti Reksadana Pasar Uang atau Bank Digital bunga terjamin.",
      ],
    },
  },
];

export function LandingRubyChat() {
  const [activeScenarioId, setActiveScenarioId] = React.useState<string>("gadget");
  const [isTyping, setIsTyping] = React.useState<boolean>(false);

  const currentScenario =
    SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];

  const handleSelectScenario = (id: string) => {
    if (id === activeScenarioId) return;
    setIsTyping(true);
    setActiveScenarioId(id);
    setTimeout(() => {
      setIsTyping(false);
    }, 450);
  };

  return (
    <section className="py-16 sm:py-24 border-b border-border/80 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Ruby Persona & Value */}
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-500/25">
              <Sparkles className="size-3.5" />
              <span>Kenalkan: Ruby</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              Punya Penasihat Keuangan Pribadi yang Selalu Ada di Kantongmu.
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Bukan robot penjawab template yang menyuruhmu berhemat tanpa konteks. Ruby membaca{" "}
              <strong className="text-foreground font-semibold">
                data pengeluaran, saldo dompet, dan tagihan riilmu
              </strong>
              , lalu memberikan kalkulasi jujur dan solutif.
            </p>

            {/* Quick interactive prompt pills */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Coba Ketuk Pertanyaan di Bawah:
              </p>
              <div className="flex flex-col gap-2">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectScenario(s.id)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-2xl border text-left text-xs font-bold transition-all active:scale-98",
                      activeScenarioId === s.id
                        ? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 shadow-xs"
                        : "border-border/80 bg-card text-foreground hover:bg-muted/50"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquare className="size-3.5 text-teal-600 shrink-0" />
                      <span>{s.prompt}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 opacity-70" />
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic">
              🔒 Tenang, percakapan dengan Ruby sepenuhnya terisolasi dan tidak digunakan untuk
              melatih model publik.
            </p>
          </div>

          {/* Right Column: Simulated Chat Box */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-border/80 bg-card shadow-xl overflow-hidden flex flex-col h-[520px]">
              {/* Chat Header */}
              <div className="px-5 py-3.5 bg-muted/40 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative size-10 rounded-2xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    <Sparkles className="size-5" />
                    <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border-2 border-background" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-foreground">Ruby</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300">
                        AI Asisten Dompetku
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Aktif · Mengetahui data dompetmu</p>
                  </div>
                </div>

                <div className="text-[11px] font-semibold text-muted-foreground hidden sm:block">
                  Simulasi Langsung
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* User Bubble */}
                <div className="flex items-start justify-end gap-2.5">
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs bg-teal-600 text-white p-3.5 text-xs sm:text-sm font-medium shadow-xs">
                    {currentScenario.userQuestion}
                  </div>
                  <div className="size-7 rounded-full bg-muted text-muted-foreground font-bold text-xs flex items-center justify-center shrink-0">
                    BY
                  </div>
                </div>

                {/* Ruby Response Bubble */}
                {isTyping ? (
                  <div className="flex items-start gap-2.5">
                    <div className="size-7 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                      <Sparkles className="size-4" />
                    </div>
                    <div className="rounded-2xl rounded-tl-xs bg-muted/60 p-3.5 text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-teal-500 animate-bounce" />
                      <span className="size-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.2s]" />
                      <span className="size-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]" />
                      <span className="ml-2 font-medium">Ruby sedang menganalisis transaksi...</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 animate-in fade-in duration-200">
                    <div className="size-7 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Sparkles className="size-4" />
                    </div>

                    <div className="max-w-[92%] sm:max-w-[85%] rounded-2xl rounded-tl-xs bg-muted/50 border border-border/80 p-4 space-y-3 text-foreground text-xs sm:text-sm">
                      {/* Verdict Banner */}
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-bold",
                            currentScenario.rubyAnswer.verdictBadge === "aman"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : currentScenario.rubyAnswer.verdictBadge === "waspada"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                              : "bg-teal-500/15 text-teal-700 dark:text-teal-300"
                          )}
                        >
                          📌 {currentScenario.rubyAnswer.verdict}
                        </span>
                      </div>

                      {/* Analysis Content */}
                      <p className="leading-relaxed text-foreground/90">
                        {currentScenario.rubyAnswer.content}
                      </p>

                      {/* Key Metrics Grid */}
                      {currentScenario.rubyAnswer.metrics && (
                        <div className="grid grid-cols-3 gap-2 py-1">
                          {currentScenario.rubyAnswer.metrics.map((m, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-xl bg-card border border-border/60 text-center"
                            >
                              <span className="text-[10px] text-muted-foreground block truncate">
                                {m.label}
                              </span>
                              <span className="text-xs font-black text-foreground block mt-0.5">
                                {m.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action Plan */}
                      <div className="space-y-1.5 pt-1 border-t border-border/60">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Saran Langkah Taktis:
                        </span>
                        <ul className="space-y-1">
                          {currentScenario.rubyAnswer.actionPlan.map((ap, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-foreground/80">
                              <CheckCircle2 className="size-3.5 text-teal-600 shrink-0 mt-0.5" />
                              <span>{ap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Placeholder */}
              <div className="p-3 bg-card border-t border-border/80 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  placeholder="Ketik pertanyaanmu untuk Ruby..."
                  className="flex-1 bg-muted/40 border border-border/60 rounded-xl px-3.5 py-2 text-xs text-muted-foreground cursor-not-allowed"
                />
                <button
                  type="button"
                  disabled
                  className="size-9 rounded-xl bg-teal-600 text-white flex items-center justify-center opacity-70"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
