"use client";

import * as React from "react";
import Link from "next/link";
import { NotificationBell, ThemeMenu } from "./header-actions";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";

interface TopHeaderProps {
  title?: string;
  subtitle?: string;
  showLogout?: boolean; // deprecated prop, kept for compatibility
}

export function TopHeader({
  title,
  subtitle,
}: TopHeaderProps) {
  const [profile, setProfile] = React.useState<UserProfile>({
    name: "Bayu Aji",
    email: "bayuaji@dompetku.id",
    avatarUrl: null,
    avatarEmoji: "🧑‍💻",
    avatarBg: "#0d9488",
  });
  const [greeting, setGreeting] = React.useState<string>("Halo");

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
      if (e.detail) {
        setProfile((prev) => ({ ...prev, ...e.detail }));
      } else {
        loadProfile();
      }
    };

    window.addEventListener("profile_updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("profile_updated", handleProfileUpdate);
    };
  }, []);

  // Nama yang ditampilkan di judul header
  const displayName = profile.name || "Sobat Dompet";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/50 bg-background/90 px-4 pb-3.5 backdrop-blur-md" style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 0.5rem, 1.25rem)" }}>
      <Link
        href="/pengaturan"
        className="flex items-center gap-3 group transition-transform active:scale-[0.98] cursor-pointer"
        title="Buka Pengaturan Akun"
      >
        {/* Avatar Profil Pengguna */}
        <div className="relative shrink-0">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={displayName}
              className="h-10 w-10 rounded-2xl object-cover ring-2 ring-teal-500/30 group-hover:ring-teal-500/60 shadow-sm transition-all"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-lg shadow-sm ring-2 ring-teal-500/30 group-hover:ring-teal-500/60 transition-all font-bold"
              style={{ backgroundColor: profile.avatarBg || "#0d9488" }}
            >
              {profile.avatarEmoji || displayName.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Status online dot */}
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
        </div>

        {/* Teks Sapaan & Nama Orang (Tepat 2 Baris Sesuai Request) */}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 leading-none mb-1">
            {greeting}
          </p>
          <h1 className="text-sm font-extrabold text-foreground leading-tight tracking-tight truncate">
            {displayName}
          </h1>
        </div>
      </Link>

      {/* Sisi kanan: notifikasi & pilihan tema */}
      <div className="flex items-center gap-2">
        <NotificationBell />
        <ThemeMenu />
      </div>
    </header>
  );
}
