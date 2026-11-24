import * as React from "react";

/** Identitas asisten AI Dompetku. Foto Ruby sementara memakai logo aplikasi. */
export const ASSISTANT_NAME = "Ruby Personal Finance Assistant";
export const ASSISTANT_GREETING = "Halo aku Ruby your personal finance assistant";
export const ASSISTANT_AVATAR = "/icons/icon-192.png";

/** Foto bulat Ruby (logo di atas lingkaran putih). */
export function RubyAvatar({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ASSISTANT_AVATAR}
      alt={ASSISTANT_NAME}
      width={size}
      height={size}
      draggable={false}
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-full bg-white object-cover p-1 shadow-sm ring-1 ring-black/5 dark:ring-white/10 ${className}`}
    />
  );
}

/** Satu bubble pesan dari Ruby ala WhatsApp: foto di kiri, nama di atas, isi di dalam bubble. */
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
    <div className={`flex items-start gap-2 ${className}`}>
      {showName ? <RubyAvatar /> : <span className="w-8 shrink-0" aria-hidden="true" />}
      <div className={`max-w-[82%] rounded-2xl ${showName ? "rounded-tl-sm" : ""} bg-white px-3 pb-2 pt-2 text-xs leading-relaxed text-zinc-900 shadow-sm ring-1 ring-black/5 dark:bg-[#202c33] dark:text-zinc-50 dark:ring-white/10`}>
        {showName && <p className="mb-0.5 text-[11px] font-bold text-teal-600 dark:text-teal-400">{ASSISTANT_NAME}</p>}
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
