"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { HelpCenterButton, NotificationBell } from "./header-actions";
import { ThemeSlider } from "@/components/theme-slider";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";
import { useEntitlement } from "@/hooks/use-entitlement";

interface TopHeaderProps {
  title?: string;
  subtitle?: string;
  showLogout?: boolean; // deprecated prop, kept for compatibility
}

export function TopHeader(props: TopHeaderProps) {
  return (
    <React.Suspense fallback={<div className="h-14" />}>
      <TopHeaderInner {...props} />
    </React.Suspense>
  );
}

function TopHeaderInner({ title }: TopHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = React.useState<UserProfile>({
    name: "Bayu Aji",
    email: "bayuaji@dompetku.id",
    avatarUrl: null,
    avatarEmoji: "🧑‍💻",
    avatarBg: "#0d9488",
  });
  const [greeting, setGreeting] = React.useState<string>("Halo");
  const { ent, loading: entLoading } = useEntitlement();
  const isPro = !entLoading && ent.plan === "pro";

  React.useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 4 && hour < 11) setGreeting("Selamat pagi");
    else if (hour >= 11 && hour < 15) setGreeting("Selamat siang");
    else if (hour >= 15 && hour < 18) setGreeting("Selamat sore");
    else setGreeting("Selamat malam");

    const loadProfile = async () => {
      const p = await getUserProfile();
      setProfile(p);
    };
    loadProfile();

    const handleProfileUpdate = (e: any) => {
      if (e.detail) setProfile((prev) => ({ ...prev, ...e.detail }));
      else loadProfile();
    };
    window.addEventListener("profile_updated", handleProfileUpdate);
    return () => window.removeEventListener("profile_updated", handleProfileUpdate);
  }, []);

  const displayName = profile.name || "Bayu Aji";
  const isSub = Boolean(title) && pathname !== "/";

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between border-b border-border/50 bg-background/90 px-4 pb-3.5 backdrop-blur-md"
      style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 0.5rem, 1.25rem)" }}
    >
      {/* Kiri: (tombol kembali di halaman dalam) + avatar & sapaan — sapaan tetap tampil */}
      <div className="flex min-w-0 items-center gap-2">
        {isSub ? (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Kembali"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-foreground transition-colors hover:bg-muted active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : null}

        <Link
          href="/more"
          className="group flex min-w-0 items-center gap-3 transition-transform active:scale-[0.98]"
          title="Buka Pengaturan Akun"
        >
          <div className="relative shrink-0">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={displayName}
                className="h-10 w-10 rounded-2xl object-cover shadow-sm ring-2 ring-teal-500/30 transition-all group-hover:ring-teal-500/60"
              />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-lg font-bold shadow-sm ring-2 ring-teal-500/30 transition-all group-hover:ring-teal-500/60"
                style={{ backgroundColor: profile.avatarBg || "#0d9488" }}
              >
                {profile.avatarEmoji || displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold leading-none text-teal-600 dark:text-teal-400">
              {greeting}
            </p>
            <h1 className="truncate text-sm font-extrabold leading-tight tracking-tight text-foreground">
              {displayName}
              {isPro && <span role="img" aria-label="Pengguna Pro" className="ml-1">👑</span>}
            </h1>
          </div>
        </Link>
      </div>

      {/* Kanan: Pusat Bantuan & tema */}
      <div className="flex shrink-0 items-center gap-2">
        <NotificationBell />
        <HelpCenterButton />
        <ThemeSlider />
      </div>
    </header>
  );
}
