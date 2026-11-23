"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Bell, LifeBuoy, Monitor, Moon, Palette, Sun } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { todayJakarta } from "@/lib/data/sample-mode";
import { getTodayPaydaySchedule } from "@/lib/data/payday";
import { getDueRecurringTransactions } from "@/lib/data/recurring";
import { getSavingsGoals } from "@/lib/data/goals";

/** Tutup popover saat klik di luar atau tekan Esc. */
function useDismiss(open: boolean, onClose: () => void) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

interface Notice {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "info" | "warn";
}

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Notice[]>([]);
  const [readIds, setReadIds] = React.useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("dompet_read_notifs");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const ref = useDismiss(open, () => setOpen(false));

  const unread = items.filter((n) => !readIds.includes(n.id));
  const markAllRead = () => {
    const ids = items.map((n) => n.id);
    setReadIds(ids);
    try {
      localStorage.setItem("dompet_read_notifs", JSON.stringify(ids));
    } catch {}
  };

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const today = todayJakarta();
      const [pay, due, goals] = await Promise.allSettled([
        getTodayPaydaySchedule(today),
        getDueRecurringTransactions(today),
        getSavingsGoals(),
      ]);
      const list: Notice[] = [];
      if (pay.status === "fulfilled" && pay.value) {
        list.push({
          id: "payday",
          title: "Hari ini jadwal gajian",
          detail: `Perkiraan ${formatRupiah(Number(pay.value.expected_amount ?? 0))}. Catat dan bagi ke tabunganmu.`,
          href: "/",
          tone: "info",
        });
      }
      if (due.status === "fulfilled") {
        for (const r of due.value) {
          list.push({
            id: `rec-${r.id}`,
            title: `Tagihan jatuh tempo: ${r.note || "Tagihan"}`,
            detail: formatRupiah(Number(r.amount)),
            href: "/",
            tone: "warn",
          });
        }
      }
      if (goals.status === "fulfilled") {
        for (const g of goals.value) {
          if (g.status !== "aktif" || !g.deadline) continue;
          const left = daysBetween(today, g.deadline);
          const remaining = Number(g.remaining ?? 0);
          if (remaining > 0 && left <= 45) {
            list.push({
              id: `goal-${g.id}`,
              title: left < 0 ? `${g.name} lewat tenggat` : `${g.name}: ${left} hari lagi`,
              detail: `Masih kurang ${formatRupiah(remaining)}`,
              href: "/tabungan",
              tone: left < 0 || left <= 14 ? "warn" : "info",
            });
          }
        }
      }
      if (!cancelled) setItems(list);
    };
    load();
    window.addEventListener("transaction_created", load);
    window.addEventListener("payday_completed", load);
    return () => {
      cancelled = true;
      window.removeEventListener("transaction_created", load);
      window.removeEventListener("payday_completed", load);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifikasi${unread.length ? `, ${unread.length} baru` : ""}`}
        aria-expanded={open}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-foreground transition-colors hover:bg-muted active:scale-95"
      >
        <Bell className="h-4.5 w-4.5" />
        {unread.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
            <p className="text-xs font-extrabold text-foreground">Notifikasi</p>
            {unread.length > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="cursor-pointer text-[11px] font-semibold text-teal-600 hover:underline dark:text-teal-400"
              >
                Tandai sudah dibaca
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Belum ada notifikasi. Semua beres ✨</p>
          ) : (
            <ul className="max-h-72 divide-y divide-border/50 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="flex gap-2.5 px-4 py-3 hover:bg-muted/50"
                  >
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.tone === "warn" ? "bg-amber-500" : "bg-teal-500"}`}
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-foreground">{n.title}</span>
                      <span className="block text-[11px] text-muted-foreground">{n.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const THEMES = [
  { id: "light", label: "Terang", icon: Sun },
  { id: "dark", label: "Gelap", icon: Moon },
  { id: "system", label: "Sistem", icon: Monitor },
] as const;

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  React.useEffect(() => setMounted(true), []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Pilih tema"
        aria-expanded={open}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-foreground transition-colors hover:bg-muted active:scale-95"
      >
        <Palette className="h-4.5 w-4.5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-50 w-40 overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-xl">
          {THEMES.map(({ id, label, icon: Icon }) => {
            const active = mounted && theme === id;
            return (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setTheme(id);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold ${
                  active ? "bg-teal-500/15 text-teal-700 dark:text-teal-300" : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Tombol Pusat Bantuan (pengganti tombol notifikasi di header). */
export function HelpCenterButton() {
  return (
    <Link
      href="/bantuan"
      aria-label="Pusat Bantuan"
      title="Pusat Bantuan"
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <LifeBuoy className="h-[18px] w-[18px]" />
    </Link>
  );
}
