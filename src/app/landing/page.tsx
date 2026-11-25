import type { Metadata } from "next";
import { LandingClient } from "./landing-client";

export const metadata: Metadata = {
  metadataBase: new URL("https://dompetku.app"),
  title: "Dompetku — Aplikasi Manajemen Finansial Pribadi Modern & Cerdas",
  description:
    "Catat keuangan tanpa ribet dengan foto struk AI & pesan suara. Multi-dompet lengkap dari BCA, Mandiri, GoPay, hingga Tunai. Asisten AI Ruby personal dan 100% aman tanpa hubungkan rekening bank.",
  keywords: [
    "aplikasi keuangan pribadi",
    "catatan keuangan indonesia",
    "scan struk ai",
    "catat uang voice note",
    "budgeting bulanan",
    "financial planner indonesia",
    "dompetku",
    "aplikasi dompet",
  ],
  openGraph: {
    title: "Dompetku — Keuangan Rapi Seketika Tanpa Ribet Ketik Angka",
    description:
      "Aplikasi keuangan pribadi berbahasa Indonesia dengan scan struk AI, catat lewat pesan suara, asisten finansial Ruby, dan mode gajian otomatis.",
    url: "/landing",
    siteName: "Dompetku",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/icons/splash-logo-512.png",
        width: 512,
        height: 512,
        alt: "Logo Dompetku",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dompetku — Keuangan Rapi Seketika Tanpa Ribet Ketik Angka",
    description:
      "Aplikasi keuangan pribadi berbahasa Indonesia dengan scan struk AI, catat pesan suara, dan asisten AI Ruby.",
    images: ["/icons/splash-logo-512.png"],
  },
};

export default function LandingPage() {
  return <LandingClient />;
}
