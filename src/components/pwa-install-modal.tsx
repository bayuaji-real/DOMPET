"use client";

import * as React from "react";
import {
  Download,
  Share,
  PlusSquare,
  CheckCircle,
  X,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS?: boolean;
  isInstalled?: boolean;
}

export function PwaInstallModal({
  isOpen,
  onClose,
  isIOS = false,
  isInstalled = false,
}: PwaInstallModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl border border-white/20 dark:border-white/10 bg-card p-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 space-y-4">
        {/* Tombol Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Modal */}
        <div className="flex items-center gap-3 pr-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white shadow-md shadow-teal-500/25 shrink-0">
            {isInstalled ? <CheckCircle className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-foreground">
              {isInstalled ? "Aplikasi Sudah Terpasang" : "Pasang Aplikasi Dompetku"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {isInstalled
                ? "Dompetku sudah terpasang di layar utama perangkat Anda"
                : "Akses cepat tanpa browser, ringan & hemat kuota"}
            </p>
          </div>
        </div>

        {/* Petunjuk Langkah Berdasarkan Status */}
        {isInstalled ? (
          <div className="space-y-2 rounded-2xl bg-teal-500/10 border border-teal-500/20 p-4 text-xs text-foreground leading-relaxed">
            <p className="font-semibold">
              🎉 Anda dapat membuka Dompetku langsung dari ikon di layar utama HP atau desktop tanpa perlu membuka browser terlebih dahulu.
            </p>
          </div>
        ) : isIOS ? (
          <div className="space-y-2.5 rounded-2xl bg-muted/40 p-3.5 border border-border/60 text-xs">
            <p className="font-bold text-teal-600 dark:text-teal-400 text-[11px] uppercase tracking-wider">
              Cara Pasang di iPhone / iPad (Safari):
            </p>
            <ol className="space-y-2 list-decimal list-inside text-muted-foreground leading-relaxed">
              <li>
                Ketuk tombol <strong className="text-foreground">Bagikan (Share)</strong>{" "}
                <Share className="inline h-3.5 w-3.5 mx-0.5 text-teal-500" /> di bilah navigasi bawah Safari.
              </li>
              <li>
                Gulir menu ke bawah lalu pilih{" "}
                <strong className="text-foreground">Tambah ke Layar Utama (Add to Home Screen)</strong>{" "}
                <PlusSquare className="inline h-3.5 w-3.5 mx-0.5 text-teal-500" />.
              </li>
              <li>
                Ketuk <strong className="text-foreground">Tambah (Add)</strong> di sudut kanan atas.
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-2.5 rounded-2xl bg-muted/40 p-3.5 border border-border/60 text-xs">
            <p className="font-bold text-teal-600 dark:text-teal-400 text-[11px] uppercase tracking-wider">
              Cara Pasang di Android / Chrome:
            </p>
            <ol className="space-y-2 list-decimal list-inside text-muted-foreground leading-relaxed">
              <li>
                Ketuk menu titik tiga (<strong className="text-foreground">⋮</strong>) di sudut kanan atas browser Chrome.
              </li>
              <li>
                Pilih <strong className="text-foreground">Instal Aplikasi</strong> atau{" "}
                <strong className="text-foreground">Tambahkan ke Layar Utama</strong>.
              </li>
              <li>
                Konfirmasi dengan menekan tombol <strong className="text-foreground">Instal</strong>.
              </li>
            </ol>
          </div>
        )}

        {/* Keunggulan PWA */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span>Tidak memenuhi memori HP & dapat dibuka offline saat darurat.</span>
        </div>

        {/* Tombol Tutup */}
        <Button
          type="button"
          onClick={onClose}
          className="w-full h-10 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md cursor-pointer"
        >
          <CheckCircle className="mr-1.5 h-4 w-4" />
          Saya Mengerti
        </Button>
      </div>
    </div>
  );
}
