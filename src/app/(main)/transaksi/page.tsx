"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { TopHeader } from "@/components/layout/top-header";
import { formatRupiah, formatTanggal, triggerHapticFeedback } from "@/lib/utils";
import { getTransactions } from "@/lib/data/transactions";
import { getWallets } from "@/lib/data/wallets";
import { getCategories } from "@/lib/data/categories";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Filter,
  Calendar,
  Receipt,
  Store,
  Wallet,
  Tag,
  Maximize2,
  X,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { getReceiptSignedUrl } from "@/lib/storage";
import { USE_SAMPLE_DATA, todayJakarta } from "@/lib/data/sample-mode";

interface TrxItem {
  id: string;
  judul: string;
  merchant?: string;
  kategori: string;
  dompet: string;
  nominal: bigint;
  tanggal: string;
  tipe: "PEMASUKAN" | "PENGELUARAN";
  source?: "manual" | "receipt" | "voice" | "recurring" | "payday";
  receipt_path?: string | null;
  items?: { name: string; qty: number; price: number }[];
  tax_breakdown?: {
    subtotal?: number | null;
    tax?: number | null;
    tax_name?: string | null;
    service_charge?: number | null;
    discount?: number | null;
    rounding?: number | null;
  } | null;
  catatan?: string;
}

