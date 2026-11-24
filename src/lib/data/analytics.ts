import { createClient as createBrowserSupabase } from "../supabase/client";

/**
 * Analitik dijalankan di server (route /api/analytics & halaman /analisis).
 * Pakai klien server yang membaca cookie login, supaya RLS mengenali pengguna.
 * (Klien browser di server tidak membawa sesi → semua query kembali kosong.)
 * Di luar request (mis. unit test) cookies() melempar error, jadi jatuh ke klien biasa.
 */
async function getSupabase() {
  try {
    const { createClient } = await import("../supabase/server");
    return await createClient();
  } catch {
    return createBrowserSupabase();
  }
}
import type {
  AnalyticsPeriod,
  AnalyticsData,
  AnalyticsSummary,
  CategoryExpense,
  MonthlyCashflow,
  DailyExpense,
  WalletExpense,
  TopTransaction,
  TopMerchant,
  FinancialHealth,
  HealthStatus,
} from "../../types/analytics";
import { USE_SAMPLE_DATA, todayJakarta } from "./sample-mode";

function withTimeout<T>(p: PromiseLike<T>, ms = 1500): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("DB timeout")), ms)),
  ]);
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
/** Label bulan dari database berbahasa Inggris (Aug, Oct, Dec, May): ubah ke bahasa Indonesia. */
const ID_MONTH: Record<string, string> = { May: "Mei", Aug: "Agt", Oct: "Okt", Dec: "Des" };
const idMonthLabel = (l: unknown) => {
  const s = String(l ?? "");
  const [first, ...rest] = s.split(" ");
  const mapped = ID_MONTH[first];
  return mapped ? [mapped, ...rest].join(" ") : s;
};

