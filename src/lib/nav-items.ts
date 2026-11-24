import {
  ArrowLeftRight,
  PieChart,
  ReceiptText,
  Sparkles,
  MessagesSquare,
    Gauge, ShoppingBag, TrendingUp, FileUp, CalendarDays, Moon, Crown, HeartPulse, LineChart, Repeat, Users, BellRing, ShieldCheck, Heart, GraduationCap,
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
      { label: "Kesehatan Finansial", description: "Skor 0-100 dan cara menaikkannya", href: "/kesehatan-finansial", icon: HeartPulse, tone: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
      { label: "Prediksi Cashflow", description: "Perkiraan saldo 3 bulan ke depan", href: "/prediksi-cashflow", icon: LineChart, tone: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
      { label: "Transaksi Berulang", description: "Tagihan dan gaji tiap bulan", href: "/berulang", icon: Repeat, tone: "bg-lime-500/15 text-lime-700 dark:text-lime-400" },
      { label: "Pengingat", description: "Tagihan dan gajian yang dekat", href: "/pengingat", icon: BellRing, tone: "bg-red-500/15 text-red-600 dark:text-red-400" },
      { label: "Dompet Bersama", description: "Patungan dengan teman atau pasangan", href: "/bersama", icon: Users, tone: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
      { label: "Keamanan", description: "PIN, MFA, notifikasi, dan hapus akun", href: "/keamanan", icon: ShieldCheck, tone: "bg-slate-500/15 text-slate-600 dark:text-slate-400" },
      { label: "Planner Acara", description: "Rencana lamaran, nikah, dan acara: vendor, seserahan, tamu, budget", href: "/planner", icon: Heart, tone: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
      { label: "Batas Pengeluaran", description: "Batas harian, mingguan, bulanan dengan peringatan", href: "/batas-pengeluaran", icon: Gauge, tone: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
      { label: "Target Beli", description: "Hitung mampu atau belum membeli sesuatu, tunai atau cicilan", href: "/target-beli", icon: ShoppingBag, tone: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
      { label: "Ilmu Keuangan", description: "Pensiun, dana kesehatan, pendidikan anak, aturan 50/30/20, dana darurat", href: "/ilmu-keuangan", icon: GraduationCap, tone: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" },
      { label: "Konsultan Keuangan", description: "Skor kesehatan, peringatan dini, cicilan, proyeksi, utang", href: "/konsultan", icon: Gauge, tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
      { label: "Investasi", description: "Kalkulator, portofolio & info pasar", href: "/investasi", icon: TrendingUp, tone: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
      { label: "Impor Mutasi", description: "Masukkan mutasi bank dari berkas CSV", href: "/impor", icon: FileUp, tone: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
      { label: "Laporan Mingguan", description: "Ringkasan 7 hari terakhir", href: "/laporan-mingguan", icon: CalendarDays, tone: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
      { label: "THR & Zakat", description: "Bagi THR dan hitung zakat", href: "/thr-zakat", icon: Moon, tone: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" },
      { label: "Paket & Uji Coba", description: "Gratis, Premium, Pro. Coba gratis 7 hari", href: "/paket", icon: Crown, tone: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" },
    ],
  },
];

/** Path yang membuat tombol More di navbar tampil aktif. */
export const MORE_ACTIVE_PREFIXES = ["/more", "/pengaturan", "/profil", "/settings", "/transaksi", "/analisis", "/tambah", "/split-bill", "/rencana", "/bantuan", "/konsultan", "/investasi", "/impor", "/laporan-mingguan", "/thr-zakat", "/paket", "/kesehatan-finansial", "/prediksi-cashflow", "/berulang", "/pengingat", "/bersama", "/keamanan", "/planner", "/admin", "/ilmu-keuangan", "/batas-pengeluaran", "/target-beli"];
