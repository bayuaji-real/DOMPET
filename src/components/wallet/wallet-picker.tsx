"use client";

import { WalletIcon } from "@/components/wallet/wallet-icon";
import { formatRupiah } from "@/lib/utils";

interface PickerWallet {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  balance: number;
}

/** Pemilih dompet berbentuk kartu. Dipakai sama persis di semua layar transfer. */
export function WalletPicker({
  wallets,
  value,
  onChange,
  tone,
  keyPrefix,
}: {
  wallets: PickerWallet[];
  value: string;
  onChange: (id: string) => void;
  tone: "from" | "to";
  keyPrefix: string;
}) {
  const active =
    tone === "from"
      ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold"
      : "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold";
  return (
    <div className="grid grid-cols-2 gap-2">
      {wallets.map((w) => (
        <button
          type="button"
          key={`${keyPrefix}-${w.id}`}
          onClick={() => onChange(w.id)}
          className={`cursor-pointer rounded-xl border p-2.5 text-left text-xs font-medium transition-all ${
            value === w.id ? active : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <WalletIcon icon={w.icon} color={w.color} size={28} />
            <div className="min-w-0">
              <div className="truncate font-bold">{w.name}</div>
              <div className="text-[10px] opacity-75">{formatRupiah(w.balance)}</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
