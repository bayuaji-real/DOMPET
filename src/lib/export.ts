import type { Transaction } from "@/lib/data/transactions";
import type { WalletBalance } from "@/lib/data/wallets";
import type { GoalProgress } from "@/lib/data/goals";
import type { Category } from "@/lib/data/categories";

/**
 * Format transaksi ke string CSV ramah Excel / Google Sheets
 * Menggunakan UTF-8 BOM (\uFEFF) agar simbol dan karakter terbuka sempurna di Excel
 */
export function generateTransactionsCSV(transactions: any[]): string {
  const headers = [
    "ID",
    "Tanggal",
    "Tipe",
    "Nominal (Rp)",
    "Kategori",
    "Dompet Sumber",
    "Dompet Tujuan",
    "Catatan",
    "Toko / Merchant",
    "Sumber Input",
  ];

  const escapeCSV = (str: any) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = transactions.map((t) => [
    escapeCSV(t.id),
    escapeCSV(t.date ? t.date.split("T")[0] : ""),
    escapeCSV(
      t.type === "expense"
        ? "Pengeluaran"
        : t.type === "income"
          ? "Pemasukan"
          : t.type === "transfer"
            ? "Transfer"
            : t.type === "goal_deposit"
              ? "Setor Tabungan"
              : "Tarik Tabungan"
    ),
    escapeCSV(Math.round(Number(t.amount || 0))),
    escapeCSV(t.category || t.category_id || "-"),
    escapeCSV(t.wallet || t.wallet_id || "-"),
    escapeCSV(t.to_wallet || t.to_wallet_id || "-"),
    escapeCSV(t.note || ""),
    escapeCSV(t.merchant || ""),
    escapeCSV(t.source || "manual"),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  return "\uFEFF" + csvContent;
}

export interface BackupDataPayload {
  exportedAt: string;
  version: string;
  appName: string;
  wallets: any[];
  categories: any[];
  transactions: any[];
  savings_goals: any[];
  budgets?: any[];
  recurring_transactions?: any[];
  payday_schedule?: any[];
  user_settings?: any;
}

/**
 * Format seluruh data aplikasi ke string JSON backup terstruktur
 */
export function generateBackupJSON(data: BackupDataPayload): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Memicu download file di browser
 */
export function triggerBrowserDownload(content: string, filename: string, mimeType: string) {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
