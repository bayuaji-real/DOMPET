import { Info } from "lucide-react";
import { INVEST_DISCLAIMER, RUBY_DISCLAIMER } from "@/lib/plans";

export function Disclaimer({ kind = "ruby", className = "" }: { kind?: "ruby" | "invest"; className?: string }) {
  return (
    <p role="note" className={`flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:text-amber-300 ${className}`}>
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{kind === "invest" ? INVEST_DISCLAIMER : RUBY_DISCLAIMER}</span>
    </p>
  );
}
