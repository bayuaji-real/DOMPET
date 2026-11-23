import {
  ArrowLeftRight,
  PieChart,
  ReceiptText,
  Sparkles,
    Settings,
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
 * Daftar menu di halaman More. Hanya fitur yang TIDAK ada di navbar bawah (Beranda, Tabungan, Dompet, More). Mau tambah fitur baru? Tambah satu objek di grup yang cocok
 * (atau buat grup baru). Navbar bawah sengaja tetap ringkas: Beranda, Tabungan, Dompet, More.
 */
export const MORE_GROUPS: MoreGroup[] = [
  {
    title: "Fitur",
    items: [
      { label: "Riwayat Transaksi", description: "Semua arus masuk & keluar uangmu", href: "/transaksi", icon: ArrowLeftRight, tone: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
      { label: "Analisis Keuangan", description: "Arus kas, kategori, anggaran & insight AI", href: "/analisis", icon: PieChart, tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
      { label: "Rencana Keuangan AI", description: "Bagi gaji ke kebutuhan, tenggat & saran dompet", href: "/rencana", icon: Sparkles, tone: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400" },
      { label: "Split Bill", description: "Bagi tagihan adil, termasuk ongkir & pajak", href: "/split-bill", icon: ReceiptText, tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
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
export const MORE_ACTIVE_PREFIXES = ["/more", "/pengaturan", "/profil", "/settings", "/transaksi", "/analisis", "/tambah", "/split-bill", "/rencana"];
