"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, PiggyBank, Trash2, ArrowRightLeft, Pencil } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WalletIcon } from "@/components/wallet/wallet-icon";
import { SavingsWalletAnalysis } from "@/components/tabungan/savings-wallet-analysis";
import { formatRupiah } from "@/lib/utils";
import {
  updateWallet,
  deleteWallet,
  isSpendableWallet,
  type WalletBalance,
} from "@/lib/data/wallets";
import { Select } from "@/components/ui/select";

const TYPE_LABEL: Record<string, string> = {
  bank: "Rekening Bank",
  ewallet: "E-Wallet",
  cash: "Uang Tunai",
  investasi: "Investasi",
  tabungan: "Tabungan",
};

interface WalletDetailSheetProps {
  wallet: WalletBalance | null;
  allWallets: WalletBalance[];
  hideBalance?: boolean;
  onClose: () => void;
  /** Dipanggil setelah dompet berubah atau terhapus, supaya induk memuat ulang data. */
  onChanged: () => void;
  /** Aksi "Pindah Saldo" (opsional, hanya ada di halaman Dompet). */
  onTransfer?: (wallet: WalletBalance) => void;
}

/**
 * Detail dompet: lihat, ubah nama dan saldo, hapus.
 * - Uang Tunai: bisa diganti nama, tidak bisa dihapus (keputusan Owner A).
 * - Tabungan: diubah dan dihapus lewat menu Tabungan, di sini hanya ditampilkan.
 * - Hapus dompet biasa: semua transaksinya dipindah ke dompet pilihan (keputusan Owner C).
 */
