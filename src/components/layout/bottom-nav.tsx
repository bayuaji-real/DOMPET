"use client";

import { todayJakarta } from "@/lib/data/sample-mode";
import { notify } from "@/lib/notify";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  PiggyBank,
  Wallet,
  LayoutGrid,
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
import { MORE_ACTIVE_PREFIXES } from "@/lib/nav-items";
import { useEntitlement } from "@/hooks/use-entitlement";
import { sisaLabel } from "@/lib/plans";
import { cn, parseRupiahInput, formatRupiah } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { compressImage } from "@/lib/image-compression";
import { uploadReceipt } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { getSpendableWallets } from "@/lib/data/wallets";
import { getCategories } from "@/lib/data/categories";
import {
  ReceiptConfirmationSheet,
} from "@/components/transaction/receipt-confirmation-sheet";
import { VoiceConfirmationSheet } from "@/components/transaction/voice-confirmation-sheet";
import type { ScanReceiptResult } from "@/app/api/scan-receipt/route";
import type { ParsedVoiceTransaction } from "@/app/api/voice-transaction/route";

/** Angka kecil sisa Gratis penggunaan AI Ruby di pojok tombol (Basic). 0 = merah. */
function SisaChip({ n, large = false }: { n: number; large?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute flex items-center justify-center rounded-full border-2 border-background text-[9px] font-extrabold leading-none text-white",
        large ? "-right-1 -top-1 h-5 min-w-5 px-1" : "-right-1.5 -top-1.5 h-4 min-w-4 px-1",
        n > 0 ? "bg-amber-500" : "bg-rose-500"
      )}
    >
      {n}
    </span>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { ent, reload: reloadEnt } = useEntitlement();
  const sisaStruk = ent.plan === "free" ? sisaLabel(ent.cicip.struk) : null;
  const sisaSuara = ent.plan === "free" ? sisaLabel(ent.cicip.suara) : null;
  const sisaTanya = ent.plan === "free" ? sisaLabel(ent.cicip.konsultasi) : null;
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
  // Format rekaman yang benar-benar dipakai perangkat (HP iPhone = audio/mp4, Android = audio/webm).
  const recorderMimeRef = React.useRef<string>("");
  const recognitionRef = React.useRef<any>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  // Refs tambahan: nilai terbaru yang dibaca dari timer/callback (menghindari state basi)
  const inputTextRef = React.useRef("");
  const lastActivityRef = React.useRef(0);
  const startedAtRef = React.useRef(0);
  const hadSpeechRef = React.useRef(false);
  const isRecordingRef = React.useRef(false);
  const finishingRef = React.useRef(false);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const finishRef = React.useRef<(process: boolean, message?: string) => void>(() => undefined);
  // Popup ketik manual (latar buram)
  const [isManualOpen, setIsManualOpen] = React.useState(false);

  // Sisa Gratis penggunaan AI Ruby diperbarui setelah foto/suara selesai diproses.
  React.useEffect(() => {
    if (!isScanning && !isProcessing) void reloadEnt();
  }, [isScanning, isProcessing, reloadEnt]);

  // Data dompet & kategori
  const [wallets, setWallets] = React.useState<{ id: string; name: string; icon?: string | null; color?: string | null }[]>([]);
  const [categories, setCategories] = React.useState<{ id: string; name: string; type?: "expense" | "income" }[]>([]);

  // Refs input kamera & galeri
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);

  // Load dompet & kategori untuk konfirmasi struk dan suara
  React.useEffect(() => {
    async function loadMetadata() {
      try {
        const [wData, cData] = await Promise.allSettled([
          getSpendableWallets(),
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
          setCategories(cData.value.map((c) => ({ id: c.id, name: c.name, type: c.type === "income" ? "income" as const : "expense" as const })));
        } else {
          setCategories([
            { id: "c-food", name: "Makanan & Minuman", type: "expense" },
            { id: "c-groceries", name: "Belanja Harian", type: "expense" },
            { id: "c-trans", name: "Transportasi", type: "expense" },
            { id: "c-bills", name: "Tagihan", type: "expense" },
            { id: "c-ent", name: "Hiburan", type: "expense" },
            { id: "c-other", name: "Lainnya", type: "expense" },
          ]);
        }
      } catch {
        // Fallback default aman
      }
    }
    loadMetadata();
  }, []);

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
          userCategories: categories.filter((c) => c.type !== "income").map((c) => c.name),
          userWallets: wallets.map((w) => w.name),
        }),
      });

      if (!res.ok) {
        if (res.status === 402 || res.status === 429) {
          const j = await res.json().catch(() => ({}));
          notify(typeof j.error === "string" ? j.error : "Foto struk belum tersedia di paketmu.");
        }
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
        date: todayJakarta(),
        total: 0,
        items: [],
        suggested_category: categories.find((c) => c.type !== "income")?.name || "Belanja Harian",
        suggested_wallet: wallets[0]?.name || "Uang Tunai",
        payment_hint: null,
        confidence: 0,
      });
      setIsConfirmationOpen(true);
    }
  };

  // Mulai merekam suara langsung di quick bar.
  // Berhenti otomatis: ~2,5 detik hening setelah bicara, 8 detik kalau tidak ada suara sama sekali, atau 60 detik.
  const startVoiceRecording = async () => {
    if (isRecordingRef.current || isProcessing) return;
    isRecordingRef.current = true;
    finishingRef.current = false;
    hadSpeechRef.current = false;
    startedAtRef.current = Date.now();
    lastActivityRef.current = Date.now();
    audioChunksRef.current = [];
    inputTextRef.current = "";
    setIsVoiceRecording(true);
    setVoiceSeconds(0);
    setInputText("");

    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;
    let useRecognition = false;

    // Jalur 1: pengenalan suara bawaan browser (gratis). Mikrofon hanya dipakai SATU jalur
    // supaya tidak berebut dengan perekam audio (dugaan penyebab voice gagal di HP).
    if (SpeechRecognitionCtor) {
      try {
        const recognition = new SpeechRecognitionCtor();
        recognition.lang = "id-ID";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          let text = "";
          for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
          if (text.trim()) {
            hadSpeechRef.current = true;
            lastActivityRef.current = Date.now();
            inputTextRef.current = text;
            setInputText(text);
          }
        };
        recognition.onerror = (e: any) => {
          if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
            finishRef.current(false, "Akses mikrofon ditolak. Izinkan mikrofon di pengaturan browser.");
          }
        };
        // Browser HP sering menghentikan pengenalan sendiri; sambung lagi selama masih merekam
        recognition.onend = () => {
          if (isRecordingRef.current && !finishingRef.current) {
            try {
              recognition.start();
            } catch {}
          }
        };
        recognition.start();
        recognitionRef.current = recognition;
        useRecognition = true;
      } catch (err) {
        console.warn("Speech recognition init error:", err);
      }
    }

    // Jalur 2 (cadangan): rekam audio, deteksi hening lewat tingkat suara
    if (!useRecognition) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/wav"];
        const mimeType = candidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";
        const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = mr;
        recorderMimeRef.current = mr.mimeType || mimeType || "";
        mr.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mr.start(250);

        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (Ctx) {
          const ctx: AudioContext = new Ctx();
          audioCtxRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          ctx.createMediaStreamSource(stream).connect(analyser);
          const buf = new Uint8Array(analyser.fftSize);
          const poll = () => {
            if (!isRecordingRef.current) return;
            analyser.getByteTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i++) {
              const v = (buf[i] - 128) / 128;
              sum += v * v;
            }
            if (Math.sqrt(sum / buf.length) > 0.04) {
              hadSpeechRef.current = true;
              lastActivityRef.current = Date.now();
            }
            setTimeout(poll, 150);
          };
          poll();
        } else {
          // Tanpa pengukur suara: anggap sudah bicara, berhenti oleh batas waktu
          hadSpeechRef.current = true;
        }
      } catch (err) {
        console.warn("Microphone stream error:", err);
        finishRef.current(false, "Mikrofon tidak bisa dipakai. Izinkan akses mikrofon di pengaturan browser.");
        return;
      }
    }

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const secs = Math.floor((now - startedAtRef.current) / 1000);
      setVoiceSeconds(secs);
      if (secs >= 60) finishRef.current(true);
      else if (hadSpeechRef.current && now - lastActivityRef.current >= 2500) finishRef.current(true);
      else if (!hadSpeechRef.current && now - startedAtRef.current >= 8000) {
        finishRef.current(false, "Tidak ada suara terdengar. Coba lagi ya.");
      }
    }, 300);
  };

  // Berhenti merekam. Kalau shouldProcess, tunggu hasil terakhir lalu kirim ke server.
  const stopVoiceRecording = (shouldProcess = true, message?: string) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    isRecordingRef.current = false;
    setIsVoiceRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {}
    }

    const release = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      audioCtxRef.current?.close().catch(() => undefined);
      audioCtxRef.current = null;
    };
    const done = () => {
      release();
      if (shouldProcess) void processSpokenInput();
      else if (message) showNotification(message);
    };

    const mr = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (mr && mr.state !== "inactive") {
      // tunggu potongan audio terakhir sebelum diproses
      mr.onstop = done;
      try {
        mr.stop();
      } catch {
        done();
      }
    } else {
      // beri waktu hasil akhir pengenalan suara masuk
      setTimeout(done, 400);
    }
  };
  finishRef.current = stopVoiceRecording;

  // Kirim hasil suara / ketik langsung ke server route
  const processSpokenInput = async () => {
    const text = inputTextRef.current.trim();
    if (!text && audioChunksRef.current.length === 0) {
      showNotification("Tidak ada suara terdengar. Coba lagi ya.");
      return;
    }
    setIsProcessing(true);
    let serverMessage = "";

    try {
      const bodyPayload: Record<string, unknown> = {
        userWallets: wallets.map((w) => w.name),
        userCategories: categories.map((c) => c.name),
      };

      if (text) {
        bodyPayload.textPrompt = text;
      } else {
        const realMime = (recorderMimeRef.current || audioChunksRef.current[0]?.type || "audio/webm").split(";")[0] || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: realMime });
        const bytes = new Uint8Array(await audioBlob.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        bodyPayload.audioBase64 = btoa(binary);
        bodyPayload.mimeType = realMime;
      }

      const res = await fetch("/api/voice-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        serverMessage = typeof data.error === "string" ? data.error : "";
        throw new Error(serverMessage || "Gagal memproses suara");
      }

      setInputText("");
      inputTextRef.current = "";
      setVoiceTranscript(data.transcript || text);
      setVoiceTransactions(data.transactions || []);
      setIsVoiceConfirmationOpen(true);
    } catch (err: unknown) {
      console.error("Gagal memproses transaksi suara:", err);
      showNotification(serverMessage || "Gagal memproses suara. Coba ulangi lagi ya.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler mic rekaman suara
  const handleMicClick = () => {
    if (isVoiceRecording) {
      stopVoiceRecording(true);
    } else {
      void startVoiceRecording();
    }
  };

  // Pintasan dari halaman Tambah: /?scan=true buka pilihan foto struk, /?voice=true mulai merekam suara
  React.useEffect(() => {
    if (pathname !== "/" || typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const wantScan = q.get("scan") === "true";
    const wantVoice = q.get("voice") === "true";
    if (!wantScan && !wantVoice) return;
    window.history.replaceState(null, "", "/");
    if (wantScan) setIsPhotoSourceOpen(true);
    if (wantVoice) void startVoiceRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Quick bar hanya ada di Beranda: kalau pindah halaman saat merekam, matikan mikrofon tanpa memproses
  React.useEffect(() => {
    if (pathname !== "/" && isVoiceRecording) stopVoiceRecording(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Jangan tampilkan bottom navigation jika sedang di halaman login/auth
  if (pathname.startsWith("/login")) {
    return null;
  }

  const navItems = [
    { label: "Beranda", href: "/", icon: Home, isActive: pathname === "/" },
    { label: "Tabungan", href: "/tabungan", icon: PiggyBank, isActive: pathname.startsWith("/tabungan") },
    { label: "Tanya Ruby", href: "/chat", icon: Sparkles, isActive: pathname.startsWith("/chat"), center: true },
    { label: "Dompet", href: "/dompet", icon: Wallet, isActive: pathname.startsWith("/dompet") },
    {
      label: "More",
      href: "/more",
      icon: LayoutGrid,
      isActive: MORE_ACTIVE_PREFIXES.some((p) => pathname.startsWith(p)),
    },
  ];

  return (
    <>
      {pathname === "/" && (
      <div
        className="fixed left-1/2 z-30 w-[calc(100%-1.5rem)] max-w-[406px] -translate-x-1/2"
        style={{ bottom: "calc(5.6rem + env(safe-area-inset-bottom, 0px))" }}
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
            className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 transition-all hover:bg-teal-500/20 active:scale-95 disabled:opacity-50 dark:bg-teal-500/15 dark:text-teal-400"
            title={sisaStruk ? `Foto Struk Belanja. ${sisaStruk.text}` : "Foto Struk Belanja"}
            aria-label={sisaStruk ? `Foto Struk Belanja. ${sisaStruk.text}` : "Foto Struk Belanja"}
          >
            <Camera className="h-5 w-5" />
            {sisaStruk && <SisaChip n={sisaStruk.n} />}
          </button>

          {/* Menekan bar membuka popup ketik manual */}
          <button
            type="button"
            onClick={() => setIsManualOpen(true)}
            disabled={isVoiceRecording || isProcessing}
            aria-label="Ketik transaksi"
            className={cn(
              "flex h-10 min-w-0 flex-1 cursor-text items-center gap-2 rounded-xl border px-3 text-left text-xs transition-all disabled:cursor-default",
              isVoiceRecording
                ? "border-rose-500/40 bg-rose-500/5 font-semibold text-rose-600 dark:text-rose-400"
                : "border-border/60 bg-muted/30 text-muted-foreground/80 hover:bg-muted/50"
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-teal-500" />
                <span className="truncate">Memproses...</span>
              </>
            ) : isVoiceRecording ? (
              <>
                <span className="h-2 w-2 shrink-0 animate-ping rounded-full bg-rose-500" />
                <span className="truncate">{inputText || `Mendengarkan... (${voiceSeconds}d)`}</span>
              </>
            ) : (
              <span className="truncate">Ketik: Nasi Padang 25rb GoPay...</span>
            )}
          </button>

          <button
            type="button"
            onClick={handleMicClick}
            disabled={isProcessing}
            className={cn(
              "relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-white shadow-sm transition-all active:scale-95 disabled:opacity-50",
              isVoiceRecording ? "animate-pulse bg-rose-500 hover:bg-rose-600" : "bg-teal-600 hover:bg-teal-700"
            )}
            title={isVoiceRecording ? "Selesai dan catat" : sisaSuara ? `Bicara untuk catat langsung. ${sisaSuara.text}` : "Bicara untuk catat langsung"}
            aria-label={isVoiceRecording ? "Selesai dan catat" : sisaSuara ? `Catat dengan suara. ${sisaSuara.text}` : "Catat dengan suara"}
          >
            {isVoiceRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
            {sisaSuara && !isVoiceRecording && <SisaChip n={sisaSuara.n} />}
          </button>
        </div>
      </div>
      )}

      {/* Popup ketik manual: latar diburamkan, isian langsung di atas keyboard */}
      <Sheet open={isManualOpen} onOpenChange={setIsManualOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          overlayClassName="bg-black/50 backdrop-blur-sm"
          className="mx-auto max-w-[430px] rounded-t-3xl border-border/80 bg-background px-5 pb-6 pt-4 shadow-2xl"
        >
          <SheetTitle className="text-sm font-extrabold">Catat transaksi</SheetTitle>
          <form
            onSubmit={(e) => {
              setIsManualOpen(false);
              void handleQuickSubmit(e);
            }}
            className="space-y-3"
          >
            <textarea
              autoFocus
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                inputTextRef.current = e.target.value;
              }}
              rows={3}
              maxLength={500}
              aria-label="Tulis transaksi"
              placeholder="Misal: Nasi Padang 25rb GoPay, kopi 18rb tunai"
              className="w-full resize-none rounded-xl border border-border/60 bg-muted/30 p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500/50"
            />
            <p className="text-[11px] text-muted-foreground">
              Tulis seperti ngobrol. Kalau dompet tidak disebut, masuk ke Uang Tunai.
            </p>
            <div className="flex gap-2">
              <Link
                href="/tambah"
                onClick={() => setIsManualOpen(false)}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/70 text-xs font-bold text-foreground hover:bg-muted/50"
              >
                <PenLine className="h-4 w-4" /> Form lengkap
              </Link>
              <button
                type="submit"
                disabled={!inputText.trim() || isProcessing}
                className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-teal-600 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                <ArrowUp className="h-4 w-4" /> Catat
              </button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <nav
        aria-label="Navigasi Bawah"
        className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-[430px] border-t border-border/80 bg-background/95 backdrop-blur-md px-3 pt-2.5"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1.25rem)" }}
      >
        <div className="flex items-center justify-around">
          {navItems.map((item, idx) => {
            const Icon = item.icon;

            // Item Navigasi Biasa (Link)
            const isActive = item.isActive;
            if ("center" in item && item.center) {
              return (
                <Link
                  key={idx}
                  href={item.href || "/chat"}
                  aria-label={sisaTanya ? `Tanya Ruby. ${sisaTanya.text}` : "Tanya Ruby"}
                  className="flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 cursor-pointer"
                >
                  <span
                    className={cn(
                      "relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-600/40 ring-4 ring-background transition-transform active:scale-95",
                      isActive && "scale-105"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                    {ent.plan === "pro" && (
                      <span aria-label="Pro" className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-amber-400/60 bg-background text-[11px] leading-none shadow">
                        <span aria-hidden>👑</span>
                      </span>
                    )}
                    {sisaTanya && <SisaChip n={sisaTanya.n} large />}
                  </span>
                  <span className={cn("text-[9.5px] font-bold leading-tight", isActive ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground")}>
                    {item.label}
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={idx}
                href={item.href || "/"}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 min-w-0 transition-colors cursor-pointer",
                  isActive
                    ? "text-teal-600 dark:text-teal-400 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn("h-4.5 w-4.5 shrink-0", isActive ? "stroke-[2.5]" : "stroke-[1.75]")}
                />
                <span className="text-[9.5px] leading-tight tracking-tight truncate max-w-full">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

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
