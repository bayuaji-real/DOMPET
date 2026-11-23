"use client";

import * as React from "react";

/**
 * Layar pembuka di dalam aplikasi: logo asli (transparan, tanpa kotak) di atas warna latar aplikasi.
 * Bertahan selama aplikasi masih menunggu server/halaman selesai dimuat (minimal 0,7 detik agar tidak
 * berkedip, maksimal 6 detik supaya tidak pernah menahan pengguna), lalu memudar.
 * Aplikasi di belakangnya tetap memuat seperti biasa.
 */
const MIN_MS = 700;
const MAX_MS = 6000;
const FADE_MS = 350;

export function SplashScreen() {
  const [phase, setPhase] = React.useState<"show" | "fade" | "gone">("show");

  React.useEffect(() => {
    const started = Date.now();
    let done = false;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, MIN_MS - (Date.now() - started));
      fadeTimer = setTimeout(() => setPhase("fade"), wait);
    };

    // Siap = halaman selesai dimuat, atau halaman memberi tanda lewat event "dompet_ready".
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    window.addEventListener("dompet_ready", finish, { once: true });
    const maxTimer = setTimeout(finish, MAX_MS);

    return () => {
      window.removeEventListener("load", finish);
      window.removeEventListener("dompet_ready", finish);
      clearTimeout(maxTimer);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, []);

  React.useEffect(() => {
    if (phase !== "fade") return;
    const t = setTimeout(() => setPhase("gone"), FADE_MS + 50);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden="true"
      className="dompet-splash bg-slate-100 dark:bg-zinc-950"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: phase === "fade" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: phase === "fade" ? "none" : "auto",
      }}
    >
      <style>{`
        @keyframes dompet-logo-in {
          0% { transform: scale(0.88); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes dompet-logo-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .dompet-splash .logo {
          animation: dompet-logo-in 350ms ease-out both, dompet-logo-pulse 1600ms ease-in-out 450ms infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .dompet-splash .logo { animation: none; }
        }
      `}</style>
      {/* Logo transparan: tidak ada kotak atau warna latar di belakangnya */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="logo"
        src="/icons/splash-logo-512.png"
        alt=""
        width={176}
        height={176}
        style={{ background: "transparent" }}
        draggable={false}
      />
    </div>
  );
}