// Dataset sampel 2 bulan realistis (Oktober & November 2026) sebagai baseline fallback
const SAMPLE_TRANSACTIONS = [
  // OKTOBER 2026
  {
    id: "s-1",
    date: "2026-10-01",
    amount: 8500000,
    type: "income",
    wallet: "BCA Utama",
    category: "Gaji / Pemasukan",
    merchant: "PT Solusi Digital",
    note: "Gaji Bulanan Oktober",
  },
  {
    id: "s-2",
    date: "2026-10-02",
    amount: 1500000,
    type: "goal_deposit",
    wallet: "BCA Utama",
    category: null,
    merchant: null,
    note: "Setor Rutin Dana Darurat",
  },
  {
    id: "s-3",
    date: "2026-10-02",
    amount: 500000,
    type: "goal_deposit",
    wallet: "BCA Utama",
    category: null,
    merchant: null,
    note: "Setor Target Lamaran",
  },
  {
    id: "s-4",
    date: "2026-10-05",
    amount: 450000,
    type: "expense",
    wallet: "BCA Utama",
    category: "Tagihan",
    merchant: "PLN Pascabayar",
    note: "Listrik Rumah Oktober",
  },
  {
    id: "s-5",
    date: "2026-10-06",
    amount: 320000,
    type: "expense",
    wallet: "BCA Utama",
    category: "Tagihan",
    merchant: "Indihome",
    note: "Paket Internet & TV",
  },
  {
    id: "s-6",
    date: "2026-10-08",
    amount: 250000,
    type: "expense",
    wallet: "GoPay",
    category: "Belanja Harian",
    merchant: "Superindo",
    note: "Belanja Dapur Mingguan",
  },
  {
    id: "s-7",
    date: "2026-10-10",
    amount: 72000,
    type: "expense",
    wallet: "GoPay",
    category: "Makanan & Minuman",
    merchant: "Kopi Kenangan",
    note: "Kopi & Roti",
  },
  {
    id: "s-8",
    date: "2026-10-12",
    amount: 50000,
    type: "expense",
    wallet: "Uang Tunai",
    category: "Transportasi",
    merchant: "SPBU Pertamina",
    note: "Bensin Pertamax",
  },
  {
    id: "s-9",
    date: "2026-10-14",
    amount: 115000,
    type: "expense",
    wallet: "GoPay",
    category: "Belanja Harian",
    merchant: "Indomaret",
    note: "Kebutuhan Kamar Mandi",
  },
  {
    id: "s-10",
    date: "2026-10-15",
    amount: 1500000,
    type: "income",
    wallet: "Bank Mandiri",
    category: "Gaji / Pemasukan",
    merchant: "Klien Lepas",
    note: "Bonus UI/UX Web",
  },
  {
    id: "s-11",
    date: "2026-10-18",
    amount: 85000,
    type: "expense",
    wallet: "GoPay",
    category: "Hiburan",
    merchant: "Cinema XXI",
    note: "Nonton Bioskop Akhir Pekan",
  },
  {
    id: "s-12",
    date: "2026-10-22",
    amount: 48000,
    type: "expense",
    wallet: "Uang Tunai",
    category: "Makanan & Minuman",
    merchant: "Mie Gacoan",
    note: "Makan Malam Santai",
  },
  {
    id: "s-13",
    date: "2026-10-25",
    amount: 82500,
    type: "expense",
    wallet: "GoPay",
    category: "Makanan & Minuman",
    merchant: "Indomaret Point",
    note: "Kopi & Roti",
  },

  // NOVEMBER 2026 (Bulan Berjalan)
  {
    id: "s-14",
    date: "2026-11-01",
    amount: 8500000,
    type: "income",
    wallet: "BCA Utama",
    category: "Gaji / Pemasukan",
    merchant: "PT Solusi Digital",
    note: "Gaji Bulanan November",
  },
  {
    id: "s-15",
    date: "2026-11-02",
    amount: 1500000,
    type: "goal_deposit",
    wallet: "BCA Utama",
    category: null,
    merchant: null,
    note: "Setor Rutin Dana Darurat",
  },
  {
    id: "s-16",
    date: "2026-11-02",
    amount: 600000,
    type: "goal_deposit",
    wallet: "BCA Utama",
    category: null,
    merchant: null,
    note: "Setor Target Lamaran",
  },
  {
    id: "s-17",
    date: "2026-11-03",
    amount: 300000,
    type: "transfer",
    wallet: "BCA Utama",
    category: null,
    merchant: null,
    note: "Topup Saldo GoPay",
  },
  {
    id: "s-18",
    date: "2026-11-03",
    amount: 45000,
    type: "expense",
    wallet: "Uang Tunai",
    category: "Makanan & Minuman",
    merchant: "Bakso Pak Kumis",
    note: "Makan Bakso Siang",
  },
  {
    id: "s-19",
    date: "2026-11-05",
    amount: 465000,
    type: "expense",
    wallet: "BCA Utama",
    category: "Tagihan",
    merchant: "PLN Pascabayar",
    note: "Listrik Rumah November",
  },
  {
    id: "s-20",
    date: "2026-11-06",
    amount: 320000,
    type: "expense",
    wallet: "BCA Utama",
    category: "Tagihan",
    merchant: "Indihome",
    note: "Paket Internet & TV",
  },
  {
    id: "s-21",
    date: "2026-11-07",
    amount: 71000,
    type: "expense",
    wallet: "Uang Tunai",
    category: "Makanan & Minuman",
    merchant: "Kopi Kenangan",
    note: "Kopi Kenangan Mantan",
  },
  {
    id: "s-22",
    date: "2026-11-09",
    amount: 50000,
    type: "expense",
    wallet: "Uang Tunai",
    category: "Transportasi",
    merchant: "SPBU Pertamina",
    note: "Bensin Motor",
  },
  {
    id: "s-23",
    date: "2026-11-10",
    amount: 2500000,
    type: "income",
    wallet: "BCA Utama",
    category: "Gaji / Pemasukan",
    merchant: "Klien Lepas",
    note: "Gajian Masuk Freelance",
  },
  {
    id: "s-24",
    date: "2026-11-12",
    amount: 82500,
    type: "expense",
    wallet: "GoPay",
    category: "Makanan & Minuman",
    merchant: "Indomaret Point",
    note: "Kopi & Roti Sarapan",
  },
  {
    id: "s-25",
    date: "2026-11-14",
    amount: 340000,
    type: "expense",
    wallet: "BCA Utama",
    category: "Belanja Harian",
    merchant: "Superindo",
    note: "Belanja Dapur & Daging",
  },
  {
    id: "s-26",
    date: "2026-11-16",
    amount: 35000,
    type: "expense",
    wallet: "GoPay",
    category: "Makanan & Minuman",
    merchant: "Warung Padang Sederhana",
    note: "Nasi Rendang Siang",
  },
  {
    id: "s-27",
    date: "2026-11-18",
    amount: 22000,
    type: "expense",
    wallet: "GoPay",
    category: "Transportasi",
    merchant: "GoJek",
    note: "GoRide ke Stasiun",
  },
  {
    id: "s-28",
    date: "2026-11-19",
    amount: 125000,
    type: "expense",
    wallet: "GoPay",
    category: "Belanja Harian",
    merchant: "Indomaret",
    note: "Susu UHT & Sabun",
  },
  {
    id: "s-29",
    date: "2026-11-20",
    amount: 25000,
    type: "expense",
    wallet: "Uang Tunai",
    category: "Makanan & Minuman",
    merchant: "Sate Ayam Madura",
    note: "Makan Sate Ayam 10 Tusuk",
  },
];

