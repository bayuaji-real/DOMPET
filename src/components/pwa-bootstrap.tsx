"use client";

import * as React from "react";
import { initPwaCapture } from "@/lib/pwa-install";

/**
 * Dipasang sekali di root. Dua tugas supaya tombol "Download Aplikasi" bisa memasang otomatis:
 * 1) menangkap event beforeinstallprompt sedini mungkin, 2) mendaftarkan service worker
 * (Chrome baru menawarkan pemasangan otomatis bila service worker aktif).
 */
export function PwaBootstrap() {
  React.useEffect(() => {
    initPwaCapture();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
