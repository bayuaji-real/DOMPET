"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  ImageIcon,
  Mic,
  ArrowUp,
  Loader2,
  CheckCircle2,
  PenLine,
  Sparkles,
  X,
  Square,
} from "lucide-react";
import { cn, parseRupiahInput, formatRupiah } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { compressImage } from "@/lib/image-compression";
import { uploadReceipt } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { getWallets } from "@/lib/data/wallets";
import { getCategories } from "@/lib/data/categories";
import {
  ReceiptConfirmationSheet,
} from "@/components/transaction/receipt-confirmation-sheet";
import { VoiceConfirmationSheet } from "@/components/transaction/voice-confirmation-sheet";
import type { ScanReceiptResult } from "@/app/api/scan-receipt/route";
import type { ParsedVoiceTransaction } from "@/app/api/voice-transaction/route";

export function BottomNav() {
  const pathname = usePathname();
  const [inputText, setInputText] = React.useState("");
  const [isRecording, setIsRecording] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);

  // State untuk aksi pemindaian struk
  const [isPhotoSourceOpen, setIsPhotoSourceOpen] = React.useState(false);
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanResult, setScanResult] = React.useState<ScanReceiptResult | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null);
  const [receiptPath, setReceiptPath] = React.useState<string | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = React.useState(false);

  // State untuk perekaman suara langsung di quick bar
  const [isVoiceRecording, setIsVoiceRecording] = React.useState(false);
  const [voiceSeconds, setVoiceSeconds] = React.useState(0);
  const [isVoiceConfirmationOpen, setIsVoiceConfirmationOpen] = React.useState(false);
  const [voiceTranscript, setVoiceTranscript] = React.useState("");
  const [voiceTransactions, setVoiceTransactions] = React.useState<ParsedVoiceTransaction[]>([]);

  // Refs audio recorder & speech recognition di quick bar
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const recognitionRef = React.useRef<any>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  // Data dompet & kategori
  const [wallets, setWallets] = React.useState<{ id: string; name: string; icon?: string | null; color?: string | null }[]>([]);
  const [categories, setCategories] = React.useState<{ id: string; name: string }[]>([]);

  // Refs input kamera & galeri
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);

  // Load dompet & kategori untuk konfirmasi struk dan suara
  React.useEffect(() => {
    async function loadMetadata() {
      try {
        const [wData, cData] = await Promise.allSettled([
          getWallets(),
          getCategories(),
        ]);

        if (wData.status === "fulfilled" && wData.value.length > 0) {
          setWallets(wData.value.map((w) => ({ id: w.id, name: w.name, icon: w.icon, color: w.color })));
        } else {
          setWallets([
            { id: "w-cash", name: "Uang Tunai" },
            { id: "w-bca", name: "BCA Utama" },
            { id: "w-gopay", name: "GoPay" },
            { id: "w-mandiri", name: "Bank Mandiri" },
          ]);
        }

        if (cData.status === "fulfilled" && cData.value.length > 0) {
          setCategories(cData.value.map((c) => ({ id: c.id, name: c.name })));
        } else {
          setCategories([
            { id: "c-food", name: "Makanan & Minuman" },
            { id: "c-groceries", name: "Belanja Harian" },
            { id: "c-trans", name: "Transportasi" },
            { id: "c-bills", name: "Tagihan" },
            { id: "c-ent", name: "Hiburan" },
            { id: "c-other", name: "Lainnya" },
          ]);
        }
      } catch {
        // Fallback default aman
      }
    }
    loadMetadata();
  }, []);

  // Jangan tampilkan bottom navigation jika sedang di halaman login/auth
  if (pathname.startsWith("/login") || pathname.startsWith("/tambah")) {
    return null;
  }

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  // Handler simpan cepat dari input bar via AI
  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    setIsProcessing(true);
    const text = inputText.trim();

    try {
      const res = await fetch("/api/voice-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textPrompt: text,
          userWallets: wallets.map((w) => w.name),
          userCategories: categories.map((c) => c.name),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memproses catatan");
      }

      setInputText("");
      setVoiceTranscript(data.transcript || text);
      setVoiceTransactions(data.transactions || []);
      setIsVoiceConfirmationOpen(true);
    } catch (err: unknown) {
      console.error("Gagal memproses kalimat cepat:", err);
      showNotification(`Memproses "${text}"...`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler pemilihan file foto struk
  const handlePhotoSelected = async (file: File) => {
    setIsPhotoSourceOpen(false);
    setIsScanning(true);

    try {
      // 1. Kompresi gambar di sisi klien (maks 1600px, JPEG 0.8)
      const compressed = await compressImage(file, 1600, 0.8);
      setImagePreviewUrl(compressed.dataUrl);

      // 2. Upload ke Supabase Storage (bucket 'receipts') jika user login
      let savedPath: string | null = null;
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id || "demo-user";

        const uploadRes = await uploadReceipt(userId, compressed.blob);
        savedPath = uploadRes.path;
      } catch (uploadErr) {
        console.warn("Storage upload warning:", uploadErr);
      }
      setReceiptPath(savedPath);

      // 3. Panggil Server Route /api/scan-receipt (Gemini API)
      const res = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: compressed.base64,
          mimeType: "image/jpeg",
          userCategories: categories.map((c) => c.name),
          userWallets: wallets.map((w) => w.name),
        }),
      });

      if (!res.ok) {
        throw new Error("Gagal memindai struk dengan Gemini");
      }

      const result: ScanReceiptResult = await res.json();
      setScanResult(result);

      // Selesai memindai -> buka layar konfirmasi
      setIsScanning(false);
      setIsConfirmationOpen(true);
    } catch (err: unknown) {
      console.error("Gagal scan struk:", err);
      setIsScanning(false);
      // Fallback ramah jika terjadi kendala OCR: buka konfirmasi manual dengan foto tetap terlampir
      setScanResult({
        is_receipt: false,
        merchant: "Struk Baru",
        date: new Date().toISOString().split("T")[0],
        total: 0,
        items: [],
        suggested_category: categories[0]?.name || "Belanja Harian",
        suggested_wallet: wallets[0]?.name || "Uang Tunai",
        payment_hint: null,
        confidence: 0,
      });
      setIsConfirmationOpen(true);
    }
  };

  // Mulai merekam suara langsung di quick bar
  const startVoiceRecording = async () => {
    setIsVoiceRecording(true);
    setVoiceSeconds(0);
    setInputText("");
    audioChunksRef.current = [];

    // 1. Coba Web Speech Recognition bawaan browser (Gratis, 0 token, ketik langsung)
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = "id-ID";
          recognition.continuous = true;
          recognition.interimResults = true;

          recognition.onresult = (event: any) => {
            let text = "";
            for (let i = 0; i < event.results.length; i++) {
              text += event.results[i][0].transcript;
            }
            if (text) {
              setInputText(text);
            }
          };

          recognition.onerror = (e: any) => {
            console.warn("Speech recognition error:", e);
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (err) {
          console.warn("Speech recognition init error:", err);
        }
      }
    }

    // 2. MediaRecorder stream sebagai audio fallback
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const candidates = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/aac",
          "audio/wav",
        ];
        const mimeType = candidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";
        const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = mr;

        mr.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mr.start(250);
      }
    } catch (err) {
      console.warn("Microphone stream error:", err);
    }

    // 3. Timer maks 60 detik
    timerRef.current = setInterval(() => {
      setVoiceSeconds((prev) => {
        if (prev >= 59) {
          stopVoiceRecording(true);
          return 60;
        }
        return prev + 1;
      });
    }, 1000);
  };

  // Berhenti merekam suara langsung di quick bar
  const stopVoiceRecording = (shouldProcess = true) => {
    setIsVoiceRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (shouldProcess) {
      setTimeout(() => {
        processSpokenInput();
      }, 300);
    }
  };

  // Kirim hasil suara / ketik langsung ke server route
  const processSpokenInput = async () => {
    const text = inputText.trim();
    setIsProcessing(true);

    try {
      const bodyPayload: Record<string, unknown> = {
        userWallets: wallets.map((w) => w.name),
        userCategories: categories.map((c) => c.name),
      };

      if (text) {
        bodyPayload.textPrompt = text;
      } else if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || "audio/webm",
        });
        const buffer = await audioBlob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        bodyPayload.audioBase64 = btoa(binary);
        bodyPayload.mimeType = audioBlob.type || "audio/webm";
      } else {
        setIsProcessing(false);
        return;
      }

      const res = await fetch("/api/voice-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memproses suara");
      }

      setInputText("");
      setVoiceTranscript(data.transcript || text);
      setVoiceTransactions(data.transactions || []);
      setIsVoiceConfirmationOpen(true);
    } catch (err: unknown) {
      console.error("Gagal memproses transaksi suara:", err);
      showNotification("Gagal memproses suara. Coba ulangi lagi ya.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler mic rekaman suara
  const handleMicClick = () => {
    if (isVoiceRecording) {
      stopVoiceRecording(true);
    } else {
      startVoiceRecording();
    }
  };

  return (
    <>
      <div
        className="fixed left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-[406px] -translate-x-1/2"
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div
          role="group"
          aria-label="Catat transaksi cepat"
          className={cn(
            "flex items-center gap-1.5 rounded-2xl border p-1.5 shadow-xl shadow-black/15 transition-all",
            isVoiceRecording
              ? "border-rose-500/70 bg-card ring-2 ring-rose-500/20"
              : "border-border/80 bg-card"
          )}
        >
          <button
            type="button"
            onClick={() => setIsPhotoSourceOpen(true)}
            disabled={isVoiceRecording || isProcessing}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 transition-all hover:bg-teal-500/20 active:scale-95 disabled:opacity-50 dark:bg-teal-500/15 dark:text-teal-400"
            title="Foto Struk Belanja"
            aria-label="Foto Struk Belanja"
          >
            <Camera className="h-5 w-5" />
          </button>

          <form onSubmit={handleQuickSubmit} className="relative flex flex-1 items-center">
            {isVoiceRecording && (
              <span className="pointer-events-none absolute left-3 z-10 h-2 w-2 animate-ping rounded-full bg-rose-500" />
            )}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              aria-label="Catat transaksi cepat"
              placeholder={
                isVoiceRecording
                  ? `Mendengarkan... (${voiceSeconds}d)`
                  : "Misal: Nasi Padang 25rb GoPay..."
              }
              disabled={isProcessing}
              className={cn(
                "h-10 w-full rounded-xl border border-border/60 bg-muted/30 pr-10 text-xs text-foreground transition-all focus:outline-none focus:ring-1 focus:ring-teal-500/50",
                isVoiceRecording
                  ? "pl-8 font-semibold text-rose-600 dark:text-rose-400"
                  : "pl-3 placeholder:text-muted-foreground/70"
              )}
            />

            {isProcessing ? (
              <div className="absolute right-1 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
              </div>
            ) : isVoiceRecording ? (
              <button
                type="button"
                onClick={() => stopVoiceRecording(true)}
                className="absolute right-1 flex h-8 w-8 animate-pulse cursor-pointer items-center justify-center rounded-lg bg-rose-500 text-white shadow-md transition-all hover:bg-rose-600"
                title="Selesai & Catat"
                aria-label="Selesai dan catat"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : inputText.trim().length > 0 ? (
              <button
                type="submit"
                className="absolute right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm transition-all hover:bg-teal-700 active:scale-95"
                title="Kirim Catatan"
                aria-label="Kirim catatan"
              >
                <ArrowUp className="h-4 w-4 stroke-[2.5]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleMicClick}
                className="absolute right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                title="Bicara untuk Catat Langsung"
                aria-label="Catat dengan suara"
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
          </form>

          <Link
            href="/tambah"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-all hover:text-foreground active:scale-95"
            title="Input Manual"
            aria-label="Input manual"
          >
            <PenLine className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Inputs Tersembunyi untuk Kamera & Galeri */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePhotoSelected(file);
          e.target.value = "";
        }}
        className="hidden"
        aria-label="Ambil Foto Kamera"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePhotoSelected(file);
          e.target.value = "";
        }}
        className="hidden"
        aria-label="Pilih Foto dari Galeri"
      />

      {/* Mini Sheet Pilihan Sumber Foto (Kamera vs Galeri) */}
      <Sheet open={isPhotoSourceOpen} onOpenChange={setIsPhotoSourceOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto max-w-[430px] rounded-t-3xl border-border/80 bg-background pb-6 pt-4 px-5 space-y-3 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
            <SheetTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Camera className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              Pindai Struk Belanja
            </SheetTitle>
            <button
              type="button"
              onClick={() => setIsPhotoSourceOpen(false)}
              className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                cameraInputRef.current?.click();
              }}
              className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border border-border/70 bg-card hover:bg-muted active:scale-95 transition-all text-xs cursor-pointer shadow-sm"
            >
              <div className="h-10 w-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Camera className="h-5 w-5" />
              </div>
              <span className="font-bold text-foreground">Buka Kamera</span>
              <span className="text-[10px] text-muted-foreground text-center">
                Ambil foto langsung
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                galleryInputRef.current?.click();
              }}
              className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border border-border/70 bg-card hover:bg-muted active:scale-95 transition-all text-xs cursor-pointer shadow-sm"
            >
              <div className="h-10 w-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <ImageIcon className="h-5 w-5" />
              </div>
              <span className="font-bold text-foreground">Pilih dari Galeri</span>
              <span className="text-[10px] text-muted-foreground text-center">
                Pilih foto struk di HP
              </span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Loading Modal: Memindai Struk dengan Gemini */}
      {isScanning && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-teal-500/20 text-teal-400 border border-teal-500/30 mb-4 shadow-xl">
            <Sparkles className="h-10 w-10 animate-spin" style={{ animationDuration: "3s" }} />
          </div>
          <h3 className="text-base font-extrabold text-white tracking-tight mb-4">
            Sedang membaca struk belanjamu
          </h3>
          <div className="h-1.5 w-44 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-teal-400 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* Sheet Konfirmasi Pengeluaran Struk */}
      <ReceiptConfirmationSheet
        open={isConfirmationOpen}
        onOpenChange={setIsConfirmationOpen}
        scanResult={scanResult}
        imagePreviewUrl={imagePreviewUrl}
        receiptPath={receiptPath}
        userWallets={wallets}
        userCategories={categories}
        onSuccess={(data) => {
          showNotification(
            `Pengeluaran ${formatRupiah(data.total)} di ${data.merchant} berhasil dicatat!`
          );
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("transaction_created"));
          }
        }}
      />

      {/* Sheet Konfirmasi Transaksi Suara (Multi-Transaksi) */}
      <VoiceConfirmationSheet
        open={isVoiceConfirmationOpen}
        onOpenChange={setIsVoiceConfirmationOpen}
        transcript={voiceTranscript}
        initialTransactions={voiceTransactions}
        userWallets={wallets}
        userCategories={categories}
        onSuccess={(count) => {
          showNotification(`${count} transaksi berhasil dicatat!`);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("transaction_created"));
          }
        }}
      />

      {/* Toast Notifikasi Mengambang Global */}
      {toastMsg && (
        <div className="fixed top-5 inset-x-0 z-[120] mx-auto max-w-[360px] px-4 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-2.5 rounded-2xl bg-teal-800/95 text-white border border-teal-600/50 p-3 text-xs font-bold shadow-2xl backdrop-blur-md">
            <CheckCircle2 className="h-4 w-4 text-teal-300 shrink-0" />
            <span className="flex-1 truncate">{toastMsg}</span>
          </div>
        </div>
      )}
    </>
  );
}
