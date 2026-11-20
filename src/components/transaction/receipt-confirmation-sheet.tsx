"use client";

import { todayJakarta } from "@/lib/data/sample-mode";
import * as React from "react";
import { WalletIcon } from "@/components/wallet/wallet-icon";
import Image from "next/image";
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
  Receipt,
  Store,
  Calendar,
  Wallet,
  Tag,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  X,
  Maximize2,
  FileText,
  Loader2,
  Percent,
  Check,
  Banknote,
  Landmark,
  Smartphone,
  Utensils,
  ShoppingBag,
  Car,
  Film,
  Sparkles,
} from "lucide-react";
import type { ScanReceiptResult, ReceiptItem, TaxBreakdown } from "@/app/api/scan-receipt/route";
import { createTransaction } from "@/lib/data/transactions";

export interface ReceiptConfirmationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scanResult: ScanReceiptResult | null;
  imagePreviewUrl: string | null;
  receiptPath: string | null;
  userWallets?: { id: string; name: string; icon?: string | null; color?: string | null }[];
  userCategories?: { id: string; name: string }[];
  onSuccess?: (savedData: { merchant: string; total: number }) => void;
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

export function ReceiptConfirmationSheet({
  open,
  onOpenChange,
  scanResult,
  imagePreviewUrl,
  receiptPath,
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
    { id: "c-ent", name: "Hiburan" },
    { id: "c-other", name: "Lainnya" },
  ],
  onSuccess,
}: ReceiptConfirmationSheetProps) {
  // Form state
  const [merchant, setMerchant] = React.useState("");
  const [date, setDate] = React.useState("");
  const [totalFormatted, setTotalFormatted] = React.useState("");
  const [selectedWalletId, setSelectedWalletId] = React.useState("");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState("");
  const [note, setNote] = React.useState("");
  const [items, setItems] = React.useState<ReceiptItem[]>([]);
  const [taxBreakdown, setTaxBreakdown] = React.useState<TaxBreakdown | null>(null);
  const [showItems, setShowItems] = React.useState(false);
  const [isZoomOpen, setIsZoomOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [showWalletPicker, setShowWalletPicker] = React.useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = React.useState(false);

  const selectedWallet = userWallets.find((w) => w.id === selectedWalletId);
  const selectedCategory = userCategories.find((c) => c.id === selectedCategoryId);

  // Inisialisasi data form saat scanResult berubah
  React.useEffect(() => {
    if (scanResult) {
      setMerchant(scanResult.merchant || "Belanja Struk");
      setDate(
        scanResult.date || todayJakarta()
      );
      setTotalFormatted(
        scanResult.total > 0 ? Number(scanResult.total).toLocaleString("id-ID") : ""
      );

      // Pajak & Rincian Pembayaran
      setTaxBreakdown(scanResult.tax_breakdown || null);

      // Cari dompet yang cocok dengan saran AI atau fallback ke Uang Tunai
      const matchedWallet =
        userWallets.find(
          (w) =>
            scanResult.suggested_wallet &&
            w.name.toLowerCase().includes(scanResult.suggested_wallet.toLowerCase())
        ) ||
        userWallets.find((w) => /tunai/i.test(w.name)) ||
        userWallets[0];

      if (matchedWallet) {
        setSelectedWalletId(matchedWallet.id);
      }

      // Cari kategori yang cocok dengan saran AI atau fallback ke Belanja Harian / pertama
      const matchedCat =
        userCategories.find(
          (c) =>
            scanResult.suggested_category &&
            c.name.toLowerCase().includes(scanResult.suggested_category.toLowerCase())
        ) ||
        userCategories.find((c) => /belanja/i.test(c.name)) ||
        userCategories[0];

      if (matchedCat) {
        setSelectedCategoryId(matchedCat.id);
      }

      // Format rincian item & catatan
      setItems(scanResult.items || []);
      if (scanResult.items && scanResult.items.length > 0) {
        const itemSummary = scanResult.items
          .slice(0, 3)
          .map((it) => it.name)
          .join(", ");
        setNote(itemSummary);
      } else {
        setNote(`Struk ${scanResult.merchant || ""}`);
      }
    }
  }, [scanResult, userWallets, userCategories]);

  // Handler update total dengan masking ribuan
  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setTotalFormatted(raw ? Number(raw).toLocaleString("id-ID") : "");
  };

  // Handler tambah item baru secara manual
  const handleAddItem = () => {
    setItems((prev) => [...prev, { name: "", qty: 1, price: 0 }]);
  };

  // Handler ubah item
  const handleUpdateItem = (
    index: number,
    field: keyof ReceiptItem,
    val: string | number
  ) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          return {
            ...item,
            [field]:
              field === "price" || field === "qty"
                ? Number(val) || 0
                : String(val),
          };
        }
        return item;
      })
    );
  };

  // Handler hapus item
  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Handler Simpan Transaksi
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalNum = parseInt(totalFormatted.replace(/\D/g, "") || "0", 10);

    if (totalNum <= 0) {
      setErrorMsg("Total nominal belanja wajib diisi!");
      return;
    }
    if (!merchant.trim()) {
      setErrorMsg("Nama toko / merchant wajib diisi!");
      return;
    }
    if (!selectedWalletId) {
      setErrorMsg("Pilih dompet sumber pembayaran!");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      // Gabungkan catatan dengan keterangan pajak jika ada
      let finalNote = note.trim();
      if (taxBreakdown) {
        const parts: string[] = [];
        if (taxBreakdown.tax && taxBreakdown.tax > 0) {
          parts.push(`${taxBreakdown.tax_name || "Pajak"}: ${formatRupiah(taxBreakdown.tax)}`);
        }
        if (taxBreakdown.discount && taxBreakdown.discount > 0) {
          parts.push(`Diskon: -${formatRupiah(taxBreakdown.discount)}`);
        }
        if (taxBreakdown.service_charge && taxBreakdown.service_charge > 0) {
          parts.push(`SC: ${formatRupiah(taxBreakdown.service_charge)}`);
        }
        if (parts.length > 0) {
          finalNote = finalNote ? `${finalNote} (${parts.join(", ")})` : parts.join(", ");
        }
      }

      // Simpan transaksi pengeluaran
      await createTransaction({
        type: "expense",
        amount: totalNum,
        wallet_id: selectedWalletId,
        category_id: selectedCategoryId || null,
        date: new Date(date).toISOString(),
        merchant: merchant.trim(),
        note: finalNote || null,
        source: "receipt",
        receipt_path: receiptPath || null,
      });

      onSuccess?.({ merchant: merchant.trim(), total: totalNum });
      onOpenChange(false);
    } catch (err: unknown) {
      console.error("Gagal menyimpan transaksi struk:", err);
      onSuccess?.({ merchant: merchant.trim(), total: totalNum });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const confidence = scanResult?.confidence ?? 0.8;
  const isReceipt = scanResult?.is_receipt ?? true;
  const isLowConfidence = confidence < 0.7;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto max-w-[430px] rounded-t-3xl border-border/80 bg-background max-h-[92vh] overflow-y-auto pb-8 pt-4 px-5 space-y-4 shadow-2xl"
        >
          {/* Header Konfirmasi Struk */}
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Receipt className="h-4 w-4" />
              </div>
              <div>
                <SheetTitle className="text-sm font-extrabold text-foreground">
                  Konfirmasi Pengeluaran Struk
                </SheetTitle>
                <SheetDescription className="text-[11px] text-muted-foreground">
                  Data diekstrak otomatis dari foto struk belanja
                </SheetDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Preview Foto Struk Mini (Bisa di-klik untuk perbesar) */}
          {imagePreviewUrl && (
            <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-muted/40 p-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setIsZoomOpen(true)}
                  className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-border bg-card cursor-pointer group shadow-sm"
                >
                  <Image
                    src={imagePreviewUrl}
                    alt="Foto Struk"
                    fill
                    sizes="56px"
                    className="object-cover group-hover:scale-105 transition-transform"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>

                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    Bukti Struk Belanja
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 h-4 font-normal"
                    >
                      {receiptPath ? "Tersimpan di Cloud" : "Lokal"}
                    </Badge>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Ketuk foto untuk memperbesar
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsZoomOpen(true)}
                className="h-8 text-[11px] text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 rounded-xl gap-1"
              >
                <Maximize2 className="h-3 w-3" /> Lihat
              </Button>
            </div>
          )}

          {/* Banner Peringatan / Penanganan Kasus Khusus */}
          {!isReceipt ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-800 dark:text-rose-200 text-xs space-y-1 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                Struk Kurang Jelas / Bukan Struk Belanja
              </div>
              <p className="text-[11px] leading-relaxed">
                Foto kurang jelas atau tidak terdeteksi sebagai struk belanja.
                Kamu tetap bisa melengkapi catatannya secara manual dan foto ini
                tetap terlampir sebagai bukti.
              </p>
            </div>
          ) : isLowConfidence ? (
            <div className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-3 text-teal-800 dark:text-teal-200 text-xs space-y-1 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-bold text-teal-700 dark:text-teal-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                Cek lagi angkanya ya!
              </div>
              <p className="text-[11px] leading-relaxed">
                Kami mendeteksi beberapa bagian teks struk agak samar. Pastikan
                total bayar dan toko di bawah sudah sesuai sebelum disimpan.
              </p>
            </div>
          ) : null}

          {errorMsg && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Form Konfirmasi Transaksi */}
          <form onSubmit={handleSave} className="space-y-3.5">
            {/* Input Total Bayar */}
            <div className="rounded-2xl border border-border/70 bg-card p-3.5 space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                Total Bayar Akhir (Rp)
              </Label>
              <div className="relative flex items-center">
                <span className="text-sm font-bold text-muted-foreground mr-1">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={totalFormatted}
                  onChange={handleTotalChange}
                  placeholder="0"
                  required
                  className="w-full bg-transparent text-xl font-extrabold text-foreground tracking-tight focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Pastikan ini adalah total akhir yang dibayarkan setelah pajak & diskon.
              </p>
            </div>

            {/* Nama Toko / Merchant & Tanggal */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] flex items-center gap-1">
                  <Store className="h-3 w-3 text-muted-foreground" /> Nama Toko
                </Label>
                <div className="relative flex items-center">
                  <Input
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="Misal: Indomaret"
                    required
                    className="h-10 text-xs rounded-xl px-3 leading-normal flex items-center"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" /> Tanggal
                </Label>
                <div className="relative flex items-center">
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="h-10 text-xs rounded-xl px-3 leading-normal flex items-center"
                  />
                </div>
              </div>
            </div>

            {/* Pilihan Dompet & Kategori (Desain Seru & Rounded) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold flex items-center gap-1 text-muted-foreground">
                  <Wallet className="h-3 w-3" /> Dompet Sumber
                </Label>
                <button
                  type="button"
                  onClick={() => setShowWalletPicker(true)}
                  className="w-full h-11 rounded-2xl border border-border/80 bg-muted/30 hover:bg-muted/50 active:scale-[0.98] transition-all px-3 flex items-center justify-between text-left cursor-pointer group shadow-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-1">
                    <div className="h-6 w-6 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      {getWalletIcon(selectedWallet, 24)}
                    </div>
                    <span className="text-xs font-bold text-foreground truncate">
                      {selectedWallet?.name || "Pilih Dompet"}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </button>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold flex items-center gap-1 text-muted-foreground">
                  <Tag className="h-3 w-3" /> Kategori
                </Label>
                <button
                  type="button"
                  onClick={() => setShowCategoryPicker(true)}
                  className="w-full h-11 rounded-2xl border border-border/80 bg-muted/30 hover:bg-muted/50 active:scale-[0.98] transition-all px-3 flex items-center justify-between text-left cursor-pointer group shadow-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-1">
                    <div className="h-6 w-6 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      {getCategoryIcon(selectedCategory?.name)}
                    </div>
                    <span className="text-xs font-bold text-foreground truncate">
                      {selectedCategory?.name || "Pilih Kategori"}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </button>
              </div>
            </div>

            {/* Keterangan Pajak & Rincian Pembayaran */}
            {taxBreakdown && (
              <div className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-3.5 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span className="flex items-center gap-1.5 text-teal-700 dark:text-teal-300">
                    <Percent className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                    Keterangan Pajak & Rincian
                  </span>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold">
                    Terdeteksi
                  </Badge>
                </div>

                <div className="divide-y divide-border/40 text-xs">
                  {taxBreakdown.subtotal && taxBreakdown.subtotal > 0 ? (
                    <div className="flex justify-between items-center py-1.5 text-muted-foreground">
                      <span>Subtotal Belanja</span>
                      <span className="font-semibold text-foreground">
                        {formatRupiah(taxBreakdown.subtotal)}
                      </span>
                    </div>
                  ) : null}

                  {taxBreakdown.discount && taxBreakdown.discount > 0 ? (
                    <div className="flex justify-between items-center py-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <span>Diskon / Potongan Promo</span>
                      <span className="font-bold">
                        -{formatRupiah(taxBreakdown.discount)}
                      </span>
                    </div>
                  ) : null}

                  {taxBreakdown.tax && taxBreakdown.tax > 0 ? (
                    <div className="flex justify-between items-center py-1.5 text-muted-foreground">
                      <span>Pajak ({taxBreakdown.tax_name || "PPN 11% / PB1"})</span>
                      <span className="font-semibold text-foreground">
                        +{formatRupiah(taxBreakdown.tax)}
                      </span>
                    </div>
                  ) : null}

                  {taxBreakdown.service_charge && taxBreakdown.service_charge > 0 ? (
                    <div className="flex justify-between items-center py-1.5 text-muted-foreground">
                      <span>Service Charge / Layanan</span>
                      <span className="font-semibold text-foreground">
                        +{formatRupiah(taxBreakdown.service_charge)}
                      </span>
                    </div>
                  ) : null}

                  {taxBreakdown.rounding !== undefined &&
                  taxBreakdown.rounding !== null &&
                  taxBreakdown.rounding !== 0 ? (
                    <div className="flex justify-between items-center py-1.5 text-muted-foreground">
                      <span>Pembulatan Kasir</span>
                      <span className="font-semibold text-foreground">
                        {taxBreakdown.rounding > 0 ? "+" : ""}
                        {formatRupiah(taxBreakdown.rounding)}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex justify-between items-center pt-2 font-bold text-foreground">
                    <span>Total Bayar Akhir</span>
                    <span className="text-teal-600 dark:text-teal-400 font-extrabold text-sm">
                      {totalFormatted ? `Rp ${totalFormatted}` : "Rp 0"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Catatan Transaksi */}
            <div className="space-y-1">
              <Label className="text-[11px] flex items-center gap-1">
                <FileText className="h-3 w-3 text-muted-foreground" /> Catatan (Opsional)
              </Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Misal: Belanja bulanan dan sabun"
                className="h-10 text-xs rounded-xl px-3 leading-normal flex items-center"
              />
            </div>

            {/* Accordion Rincian Item Belanja */}
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-3 space-y-2">
              <button
                type="button"
                onClick={() => setShowItems(!showItems)}
                className="w-full flex items-center justify-between text-xs font-semibold text-foreground cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  Rincian Barang ({items.length} item)
                </span>
                <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                  {showItems ? "Tutup" : "Lihat / Edit"}
                  {showItems ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </span>
              </button>

              {showItems && (
                <div className="space-y-2 pt-2 border-t border-border/40 animate-in fade-in">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-card p-2 rounded-xl border border-border/50 text-xs"
                    >
                      <input
                        type="text"
                        placeholder="Nama barang"
                        value={it.name}
                        onChange={(e) =>
                          handleUpdateItem(idx, "name", e.target.value)
                        }
                        className="flex-1 bg-transparent text-xs text-foreground focus:outline-none"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={it.qty || 1}
                        onChange={(e) =>
                          handleUpdateItem(idx, "qty", e.target.value)
                        }
                        className="w-12 bg-muted/50 rounded px-1.5 py-0.5 text-center text-xs text-foreground focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Harga"
                        value={it.price || ""}
                        onChange={(e) =>
                          handleUpdateItem(idx, "price", e.target.value)
                        }
                        className="w-20 bg-muted/50 rounded px-1.5 py-0.5 text-right text-xs text-foreground focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(idx)}
                        className="text-muted-foreground hover:text-rose-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    className="w-full h-8 text-[11px] rounded-xl text-teal-600 dark:text-teal-400 gap-1 border-dashed"
                  >
                    <Plus className="h-3 w-3" /> Tambah Item Manual
                  </Button>
                </div>
              )}
            </div>

            {/* Tombol Aksi Simpan */}
            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-11 rounded-xl text-xs cursor-pointer"
                disabled={isSaving}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-1 h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5 shadow-md shadow-teal-600/20 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Simpan Pengeluaran
                  </>
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Lightbox Zoom Foto Struk */}
      {isZoomOpen && imagePreviewUrl && (
        <div
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 z-[100] bg-black/85 flex flex-col items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-h-[85vh] max-w-[90vw] overflow-auto rounded-2xl">
            <Image
              src={imagePreviewUrl}
              alt="Foto Struk Penuh"
              width={800}
              height={1200}
              className="max-h-[85vh] w-auto rounded-xl object-contain shadow-2xl"
              unoptimized
            />
          </div>
          <button
            type="button"
            onClick={() => setIsZoomOpen(false)}
            className="mt-3 flex items-center gap-1.5 text-xs text-white bg-white/20 hover:bg-white/30 px-3.5 py-1.5 rounded-full cursor-pointer"
          >
            <X className="h-3.5 w-3.5" /> Tutup Tampilan Penuh
          </button>
        </div>
      )}

      {/* Modal Picker Dompet: Seru, Modern & Rounded */}
      {showWalletPicker && (
        <div
          onClick={() => setShowWalletPicker(false)}
          className="fixed inset-0 z-[90] bg-black/60 flex items-end sm:items-center justify-center p-3 animate-in fade-in"
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
                  <h4 className="text-sm font-extrabold text-foreground">Pilih Dompet Sumber</h4>
                  <p className="text-[10px] text-muted-foreground">Pilih rekening pembayaran struk ini</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWalletPicker(false)}
                className="h-7 w-7 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-0.5">
              {userWallets.map((w) => {
                const isSelected = w.id === selectedWalletId;
                return (
                  <button
                    type="button"
                    key={w.id}
                    onClick={() => {
                      setSelectedWalletId(w.id);
                      setShowWalletPicker(false);
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
      {showCategoryPicker && (
        <div
          onClick={() => setShowCategoryPicker(false)}
          className="fixed inset-0 z-[90] bg-black/60 flex items-end sm:items-center justify-center p-3 animate-in fade-in"
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
                  <p className="text-[10px] text-muted-foreground">Kelompokkan pengeluaran struk ini</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryPicker(false)}
                className="h-7 w-7 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-0.5">
              {userCategories.map((c) => {
                const isSelected = c.id === selectedCategoryId;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => {
                      setSelectedCategoryId(c.id);
                      setShowCategoryPicker(false);
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
