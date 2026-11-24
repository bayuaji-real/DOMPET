"use client";

import * as React from "react";
import {
  Bell,
  Check,
  X,
  Loader2,
  Calendar,
  AlertCircle,
  Repeat,
  Sparkles,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import {
  processRecurringTransaction,
  type RecurringTransaction,
} from "@/lib/data/recurring";

interface DueRecurringCardProps {
  dueItems: RecurringTransaction[];
  onActionComplete?: () => void;
}

export function DueRecurringCard({
  dueItems,
  onActionComplete,
}: DueRecurringCardProps) {
  const [items, setItems] = React.useState<RecurringTransaction[]>(dueItems);
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [successToast, setSuccessToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    setItems(dueItems);
  }, [dueItems]);

  const handleAction = async (id: string, action: "record" | "skip") => {
    setLoadingId(id);
    try {
      const res = await processRecurringTransaction(id, action);
      const target = items.find((i) => i.id === id);

      // Hapus dari list lokal
      setItems((prev) => prev.filter((i) => i.id !== id));

      const message =
        action === "record"
          ? `Tagihan ${target?.note || "berulang"} berhasil dicatat!`
          : `Tagihan ${target?.note || "berulang"} dilewati bulan ini.`;
      setSuccessToast(message);
      setTimeout(() => setSuccessToast(null), 3000);

      if (onActionComplete) onActionComplete();
    } catch (err: any) {
      console.error("Gagal memproses tagihan berulang:", err);
    } finally {
      setLoadingId(null);
    }
  };

  if (items.length === 0 && !successToast) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card p-4 space-y-3 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Repeat className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
              Tagihan Hari Ini ⚡
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                {items.length} jatuh tempo
              </span>
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Transaksi berulang yang perlu dikonfirmasi
            </p>
          </div>
        </div>
      </div>

      {successToast && (
        <div className="rounded-xl border border-teal-500/40 bg-teal-500/15 p-2 text-xs text-teal-700 dark:text-teal-300 font-semibold animate-in fade-in">
          {successToast}
        </div>
      )}

      <div className="space-y-2 pt-1 divide-y divide-border/30">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between pt-2 first:pt-0 text-xs gap-3"
          >
            <div className="min-w-0">
              <p className="font-bold text-foreground truncate">{item.note}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="font-extrabold text-rose-600 dark:text-rose-400">
                  {formatRupiah(item.amount)}
                </span>
                <span>•</span>
                <span>Tiap tgl {item.day_of_month}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleAction(item.id, "skip")}
                disabled={loadingId === item.id}
                className="h-8 px-2.5 rounded-xl border border-border/80 text-[11px] font-semibold text-muted-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                title="Lewati tagihan periode ini"
              >
                Lewati
              </button>
              <button
                type="button"
                onClick={() => handleAction(item.id, "record")}
                disabled={loadingId === item.id}
                className="h-8 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 active:scale-95 transition-all text-[11px] font-bold text-white shadow-md shadow-emerald-600/25 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Catat sebagai pengeluaran sekarang"
              >
                {loadingId === item.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Check className="h-3 w-3 stroke-[3]" />
                    Catat
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
