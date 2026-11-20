"use client";

import { useState } from "react";
import { Banknote, CreditCard, Landmark, PiggyBank, Smartphone, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPresetFromIcon, logoUrl } from "@/lib/wallet-presets";

interface WalletIconProps {
  /** Nilai kolom wallets.icon: "brand:bca" atau nama ikon lucide ("banknote"). */
  icon?: string | null;
  /** Warna dompet (wallets.color), dipakai untuk ikon lucide. */
  color?: string | null;
  /** Ukuran dalam piksel. Default 40. */
  size?: number;
  className?: string;
}

/** Ikon lucide yang boleh dipakai dompet. Tambahkan di sini kalau perlu ikon lain. */
const LUCIDE_WALLET_ICONS: Record<string, LucideIcon> = {
  wallet: Wallet,
  banknote: Banknote,
  landmark: Landmark,
  smartphone: Smartphone,
  "trending-up": TrendingUp,
  "credit-card": CreditCard,
  "piggy-bank": PiggyBank,
};

/**
 * Ikon dompet: logo brand (bank/e-wallet/investasi) kalau icon = "brand:<id>",
 * kalau gagal dimuat → inisial berwarna; selain itu → ikon lucide.
 */
export function WalletIcon({ icon, color, size = 40, className }: WalletIconProps) {
  const preset = getPresetFromIcon(icon);
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size };

  if (preset?.domain && !failed) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5", className)}
        style={box}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl(preset.domain)}
          alt={preset.name}
          width={Math.round(size * 0.7)}
          height={Math.round(size * 0.7)}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          onLoad={(e) => {
            // Google mengembalikan globe abu-abu 16px kalau logo tidak ditemukan
            if (e.currentTarget.naturalWidth <= 16) setFailed(true);
          }}
          className="object-contain"
        />
      </span>
    );
  }

  if (preset) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center rounded-xl font-bold text-white", className)}
        style={{ ...box, backgroundColor: preset.color, fontSize: size * (preset.initials.length > 2 ? 0.3 : 0.38) }}
        aria-label={preset.name}
      >
        {preset.initials}
      </span>
    );
  }

  const Lucide = (icon && LUCIDE_WALLET_ICONS[icon]) || Wallet;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-xl", className)}
      style={{ ...box, backgroundColor: `${color ?? "#64748b"}22`, color: color ?? "#64748b" }}
    >
      <Lucide size={size * 0.55} />
    </span>
  );
}
