"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  Smartphone,
  ChevronRight,
} from "lucide-react";
import { LandingPhonePreview } from "./landing-phone-preview";

interface LandingHeroProps {
  isLoggedIn?: boolean;
}

export function LandingHero({ isLoggedIn = false }: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden pt-28 sm:pt-36 pb-16 sm:pb-24">
      {/* Background Aurora / Glow Effects (Exact teal styling from globals.css & login) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(55% 40% at 50% 0%, rgba(13,148,136,0.18) 0%, rgba(13,148,136,0) 70%), radial-gradient(40% 35% at 90% 25%, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0) 70%), radial-gradient(45% 35% at 10% 70%, rgba(20,184,166,0.10) 0%, rgba(20,184,166,0) 70%)",
        }}
      />

      {/* Subtle Grid Accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Copywriting & High-Converting Value Props */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Tag / Micro-Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-700 dark:text-teal-300 text-xs font-bold shadow-xs">
              <span className="flex size-2 rounded-full bg-teal-500 animate-pulse" />
              <span>Aplikasi Finansial AI Indonesia Pertama yang Paham Kebutuhanmu</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.12]">
              Keuanganmu Rapi Seketika,{" "}
              <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 bg-clip-text text-transparent">
                Tanpa Ribet Ketik Angka
              </span>{" "}
              Satu-Satu.
            </h1>

            {/* Down-to-Earth Indonesian Subheadline (Anti-Slop) */}
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Cukup <strong className="text-foreground font-semibold">foto struk belanjaan</strong> atau{" "}
              <strong className="text-foreground font-semibold">bicara lewat pesan suara</strong> saat
              lagi jalan santai. Didukung <strong className="text-teal-700 dark:text-teal-300 font-semibold">Ruby</strong>,
              asisten AI pribadi yang membaca keuangan riilmu tanpa menghakimi dan tanpa perlu
              konek ke akun bank.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-extrabold text-sm shadow-xl shadow-teal-700/25 hover:shadow-teal-700/35 active:scale-95 transition-all"
              >
                <Sparkles className="size-4" />
                <span>{isLoggedIn ? "Buka Dompetku Sekarang" : "Mulai Coba Gratis 7 Hari"}</span>
                <ArrowRight className="size-4" />
              </Link>

              <a
                href="#demo-ai"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-card border border-border/80 hover:bg-muted/70 text-foreground font-bold text-sm shadow-xs transition-all active:scale-95"
              >
                <span>Coba Demo Fitur</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </a>
            </div>

            {/* Trust Indicators (Micro-Pills) */}
            <div className="pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-card/60 border border-border/40">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[11px] font-semibold text-muted-foreground">
                  <strong className="text-foreground font-bold">100% Aman:</strong> Tanpa minta password rekening bank
                </span>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-card/60 border border-border/40">
                <Smartphone className="size-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="text-[11px] font-semibold text-muted-foreground">
                  <strong className="text-foreground font-bold">Aplikasi Enteng:</strong> Pasang langsung di HP tanpa antre app store
                </span>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-card/60 border border-border/40">
                <Lock className="size-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="text-[11px] font-semibold text-muted-foreground">
                  <strong className="text-foreground font-bold">Privasi Dijamin:</strong> Row Level Security enkripsi cloud
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: High-Fidelity Interactive Mobile Preview */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <LandingPhonePreview />
          </div>
        </div>
      </div>
    </section>
  );
}
