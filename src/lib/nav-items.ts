import {
  ArrowLeftRight,
  PieChart,
  ReceiptText,
  Sparkles,
    Gauge, Scale, ShoppingBag, TrendingUp, FileUp, CalendarDays, Moon, Crown, HeartPulse, LineChart, Repeat, Users, BellRing, ShieldCheck, Heart, Wallet, LifeBuoy, Landmark, PiggyBank, Flame,
    type LucideIcon,
} from "lucide-react";

export interface MoreItem {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** kelas warna kotak ikon */
  tone: string;
  /** fitur yang seluruhnya Pro: tampil dengan lencana mahkota */
  pro?: boolean;
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
    title: "Uang harian",
    items: [
      { label: "Riwayat Transaksi", description: "Semua arus masuk & keluar uangmu", href: "/transaksi", icon: ArrowLeftRight, tone: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
      { label: "Transaksi Berulang", description: "Tagihan dan gaji tiap bulan", href: "/berulang", icon: Repeat, tone: "bg-lime-500/15 text-lime-700 dark:text-lime-400" },
      { label: "Pengingat", description: "Tagihan dan gajian yang dekat", href: "/pengingat", icon: BellRing, tone: "bg-red-500/15 text-red-600 dark:text-red-400" },
      { label: "Batas Pengeluaran", description: "Batas harian, mingguan, bulanan dengan peringatan", href: "/batas-pengeluaran", icon: Gauge, tone: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
      { label: "Impor Mutasi", description: "Masukkan mutasi bank dari berkas CSV", href: "/impor", icon: FileUp, tone: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
    ],
  },
  {
    title: "Analisis & laporan",
    items: [
      { label: "Analisis Keuangan", description: "Arus kas, kategori, anggaran & insight Ruby", href: "/analisis", icon: PieChart, tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400", pro: true },
      { label: "Kesehatan Finansial", description: "Skor 0-100 dan cara menaikkannya", href: "/kesehatan-finansial", icon: HeartPulse, tone: "bg-pink-500/15 text-pink-600 dark:text-pink-400", pro: true },
      { label: "Prediksi Cashflow", description: "Perkiraan saldo 3 bulan ke depan", href: "/prediksi-cashflow", icon: LineChart, tone: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400", pro: true },
      { label: "Laporan Mingguan", description: "Ringkasan 7 hari terakhir", href: "/laporan-mingguan", icon: CalendarDays, tone: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
    ],
  },
  {
    title: "Rencana & dana",
    items: [
      { label: "Rencana Keuangan Ruby", description: "Bagi gaji ke kebutuhan, tenggat & saran dompet", href: "/rencana", icon: Sparkles, tone: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400", pro: true },
      { label: "Cicilan & Utang", description: "Bandingkan cicilan dan atur urutan melunasi utang", href: "/cicilan-utang", icon: Scale, tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", pro: true },
      { label: "Target Beli", description: "Hitung mampu atau belum membeli sesuatu", href: "/target-beli", icon: ShoppingBag, tone: "bg-purple-500/15 text-purple-600 dark:text-purple-400", pro: true },
      { label: "Money planner", description: "Bagi pemasukan jadi pos-pos", href: "/money-planner", icon: Wallet, tone: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400", pro: true },
      { label: "Dana daruratku", description: "Berapa cadangan yang cukup", href: "/dana-daruratku", icon: LifeBuoy, tone: "bg-red-500/15 text-red-600 dark:text-red-400", pro: true },
      { label: "Dana pensiunku", description: "Berapa yang perlu disisihkan", href: "/dana-pensiunku", icon: Landmark, tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400", pro: true },
      { label: "Dana lain", description: "Kesehatan, pendidikan, rumah, dan lainnya", href: "/dana-lain", icon: PiggyBank, tone: "bg-teal-500/15 text-teal-600 dark:text-teal-400", pro: true },
      { label: "Financial Freedom", description: "Dana untuk hidup dari hasil investasi", href: "/financial-freedom", icon: Flame, tone: "bg-orange-500/15 text-orange-600 dark:text-orange-400", pro: true },
    ],
  },
  {
    title: "Bersama & acara",
    items: [
      { label: "Split Bill", description: "Bagi tagihan adil, termasuk ongkir & pajak", href: "/split-bill", icon: ReceiptText, tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
      { label: "Dompet Bersama", description: "Patungan dengan teman atau pasangan", href: "/bersama", icon: Users, tone: "bg-blue-500/15 text-blue-600 dark:text-blue-400", pro: true },
      { label: "Planner Acara", description: "Lamaran, nikah, dan acara: vendor, tamu, budget", href: "/planner", icon: Heart, tone: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
      { label: "THR & Zakat", description: "Bagi THR dan hitung zakat", href: "/thr-zakat", icon: Moon, tone: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" },
    ],
  },
  {
    title: "Investasi & akun",
    items: [
      { label: "Investasi", description: "Kalkulator, portofolio & info pasar", href: "/investasi", icon: TrendingUp, tone: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
      { label: "Keamanan", description: "PIN, MFA, notifikasi, dan hapus akun", href: "/keamanan", icon: ShieldCheck, tone: "bg-slate-500/15 text-slate-600 dark:text-slate-400" },
      { label: "Paket & Uji Coba", description: "Gratis atau Pro. Coba Pro gratis 7 hari", href: "/paket", icon: Crown, tone: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" },
    ],
  },
];

/** Path yang membuat tombol More di navbar tampil aktif. */
export const MORE_ACTIVE_PREFIXES = ["/more", "/pengaturan", "/profil", "/settings", "/transaksi", "/analisis", "/tambah", "/split-bill", "/rencana", "/bantuan", "/konsultan", "/cicilan-utang", "/investasi", "/impor", "/laporan-mingguan", "/thr-zakat", "/paket", "/kesehatan-finansial", "/prediksi-cashflow", "/berulang", "/pengingat", "/bersama", "/keamanan", "/planner", "/admin", "/ilmu-keuangan", "/money-planner", "/dana-daruratku", "/dana-pensiunku", "/dana-lain", "/financial-freedom", "/batas-pengeluaran", "/target-beli"];
