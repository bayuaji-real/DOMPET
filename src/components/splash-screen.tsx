"use client";

import * as React from "react";

/**
 * Layar pembuka di dalam aplikasi: koin Rp muncul dari dompet lalu naik.
 * Tampil sebentar saat aplikasi dibuka (maksimal ~1,8 detik) lalu memudar.
 * Tidak menahan apa pun: aplikasi di belakangnya tetap memuat seperti biasa.
 */
export function SplashScreen() {
  const [phase, setPhase] = React.useState<"show" | "fade" | "gone">("show");

  React.useEffect(() => {
    const t1 = setTimeout(() => setPhase("fade"), 1500);
    const t2 = setTimeout(() => setPhase("gone"), 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden="true"
      className="dompet-splash"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        opacity: phase === "fade" ? 0 : 1,
        transition: "opacity 400ms ease",
        pointerEvents: phase === "fade" ? "none" : "auto",
      }}
    >
      <style>{`
        @keyframes dompet-coin-rise {
          0% { transform: translateY(62px) scale(0.7); opacity: 0; }
          25% { opacity: 1; }
          70% { transform: translateY(-34px) scale(1); }
          100% { transform: translateY(-26px) scale(1); opacity: 1; }
        }
        @keyframes dompet-wallet-pop {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .dompet-splash .coin { animation: dompet-coin-rise 1000ms cubic-bezier(.2,.9,.3,1.2) 250ms both; }
        .dompet-splash .wallet { animation: dompet-wallet-pop 350ms ease-out both; transform-origin: 50% 70%; }
        @media (prefers-reduced-motion: reduce) {
          .dompet-splash .coin, .dompet-splash .wallet { animation: none; }
          .dompet-splash .coin { transform: translateY(-26px); }
        }
      `}</style>
      <svg width="200" height="200" viewBox="0 0 200 200" role="img">
        {/* Dompet (bagian belakang) */}
        <g className="wallet">
          <ellipse cx="100" cy="168" rx="52" ry="6" fill="#000" opacity="0.25" />
          <rect x="40" y="92" width="120" height="72" rx="22" fill="#0b4a47" />
        </g>
        {/* Koin keluar dari dalam dompet */}
        <g className="coin">
          <circle cx="100" cy="96" r="28" fill="#f59e0b" />
          <circle cx="100" cy="96" r="22" fill="#fbbf24" stroke="#d97706" strokeWidth="3" />
          <text x="100" y="105" textAnchor="middle" fontSize="22" fontWeight="800" fill="#7c2d12" fontFamily="system-ui, sans-serif">
            Rp
          </text>
        </g>
        {/* Dompet (bagian depan, menutupi dasar koin) */}
        <g className="wallet">
          <rect x="40" y="108" width="120" height="56" rx="20" fill="#14b8a6" />
          <rect x="52" y="118" width="60" height="6" rx="3" fill="#99f6e4" opacity="0.6" />
          <rect x="116" y="126" width="48" height="26" rx="13" fill="#115e59" />
          <circle cx="132" cy="139" r="6" fill="#fbbf24" />
        </g>
      </svg>
    </div>
  );
}
