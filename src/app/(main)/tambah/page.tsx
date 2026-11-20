"use client";

import * as React from "react";
import { WalletIcon } from "@/components/wallet/wallet-icon";
import Link from "next/link";
import { TopHeader } from "@/components/layout/top-header";
import {
  PenLine,
  Camera,
  Mic,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRightLeft,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah, parseRupiahInput, triggerHapticFeedback } from "@/lib/utils";
import { createTransaction } from "@/lib/data/transactions";
import { getWallets, type WalletBalance } from "@/lib/data/wallets";
import { getCategories, type Category } from "@/lib/data/categories";

export default function TambahTransaksiPage() {
  const [tipe, setTipe] = React.useState<"PENGELUARAN" | "PEMASUKAN" | "TRANSFER">("PENGELUARAN");
  const [nominalStr, setNominalStr] = React.useState("");
  const [judul, setJudul] = React.useState("");
  const [selectedWalletId, setSelectedWalletId] = React.useState("");
  const [toWalletId, setToWalletId] = React.useState("");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState("");

  const [wallets, setWallets] = React.useState<WalletBalance[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Muat daftar dompet & kategori
  React.useEffect(() => {
    async function loadData() {
      try {
        const [wList, cList] = await Promise.all([getWallets(), getCategories()]);
        setWallets(wList);
        setCategories(cList);

        if (wList.length > 0) {
          setSelectedWalletId(wList[0].id);
          if (wList.length > 1) {
            setToWalletId(wList[1].id);
          }
        }
        if (cList.length > 0) {
          const firstExp = cList.find((c) => c.type === "expense") || cList[0];
          setSelectedCategoryId(firstExp.id);
        }
      } catch (err) {
        console.warn("Gagal memuat dompet & kategori:", err);
      }
    }
    loadData();
  }, []);

  // Update pilihan kategori default saat tipe transaksi berubah
  React.useEffect(() => {
    if (categories.length > 0 && tipe !== "TRANSFER") {
      const targetType = tipe === "PENGELUARAN" ? "expense" : "income";
      const matched = categories.find((c) => c.type === targetType);
      if (matched) {
        setSelectedCategoryId(matched.id);
      }
    }
  }, [tipe, categories]);

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, "");
    if (!rawVal) {
      setNominalStr("");
      return;
    }
    const asBigInt = BigInt(rawVal);
    setNominalStr(asBigInt.toLocaleString("id-ID"));
  };

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const amount = Number(nominalStr.replace(/\D/g, ""));
    if (amount <= 0) {
      setErrorMessage("Nominal transaksi harus lebih dari Rp 0.");
      return;
    }

    if (tipe === "TRANSFER" && selectedWalletId === toWalletId) {
      setErrorMessage("Dompet tujuan tidak boleh sama dengan dompet asal.");
      return;
    }

    setIsSubmitting(true);
    triggerHapticFeedback([15, 30, 15]);

    try {
      const typeKey =
        tipe === "PENGELUARAN" ? "expense" : tipe === "PEMASUKAN" ? "income" : "transfer";

      await createTransaction({
        type: typeKey,
        amount,
        wallet_id: selectedWalletId,
        to_wallet_id: tipe === "TRANSFER" ? toWalletId : null,
        category_id: tipe === "TRANSFER" ? null : selectedCategoryId || null,
        note: judul.trim() || (tipe === "TRANSFER" ? "Transfer Antar Dompet" : tipe === "PENGELUARAN" ? "Pengeluaran" : "Pemasukan"),
        date: new Date().toISOString(),
        source: "manual",
      });

      triggerHapticFeedback([30, 50, 30]);
      setSavedSuccess(true);
      setNominalStr("");
      setJudul("");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("transaction_created"));
      }

      setTimeout(() => {
        setSavedSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error("Gagal menyimpan transaksi:", err);
      setErrorMessage(err.message || "Gagal mencatat transaksi. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentBigInt = parseRupiahInput(nominalStr);
  const activeCategories = categories.filter(
    (c) => c.type === (tipe === "PENGELUARAN" ? "expense" : "income")
  );

  return (
    <div className="flex flex-col flex-1 pb-24">
      <TopHeader title="Catat Transaksi" subtitle="Pilih jenis & masukkan detail" />

      <div className="space-y-4 p-4">
        {/* Toggle Pilihan Tipe Transaksi (Pengeluaran / Pemasukan / Transfer) */}
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(10);
              setTipe("PENGELUARAN");
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all cursor-pointer ${
              tipe === "PENGELUARAN"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowUpCircle className="h-3.5 w-3.5" />
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(10);
              setTipe("PEMASUKAN");
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all cursor-pointer ${
              tipe === "PEMASUKAN"
                ? "bg-teal-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowDownCircle className="h-3.5 w-3.5" />
            Pemasukan
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(10);
              setTipe("TRANSFER");
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all cursor-pointer ${
              tipe === "TRANSFER"
                ? "bg-sky-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Transfer
          </button>
        </div>

        {/* Shortcut Mode Input */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center gap-1 rounded-2xl border border-teal-500/40 bg-teal-500/10 p-2.5 text-teal-700 dark:text-teal-300">
            <PenLine className="h-4.5 w-4.5" />
            <span className="text-[11px] font-semibold">Manual</span>
          </div>
          <Link
            href="/?scan=true"
            className="flex flex-col items-center gap-1 rounded-2xl border border-border/60 bg-card p-2.5 text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            <Camera className="h-4.5 w-4.5" />
            <span className="text-[11px] font-medium">Scan Struk</span>
          </Link>
          <Link
            href="/?voice=true"
            className="flex flex-col items-center gap-1 rounded-2xl border border-border/60 bg-card p-2.5 text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            <Mic className="h-4.5 w-4.5" />
            <span className="text-[11px] font-medium">Pesan Suara</span>
          </Link>
        </div>

        {/* Form Input Manual */}
        <Card className="border-border/60 shadow-sm bg-card rounded-3xl">
          <CardContent className="p-4">
            <form onSubmit={handleSimpan} className="space-y-4">
              {/* Input Nominal Besar */}
              <div className="text-center py-2">
                <Label className="text-xs text-muted-foreground font-semibold">Nominal Transaksi (Rp)</Label>
                <div className="mt-1 flex items-center justify-center">
                  <span className="text-xl font-bold text-muted-foreground mr-1">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={nominalStr}
                    onChange={handleNominalChange}
                    className="w-full text-center text-3xl font-extrabold bg-transparent outline-none tracking-tight focus:ring-0 placeholder:text-muted-foreground/40"
                    autoFocus
                  />
                </div>
                {currentBigInt > 0n && (
                  <p className="mt-1 text-xs text-muted-foreground font-medium">
                    Terbaca: {formatRupiah(currentBigInt)}
                  </p>
                )}
              </div>

              {/* Judul / Catatan */}
              <div className="space-y-1.5">
                <Label htmlFor="judul" className="text-xs font-semibold">
                  {tipe === "TRANSFER" ? "Catatan Transfer (Opsional)" : "Catatan Transaksi"}
                </Label>
                <Input
                  id="judul"
                  placeholder={
                    tipe === "TRANSFER"
                      ? "Misal: Pindah saldo dari BCA ke GoPay"
                      : tipe === "PENGELUARAN"
                        ? "Misal: Nasi Padang, Belanja Mingguan"
                        : "Misal: Gaji, Bonus, Penjualan"
                  }
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                  required={tipe !== "TRANSFER"}
                />
              </div>

              {/* Pilihan Dompet */}
              {tipe === "TRANSFER" ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      Dari Dompet (Asal)
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {wallets.map((w) => (
                        <button
                          type="button"
                          key={`from-${w.id}`}
                          onClick={() => {
                            triggerHapticFeedback(10);
                            setSelectedWalletId(w.id);
                          }}
                          className={`rounded-xl border p-2.5 text-left text-xs font-medium transition-all cursor-pointer ${
                            selectedWalletId === w.id
                              ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold"
                              : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <WalletIcon icon={w.icon} color={w.color} size={28} />
                            <div className="min-w-0">
                              <div className="font-bold truncate">{w.name}</div>
                              <div className="text-[10px] opacity-75">{formatRupiah(w.balance)}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                      Ke Dompet (Tujuan)
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {wallets.map((w) => (
                        <button
                          type="button"
                          key={`to-${w.id}`}
                          onClick={() => {
                            triggerHapticFeedback(10);
                            setToWalletId(w.id);
                          }}
                          className={`rounded-xl border p-2.5 text-left text-xs font-medium transition-all cursor-pointer ${
                            toWalletId === w.id
                              ? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold"
                              : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <WalletIcon icon={w.icon} color={w.color} size={28} />
                            <div className="min-w-0">
                              <div className="font-bold truncate">{w.name}</div>
                              <div className="text-[10px] opacity-75">{formatRupiah(w.balance)}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Pilih Dompet / Rekening</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {wallets.map((w) => (
                      <button
                        type="button"
                        key={w.id}
                        onClick={() => {
                          triggerHapticFeedback(10);
                          setSelectedWalletId(w.id);
                        }}
                        className={`rounded-xl border p-2.5 text-left text-xs font-medium transition-all cursor-pointer ${
                          selectedWalletId === w.id
                            ? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold"
                            : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <WalletIcon icon={w.icon} color={w.color} size={28} />
                          <div className="min-w-0">
                            <div className="font-bold truncate">{w.name}</div>
                            <div className="text-[10px] opacity-75">{formatRupiah(w.balance)}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Pilihan Kategori (jika bukan transfer) */}
              {tipe !== "TRANSFER" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Pilih Kategori</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {activeCategories.map((kat) => (
                      <button
                        type="button"
                        key={kat.id}
                        onClick={() => {
                          triggerHapticFeedback(10);
                          setSelectedCategoryId(kat.id);
                        }}
                        className={`rounded-xl border py-2 px-1 text-center text-[11px] truncate transition-all cursor-pointer ${
                          selectedCategoryId === kat.id
                            ? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold"
                            : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {kat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/30 p-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              )}

              {savedSuccess && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-teal-500/15 border border-teal-500/30 p-2.5 text-xs font-semibold text-teal-600 dark:text-teal-400 animate-in fade-in">
                  <Check className="h-4 w-4" /> Transaksi berhasil dicatat!
                </div>
              )}

              <Button
                type="submit"
                disabled={!nominalStr || isSubmitting || (tipe !== "TRANSFER" && !judul)}
                className={`w-full h-11 rounded-2xl text-white font-bold transition-all shadow-md cursor-pointer ${
                  tipe === "PENGELUARAN"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                    : tipe === "PEMASUKAN"
                      ? "bg-teal-600 hover:bg-teal-700 shadow-teal-600/20"
                      : "bg-sky-600 hover:bg-sky-700 shadow-sky-600/20"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  `Simpan ${tipe === "PENGELUARAN" ? "Pengeluaran" : tipe === "PEMASUKAN" ? "Pemasukan" : "Transfer"}`
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
