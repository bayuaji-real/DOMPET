"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Wallet,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
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
        "Koneksi Supabase belum diatur. Silakan periksa .env.local kamu."
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

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-zinc-950">
      {/* Theme toggle di pojok kanan atas agar tidak menumpuk di tengah */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[390px]">
        {/* Header Bersih & Ringkas (Logo + Brand Horizontal) */}
        <div className="mb-5 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/30 dark:bg-teal-500 dark:text-zinc-950">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">
              Dompetku
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Catatan keuangan simpel & tenang
            </p>
          </div>
        </div>

        {/* Card Form */}
        <Card className="border-border/60 shadow-xl bg-card rounded-2xl">
          <CardHeader className="space-y-1 pb-3 pt-5 px-5">
            <CardTitle className="text-lg font-bold">
              {isRegisterMode ? "Buat Akun Baru" : "Masuk ke Akun"}
            </CardTitle>
            <CardDescription className="text-xs">
              {isRegisterMode
                ? "Daftarkan akun pribadimu untuk mulai mencatat keuangan"
                : "Masukkan email dan kata sandi yang terdaftar"}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-3.5 px-5 pt-1 pb-4">
              {!isEnvConfigured && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Kredensial Supabase di <code className="bg-amber-500/20 px-1 rounded">.env.local</code> belum lengkap.
                    </p>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 text-xs text-teal-700 dark:text-teal-400">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </div>
                </div>
              )}

              {/* Input Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium">
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
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              {/* Input Kata Sandi */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium">
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
                    className="h-10 text-xs rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
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
                  <Label htmlFor="confirmPassword" className="text-xs font-medium">
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
                      className="h-10 text-xs rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
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
            </CardContent>

            <CardFooter className="flex flex-col gap-2.5 px-5 pb-5 pt-0">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-xl bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-500 dark:text-zinc-950 dark:hover:bg-teal-400 font-medium text-xs shadow-md shadow-teal-600/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : isRegisterMode ? (
                  "Daftar Sekarang"
                ) : (
                  "Masuk"
                )}
              </Button>

{process.env.NODE_ENV !== "production" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  router.push("/?demo=true");
                }}
                className="w-full h-10 rounded-xl border-dashed border-teal-500/50 text-teal-600 dark:text-teal-400 font-semibold text-xs hover:bg-teal-500/10 cursor-pointer"
              >
                ✨ Coba Langsung (Mode Demo)
              </Button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                  setConfirmPassword("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground text-center transition-colors py-1"
              >
                {isRegisterMode
                  ? "Sudah punya akun? Masuk di sini"
                  : "Belum punya akun? Buat akun di sini"}
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
