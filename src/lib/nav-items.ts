import {
  ArrowLeftRight,
  PenLine,
  PieChart,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export interface FeatureItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** kelas warna lingkaran ikon */
  tone: string;
}

/**
 * Fitur tambahan yang tampil di container "Menu" di Beranda (gaya Livin').
 * Mau tambah fitur baru? Cukup tambah satu baris di sini; grid menyesuaikan sendiri.
 * (Navbar bawah sengaja hanya 5: Beranda, Tabungan, +, Dompet, Pengaturan.)
 */
export const FEATURE_ITEMS: FeatureItem[] = [
  { label: "Transaksi", href: "/transaksi", icon: ArrowLeftRight, tone: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  { label: "Analisis", href: "/analisis", icon: PieChart, tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  { label: "Input Manual", href: "/tambah", icon: PenLine, tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  { label: "Tambah Dompet", href: "/dompet?tambah=1", icon: WalletCards, tone: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
];
