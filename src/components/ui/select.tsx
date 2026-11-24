"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "cn";

type Opt = { value: string; label: string; disabled: boolean };

function textOf(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children);
  return "";
}

function collect(children: React.ReactNode, out: Opt[]) {
  React.Children.forEach(children, (c) => {
    if (!React.isValidElement(c)) return;
    const p = c.props as { value?: string | number; disabled?: boolean; children?: React.ReactNode };
    if (c.type === React.Fragment) { collect(p.children, out); return; }
    if (c.type === "option") out.push({ value: String(p.value ?? textOf(p.children)), label: textOf(p.children), disabled: !!p.disabled });
  });
}

/**
 * Pilihan (dropdown) bergaya Dompetku: pemicu bulat seperti kolom isian lain,
 * daftar muncul sebagai lembar dari bawah dengan tanda centang. Pakai seperti <select> biasa
 * (anak berupa <option>, onChange menerima e.target.value).
 */
export function Select({
  value, onChange, children, className, size = "md", disabled, id, "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  children: React.ReactNode;
  className?: string;
  size?: "md" | "sm";
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const opts: Opt[] = [];
  collect(children, opts);
  const current = opts.find((o) => o.value === value);
  const placeholder = !current || (current.disabled && current.value === "");
  const pick = (v: string) => { setOpen(false); if (v !== value) onChange({ target: { value: v } }); };
  return (
    <>
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/30 text-left font-medium text-foreground outline-none transition-colors hover:bg-muted/70 focus-visible:border-teal-500/60 focus-visible:ring-3 focus-visible:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "h-8 px-2.5 text-xs" : "h-10 px-3 text-sm",
          className,
        )}
      >
        <span className={cn("truncate", placeholder && "font-normal text-muted-foreground")}>{current?.label || "Pilih"}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[75dvh] overflow-y-auto rounded-t-3xl px-4 pb-8">
          <SheetHeader className="px-0 pb-0">
            <SheetTitle className="text-sm font-bold">{ariaLabel ?? "Pilih"}</SheetTitle>
          </SheetHeader>
          <div role="listbox" aria-label={ariaLabel} className="space-y-1.5">
            {opts.filter((o) => !(o.disabled && o.value === "")).map((o) => {
              const on = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={on}
                  disabled={o.disabled}
                  onClick={() => pick(o.value)}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    on ? "border-teal-500/40 bg-teal-500/10 font-bold text-teal-700 dark:text-teal-300" : "border-border/60 bg-card font-medium hover:bg-muted/50",
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {on && <Check className="size-4 shrink-0" aria-hidden />}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