function WalletDetailSheetInner({
  wallet,
  allWallets,
  hideBalance = false,
  onClose,
  onChanged,
  onTransfer,
}: WalletDetailSheetProps & { wallet: WalletBalance }) {
  const [mode, setMode] = React.useState<"view" | "edit" | "delete">("view");
  const [name, setName] = React.useState(wallet.name);
  const [balanceStr, setBalanceStr] = React.useState(String(Math.round(wallet.balance || 0)));
  const [moveToChoice, setMoveToChoice] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const targets = React.useMemo(
    () =>
      allWallets.filter(
        (w) => w.id !== wallet.id && isSpendableWallet(w) && !w.goal_id
      ),
    [allWallets, wallet.id]
  );

  const moveTo = moveToChoice || (targets.find((t) => t.is_default) ?? targets[0])?.id || "";

  const isSavings = wallet.type === "tabungan" || Boolean(wallet.goal_id);
  const money = (n: number) => (hideBalance ? "••••••••" : formatRupiah(n, { absolute: false }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Nama dompet tidak boleh kosong.");
      return;
    }
    const raw = balanceStr.trim();
    const negative = raw.startsWith("-");
    const digits = raw.replace(/\D/g, "");
    const target = digits ? (negative ? -1 : 1) * parseInt(digits, 10) : 0;
    // Saldo sekarang = saldo awal + semua transaksi. Ubah saldo awal supaya saldo sekarang = angka yang diisi.
    const newInitial = Math.round(wallet.initial_balance + (target - wallet.balance));

    setBusy(true);
    setError(null);
    try {
      await updateWallet(wallet.id, { name: cleanName, initial_balance: newInitial });
      onChanged();
      setMode("view");
    } catch {
      setError("Gagal menyimpan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!moveTo) return;
    setBusy(true);
    setError(null);
    const res = await deleteWallet(wallet.id, moveTo);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Gagal menghapus dompet. Coba lagi.");
      return;
    }
    onChanged();
    onClose();
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-w-[430px] max-h-[90vh] space-y-4 overflow-y-auto rounded-t-3xl border-border/80 bg-background px-5 pb-8 pt-4 shadow-2xl"
      >
        <SheetHeader className="p-0">
          <div className="flex items-center gap-3">
            <WalletIcon icon={wallet.icon} color={wallet.color} size={44} className="rounded-2xl" />
            <div className="min-w-0">
              <SheetTitle className="truncate text-base font-extrabold">{wallet.name}</SheetTitle>
              <SheetDescription className="text-xs">
                {TYPE_LABEL[wallet.type] ?? "Dompet"}
                {wallet.is_default ? " • Bawaan" : ""}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="rounded-2xl bg-muted/50 p-4">
          <p className="text-[11px] font-semibold text-muted-foreground">Saldo sekarang</p>
          <p className="mt-0.5 text-2xl font-extrabold tracking-tight">{money(wallet.balance)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Saldo awal: {money(wallet.initial_balance)}
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}

        {mode === "view" && (
          <div className="space-y-2">
            {isSavings ? (
              <>
                <SavingsWalletAnalysis wallet={wallet} />
                <p className="text-xs text-muted-foreground">
                  Setor, tarik, ubah target, dan hapus dilakukan di menu Tabungan.
                </p>
                <Link
                  href="/tabungan"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold text-white hover:bg-violet-700"
                >
                  <PiggyBank className="h-4 w-4" /> Buka Tabungan
                </Link>
              </>
            ) : (
              <>
                <Button type="button" onClick={() => setMode("edit")} className="h-11 w-full rounded-xl bg-teal-600 text-sm font-bold text-white hover:bg-teal-700">
                  <Pencil className="mr-2 h-4 w-4" /> Ubah nama dan saldo
                </Button>
                {onTransfer && (
                  <Button type="button" variant="outline" onClick={() => onTransfer(wallet)} className="h-11 w-full rounded-xl text-sm font-bold">
                    <ArrowRightLeft className="mr-2 h-4 w-4" /> Pindah Saldo
                  </Button>
                )}
                {wallet.is_default ? (
                  <p className="px-1 text-[11px] text-muted-foreground">
                    Uang Tunai adalah dompet bawaan. Transaksi tanpa dompet masuk ke sini, jadi tidak bisa dihapus, hanya diganti nama.
                  </p>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setMode("delete")} className="h-11 w-full rounded-xl border-rose-500/40 text-sm font-bold text-rose-600 hover:bg-rose-500/10 dark:text-rose-400">
                    <Trash2 className="mr-2 h-4 w-4" /> Hapus dompet
                  </Button>
                )}
              </>
            )}
            <Button type="button" variant="ghost" onClick={onClose} className="h-10 w-full rounded-xl text-xs font-semibold">
              Tutup
            </Button>
          </div>
        )}

        {mode === "edit" && (
          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="wallet-name" className="text-xs">Nama dompet</Label>
              <Input id="wallet-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wallet-balance" className="text-xs">Saldo sekarang (Rp)</Label>
              <Input
                id="wallet-balance"
                inputMode="numeric"
                value={balanceStr}
                onChange={(e) => setBalanceStr(e.target.value)}
                className="h-11 rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">
                Mengubah saldo menyesuaikan saldo awal dompet. Riwayat transaksi tidak berubah.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => { setMode("view"); setError(null); }} className="h-11 flex-1 rounded-xl text-sm font-bold">
                Batal
              </Button>
              <Button type="submit" disabled={busy} className="h-11 flex-1 rounded-xl bg-teal-600 text-sm font-bold text-white hover:bg-teal-700">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
              </Button>
            </div>
          </form>
        )}

        {mode === "delete" && (
          <div className="space-y-3">
            <p className="text-xs text-foreground">
              Semua transaksi di dompet ini <strong>tidak ikut terhapus</strong>. Transaksi dan saldonya dipindah ke dompet yang kamu pilih.
            </p>
            {targets.length === 0 ? (
              <p className="text-xs text-rose-600 dark:text-rose-400">Belum ada dompet lain sebagai tujuan.</p>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="wallet-move" className="text-xs">Pindahkan ke</Label>
                <Select
                  id="wallet-move"
                  value={moveTo}
                  onChange={(e) => setMoveToChoice(e.target.value)}
                 
                >
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => { setMode("view"); setError(null); }} className="h-11 flex-1 rounded-xl text-sm font-bold">
                Batal
              </Button>
              <Button type="button" disabled={busy || !moveTo} onClick={handleDelete} className="h-11 flex-1 rounded-xl bg-rose-600 text-sm font-bold text-white hover:bg-rose-700">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hapus dompet"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function WalletDetailSheet(props: WalletDetailSheetProps) {
  if (!props.wallet) return null;
  // key = id dompet, supaya isian form mulai bersih setiap membuka dompet lain
  return <WalletDetailSheetInner key={props.wallet.id} {...props} wallet={props.wallet} />;
}
