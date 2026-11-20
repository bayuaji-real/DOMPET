import {
  ArrowLeftRight,
  PenLine,
  PieChart,
  PiggyBank,
  Settings,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export interface MoreItem {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** kelas warna kotak ikon */
  tone: string;
}

export interface MoreGroup {
  title: string;
  items: MoreItem[];
}

/**
 * Daftar menu di halaman More. Mau tambah fitur baru? Tambah satu objek di grup yang cocok
 * (atau buat grup baru). Navbar bawah sengaja tetap ringkas: Beranda, Tabungan, Dompet, More.
 */
export const MORE_GROUPS: MoreGroup[] = [
  {
    title: "Fitur",
    items: [
      { label: "Riwayat Transaksi", description: "Semua arus masuk & keluar uangmu", href: "/transaksi", icon: ArrowLeftRight, tone: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
      { label: "Analisis Keuangan", description: "Arus kas, kategori, anggaran & insight AI", href: "/analisis", icon: PieChart, tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
      { label: "Catat Manual", description: "Atur kategori, dompet, tanggal & transfer", href: "/tambah", icon: PenLine, tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
      { label: "Target Tabungan", description: "Impian, proyeksi & timeline setoran", href: "/tabungan", icon: PiggyBank, tone: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
      { label: "Tambah Dompet", description: "Rekening, e-wallet, tunai, investasi", href: "/dompet?tambah=1", icon: WalletCards, tone: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
    ],
  },
  {
    title: "Akun",
    items: [
      { label: "Pengaturan", description: "Profil, jadwal gajian, kategori, keamanan & data", href: "/pengaturan", icon: Settings, tone: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
    ],
  },
];

/** Path yang membuat tombol More di navbar tampil aktif. */
export const MORE_ACTIVE_PREFIXES = ["/more", "/pengaturan", "/profil", "/settings", "/transaksi", "/analisis", "/tambah"];
