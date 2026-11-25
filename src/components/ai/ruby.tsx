import * as React from "react";
import { Sparkles } from "lucide-react";

/** Identitas asisten AI Dompetku. */
export const ASSISTANT_NAME = "Ruby Personal Finance Assistant";
export const ASSISTANT_AVATAR = "/icons/icon-192.png";

/** Foto/badge Ruby ala preview: gradient teal-emerald dengan ikon Sparkles putih. */
export function RubyAvatar({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs ${className}`}
    >
      <Sparkles className="size-4" />
    </div>
  );
}

/** Satu bubble pesan dari Ruby ala preview: avatar di kiri, badge di atas, kartu berborder rapi. */
export function RubyBubble({
  children,
  showName = true,
  className = "",
}: {
  children: React.ReactNode;
  /** true = bubble paling atas dalam rangkaian: tampilkan foto dan nama. false = bubble lanjutan tanpa foto. */
  showName?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-2.5 ${className}`}>
      {showName ? <RubyAvatar /> : <span className="w-8 shrink-0" aria-hidden="true" />}
      <div
        className={`max-w-[88%] sm:max-w-[85%] rounded-2xl ${
          showName ? "rounded-tl-xs" : ""
        } bg-card border border-border/80 p-3.5 text-xs leading-relaxed text-foreground shadow-xs`}
      >
        {showName && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="text-xs font-extrabold text-foreground">Ruby</span>
            <span className="rounded-full bg-teal-500/15 px-1.5 py-0.2 text-[9px] font-bold text-teal-700 dark:text-teal-300">
              AI Asisten
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/** Daftar fitur yang bisa dibuka lewat dropdown Ruby di Tanya Ruby. */
export const RUBY_MENU: { label: string; href: string }[] = [
  { label: "Buat Tabungan baru", href: "/tabungan" },
  { label: "Rencana Keuangan Ruby", href: "/rencana" },
  { label: "Analisis Keuangan", href: "/analisis" },
  { label: "Riwayat Transaksi", href: "/transaksi" },
  { label: "Split Bill", href: "/split-bill" },
  { label: "Dompet", href: "/dompet" },
  { label: "Lapor keluhan / usul", href: "/bantuan" },
];