export interface GetAnalyticsOptions {
  period?: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
}

/**
 * Hitung rentang tanggal berdasarkan tipe periode
 */
export function resolveDateRange(
  period: AnalyticsPeriod,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string; label: string; daysCount: number } {
  // Hari ini menurut WIB. Diparse sebagai jam 12 waktu lokal supaya getDate()/getMonth() tetap tanggal yang sama
  // baik di server (UTC) maupun di HP (WIB).
  const now = new Date(`${todayJakarta()}T12:00:00`);
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === "custom" && customStart && customEnd) {
    const s = new Date(customStart);
    const e = new Date(customEnd);
    const days = Math.max(
      1,
      Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    return {
      startDate: customStart,
      endDate: customEnd,
      label: `Kustom (${customStart} s/d ${customEnd})`,
      daysCount: days,
    };
  }

  if (period === "week") {
    // Senin s/d Minggu minggu ini
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=Senin, 6=Minggu
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      startDate: formatDate(monday),
      endDate: formatDate(sunday),
      label: "Minggu Ini",
      daysCount: 7,
    };
  }

  if (period === "last_month") {
    // Bulan lalu: Oktober 2026
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      startDate: formatDate(firstDay),
      endDate: formatDate(lastDay),
      label: "Bulan Lalu (Okt 2026)",
      daysCount: lastDay.getDate(),
    };
  }

  if (period === "3months") {
    // 3 bulan terakhir: 1 Sept 2026 s/d 30 Nov 2026
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const days = Math.round(
      (lastDay.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      startDate: formatDate(firstDay),
      endDate: formatDate(lastDay),
      label: "3 Bulan Terakhir",
      daysCount: days,
    };
  }

  // Default: Bulan Ini
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: formatDate(firstDay),
    endDate: formatDate(lastDay),
    label: `Bulan Ini (${MONTH_SHORT[now.getMonth()]} ${now.getFullYear()})`,
    daysCount: lastDay.getDate(),
  };
}

/**
 * Kerangka data kosong untuk membuka halaman Analisis seketika.
 * Data asli diambil layar lewat /api/analytics (supaya tidak dihitung dua kali).
 */
export function emptyAnalyticsData(period: AnalyticsPeriod = "month"): AnalyticsData {
  const { startDate, endDate, label, daysCount } = resolveDateRange(period);
  return applyNoDataStatus({
    period: { type: period, label, startDate, endDate, daysCount },
    summary: { totalIncome: 0, totalExpense: 0, cashflow: 0, savingsAmount: 0, savingsRate: 0, incomeChangePct: 0, expenseChangePct: 0 },
    categories: [],
    monthlyCashflow: [],
    dailyExpenses: [],
    dailyAverage: 0,
    wallets: [],
    topTransactions: [],
    topMerchants: [],
    financialHealth: {
      overallStatus: "belum",
      savingsRate: 0,
      savingsRateStatus: "belum",
      emergencyFundBalance: 0,
      emergencyFundMonths: 0,
      emergencyStatus: "belum",
      goalsOnTrack: true,
    },
  });
}

/**
 * Mengambil data analisis agregasi finansial.
 * Mengutamakan SQL function RPC `get_financial_analytics` di database Supabase.
 * Menyediakan fallback agregasi server-side jika RPC belum dijalankan di Supabase Dashboard.
 */