export default function TransaksiPage() {
  const [selectedTrx, setSelectedTrx] = React.useState<TrxItem | null>(null);
  const [isZoomOpen, setIsZoomOpen] = React.useState(false);
  const [signedReceiptUrl, setSignedReceiptUrl] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterType, setFilterType] = React.useState<"all" | "expense" | "income" | "receipt">("all");
  const [isLoading, setIsLoading] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(8);

  const [transactions, setTransactions] = React.useState<TrxItem[]>(USE_SAMPLE_DATA ? [
    {
      id: "trx-receipt-1",
      judul: "Indomaret Point Sudirman",
      merchant: "Indomaret Point",
      kategori: "Belanja Harian",
      dompet: "GoPay",
      nominal: -82500n,
      tanggal: "20 Nov 2026",
      tipe: "PENGELUARAN",
      source: "receipt",
      receipt_path: "/samples/struk-indomaret.jpg",
      catatan: "Belanja mingguan: Roti tawar, susu UHT, kopi botol",
      tax_breakdown: {
        subtotal: 87500,
        discount: 5000,
        tax: 8175,
        tax_name: "PPN 11% (Termasuk)",
        service_charge: 0,
        rounding: 0,
      },
      items: [
        { name: "ROTI TAWAR GANDUM 1X", qty: 1, price: 19500 },
        { name: "ULTRA MILK FULL CREAM 1L", qty: 2, price: 38000 },
        { name: "KOPI KENANGAN RTD 220ML", qty: 2, price: 30000 },
      ],
    },
    {
      id: "trx-receipt-2",
      judul: "Kopi Kenangan Kokas",
      merchant: "Kopi Kenangan",
      kategori: "Makanan & Minuman",
      dompet: "Uang Tunai",
      nominal: -71000n,
      tanggal: "20 Nov 2026",
      tipe: "PENGELUARAN",
      source: "receipt",
      receipt_path: "/samples/struk-kopi-kenangan.jpg",
      catatan: "Nongkrong sore: 2 Kopi Kenangan Mantan + Roti Coklat",
      tax_breakdown: {
        subtotal: 62000,
        tax: 6200,
        tax_name: "PB1 Resto (10%)",
        service_charge: 3100,
        discount: 0,
        rounding: -300,
      },
      items: [
        { name: "2X KOPI KENANGAN MANTAN (L)", qty: 2, price: 48000 },
        { name: "1X ROTI COKLAT KLASIK", qty: 1, price: 14000 },
      ],
    },
    {
      id: "1",
      judul: "Kopi Susu Senja",
      kategori: "Makanan & Minuman",
      dompet: "GoPay",
      nominal: -22000n,
      tanggal: "20 Nov 2026",
      tipe: "PENGELUARAN",
      source: "manual",
    },
    {
      id: "2",
      judul: "Nasi Padang Spesial Rendang",
      kategori: "Makanan & Minuman",
      dompet: "Uang Tunai",
      nominal: -25000n,
      tanggal: "20 Nov 2026",
      tipe: "PENGELUARAN",
      source: "manual",
    },
    {
      id: "3",
      judul: "Gaji Bulanan",
      kategori: "Pemasukan",
      dompet: "BCA Utama",
      nominal: 8500000n,
      tanggal: "19 Nov 2026",
      tipe: "PEMASUKAN",
      source: "payday",
    },
    {
      id: "4",
      judul: "Beli Paket Internet 50GB",
      kategori: "Tagihan",
      dompet: "GoPay",
      nominal: -110000n,
      tanggal: "18 Nov 2026",
      tipe: "PENGELUARAN",
      source: "manual",
    },
    {
      id: "5",
      judul: "Cashback Belanja Online",
      kategori: "Pemasukan",
      dompet: "GoPay",
      nominal: 15000n,
      tanggal: "17 Nov 2026",
      tipe: "PEMASUKAN",
      source: "manual",
    },
  ] : []);

  // Muat transaksi live dari database Supabase dan dengarkan update event
  React.useEffect(() => {
    async function loadLiveTransactions() {
      setIsLoading(true);
      try {
        const [dbTrx, dbWallets, dbCats] = await Promise.allSettled([
          getTransactions({ limit: 50 }),
          getWallets(),
          getCategories(),
        ]);

        if (dbTrx.status === "fulfilled" && dbTrx.value.length > 0) {
          const walletsMap = new Map(
            dbWallets.status === "fulfilled"
              ? dbWallets.value.map((w) => [w.id, w.name])
              : []
          );
          const catsMap = new Map(
            dbCats.status === "fulfilled"
              ? dbCats.value.map((c) => [c.id, c.name])
              : []
          );

          const liveItems: TrxItem[] = dbTrx.value.map((t) => {
            const isExpense = t.type === "expense";
            const dt = t.date ? new Date(t.date) : new Date();
            const dateFormatted = formatTanggal(dt);

            return {
              id: t.id,
              judul: t.note || (isExpense ? "Pengeluaran" : "Pemasukan"),
              merchant: t.merchant || undefined,
              kategori: t.category_id ? (catsMap.get(t.category_id) || "Lainnya") : "Lainnya",
              dompet: walletsMap.get(t.wallet_id) || "Uang Tunai",
              nominal: isExpense ? -BigInt(t.amount) : BigInt(t.amount),
              tanggal: dateFormatted,
              tipe: isExpense ? "PENGELUARAN" : "PEMASUKAN",
              source: (t.source as any) || "manual",
              receipt_path: t.receipt_path || undefined,
              catatan: t.note || undefined,
            };
          });

          // Tampilkan transaksi live dari database di bagian atas
          setTransactions((prev) => {
            const liveIds = new Set(liveItems.map((l) => l.id));
            const remainingMocks = prev.filter((p) => !liveIds.has(p.id));
            return [...liveItems, ...remainingMocks];
          });
        }
      } catch (err) {
        console.warn("Gagal memuat riwayat transaksi live:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadLiveTransactions();

    const handleCreated = () => {
      loadLiveTransactions();
    };

    window.addEventListener("transaction_created", handleCreated);
    return () => window.removeEventListener("transaction_created", handleCreated);
  }, []);

  // Handle buka detail transaksi dan resolve signed URL struk
  const handleOpenDetail = async (trx: TrxItem) => {
    setSelectedTrx(trx);
    if (trx.receipt_path) {
      if (trx.receipt_path.startsWith("/")) {
        // Path statis lokal di public/
        setSignedReceiptUrl(trx.receipt_path);
      } else {
        // Path di Supabase Storage
        const signed = await getReceiptSignedUrl(trx.receipt_path);
        setSignedReceiptUrl(signed || trx.receipt_path);
      }
    } else {
      setSignedReceiptUrl(null);
    }
  };

  const filteredTransactions = transactions.filter((trx) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = trx.judul.toLowerCase().includes(q);
      const matchCat = trx.kategori.toLowerCase().includes(q);
      const matchWallet = trx.dompet.toLowerCase().includes(q);
      const matchMerchant = trx.merchant?.toLowerCase().includes(q);
      if (!matchTitle && !matchCat && !matchWallet && !matchMerchant) return false;
    }

    if (filterType === "expense") return trx.tipe === "PENGELUARAN";
    if (filterType === "income") return trx.tipe === "PEMASUKAN";
    if (filterType === "receipt") return trx.source === "receipt" || Boolean(trx.receipt_path);
    return true;
  });

  return (
    <div className="flex flex-col flex-1 pb-20">
      <TopHeader
        title="Riwayat Transaksi"
        subtitle="Semua arus masuk & keluar uangmu"
      />

      <div className="space-y-4 p-4">
        {/* Kolom Pencarian & Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari transaksi atau nama toko..."
              className="pl-9 h-10 text-xs rounded-xl bg-card border-border/60"
            />
          </div>
          <button
            onClick={() => setFilterType((prev) => (prev === "receipt" ? "all" : "receipt"))}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 transition-colors ${
              filterType === "receipt"
                ? "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/40"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
            title="Filter Struk"
            aria-label="Filter transaksi struk"
          >
            <Receipt className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Filter Cepat */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          <Badge
            variant={filterType === "all" ? "default" : "secondary"}
            onClick={() => setFilterType("all")}
            className={`rounded-lg px-3 py-1 cursor-pointer ${
              filterType === "all" ? "bg-teal-600 hover:bg-teal-700 text-white" : ""
            }`}
          >
            Semua
          </Badge>
          <Badge
            variant={filterType === "receipt" ? "default" : "secondary"}
            onClick={() => setFilterType("receipt")}
            className={`rounded-lg px-3 py-1 cursor-pointer gap-1 ${
              filterType === "receipt" ? "bg-teal-600 hover:bg-teal-700 text-white" : ""
            }`}
          >
            <Receipt className="h-3 w-3" /> Foto Struk
          </Badge>
          <Badge
            variant={filterType === "expense" ? "default" : "secondary"}
            onClick={() => setFilterType("expense")}
            className={`rounded-lg px-3 py-1 cursor-pointer ${
              filterType === "expense" ? "bg-teal-600 hover:bg-teal-700 text-white" : ""
            }`}
          >
            Pengeluaran
          </Badge>
          <Badge
            variant={filterType === "income" ? "default" : "secondary"}
            onClick={() => setFilterType("income")}
            className={`rounded-lg px-3 py-1 cursor-pointer ${
              filterType === "income" ? "bg-teal-600 hover:bg-teal-700 text-white" : ""
            }`}
          >
            Pemasukan
          </Badge>
        </div>

        {/* Daftar Transaksi */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>November 2026</span>
            </div>
            <span className="text-[11px] font-normal">
              {filteredTransactions.length} transaksi
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-border/40 bg-card shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-xl" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-2.5 w-36" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center bg-card/40 space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Receipt className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">
                  Belum ada transaksi, yuk catat yang pertama
                </p>
                <p className="text-xs text-muted-foreground">
                  Catat pengeluaran harian, pemasukan gaji, atau foto struk belanjamu
                </p>
              </div>
              <Link
                href="/tambah"
                className="inline-flex items-center justify-center rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2.5 shadow-sm transition-colors cursor-pointer"
              >
                Catat Transaksi Sekarang
              </Link>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border/50 rounded-2xl border border-border/60 bg-card shadow-sm">
                {filteredTransactions.slice(0, visibleCount).map((trx) => {
                  const isIncome = trx.nominal > 0n;
                  const hasReceipt = trx.source === "receipt" || Boolean(trx.receipt_path);

                  return (
                    <div
                      key={trx.id}
                      onClick={() => {
                        triggerHapticFeedback(10);
                        handleOpenDetail(trx);
                      }}
                      className="flex items-center justify-between p-3.5 transition-colors hover:bg-muted/40 cursor-pointer group active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                            hasReceipt
                              ? "bg-teal-500/15 text-teal-600 dark:text-teal-400"
                              : isIncome
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {hasReceipt ? (
                            <Receipt className="h-4 w-4" />
                          ) : isIncome ? (
                            <ArrowDownRight className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold leading-tight text-foreground">
                              {trx.judul}
                            </p>
                            {hasReceipt && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] px-1 py-0 h-4 bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold"
                              >
                                Struk
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span>{trx.dompet}</span>
                            <span>•</span>
                            <span>{trx.kategori}</span>
                            <span>•</span>
                            <span>{trx.tanggal}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-bold ${
                          isIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {formatRupiah(trx.nominal, { absolute: true })}
                      </span>
                    </div>
                  );
                })}
              </div>

              {filteredTransactions.length > visibleCount && (
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback();
                      setVisibleCount((prev) => prev + 8);
                    }}
                    className="w-full py-2.5 rounded-xl border border-border/80 bg-card hover:bg-muted/60 text-xs font-bold text-foreground shadow-xs transition-colors cursor-pointer"
                  >
                    Muat Lebih Banyak ({filteredTransactions.length - visibleCount} tersisa)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sheet Detail Transaksi */}
      <Sheet open={Boolean(selectedTrx)} onOpenChange={(open) => !open && setSelectedTrx(null)}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto max-w-[430px] rounded-t-3xl border-border/80 bg-background pb-8 pt-4 px-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {selectedTrx && (
            <>
              {/* Header Detail */}
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                      selectedTrx.source === "receipt"
                        ? "bg-teal-500/15 text-teal-600 dark:text-teal-400"
                        : selectedTrx.nominal > 0n
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-rose-500/10 text-rose-600"
                    }`}
                  >
                    {selectedTrx.source === "receipt" ? (
                      <Receipt className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <SheetTitle className="text-sm font-extrabold text-foreground leading-tight">
                      Detail Transaksi
                    </SheetTitle>
                    <SheetDescription className="text-[11px] text-muted-foreground">
                      {selectedTrx.source === "receipt"
                        ? "Dicatat otomatis dari foto struk belanja"
                        : "Dicatat secara manual"}
                    </SheetDescription>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTrx(null)}
                  className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Nominal & Judul */}
              <div className="rounded-2xl border border-border/70 bg-card p-4 text-center space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">
                  {selectedTrx.tipe === "PEMASUKAN" ? "Total Pemasukan" : "Total Pengeluaran"}
                </span>
                <h3
                  className={`text-2xl font-extrabold tracking-tight ${
                    selectedTrx.nominal > 0n || selectedTrx.tipe === "PEMASUKAN"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {formatRupiah(selectedTrx.nominal, { absolute: true })}
                </h3>
                <p className="text-xs font-semibold text-foreground pt-1">
                  {selectedTrx.judul}
                </p>
              </div>

              {/* Bukti Foto Struk (Jika Ada) */}
              {signedReceiptUrl && (
                <div className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-3 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1.5 text-teal-700 dark:text-teal-300">
                      <Receipt className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      Bukti Foto Struk
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsZoomOpen(true)}
                      className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Maximize2 className="h-3 w-3" /> Perbesar
                    </button>
                  </div>

                  <div
                    onClick={() => setIsZoomOpen(true)}
                    className="relative h-40 w-full overflow-hidden rounded-xl border border-border bg-black/10 cursor-pointer group shadow-inner"
                  >
                    <Image
                      src={signedReceiptUrl}
                      alt="Bukti Struk"
                      fill
                      sizes="390px"
                      className="object-contain group-hover:scale-102 transition-transform"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs text-white bg-black/60 px-3 py-1.5 rounded-full flex items-center gap-1 font-semibold">
                        <Maximize2 className="h-3 w-3" /> Ketuk untuk melihat struk penuh
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Rincian Item (Jika Diekstrak dari Struk) */}
              {selectedTrx.items && selectedTrx.items.length > 0 && (
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                    Rincian Barang yang Dibeli ({selectedTrx.items.length} item)
                  </p>
                  <div className="divide-y divide-border/40 text-xs">
                    {selectedTrx.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5">
                        <span className="text-foreground">
                          {it.name} <span className="text-muted-foreground">x{it.qty}</span>
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatRupiah(it.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Keterangan Pajak & Rincian Transaksi */}
              {selectedTrx.tax_breakdown && (
                <div className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-3.5 space-y-2 animate-in fade-in text-xs">
                  <p className="font-bold text-foreground flex items-center gap-1.5 text-teal-700 dark:text-teal-300">
                    <Receipt className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                    Keterangan Pajak & Rincian
                  </p>
                  <div className="divide-y divide-border/40 text-xs">
                    {selectedTrx.tax_breakdown.subtotal && selectedTrx.tax_breakdown.subtotal > 0 ? (
                      <div className="flex justify-between items-center py-1 text-muted-foreground">
                        <span>Subtotal Belanja</span>
                        <span className="font-semibold text-foreground">
                          {formatRupiah(selectedTrx.tax_breakdown.subtotal)}
                        </span>
                      </div>
                    ) : null}

                    {selectedTrx.tax_breakdown.discount && selectedTrx.tax_breakdown.discount > 0 ? (
                      <div className="flex justify-between items-center py-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <span>Diskon / Potongan Promo</span>
                        <span className="font-bold">
                          -{formatRupiah(selectedTrx.tax_breakdown.discount)}
                        </span>
                      </div>
                    ) : null}

                    {selectedTrx.tax_breakdown.tax && selectedTrx.tax_breakdown.tax > 0 ? (
                      <div className="flex justify-between items-center py-1 text-muted-foreground">
                        <span>Pajak ({selectedTrx.tax_breakdown.tax_name || "PPN / PB1"})</span>
                        <span className="font-semibold text-foreground">
                          +{formatRupiah(selectedTrx.tax_breakdown.tax)}
                        </span>
                      </div>
                    ) : null}

                    {selectedTrx.tax_breakdown.service_charge && selectedTrx.tax_breakdown.service_charge > 0 ? (
                      <div className="flex justify-between items-center py-1 text-muted-foreground">
                        <span>Service Charge</span>
                        <span className="font-semibold text-foreground">
                          +{formatRupiah(selectedTrx.tax_breakdown.service_charge)}
                        </span>
                      </div>
                    ) : null}

                    {selectedTrx.tax_breakdown.rounding !== undefined &&
                    selectedTrx.tax_breakdown.rounding !== null &&
                    selectedTrx.tax_breakdown.rounding !== 0 ? (
                      <div className="flex justify-between items-center py-1 text-muted-foreground">
                        <span>Pembulatan</span>
                        <span className="font-semibold text-foreground">
                          {selectedTrx.tax_breakdown.rounding > 0 ? "+" : ""}
                          {formatRupiah(selectedTrx.tax_breakdown.rounding)}
                        </span>
                      </div>
                    ) : null}

                    <div className="flex justify-between items-center pt-2 font-bold text-foreground">
                      <span>Total Bayar Akhir</span>
                      <span className="text-teal-600 dark:text-teal-400 font-extrabold text-sm">
                        {formatRupiah(selectedTrx.nominal)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Informasi Dompet, Kategori, Tanggal, Catatan */}
              <div className="divide-y divide-border/50 rounded-2xl border border-border/60 bg-card text-xs">
                {selectedTrx.merchant && (
                  <div className="flex items-center justify-between p-3">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Store className="h-3.5 w-3.5" /> Toko / Merchant
                    </span>
                    <span className="font-semibold text-foreground">
                      {selectedTrx.merchant}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between p-3">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-3.5 w-3.5" /> Dompet
                  </span>
                  <span className="font-semibold text-foreground">
                    {selectedTrx.dompet}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5" /> Kategori
                  </span>
                  <span className="font-semibold text-foreground">
                    {selectedTrx.kategori}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Tanggal
                  </span>
                  <span className="font-semibold text-foreground">
                    {selectedTrx.tanggal}
                  </span>
                </div>

                {selectedTrx.catatan && (
                  <div className="p-3 space-y-1">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" /> Catatan
                    </span>
                    <p className="text-foreground leading-relaxed pl-5">
                      {selectedTrx.catatan}
                    </p>
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedTrx(null)}
                className="w-full h-11 rounded-xl text-xs font-semibold"
              >
                Tutup
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Lightbox Struk Penuh */}
      {isZoomOpen && signedReceiptUrl && (
        <div
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 z-[100] bg-black/85 flex flex-col items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-h-[85vh] max-w-[90vw] overflow-auto rounded-2xl">
            <Image
              src={signedReceiptUrl}
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
    </div>
  );
}
