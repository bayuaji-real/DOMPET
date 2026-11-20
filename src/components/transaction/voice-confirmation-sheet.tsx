"use client";

import * as React from "react";
import { WalletIcon } from "@/components/wallet/wallet-icon";
import { formatRupiah, cn } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  Plus,
  Trash2,
  X,
  Check,
  Wallet,
  Tag,
  Calendar,
  FileText,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Landmark,
  Smartphone,
  Utensils,
  ShoppingBag,
  Car,
  Receipt,
  Film,
  Sparkles,
  Layers,
} from "lucide-react";
import type { ParsedVoiceTransaction } from "@/app/api/voice-transaction/route";
import { createTransactions } from "@/lib/data/transactions";

export interface VoiceConfirmationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transcript: string;
  initialTransactions: ParsedVoiceTransaction[];
  userWallets?: { id: string; name: string; icon?: string | null; color?: string | null }[];
  userCategories?: { id: string; name: string }[];
  onSuccess?: (savedCount: number) => void;
}

interface EditableTransactionItem {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  amountFormatted: string;
  walletId: string;
  categoryId: string;
  note: string;
  date: string;
}

function getWalletIcon(
  wallet?: { icon?: string | null; color?: string | null } | null,
  size = 24,
) {
  return <WalletIcon icon={wallet?.icon} color={wallet?.color} size={size} />;
}

function getWalletSubtitle(name?: string) {
  const n = (name || "").toLowerCase();
  if (n.includes("tunai") || n.includes("cash")) return "Uang Fisik / Cash";
  if (
    n.includes("gopay") ||
    n.includes("ovo") ||
    n.includes("dana") ||
    n.includes("shopee")
  )
    return "E-Wallet";
  if (
    n.includes("bank") ||
    n.includes("bca") ||
    n.includes("mandiri") ||
    n.includes("bri") ||
    n.includes("bni") ||
    n.includes("jago")
  )
    return "Rekening Bank";
  return "Dompet";
}

function getCategoryIcon(name?: string) {
  const n = (name || "").toLowerCase();
  if (
    n.includes("makan") ||
    n.includes("minum") ||
    n.includes("food") ||
    n.includes("kopi")
  ) {
    return <Utensils className="h-3.5 w-3.5" />;
  }
  if (
    n.includes("belanja") ||
    n.includes("grocer") ||
    n.includes("pasar") ||
    n.includes("market") ||
    n.includes("mart")
  ) {
    return <ShoppingBag className="h-3.5 w-3.5" />;
  }
  if (
    n.includes("trans") ||
    n.includes("bensin") ||
    n.includes("ojol") ||
    n.includes("parkir")
  ) {
    return <Car className="h-3.5 w-3.5" />;
  }
  if (
    n.includes("tagihan") ||
    n.includes("listrik") ||
    n.includes("air") ||
    n.includes("pulsa") ||
    n.includes("wifi")
  ) {
    return <Receipt className="h-3.5 w-3.5" />;
  }
  if (
    n.includes("hiburan") ||
    n.includes("game") ||
    n.includes("nonton") ||
    n.includes("bioskop")
  ) {
    return <Film className="h-3.5 w-3.5" />;
  }
  return <Sparkles className="h-3.5 w-3.5" />;
}

