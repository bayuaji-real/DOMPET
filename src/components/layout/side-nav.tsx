"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isNavActive } from "@/lib/nav-items";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function SideNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-foreground transition-colors hover:bg-muted active:scale-95"
        aria-label="Buka menu"
      >
        <Menu className="h-4.5 w-4.5" />
      </SheetTrigger>

      <SheetContent
        side="right"
        showCloseButton={false}
        overlayClassName="bg-black/30 backdrop-blur-sm"
        className="w-[80%] max-w-[300px] gap-0 border-border/80 bg-background p-0 shadow-2xl"
      >
        <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
        <SheetDescription className="sr-only">Pilih halaman Dompetku</SheetDescription>

        <div
          className="flex items-center justify-between border-b border-border/60 px-5 pb-5"
          style={{ paddingTop: "max(1.75rem, calc(env(safe-area-inset-top) + 1rem))" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl shadow-sm"
            />
            <div className="min-w-0">
              <p className="text-sm font-extrabold leading-tight text-foreground">Dompetku</p>
              <p className="truncate text-[11px] text-muted-foreground">{userName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
            className="cursor-pointer rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Navigasi utama" className="flex-1 space-y-1.5 overflow-y-auto px-4 py-5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors",
                  active
                    ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
                    : "text-foreground/80 hover:bg-muted"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", active ? "stroke-[2.5]" : "stroke-[1.75]")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <p
          className="border-t border-border/60 px-5 pt-4 text-center text-[11px] text-muted-foreground"
          style={{ paddingBottom: "max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))" }}
        >
          Dompetku v1.0.0
        </p>
      </SheetContent>
    </Sheet>
  );
}
