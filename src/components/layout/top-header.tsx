"use client";

import * as React from "react";
import { formatTanggalWIB } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wallet, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TopHeaderProps {
  title?: string;
  subtitle?: string;
  showLogout?: boolean;
}

export function TopHeader({
  title = "Dompetku",
  subtitle,
  showLogout = true,
}: TopHeaderProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = React.useState<string>("");

  React.useEffect(() => {
    setCurrentDate(formatTanggalWIB(new Date()));
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Gagal logout:", e);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/50 bg-background/90 px-4 py-3 backdrop-blur-md pt-safe">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600/10 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-bold leading-tight tracking-tight">
            {title}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {subtitle || currentDate}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Link
          href="/pengaturan"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          title="Pengaturan"
          aria-label="Pengaturan"
        >
          <Settings className="h-4 w-4" />
        </Link>
        {showLogout && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive"
            title="Keluar / Logout"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