/**
 * Jangan cap "Kritis" kalau datanya memang belum ada.
 * - Tanpa pemasukan & pengeluaran pada periode ini => rasio menabung "belum".
 * - Status keseluruhan dihitung hanya dari indikator yang sudah punya data.
 */
export function applyNoDataStatus<T extends { summary: { totalIncome: number; totalExpense: number }; financialHealth: FinancialHealth }>(data: T): T {
  const fh = { ...data.financialHealth };
  const noActivity = data.summary.totalIncome === 0 && data.summary.totalExpense === 0;
  if (noActivity) fh.savingsRateStatus = "belum";
  const known = [fh.savingsRateStatus, fh.emergencyStatus].filter((x) => x !== "belum");
  if (noActivity || known.length === 0) fh.overallStatus = "belum";
  else if (known.includes("kritis")) fh.overallStatus = "kritis";
  else if (known.every((x) => x === "sehat")) fh.overallStatus = "sehat";
  else fh.overallStatus = "waspada";
  return { ...data, financialHealth: fh };
}

export async function getAnalyticsData(
  options: GetAnalyticsOptions = {}
): Promise<AnalyticsData> {
  const period = options.period || "month";
  const { startDate, endDate, label, daysCount } = resolveDateRange(
    period,
    options.startDate,
    options.endDate
  );

  const supabase = await getSupabase();

  // 1. Coba panggil RPC PostgreSQL Supabase `get_financial_analytics` dengan batas waktu 1.5 detik
  try {
    const rpcPromise = (supabase.rpc as any)("get_financial_analytics", {
      p_start_date: startDate,
      p_end_date: endDate,
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("RPC timeout")), 1500)
    );
    const { data: rpcData, error: rpcError } = (await Promise.race([
      rpcPromise,
      timeoutPromise,
    ])) as any;

    if (!rpcError && rpcData && rpcData.summary) {
      return applyNoDataStatus({
        period: {
          type: period,
          label,
          startDate,
          endDate,
          daysCount,
        },
        summary: {
          totalIncome: Number(rpcData.summary.total_income || 0),
          totalExpense: Number(rpcData.summary.total_expense || 0),
          cashflow: Number(rpcData.summary.cashflow || 0),
          savingsAmount: Number(rpcData.summary.savings_deposited || 0),
          savingsRate: Number(rpcData.summary.savings_rate || 0),
          incomeChangePct: Number(rpcData.summary.income_change_pct || 0),
          expenseChangePct: Number(rpcData.summary.expense_change_pct || 0),
        },
        categories: (rpcData.categories || []).map((c: any) => ({
          id: c.category_id,
          name: c.name,
          color: c.color,
          icon: c.icon,
          nominal: Number(c.nominal || 0),
          percentage: Number(c.percentage || 0),
        })),
        monthlyCashflow: (rpcData.monthly_cashflow || []).map((m: any) => ({
          monthKey: m.month_key,
          label: idMonthLabel(m.label),
          income: Number(m.income || 0),
          expense: Number(m.expense || 0),
        })),
        dailyExpenses: (rpcData.daily_expenses || []).map((d: any) => ({
          date: d.date,
          day: d.day,
          amount: Number(d.amount || 0),
        })),
        dailyAverage: Number(rpcData.daily_average || 0),
        wallets: (rpcData.wallets || []).map((w: any) => ({
          walletId: w.wallet_id,
          name: w.name,
          color: w.color,
          icon: w.icon,
          nominal: Number(w.nominal || 0),
          percentage: Number(w.percentage || 0),
        })),
        topTransactions: (rpcData.top_transactions || []).map((t: any) => ({
          id: t.id,
          judul: t.judul,
          merchant: t.merchant,
          nominal: Number(t.nominal || 0),
          tanggal: t.tanggal,
          kategori: t.kategori,
          dompet: t.dompet,
        })),
        topMerchants: (rpcData.top_merchants || []).map((m: any) => ({
          merchant: m.merchant,
          visitCount: Number(m.visit_count || 0),
          totalSpent: Number(m.total_spent || 0),
        })),
        financialHealth: {
          overallStatus: rpcData.financial_health.overall_status || "sehat",
          savingsRate: Number(rpcData.financial_health.savings_rate || 0),
          savingsRateStatus: rpcData.financial_health.savings_rate_status || "sehat",
          emergencyFundBalance: Number(rpcData.financial_health.emergency_fund_balance || 0),
          emergencyFundMonths: Number(rpcData.financial_health.emergency_fund_months || 0),
          emergencyStatus: rpcData.financial_health.emergency_status || "sehat",
          goalsOnTrack: Boolean(rpcData.financial_health.goals_on_track ?? true),
        },
      });
    }
  } catch (err) {
    // Supabase RPC belum dibuat di dashboard atau offline -> fallback otomatis
  }

  // 2. Fallback: Agregasi di Server / Database Client
  return applyNoDataStatus(await calculateAnalyticsFallback(period, startDate, endDate, label, daysCount));
}

