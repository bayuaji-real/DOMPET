import * as React from "react";

/** Lencana mahkota kecil untuk fitur Pro (keputusan Owner 24 Nov: mahkota saja, tanpa gembok). */
export function ProBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full border border-amber-400/50 bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-extrabold leading-none text-amber-600 dark:text-amber-300 ${className}`}
      aria-label="Fitur Pro"
    >
      <span aria-hidden>👑</span>
      <span>Pro</span>
    </span>
  );
}
