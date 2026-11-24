"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  LogIn,
  Sparkles,
  Camera,
  Mic,
  ShieldCheck,
  Download,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { usePwaInstall } from "@/lib/pwa-install";
import { PwaInstallModal } from "@/components/pwa-install-modal";

export default function LoginPage() {
  const router = useRouter();
  const { isInstalled, isIOS, showModal, setShowModal, promptInstall } = usePwaInstall();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isRegisterMode, setIsRegisterMode] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Cek apakah env Supabase sudah diisi
  const isEnvConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") &&
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isEnvConfigured) {
      setErrorMsg(
        "Layanan masuk sedang dalam perbaikan. Coba lagi beberapa saat lagi."
      );
      return;
    }

    if (!email || !password) {
      setErrorMsg("Email dan kata sandi wajib diisi.");
      return;
    }

    if (isRegisterMode) {
      if (password.length < 6) {
        setErrorMsg("Kata sandi minimal 6 karakter.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Konfirmasi kata sandi tidak cocok. Pastikan keduanya sama.");
        return;
      }
    }

    setLoading(true);

    try {
      const supabase = createClient();

      if (isRegisterMode) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
        } else if (data.session) {
          setSuccessMsg("Pendaftaran berhasil! Mengalihkan ke beranda...");
          router.push("/");
          router.refresh();
        } else {
          setSuccessMsg(
            "Pendaftaran berhasil dikirim! Silakan periksa email kamu untuk konfirmasi akun jika diaktifkan."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            setErrorMsg("Email atau kata sandi tidak cocok. Coba periksa lagi.");
          } else {
            setErrorMsg(error.message);
          }
        } else {
          router.push("/");
          router.refresh();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Saat kolom diketuk dan keyboard muncul, geser kolom ke tengah layar yang tersisa
  const scrollFieldIntoView = (e: React.FocusEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
    setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
  };

  return (
    <div className="relative min-h-dvh flex items-start sm:items-center justify-center overflow-x-clip bg-background px-4 pb-10 pt-[max(env(safe-area-inset-top,0px)+3rem,4rem)]" onFocusCapture={scrollFieldIntoView}>
      {/* Latar aurora: radial-gradient (tanpa filter blur, supaya tidak muncul tepi kotak) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 50% 0%, rgba(20,184,166,0.20) 0%, rgba(20,184,166,0) 70%), radial-gradient(45% 40% at 100% 35%, rgba(16,185,129,0.14) 0%, rgba(16,185,129,0) 70%), radial-gradient(50% 40% at 0% 100%, rgba(13,148,136,0.14) 0%, rgba(13,148,136,0) 70%)",
        }}
      />

      {/* Tombol Fullscreen & Theme toggle di pojok kanan atas */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1">
        <FullscreenToggle />
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-[400px]">
        {/* Header Brand dengan Logo Glow Bergradasi */}
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/icons/icon-512.png"
            alt="Logo Dompetku"
            width={88}
            height={88}
            priority
            className="mb-2 h-[88px] w-[88px] drop-shadow-[0_8px_18px_rgba(13,148,136,0.35)] transition-transform hover:scale-105 duration-200"
          />
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Dompetku
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Catatan keuangan simpel, tenang, & berdaya AI
          </p>
        </div>

        {/* Card Glassmorphism */}
        <div className="rounded-3xl border border-white/20 dark:border-white/10 bg-card/85 dark:bg-card/70 backdrop-blur-2xl shadow-2xl shadow-teal-950/20 p-5 sm:p-6 space-y-4 transition-all">
          {/* Segmented Pill Switcher (Masuk vs Buat Akun) */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-muted/60 border border-border/50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={cn(
                "py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                !isRegisterMode
                  ? "bg-background text-foreground shadow-sm ring-1 ring-teal-600/40 font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LogIn className="h-3.5 w-3.5" />
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={cn(
                "py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                isRegisterMode
                  ? "bg-background text-foreground shadow-sm ring-1 ring-teal-600/40 font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="h-3.5 w-3.5 text-teal-500" />
              Buat Akun
            </button>
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              {isRegisterMode ? "Mulai Akun Baru" : "Selamat Datang Kembali"}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {isRegisterMode
                ? "Daftarkan akun pribadimu untuk mulai mencatat keuangan"
                : "Masukkan email dan kata sandi yang terdaftar"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {!isEnvConfigured && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Layanan masuk sedang dalam perbaikan. Coba lagi beberapa saat lagi.
                  </p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in duration-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-3 text-xs text-teal-700 dark:text-teal-400 animate-in fade-in duration-200">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              </div>
            )}

            {/* Input Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-foreground/90">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="kamu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 text-xs rounded-2xl bg-muted/30 focus:bg-background border-border/80 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all px-3.5"
              />
            </div>

            {/* Input Kata Sandi */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-foreground/90">
                Kata Sandi
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isRegisterMode ? "Minimal 6 karakter" : "••••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isRegisterMode ? "new-password" : "current-password"}
                  className="h-11 text-xs rounded-2xl bg-muted/30 focus:bg-background border-border/80 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all px-3.5 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "Sembunyikan sandi" : "Lihat sandi"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Input Konfirmasi Kata Sandi (Khusus mode daftar) */}
            {isRegisterMode && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground/90">
                  Konfirmasi Kata Sandi
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ketik ulang kata sandi"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="h-11 text-xs rounded-2xl bg-muted/30 focus:bg-background border-border/80 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all px-3.5 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                    tabIndex={-1}
                    aria-label={
                      showConfirmPassword ? "Sembunyikan sandi" : "Lihat sandi"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Tombol Aksi Utama */}
            <div className="pt-1.5 space-y-2.5">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-2xl [background-color:var(--color-teal-700)] bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold text-xs shadow-lg shadow-teal-500/25 active:scale-[0.98] transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : isRegisterMode ? (
                  "Daftar Akun Baru"
                ) : (
                  "Masuk ke Dompetku"
                )}
              </Button>

              {/* Tombol Download Aplikasi */}
              <button
                type="button"
                onClick={promptInstall}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border border-border/70 bg-card hover:bg-muted/50 text-foreground text-xs font-semibold transition-all cursor-pointer group shadow-xs active:scale-[0.98]"
              >
                <Download className="h-4 w-4 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform" />
                <span>{isInstalled ? "Aplikasi Sudah Terpasang ✓" : "Download Aplikasi"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Feature Badges Footer */}
        <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border/40 text-[10px] text-muted-foreground font-medium backdrop-blur-sm">
            <Camera className="h-3 w-3 text-teal-500" />
            <span>Scan Struk Ruby</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border/40 text-[10px] text-muted-foreground font-medium backdrop-blur-sm">
            <Mic className="h-3 w-3 text-teal-500" />
            <span>Voice Note</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border/40 text-[10px] text-muted-foreground font-medium backdrop-blur-sm">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            <span>100% Privat</span>
          </div>
        </div>
      </div>

      <PwaInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isIOS={isIOS}
        isInstalled={isInstalled}
      />
    </div>
  );
}