/**
 * Kalkulasi agregasi mandiri jika RPC belum di-apply di Supabase
 */
async function calculateAnalyticsFallback(
  period: AnalyticsPeriod,
  startDate: string,
  endDate: string,
  label: string,
  daysCount: number
): Promise<AnalyticsData> {
  const supabase = await getSupabase();

  // Hitung durasi periode sebelumnya
  const sDate = new Date(startDate);
  const eDate = new Date(endDate);
  const durationMs = eDate.getTime() - sDate.getTime();
  const prevEnd = new Date(sDate.getTime() - 24 * 60 * 60 * 1000);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const prevStartStr = formatDate(prevStart);
  const prevEndStr = formatDate(prevEnd);

  // Ambil data transaksi dari Supabase jika ada dengan batas waktu 1.5 detik
  let dbTransactions: any[] = [];
  try {
    const dbPromise = supabase
      .from("transactions")
      .select("*, categories(name, color), wallets(name, color, icon)")
      .order("date", { ascending: false });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("DB timeout")), 1500)
    );
    const { data } = (await Promise.race([dbPromise, timeoutPromise])) as any;

    if (data && data.length > 0) {
      dbTransactions = data.map((t: any) => ({
        id: t.id,
        date: t.date ? t.date.split("T")[0] : startDate,
        amount: Number(t.amount || 0),
        type: t.type,
        wallet: t.wallets?.name || "Uang Tunai",
        walletId: t.wallet_id,
        category: t.categories?.name || "Lainnya",
        categoryId: t.category_id,
        categoryColor: t.categories?.color || "#0d9488",
        merchant: t.merchant || null,
        note: t.note || "Transaksi",
      }));
    }
  } catch (err) {
    // Fallback ke dataset sampel
  }

  // Jika transaksi di Supabase masih kosong atau sedikit, gabungkan dataset sampel realistis
  const allTransactions =
    !USE_SAMPLE_DATA || dbTransactions.length > 5
      ? dbTransactions
      : [...dbTransactions, ...SAMPLE_TRANSACTIONS];

  // Filter transaksi periode aktif
  const currentTxs = allTransactions.filter(
    (t) => t.date >= startDate && t.date <= endDate
  );

  // Filter transaksi periode sebelumnya
  const prevTxs = allTransactions.filter(
    (t) => t.date >= prevStartStr && t.date <= prevEndStr
  );

  // 1. Ringkasan: transfer & goal_deposit/withdraw BUKAN pengeluaran/pemasukan
  const totalIncome = currentTxs
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = currentTxs
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const savingsDeposited = currentTxs
    .filter((t) => t.type === "goal_deposit")
    .reduce((sum, t) => sum + t.amount, 0);

  const cashflow = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? Math.round((savingsDeposited / totalIncome) * 1000) / 10 : 0;

  // Ringkasan Periode Sebelumnya
  const prevIncome = prevTxs
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const prevExpense = prevTxs
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const incomeChangePct =
    prevIncome > 0
      ? Math.round(((totalIncome - prevIncome) / prevIncome) * 1000) / 10
      : 0;

  const expenseChangePct =
    prevExpense > 0
      ? Math.round(((totalExpense - prevExpense) / prevExpense) * 1000) / 10
      : 0;

  const summary: AnalyticsSummary = {
    totalIncome,
    totalExpense,
    cashflow,
    savingsAmount: savingsDeposited,
    savingsRate,
    incomeChangePct,
    expenseChangePct,
  };

  // 2. Kategori Pengeluaran (Donut Chart)
  const categoryMap = new Map<string, { nominal: number; color: string }>();
  const categoryPalette = [
    "#0d9488", // teal-600
    "#0284c7", // sky-600
    "#6366f1", // indigo-500
    "#ec4899", // pink-500
    "#f59e0b", // amber-500
    "#8b5cf6", // violet-500
    "#10b981", // emerald-500
    "#64748b", // slate-500
  ];

  currentTxs
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const catName = t.category || "Lainnya";
      const existing = categoryMap.get(catName);
      if (existing) {
        existing.nominal += t.amount;
      } else {
        const idx = categoryMap.size % categoryPalette.length;
        categoryMap.set(catName, {
          nominal: t.amount,
          color: t.categoryColor || categoryPalette[idx],
        });
      }
    });

  const categories: CategoryExpense[] = Array.from(categoryMap.entries())
    .map(([name, val], idx) => ({
      id: `cat-${idx}`,
      name,
      color: val.color,
      nominal: val.nominal,
      percentage:
        totalExpense > 0
          ? Math.round((val.nominal / totalExpense) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.nominal - a.nominal);

  // 3. Bar Chart Pemasukan vs Pengeluaran 6 Bulan Terakhir (murni dari transaksi asli)
  const monthlyCashflow: MonthlyCashflow[] = [];
  const [todayY, todayM] = todayJakarta().split("-").map(Number);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(todayY, todayM - 1 - i, 1));
    const monthNum = d.getUTCMonth() + 1;
    const mStr = `${d.getUTCFullYear()}-${pad(monthNum)}`;
    const inMonth = allTransactions.filter((t) => t.date.startsWith(mStr));
    const inc = inMonth
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const exp = inMonth
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    monthlyCashflow.push({
      monthKey: mStr,
      label: MONTH_SHORT[monthNum - 1],
      income: inc,
      expense: exp,
    });
  }

  // 4. Grafik Pengeluaran Harian & Rata-rata per Hari
  const dayMap = new Map<string, number>();
  // Inisialisasi setiap hari dalam rentang periode
  const curDay = new Date(startDate);
  const endDay = new Date(endDate);
  while (curDay <= endDay) {
    dayMap.set(formatDate(curDay), 0);
    curDay.setDate(curDay.getDate() + 1);
  }

  currentTxs
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      if (dayMap.has(t.date)) {
        dayMap.set(t.date, (dayMap.get(t.date) || 0) + t.amount);
      }
    });

  const dailyExpenses: DailyExpense[] = Array.from(dayMap.entries()).map(
    ([date, amount]) => ({
      date,
      day: date.split("-")[2],
      amount,
    })
  );

  const validDays = Math.max(1, dailyExpenses.length);
  const dailyAverage = Math.round(totalExpense / validDays);

  // 5. Pengeluaran per Dompet
  const walletMap = new Map<string, { nominal: number; color: string; icon?: string }>();
  currentTxs
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const wName = t.wallet || "Uang Tunai";
      const existing = walletMap.get(wName);
      if (existing) {
        existing.nominal += t.amount;
      } else {
        walletMap.set(wName, {
          nominal: t.amount,
          color: /bca/i.test(wName)
            ? "#005EB8"
            : /gopay/i.test(wName)
              ? "#00AED6"
              : /mandiri/i.test(wName)
                ? "#003D79"
                : "#16a34a",
          icon: /bca/i.test(wName)
            ? "landmark"
            : /gopay/i.test(wName)
              ? "smartphone"
              : "banknote",
        });
      }
    });

  const wallets: WalletExpense[] = Array.from(walletMap.entries())
    .map(([name, val], idx) => ({
      walletId: `w-${idx}`,
      name,
      color: val.color,
      icon: val.icon,
      nominal: val.nominal,
      percentage:
        totalExpense > 0
          ? Math.round((val.nominal / totalExpense) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.nominal - a.nominal);

  // 6. Top 5 Transaksi Terbesar
  const topTransactions: TopTransaction[] = currentTxs
    .filter((t) => t.type === "expense")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((t, idx) => ({
      id: t.id || `top-${idx}`,
      judul: t.note || t.merchant || "Pengeluaran",
      merchant: t.merchant || undefined,
      nominal: t.amount,
      tanggal: t.date,
      kategori: t.category || "Lainnya",
      dompet: t.wallet || "Dompet",
    }));

  // Top 5 Toko Paling Sering
  const merchantMap = new Map<string, { count: number; total: number }>();
  currentTxs
    .filter((t) => t.type === "expense" && t.merchant)
    .forEach((t) => {
      const m = t.merchant.trim();
      const existing = merchantMap.get(m);
      if (existing) {
        existing.count += 1;
        existing.total += t.amount;
      } else {
        merchantMap.set(m, { count: 1, total: t.amount });
      }
    });

  const topMerchants: TopMerchant[] = Array.from(merchantMap.entries())
    .map(([merchant, val]) => ({
      merchant,
      visitCount: val.count,
      totalSpent: val.total,
    }))
    .sort((a, b) => b.visitCount - a.visitCount || b.totalSpent - a.totalSpent)
    .slice(0, 5);

  // 7. Kesehatan Finansial
  // - Rasio Menabung: >20% sehat, 10–20% waspada, <10% kritis
  let savingsRateStatus: HealthStatus = "kritis";
  if (savingsRate >= 20) {
    savingsRateStatus = "sehat";
  } else if (savingsRate >= 10) {
    savingsRateStatus = "waspada";
  }

  // - Dana Darurat: saldo target bertanda "dana darurat" dibagi biaya hidup bulanan (dari Pengaturan).
  //   Belum punya dana darurat => saldo 0 => status kritis (jujur, bukan angka contoh).
  let emergencyFundBalance = 0;
  let monthlyLiving = 0;
  let goalsOnTrack = true;
  try {
    const todayStr = todayJakarta();
    const [goalsRes, settingsRes] = await withTimeout(
      Promise.all([
        supabase
          .from("goal_progress")
          .select("saved,target_amount,deadline,is_emergency_fund,status"),
        supabase.from("user_settings").select("living_cost_per_payday").maybeSingle(),
      ])
    );
    const goalRows = goalsRes.data ?? [];
    emergencyFundBalance = goalRows
      .filter((g) => g.is_emergency_fund && g.status !== "dibatalkan")
      .reduce((sum, g) => sum + Number(g.saved ?? 0), 0);
    // Gajian tiap 2 minggu => ±26 kali setahun
    monthlyLiving = Math.round((Number(settingsRes.data?.living_cost_per_payday ?? 0) * 26) / 12);
    goalsOnTrack = !goalRows.some(
      (g) =>
        g.status === "aktif" &&
        g.deadline &&
        g.deadline < todayStr &&
        Number(g.saved ?? 0) < Number(g.target_amount ?? 0)
    );
  } catch {
    // Biarkan nilai bawaan jika database tidak terjangkau
  }
  const emergencyFundMonths =
    monthlyLiving > 0 ? Math.round((emergencyFundBalance / monthlyLiving) * 10) / 10 : 0;
  let emergencyStatus: HealthStatus = "kritis";
  if (monthlyLiving === 0 && emergencyFundBalance === 0) {
    // Biaya hidup belum diisi di Pengaturan dan belum ada dana darurat: belum bisa dinilai
    emergencyStatus = "belum";
  } else if (emergencyFundMonths >= 3) {
    emergencyStatus = "sehat";
  } else if (emergencyFundMonths >= 1) {
    emergencyStatus = "waspada";
  }

  // - Overall status
  let overallStatus: HealthStatus = "sehat";
  if (savingsRateStatus === "sehat" && emergencyStatus === "sehat") {
    overallStatus = "sehat";
  } else if (savingsRateStatus === "kritis" || emergencyStatus === "kritis") {
    overallStatus = "kritis";
  } else {
    overallStatus = "waspada";
  }

  const financialHealth: FinancialHealth = {
    overallStatus,
    savingsRate,
    savingsRateStatus,
    emergencyFundBalance,
    emergencyFundMonths,
    emergencyStatus,
    goalsOnTrack,
  };

  return {
    period: {
      type: period,
      label,
      startDate,
      endDate,
      daysCount,
    },
    summary,
    categories,
    monthlyCashflow,
    dailyExpenses,
    dailyAverage,
    wallets,
    topTransactions,
    topMerchants,
    financialHealth,
  };
}
