import * as React from "react";

/** Identitas asisten AI Dompetku. */
export const ASSISTANT_NAME = "Ruby Personal Finance Assistant";
export const ASSISTANT_AVATAR = "/icons/icon-192.png";

/** Foto Ruby (maskot) di lingkaran dengan latar teal-emerald lembut. */
export const RUBY_PHOTO = "/ruby-avatar.png";
export function RubyAvatar({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={RUBY_PHOTO}
      alt="Ruby"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-full bg-gradient-to-tr from-teal-200 to-emerald-100 object-cover shadow-xs ring-1 ring-border ${className}`}
      draggable={false}
    />
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
            <span className="text-xs sm:text-[13px] font-black tracking-tight text-foreground">Ruby</span>
            <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[9px] font-bold text-teal-700 dark:text-teal-300 tracking-tight">
              Personal Finance AI Assistant
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
