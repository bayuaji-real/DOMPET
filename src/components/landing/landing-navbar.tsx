"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sparkles, ArrowRight, Menu, X, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface LandingNavbarProps {
  isLoggedIn?: boolean;
}

export function LandingNavbar({ isLoggedIn = false }: LandingNavbarProps) {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Fitur Cerdas", href: "#fitur" },
    { label: "Demo AI", href: "#demo-ai" },
    { label: "Mode Gajian", href: "#mode-gajian" },
    { label: "Paket & Harga", href: "#paket" },
    { label: "Tanya Jawab", href: "#faq" },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/85 backdrop-blur-md border-b border-border/80 shadow-xs py-3"
          : "bg-transparent py-4 sm:py-5"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand */}
        <Link href="/landing" className="flex items-center gap-2.5 group">
          <Image
            src="/logo.svg"
            alt="Logo Dompetku"
            width={34}
            height={34}
            className="size-8 sm:size-9 object-contain group-hover:scale-105 transition-transform drop-shadow-sm"
          />
          <div className="flex flex-col">
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-foreground">
              Dompetku
            </span>
            <span className="text-[10px] text-muted-foreground hidden sm:block">
              Keuangan Pribadi & AI
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right CTA & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-0.5">
            <ThemeToggle />
          </div>

          <Link
            href="/login"
            className="hidden sm:inline-flex items-center justify-center text-xs font-bold px-3.5 py-2 rounded-xl text-foreground hover:bg-muted/80 transition-colors"
          >
            {isLoggedIn ? "Buka Dashboard" : "Masuk"}
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-extrabold px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white shadow-md shadow-teal-700/20 active:scale-95 transition-all"
          >
            <Sparkles className="size-3.5" />
            <span>{isLoggedIn ? "Aplikasi" : "Coba Gratis 7 Hari"}</span>
            <ArrowRight className="size-3.5 hidden sm:inline" />
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-border/80 bg-background/95 backdrop-blur-xl px-4 pt-2 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="pt-2 border-t border-border/60 flex flex-col gap-2">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl text-xs font-bold text-foreground bg-muted/60 hover:bg-muted transition-colors"
            >
              {isLoggedIn ? "Buka Dashboard" : "Masuk ke Akun"}
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-700 text-white text-xs font-extrabold shadow-sm"
            >
              <Sparkles className="size-4" />
              <span>Mulai Coba Gratis 7 Hari</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
