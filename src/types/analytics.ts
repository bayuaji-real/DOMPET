export type AnalyticsPeriod = "week" | "month" | "last_month" | "3months" | "custom";

export interface AnalyticsSummary {
  totalIncome: number;
  totalExpense: number;
  cashflow: number;
  savingsAmount: number;
  savingsRate: number; // Persentase menabung dari pemasukan
  incomeChangePct: number; // Kenaikan/penurunan dibanding periode sebelumnya (%)
  expenseChangePct: number; // Kenaikan/penurunan dibanding periode sebelumnya (%)
}

export interface CategoryExpense {
  id: string;
  name: string;
  color: string;
  icon?: string;
  nominal: number;
  percentage: number;
}

export interface MonthlyCashflow {
  monthKey: string; // "2026-06"
  label: string; // "Jun", "Jul", dst.
  income: number;
  expense: number;
}

export interface DailyExpense {
  date: string; // "2026-11-01"
  day: string; // "01"
  amount: number;
}

export interface WalletExpense {
  walletId: string;
  name: string;
  color: string;
  icon?: string;
  nominal: number;
  percentage: number;
}

export interface TopTransaction {
  id: string;
  judul: string;
  merchant?: string;
  nominal: number;
  tanggal: string;
  kategori: string;
  dompet: string;
}

export interface TopMerchant {
  merchant: string;
  visitCount: number;
  totalSpent: number;
}

/** "belum" = belum cukup data untuk dinilai (mis. belum ada transaksi pada periode ini). */
export type HealthStatus = "sehat" | "waspada" | "kritis" | "belum";

export interface FinancialHealth {
  overallStatus: HealthStatus;
  savingsRate: number;
  savingsRateStatus: HealthStatus;
  emergencyFundBalance: number;
  emergencyFundMonths: number;
  emergencyStatus: HealthStatus;
  goalsOnTrack: boolean;
}

export interface AnalyticsData {
  period: {
    type: AnalyticsPeriod;
    label: string;
    startDate: string;
    endDate: string;
    daysCount: number;
  };
  summary: AnalyticsSummary;
  categories: CategoryExpense[];
  monthlyCashflow: MonthlyCashflow[];
  dailyExpenses: DailyExpense[];
  dailyAverage: number;
  wallets: WalletExpense[];
  topTransactions: TopTransaction[];
  topMerchants: TopMerchant[];
  financialHealth: FinancialHealth;
}

export interface AIInsightResult {
  periodKey: string;
  insights: string[];
  actionableTip: string;
  generatedAt: string;
  cached?: boolean;
}
