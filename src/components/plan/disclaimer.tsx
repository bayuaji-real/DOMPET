import { Info } from "lucide-react";
import { INVEST_DISCLAIMER } from "@/lib/plans";

/** Peringatan investasi (wajib ada karena menyangkut risiko). Peringatan umum Ruby sudah dihapus atas permintaan Owner. */
export function Disclaimer({ className = "" }: { kind?: "invest"; className?: string }) {
  return (
    <p role="note" className={`flex items-start gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:text-amber-300 ${className}`}>
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{INVEST_DISCLAIMER}</span>
    </p>
  );
}
