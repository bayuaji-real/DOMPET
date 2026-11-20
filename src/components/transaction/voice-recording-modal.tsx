"use client";

import * as React from "react";
import {
  Mic,
  Square,
  Sparkles,
  X,
  Send,
  Loader2,
  AlertCircle,
  Keyboard,
  AudioWaveform,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ParsedVoiceTransaction,
  VoiceTransactionResponse,
} from "@/app/api/voice-transaction/route";

export interface VoiceRecordingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userWallets?: { id: string; name: string; icon?: string | null; color?: string | null }[];
  userCategories?: { id: string; name: string }[];
  onProcessed: (data: {
    transcript: string;
    transactions: ParsedVoiceTransaction[];
  }) => void;
}

export function VoiceRecordingModal({
  open,
  onOpenChange,
  userWallets = [],
  userCategories = [],
  onProcessed,
}: VoiceRecordingModalProps) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [textInput, setTextInput] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Bersihkan stream dan timer saat modal ditutup
  React.useEffect(() => {
    if (!open) {
      cleanupRecording();
      setSeconds(0);
      setIsRecording(false);
      setIsProcessing(false);
      setErrorMessage(null);
    }
  }, [open]);

  const cleanupRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  };

  // Pilih MIME type yang didukung browser (Chrome Android vs Safari iOS)
  const getSupportedMimeType = (): string => {
    if (typeof window === "undefined" || !window.MediaRecorder) return "";
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/aac",
      "audio/ogg;codecs=opus",
      "audio/wav",
    ];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return "";
  };

  // Mulai merekam suara
  const startRecording = async () => {
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMessage("Browser tidak mendukung perekaman suara. Gunakan fitur 'Ketik cepat' di bawah ya.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const actualMime = mediaRecorder.mimeType || mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
        if (audioBlob.size > 0) {
          await processAudio(audioBlob, actualMime);
        }
      };

      mediaRecorder.start(250); // kumpulkan chunk per 250ms
      setIsRecording(true);
      setSeconds(0);

      // Timer 60 detik maksimal
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= 59) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      console.error("Gagal mengakses mikrofon:", err);
      const isNotAllowed =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      setErrorMessage(
        isNotAllowed
          ? "Izin mikrofon belum diberikan. Silakan izinkan di browser atau gunakan 'Ketik cepat' di bawah."
          : "Gagal memulai rekaman suara. Coba lagi atau gunakan 'Ketik cepat'."
      );
    }
  };

  // Berhenti merekam
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  };

  // Kirim audio ke server route /api/voice-transaction
  const processAudio = async (blob: Blob, mimeType: string) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const audioBase64 = btoa(binary);

      const res = await fetch("/api/voice-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          userWallets: userWallets.map((w) => w.name),
          userCategories: userCategories.map((c) => c.name),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memproses suara");
      }

      onOpenChange(false);
      onProcessed({
        transcript: data.transcript,
        transactions: data.transactions || [],
      });
    } catch (err: unknown) {
      console.error("Gagal proses audio Gemini:", err);
      const msg = err instanceof Error ? err.message : "Gagal memproses suara.";
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Kirim teks kalimat bebas (Ketik Cepat)
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/voice-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textPrompt: textInput.trim(),
          userWallets: userWallets.map((w) => w.name),
          userCategories: userCategories.map((c) => c.name),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memproses kalimat");
      }

      setTextInput("");
      onOpenChange(false);
      onProcessed({
        transcript: data.transcript,
        transactions: data.transactions || [],
      });
    } catch (err: unknown) {
      console.error("Gagal proses teks Gemini:", err);
      const msg = err instanceof Error ? err.message : "Gagal memproses kalimat.";
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!open) return null;

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div
      onClick={() => {
        if (!isProcessing) {
          stopRecording();
          onOpenChange(false);
        }
      }}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 animate-in fade-in"
    >
      <div
        className="w-full max-w-[430px] rounded-3xl bg-card border border-border/80 shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-5 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle Bar */}
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto" />

        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Mic className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground">
                Catat Lewat Suara
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Bicara santai, AI yang pisahkan transaksimu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopRecording();
              onOpenChange(false);
            }}
            disabled={isProcessing}
            className="h-7 w-7 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* State Loading Pemrosesan */}
        {isProcessing ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="h-16 w-16 rounded-3xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shadow-lg">
              <Sparkles className="h-8 w-8 animate-spin" style={{ animationDuration: "3s" }} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Sedang mendengarkan & menganalisis...
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                AI sedang mengekstrak nominal, dompet, dan kategori
              </p>
            </div>
            <div className="h-1.5 w-36 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-teal-400 rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        ) : (
          <>
            {/* Bagian Perekaman Suara (Mic Besar & Gelombang) */}
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              {/* Tombol Mic Besar */}
              <div className="relative flex items-center justify-center">
                {isRecording && (
                  <>
                    <div className="absolute h-28 w-28 rounded-full bg-rose-500/20 animate-ping duration-1000" />
                    <div className="absolute h-24 w-24 rounded-full bg-rose-500/30 animate-pulse" />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (isRecording) {
                      stopRecording();
                    } else {
                      startRecording();
                    }
                  }}
                  className={cn(
                    "relative h-20 w-20 rounded-full flex items-center justify-center shadow-xl transition-all cursor-pointer active:scale-95",
                    isRecording
                      ? "bg-rose-500 text-white ring-4 ring-rose-500/40"
                      : "bg-teal-600 hover:bg-teal-500 text-white ring-4 ring-teal-500/30"
                  )}
                  title={isRecording ? "Ketuk untuk berhenti" : "Ketuk untuk mulai merekam"}
                >
                  {isRecording ? (
                    <Square className="h-8 w-8 fill-current" />
                  ) : (
                    <Mic className="h-9 w-9 stroke-[2.2]" />
                  )}
                </button>
              </div>

              {/* Status & Timer */}
              <div className="text-center space-y-1">
                {isRecording ? (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 text-rose-500 font-extrabold text-xs">
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                      Merekam: {formatTimer(seconds)} / 01:00
                    </div>

                    {/* Waveform Bar Animasi */}
                    <div className="flex items-center gap-1 mt-2.5 h-6">
                      <span className="w-1 bg-rose-500 rounded-full h-3 animate-pulse" />
                      <span className="w-1 bg-rose-500 rounded-full h-5 animate-pulse delay-75" />
                      <span className="w-1 bg-rose-500 rounded-full h-2 animate-pulse delay-150" />
                      <span className="w-1 bg-rose-500 rounded-full h-6 animate-pulse delay-100" />
                      <span className="w-1 bg-rose-500 rounded-full h-4 animate-pulse delay-200" />
                      <span className="w-1 bg-rose-500 rounded-full h-5 animate-pulse delay-75" />
                      <span className="w-1 bg-rose-500 rounded-full h-3 animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      Ketuk tombol mic untuk mulai merekam
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Sebutkan pengeluaran/pemasukan bebas (maks 60 dtk)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Pemisah atau Opsi Ketik Cepat */}
            <div className="relative flex items-center justify-center pt-1 pb-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <span className="relative bg-card px-2.5 text-[10px] font-semibold text-muted-foreground">
                ATAU KETIK CEPAT
              </span>
            </div>

            {/* Kolom Teks Kalimat Bebas (Ketik Cepat) */}
            <form onSubmit={handleTextSubmit} className="space-y-2">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Misal: bakso 15rb terus isi bensin 20rb gopay..."
                  disabled={isRecording || isProcessing}
                  className="w-full h-11 rounded-2xl border border-border/70 bg-muted/30 pl-3.5 pr-11 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1.5 focus:ring-teal-500/50 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || isRecording || isProcessing}
                  className={cn(
                    "absolute right-1.5 h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs",
                    textInput.trim()
                      ? "bg-teal-600 hover:bg-teal-700 text-white active:scale-95"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                  title="Kirim kalimat cepat"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Kalimat bebas diurai otomatis dengan AI tanpa perlu rekam suara.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
