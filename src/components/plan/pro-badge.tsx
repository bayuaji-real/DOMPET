import * as React from "react";

/** Lencana mahkota kecil untuk fitur Pro (keputusan Owner: fitur Pro diberi mahkota dan gembok). */
export function ProBadge({ locked = false, className = "" }: { locked?: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full border border-amber-400/50 bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-extrabold leading-none text-amber-600 dark:text-amber-300 ${className}`}
      aria-label={locked ? "Fitur Pro, terkunci" : "Fitur Pro"}
    >
      <span aria-hidden>👑</span>
      {locked && <span aria-hidden>🔒</span>}
      <span>Pro</span>
    </span>
  );
}