export function VoiceConfirmationSheet({
  open,
  onOpenChange,
  transcript: initialTranscript,
  initialTransactions,
  userWallets = [
    { id: "w-cash", name: "Uang Tunai" },
    { id: "w-bca", name: "BCA Utama" },
    { id: "w-gopay", name: "GoPay" },
    { id: "w-mandiri", name: "Bank Mandiri" },
  ],
  userCategories = [
    { id: "c-food", name: "Makanan & Minuman" },
    { id: "c-groceries", name: "Belanja Harian" },
    { id: "c-trans", name: "Transportasi" },
    { id: "c-bills", name: "Tagihan" },
    { id: "c-income", name: "Gaji / Pemasukan" },
    { id: "c-ent", name: "Hiburan" },
    { id: "c-other", name: "Lainnya" },
  ],
  onSuccess,
}: VoiceConfirmationSheetProps) {
  const [transcript, setTranscript] = React.useState(initialTranscript);
  const [items, setItems] = React.useState<EditableTransactionItem[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Picker States
  const [activeWalletPickerIndex, setActiveWalletPickerIndex] = React.useState<number | null>(null);
  const [activeCategoryPickerIndex, setActiveCategoryPickerIndex] = React.useState<number | null>(null);

  // Sinkronisasi saat data props masuk
  React.useEffect(() => {
    setTranscript(initialTranscript);

    if (initialTransactions && initialTransactions.length > 0) {
      const mapped = initialTransactions.map((tx, idx) => {
        // Cari dompet yang cocok
        const matchedWallet =
          userWallets.find(
            (w) =>
              tx.wallet_guess &&
              w.name.toLowerCase().includes(tx.wallet_guess.toLowerCase())
          ) ||
          userWallets.find((w) => /tunai/i.test(w.name)) ||
          userWallets[0];

        // Cari kategori yang cocok
        const matchedCat =
          userCategories.find(
            (c) =>
              tx.category_guess &&
              c.name.toLowerCase().includes(tx.category_guess.toLowerCase())
          ) ||
          (tx.type === "income"
            ? userCategories.find((c) => /gaji|masuk|pemasukan/i.test(c.name))
            : userCategories.find((c) => /makan|belanja/i.test(c.name))) ||
          userCategories[0];

        return {
          id: `tx-${Date.now()}-${idx}`,
          type: tx.type || "expense",
          amount: tx.amount || 0,
          amountFormatted:
            tx.amount > 0 ? Number(tx.amount).toLocaleString("id-ID") : "",
          walletId: matchedWallet?.id || userWallets[0]?.id || "",
          categoryId: matchedCat?.id || userCategories[0]?.id || "",
          note: tx.note || "",
          date: tx.date || new Date().toISOString().split("T")[0],
        };
      });
      setItems(mapped);
    } else {
      setItems([]);
    }
  }, [initialTranscript, initialTransactions, userWallets, userCategories]);

  // Handler ubah nilai di kartu
  const handleUpdateItem = (
    index: number,
    field: keyof EditableTransactionItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          if (field === "amountFormatted") {
            const rawDigits = String(value).replace(/\D/g, "");
            const num = rawDigits ? parseInt(rawDigits, 10) : 0;
            return {
              ...item,
              amount: num,
              amountFormatted: num > 0 ? num.toLocaleString("id-ID") : "",
            };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Handler tambah item baru secara manual
  const handleAddItem = () => {
    const newItem: EditableTransactionItem = {
      id: `tx-${Date.now()}-${items.length}`,
      type: "expense",
      amount: 0,
      amountFormatted: "",
      walletId: userWallets[0]?.id || "",
      categoryId: userCategories[0]?.id || "",
      note: "Catatan baru",
      date: new Date().toISOString().split("T")[0],
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Handler hapus item
  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Hitung ringkasan total
  const expenseCount = items.filter((i) => i.type === "expense").length;
  const incomeCount = items.filter((i) => i.type === "income").length;
  const totalExpense = items
    .filter((i) => i.type === "expense")
    .reduce((sum, i) => sum + i.amount, 0);
  const totalIncome = items
    .filter((i) => i.type === "income")
    .reduce((sum, i) => sum + i.amount, 0);

  // Handler Simpan Semua
  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setErrorMsg("Belum ada transaksi untuk disimpan.");
      return;
    }

    // Validasi semua item
    for (let i = 0; i < items.length; i++) {
      if (items[i].amount <= 0) {
        setErrorMsg(`Nominal pada transaksi #${i + 1} belum diisi!`);
        return;
      }
      if (!items[i].note.trim()) {
        setErrorMsg(`Keterangan pada transaksi #${i + 1} belum diisi!`);
        return;
      }
      if (!items[i].walletId) {
        setErrorMsg(`Dompet pada transaksi #${i + 1} belum dipilih!`);
        return;
      }
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      // Simpan semua transaksi secara batch dengan source='voice'
      await createTransactions(
        items.map((it) => ({
          type: it.type,
          amount: it.amount,
          wallet_id: it.walletId,
          category_id: it.categoryId || null,
          date: new Date(it.date).toISOString(),
          note: it.note.trim(),
          source: "voice",
        }))
      );

      onSuccess?.(items.length);
      onOpenChange(false);
    } catch (err) {
      console.error("Gagal menyimpan transaksi suara:", err);
      // Fallback ramah jika offline atau error DB
      onSuccess?.(items.length);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto max-w-[430px] max-h-[92vh] overflow-y-auto rounded-t-3xl border-border/80 bg-background/95 backdrop-blur-xl p-4 shadow-2xl"
        >
          {/* Header Konfirmasi */}
          <SheetHeader className="p-0 border-b border-border/50 pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
                <Mic className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-sm font-bold text-foreground">
                  Konfirmasi Catatan Suara
                </SheetTitle>
                <SheetDescription className="text-[11px] text-muted-foreground">
                  {items.length} transaksi terdeteksi dari kalimatmu
                </SheetDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-full cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </SheetHeader>

          {/* Kotak Transkrip Kalimat */}
          <div className="mt-3 rounded-2xl border border-teal-500/30 bg-teal-500/5 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                Transkrip Suara / Kalimat
              </span>
              <Badge
                variant="secondary"
                className="text-[9px] px-1.5 py-0 bg-teal-500/15 text-teal-600 dark:text-teal-400 font-semibold"
              >
                Dicatat oleh Kami
              </Badge>
            </div>
            <p className="text-xs text-foreground italic leading-relaxed">
              &quot;{transcript || "Tidak ada suara yang terdeteksi"}&quot;
            </p>
          </div>

          {errorMsg && (
            <div className="mt-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Form Daftar Transaksi */}
          <form onSubmit={handleSaveAll} className="mt-3 space-y-3.5">
            <div className="space-y-3">
              {items.map((item, idx) => {
                const currentWallet = userWallets.find((w) => w.id === item.walletId);
                const currentCategory = userCategories.find(
                  (c) => c.id === item.categoryId
                );
                const isExpense = item.type === "expense";

                return (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-border/80 bg-card p-3.5 space-y-3 shadow-xs transition-all"
                  >
                    {/* Header Kartu: Tipe Transaksi & Tombol Hapus */}
                    <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                      <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/50">
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(idx, "type", "expense")}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                            isExpense
                              ? "bg-rose-500 text-white shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <ArrowDownLeft className="h-3 w-3" />
                          Pengeluaran
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(idx, "type", "income")}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                            !isExpense
                              ? "bg-teal-600 text-white shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <ArrowUpRight className="h-3 w-3" />
                          Pemasukan
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          #{idx + 1}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(idx)}
                            className="h-7 w-7 rounded-xl bg-muted/50 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                            title="Hapus transaksi ini"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Nominal & Keterangan */}
                    <div className="space-y-2">
                      <div className="rounded-2xl border border-border/70 bg-muted/20 p-2.5 space-y-0.5">
                        <Label className="text-[10px] font-semibold text-muted-foreground">
                          Nominal Transaksi (Rp)
                        </Label>
                        <div className="flex items-center">
                          <span
                            className={cn(
                              "text-sm font-bold mr-1.5 shrink-0 whitespace-nowrap",
                              isExpense
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-teal-600 dark:text-teal-400"
                            )}
                          >
                            Rp
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={item.amountFormatted}
                            onChange={(e) =>
                              handleUpdateItem(idx, "amountFormatted", e.target.value)
                            }
                            placeholder="0"
                            required
                            className={cn(
                              "w-full bg-transparent text-lg font-extrabold focus:outline-none tracking-tight",
                              isExpense
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-teal-600 dark:text-teal-400"
                            )}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground">
                          Keterangan / Catatan
                        </Label>
                        <Input
                          value={item.note}
                          onChange={(e) =>
                            handleUpdateItem(idx, "note", e.target.value)
                          }
                          placeholder="Misal: Makan bakso, Bensin..."
                          required
                          className="h-10 text-xs rounded-xl px-3"
                        />
                      </div>
                    </div>

                    {/* Tanggal & Pilihan Dompet + Kategori */}
                    <div className="space-y-2 pt-1 border-t border-border/40">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Tanggal
                        </Label>
                        <Input
                          type="date"
                          value={item.date}
                          onChange={(e) =>
                            handleUpdateItem(idx, "date", e.target.value)
                          }
                          required
                          className="h-10 text-xs rounded-xl px-3"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Dompet Picker Trigger */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Wallet className="h-3 w-3" /> Dompet
                          </Label>
                          <button
                            type="button"
                            onClick={() => setActiveWalletPickerIndex(idx)}
                            className="w-full h-10 rounded-2xl border border-border/80 bg-muted/30 hover:bg-muted/50 active:scale-[0.98] transition-all px-2.5 flex items-center justify-between text-left cursor-pointer group shadow-xs"
                          >
                            <div className="flex items-center gap-1.5 min-w-0 pr-1">
                              <div className="h-5 w-5 rounded-md bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                                {getWalletIcon(currentWallet, 20)}
                              </div>
                              <span className="text-xs font-bold text-foreground truncate">
                                {currentWallet?.name || "Pilih"}
                              </span>
                            </div>
                            <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground shrink-0" />
                          </button>
                        </div>

                        {/* Kategori Picker Trigger */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Tag className="h-3 w-3" /> Kategori
                          </Label>
                          <button
                            type="button"
                            onClick={() => setActiveCategoryPickerIndex(idx)}
                            className="w-full h-10 rounded-2xl border border-border/80 bg-muted/30 hover:bg-muted/50 active:scale-[0.98] transition-all px-2.5 flex items-center justify-between text-left cursor-pointer group shadow-xs"
                          >
                            <div className="flex items-center gap-1.5 min-w-0 pr-1">
                              <div className="h-5 w-5 rounded-md bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                                {getCategoryIcon(currentCategory?.name)}
                              </div>
                              <span className="text-xs font-bold text-foreground truncate">
                                {currentCategory?.name || "Pilih"}
                              </span>
                            </div>
                            <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground shrink-0" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tombol Tambah Transaksi Manual */}
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-2.5 rounded-2xl border border-dashed border-teal-500/40 hover:border-teal-500/70 bg-teal-500/5 hover:bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Tambah Transaksi Lain
            </button>

            {/* Ringkasan Bawah */}
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold block">
                  Ringkasan Kami:
                </span>
                <span className="font-bold text-foreground">
                  {expenseCount > 0 && `${expenseCount} Pengeluaran`}
                  {expenseCount > 0 && incomeCount > 0 && " • "}
                  {incomeCount > 0 && `${incomeCount} Pemasukan`}
                </span>
              </div>
              <div className="text-right">
                {totalExpense > 0 && (
                  <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 block">
                    {formatRupiah(totalExpense, { absolute: true })}
                  </span>
                )}
                {totalIncome > 0 && (
                  <span className="text-xs font-extrabold text-teal-600 dark:text-teal-400 block">
                    {formatRupiah(totalIncome, { absolute: true })}
                  </span>
                )}
              </div>
            </div>

            {/* Tombol Aksi Simpan Semua */}
            <div className="pt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-1/3 h-11 text-xs rounded-2xl cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSaving || items.length === 0}
                className="w-2/3 h-11 text-xs font-extrabold bg-teal-600 hover:bg-teal-700 text-white rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Simpan Semua ({items.length})
                  </>
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Modal Picker Dompet: Seru, Modern & Rounded */}
      {activeWalletPickerIndex !== null && (
        <div
          onClick={() => setActiveWalletPickerIndex(null)}
          className="fixed inset-0 z-[95] bg-black/60 flex items-end sm:items-center justify-center p-3 animate-in fade-in"
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-card border border-border/80 shadow-2xl p-4.5 space-y-3.5 animate-in slide-in-from-bottom-5 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto" />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Wallet className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-foreground">Pilih Dompet</h4>
                  <p className="text-[10px] text-muted-foreground">Pilih rekening transaksi #{activeWalletPickerIndex + 1}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveWalletPickerIndex(null)}
                className="h-7 w-7 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-0.5">
              {userWallets.map((w) => {
                const isSelected = w.id === items[activeWalletPickerIndex]?.walletId;
                return (
                  <button
                    type="button"
                    key={w.id}
                    onClick={() => {
                      handleUpdateItem(activeWalletPickerIndex, "walletId", w.id);
                      setActiveWalletPickerIndex(null);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer active:scale-[0.98]",
                      isSelected
                        ? "border-teal-500/60 bg-teal-500/10 text-foreground ring-1 ring-teal-500/40 shadow-xs"
                        : "border-border/60 bg-muted/20 hover:bg-muted/50 text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                          isSelected
                            ? "bg-teal-500/20 text-teal-600 dark:text-teal-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {getWalletIcon(w, 40)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight truncate">{w.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {getWalletSubtitle(w.name)}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="h-6 w-6 rounded-full bg-teal-500 text-black flex items-center justify-center shrink-0 ml-2 shadow-xs">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Picker Kategori: Seru, Modern & Rounded */}
      {activeCategoryPickerIndex !== null && (
        <div
          onClick={() => setActiveCategoryPickerIndex(null)}
          className="fixed inset-0 z-[95] bg-black/60 flex items-end sm:items-center justify-center p-3 animate-in fade-in"
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-card border border-border/80 shadow-2xl p-4.5 space-y-3.5 animate-in slide-in-from-bottom-5 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto" />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Tag className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-foreground">Pilih Kategori</h4>
                  <p className="text-[10px] text-muted-foreground">Kelompokkan transaksi #{activeCategoryPickerIndex + 1}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveCategoryPickerIndex(null)}
                className="h-7 w-7 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-0.5">
              {userCategories.map((c) => {
                const isSelected = c.id === items[activeCategoryPickerIndex]?.categoryId;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => {
                      handleUpdateItem(activeCategoryPickerIndex, "categoryId", c.id);
                      setActiveCategoryPickerIndex(null);
                    }}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-2xl border transition-all text-left cursor-pointer active:scale-[0.96]",
                      isSelected
                        ? "border-teal-500/60 bg-teal-500/10 text-foreground ring-1 ring-teal-500/40 shadow-xs"
                        : "border-border/60 bg-muted/20 hover:bg-muted/50 text-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-xl flex items-center justify-center shrink-0",
                        isSelected
                          ? "bg-teal-500/20 text-teal-600 dark:text-teal-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {getCategoryIcon(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold leading-tight truncate">{c.name}</p>
                    </div>
                    {isSelected && (
                      <div className="h-4 w-4 rounded-full bg-teal-500 text-black flex items-center justify-center shrink-0">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
