"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/** Saklar geser terang/gelap. */
export function ThemeSlider({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Mode gelap aktif. Geser ke terang" : "Mode terang aktif. Geser ke gelap"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={`relative h-8 w-[3.75rem] shrink-0 cursor-pointer rounded-full border border-border/60 transition-colors ${
        dark ? "bg-indigo-900" : "bg-sky-200"
      } ${className}`}
    >
      <Sun className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-amber-500" />
      <Moon className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-indigo-200" />
      <span
        className={`absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-all duration-300 ${
          dark ? "left-[calc(100%-1.625rem)]" : "left-0.5"
        }`}
      >
        {dark ? <Moon className="h-3.5 w-3.5 text-indigo-700" /> : <Sun className="h-3.5 w-3.5 text-amber-500" />}
      </span>
    </button>
  );
}
