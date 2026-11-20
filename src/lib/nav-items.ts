import {
  ArrowLeftRight,
  Home,
  PieChart,
  PiggyBank,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** true = hanya aktif jika path persis sama (untuk Beranda) */
  exact?: boolean;
  /** path tambahan yang juga menandai item ini aktif */
  alsoActiveOn?: string[];
}

/**
 * Daftar menu di side bar. Mau tambah fitur baru? Cukup tambah satu baris di sini.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Beranda", href: "/", icon: Home, exact: true },
  { label: "Transaksi", href: "/transaksi", icon: ArrowLeftRight },
  { label: "Dompet", href: "/dompet", icon: Wallet },
  { label: "Tabungan", href: "/tabungan", icon: PiggyBank },
  { label: "Analisis", href: "/analisis", icon: PieChart },
  { label: "Pengaturan", href: "/pengaturan", icon: Settings, alsoActiveOn: ["/profil", "/settings"] },
];

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return [item.href, ...(item.alsoActiveOn ?? [])].some((p) => pathname.startsWith(p));
}
