"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateTransaction, type Transaction } from "@/lib/data/transactions";
import { getCategoryEmoji, categoryEmoji, type Category } from "@/lib/data/categories";
import type { WalletBalance } from "@/lib/data/wallets";
import { triggerHapticFeedback } from "@/lib/utils";

const fmt = (n: number) => (n > 0 ? n.toLocaleString("id-ID") : "");

interface Props {
  trx: Transaction | null;
  wallets: WalletBalance[];
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

/** Lembar ubah transaksi: nominal, judul, toko, kategori, dompet, tanggal. Jenis transaksi tidak berubah. */
export function EditTransactionSheet({ trx, wallets, categories, onClose, onSaved }: Props) {
  const [amountStr, setAmountStr] = React.useState("");
  const [note, setNote] = React.useState("");
  const [merchant, setMerchant] = React.useState("");
  const [walletId, setWalletId] = React.useState("");
  const [toWalletId, setToWalletId] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!trx) return;
    setAmountStr(fmt(Number(trx.amount)));
    setNote(trx.note || "");
    setMerchant(trx.merchant || "");
    setWalletId(trx.wallet_id);
    setToWalletId(trx.to_wallet_id || "");
    setCategoryId(trx.category_id || "");
    setDate((trx.date || "").slice(0, 10));
    setError(null);
  }, [trx]);

  if (!trx) return null;
  const isFlow = trx.type === "income" || trx.type === "expense";
  const isTransfer = trx.type === "transfer";
  const cats = categories.filter((c) => c.type === trx.type);
  const activeWallets = wallets.filter((w) => !w.is_archived);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(amountStr.replace(/\D/g, ""));
    if (!(amount > 0)) {
      setError("Nominal harus lebih dari Rp0.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Tanggal belum diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await updateTransaction(trx.id, trx.type, {
      amount,
      note,
      merchant: isFlow ? merchant : undefined,
      wallet_id: walletId,
      to_wallet_id: isTransfer ? toWalletId : undefined,
      category_id: isFlow ? categoryId || null : undefined,
      date,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error || "Gagal menyimpan perubahan.");
      return;
    }
    triggerHapticFeedback([20, 40, 20]);
    window.dispatchEvent(new CustomEvent("transaction_created"));
    onSaved();
  };

  const chip = (active: boolean) =>
    `rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${
      active ? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300" : "border-border bg-background text-foreground"
    }`;

  return (
    <Sheet open={!!trx} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl px-5 pb-8">
        <SheetHeader className="px-0">
          <SheetTitle>Ubah Transaksi</SheetTitle>
          <SheetDescription>Saldo dompet dan tabungan dihitung ulang otomatis.</SheetDescription>
        </SheetHeader>

        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-amount">Nominal</Label>
            <div className="flex items-center rounded-xl border border-input bg-background px-3">
              <span className="text-sm font-bold text-muted-foreground">Rp</span>
              <input
                id="edit-amount"
                inputMode="numeric"
                value={amountStr}
                onChange={(e) => setAmountStr(fmt(Number(e.target.value.replace(/\D/g, "")) || 0))}
                className="h-11 w-full bg-transparent px-2 text-lg font-extrabold outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-note">{isFlow ? "Judul / catatan" : "Catatan"}</Label>
            <Input id="edit-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />
          </div>

          {isFlow && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-merchant">Toko (opsional)</Label>
              <Input id="edit-merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} maxLength={80} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-date">Tanggal</Label>
            <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">{isTransfer ? "Dari dompet" : "Dompet"}</legend>
            <div className="grid grid-cols-2 gap-2">
              {activeWallets.map((w) => (
                <button type="button" key={w.id} onClick={() => setWalletId(w.id)} className={chip(walletId === w.id)} aria-pressed={walletId === w.id}>
                  {w.name}
                </button>
              ))}
            </div>
          </fieldset>

          {isTransfer && (
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Ke dompet</legend>
              <div className="grid grid-cols-2 gap-2">
                {activeWallets
                  .filter((w) => w.id !== walletId)
                  .map((w) => (
                    <button type="button" key={w.id} onClick={() => setToWalletId(w.id)} className={chip(toWalletId === w.id)} aria-pressed={toWalletId === w.id}>
                      {w.name}
                    </button>
                  ))}
              </div>
            </fieldset>
          )}

          {isFlow && cats.length > 0 && (
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Kategori</legend>
              <div className="flex flex-wrap gap-2">
                {cats.map((c) => (
                  <button type="button" key={c.id} onClick={() => setCategoryId(c.id)} className={chip(categoryId === c.id)} aria-pressed={categoryId === c.id}>
                    {categoryEmoji(c)} {c.name}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="h-11 rounded-xl">
              Batal
            </Button>
            <Button type="submit" disabled={saving} className="h-11 rounded-xl bg-teal-600 font-bold text-white hover:bg-teal-700">
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
