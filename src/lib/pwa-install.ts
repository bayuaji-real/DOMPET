"use client";

import * as React from "react";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Event "beforeinstallprompt" hanya ditembakkan sekali dan cepat. Ditangkap di tingkat modul (dipasang dari root
// aplikasi lewat PwaBootstrap) supaya tidak terlewat walau halaman Login/Pengaturan belum dibuka.
let captured: BeforeInstallPromptEvent | null = null;
let capturedInstalled = false;
let capturing = false;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

export function initPwaCapture() {
  if (typeof window === "undefined" || capturing) return;
  capturing = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    captured = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    capturedInstalled = true;
    captured = null;
    notify();
  });
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = React.useState(false);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Cek apakah sudah running dalam mode standalone / PWA terpasang
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Deteksi iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isApple);

    initPwaCapture();
    const sync = () => {
      setDeferredPrompt(captured);
      setIsInstallable(captured !== null);
      if (capturedInstalled) setIsInstalled(true);
    };
    sync();
    subs.add(sync);
    return () => { subs.delete(sync); };
  }, []);

  const promptInstall = async () => {
    if (isInstalled) {
      setShowModal(true);
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
        }
        captured = null;
        notify();
      } catch (err) {
        console.warn("Gagal menampilkan dialog instalasi PWA:", err);
        setShowModal(true);
      }
    } else {
      // Jika prompt otomatis tidak tersedia atau di Safari iOS, tampilkan panduan modal
      setShowModal(true);
    }
  };

  return {
    isInstallable,
    isInstalled,
    isIOS,
    showModal,
    setShowModal,
    promptInstall,
  };
}
