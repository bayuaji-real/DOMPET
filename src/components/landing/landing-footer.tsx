"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowRight, ShieldCheck, Heart } from "lucide-react";

interface LandingFooterProps {
  isLoggedIn?: boolean;
}

export function LandingFooter({ isLoggedIn = false }: LandingFooterProps) {
  return (
    <footer className="relative overflow-hidden bg-background border-t border-border/80 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Pre-footer Call to Action Banner (Anti-Slop, High-Converting) */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-900 p-8 sm:p-12 text-white shadow-2xl shadow-teal-900/30">
          {/* Subtle Decorative Glow Background */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              background:
                "radial-gradient(ellipse at top right, rgba(45,212,191,0.5) 0%, transparent 60%), radial-gradient(ellipse at bottom left, rgba(16,185,129,0.4) 0%, transparent 60%)",
            }}
          />

          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-200 text-xs font-bold border border-white/15">
              <Sparkles className="size-3.5" />
              <span>Ketenangan Finansial Dimulai dari Langkah Kecil</span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Kendalikan Uangmu Hari Ini, Sebelum Uangmu Mengendalikan Hidupmu.
            </h2>

            <p className="text-sm sm:text-base text-teal-100/90 max-w-2xl mx-auto leading-relaxed">
              Tinggalkan buku catatan kusam dan form input yang bikin malas. Coba Dompetku gratis 7
              hari penuh tanpa perlu kartu kredit.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white text-teal-900 hover:bg-teal-50 font-black text-sm shadow-xl active:scale-95 transition-all"
              >
                <Sparkles className="size-4 text-teal-700" />
                <span>{isLoggedIn ? "Masuk ke Dashboard" : "Mulai Coba Gratis 7 Hari"}</span>
                <ArrowRight className="size-4" />
              </Link>

              <a
                href="#demo-ai"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm border border-white/20 active:scale-95 transition-all"
              >
                <span>Lihat Fitur Lagi</span>
              </a>
            </div>

            <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-teal-200/80 flex-wrap">
              <span className="flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-emerald-400" />
                Tanpa Konek Rekening Bank
              </span>
              <span>•</span>
              <span>Ringan & Cepat</span>
              <span>•</span>
              <span>Batalkan Kapan Saja</span>
            </div>
          </div>
        </div>

        {/* Footer Navigation & Brand Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-4">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <Link href="/landing" className="flex items-center gap-2.5">
              <Image
                src="/logo.svg"
                alt="Logo Dompetku"
                width={30}
                height={30}
                className="size-7 sm:size-8 object-contain drop-shadow-sm"
              />
              <span className="font-extrabold text-lg tracking-tight text-foreground">
                Dompetku
              </span>
            </Link>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm">
              Aplikasi pencatatan dan perencanaan keuangan pribadi modern berbahasa Indonesia.
              Dirancang mobile-first dengan integrasi kecerdasan buatan cerdas untuk kenyamanan harianmu.
            </p>

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <span>Keamanan teruji dengan PostgreSQL Row Level Security (RLS)</span>
            </div>
          </div>

          {/* Quick Nav */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-foreground">Navigasi</p>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a href="#fitur" className="hover:text-foreground transition-colors">
                  Fitur Unggulan
                </a>
              </li>
              <li>
                <a href="#demo-ai" className="hover:text-foreground transition-colors">
                  Demo Scan Struk & Suara
                </a>
              </li>
              <li>
                <a href="#mode-gajian" className="hover:text-foreground transition-colors">
                  Kalkulator Mode Gajian
                </a>
              </li>
              <li>
                <a href="#paket" className="hover:text-foreground transition-colors">
                  Paket & Harga Langganan
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-foreground transition-colors">
                  Pertanyaan Populer (FAQ)
                </a>
              </li>
            </ul>
          </div>

          {/* Akun & Akses */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-foreground">Aplikasi</p>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/login" className="hover:text-foreground transition-colors">
                  Masuk ke Akun
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground transition-colors">
                  Daftar Akun Baru
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground transition-colors">
                  Pasang Aplikasi di HP (PWA)
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Credit */}
        <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 Dompetku. Hak cipta dilindungi undang-undang.</p>
          <p className="flex items-center gap-1">
            Dibuat dengan <Heart className="size-3 text-rose-500 fill-rose-500" /> untuk masyarakat
            Indonesia yang ingin cerdas finansial.
          </p>
        </div>
      </div>
    </footer>
  );
}
