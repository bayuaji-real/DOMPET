/**
 * Ringkasan keuangan pengguna untuk konteks AI. Dihitung di SERVER dari database (bukan dari browser),
 * dan hanya berisi angka ringkas, bukan daftar transaksi mentah (hemat token dan lebih aman).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { addMonths } from "@/lib/savings-feasibility";
import { billsMonthlyFromRules, paydayInfoFromRows } from "@/lib/savings-queue";
import { allocationToText, buildAllocation, type AllocationInput } from "@/lib/ai/allocation";
import { buildRoadmap, roadmapToText } from "@/lib/ai/roadmap";

export interface FinanceSummary {
  today: string;
  /** Rata-rata 3 bulan penuh terakhir (atau yang tersedia). */
  avgMonthlyIncome: number;
  avgMonthlyExpense: number;
  monthsOfData: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  totalBalance: number;
  savingsBalance: number;
  topCategories: { name: string; amount: number }[];
  goals: { name: string; target: number; saved: number; deadline: string | null; monthly: number }[];
  /** Total setoran bulanan semua tabungan aktif (asumsi 1 gajian per bulan). */
  otherMonthlyCommitments: number;
  nextPayday: string | null;
  /** Gaji yang diharapkan pada gajian berikutnya (0 bila belum diatur) dan berapa kali gajian per bulan. */
  nextPaydayAmount: number;
  paydaysPerMonth: number;
  /**
   * Cara hitung ala Money Planner (dipakai untuk menilai tabungan baru):
   * gaji per bulan - (biaya hidup + tagihan rutin + cicilan utang) - setoran tabungan lain.
   * Bila gaji belum diatur di Rencana, dipakai rata-rata riwayat (planBasis = "rata-rata").
   */
  planIncomeMonthly: number;
  planFixedMonthly: number;
  planLivingMonthly: number;
  planBillsMonthly: number;
  planDebtMonthly: number;
  planBasis: "rencana" | "rata-rata";
  /** Jadwal gajian dari Rencana, atau null bila belum diatur. */
  planPayday: { first: string; amount: number; frequency: "monthly" | "biweekly" } | null;
  /** Komitmen rutin pasti per bulan dari pengaturan; null = belum ditanya. */
  planOtherFixedMonthly: number | null;
}


/**
 * userId: wajib bila dipanggil dengan klien kunci layanan (pekerjaan terjadwal), karena klien itu tidak dibatasi RLS.
 * Dari sesi pengguna biasa boleh dikosongkan (RLS sudah membatasi ke pemilik).
 */
export async function buildFinanceSummary(
  supabase: SupabaseClient<Database>,
  today: string,
  userId?: string
): Promise<FinanceSummary> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const own = <T,>(q: T): T => (userId ? (q as any).eq("user_id", userId) : q);
  const monthStart = `${today.slice(0, 7)}-01`;
  const threeAgo = addMonths(monthStart, -3);

  const [txRes, walletRes, goalRes, catRes, payRes, planPayRes, settingsRes, recRes, debtRes] = await Promise.all([
    own(
      supabase
        .from("transactions")
        .select("type, amount, date, category_id")
        .in("type", ["income", "expense"])
        .gte("date", threeAgo)
        .lte("date", today)
        .limit(5000)
    ),
    own(supabase.from("wallet_balances").select("balance, type, is_archived")),
    own(supabase.from("goal_progress").select("name, target_amount, saved, deadline, planned_per_payday, status")),
    supabase.from("categories").select("id, name"),
    own(supabase.from("payday_schedule").select("date").gte("date", today).order("date", { ascending: true }).limit(1)),
    own(
      supabase
        .from("payday_schedule")
        .select("date, expected_amount")
        .gte("date", today)
        .is("actual_amount", null)
        .order("date", { ascending: true })
        .limit(6)
    ),
    own(supabase.from("user_settings").select("living_cost_per_payday, other_fixed_monthly")).maybeSingle(),
    own(supabase.from("recurring_transactions").select("amount, rule").eq("is_active", true).eq("type", "expense")),
    own(supabase.from("debts").select("min_payment")),
  ]);

  const catName = new Map((catRes.data ?? []).map((c) => [c.id, c.name]));
  const monthly = new Map<string, { income: number; expense: number }>();
  const thisCat = new Map<string, number>();
  let thisIncome = 0;
  let thisExpense = 0;

  for (const t of txRes.data ?? []) {
    const ym = String(t.date).slice(0, 7);
    const m = monthly.get(ym) ?? { income: 0, expense: 0 };
    const amt = Number(t.amount) || 0;
    if (t.type === "income") m.income += amt;
    else m.expense += amt;
    monthly.set(ym, m);
    if (String(t.date) >= monthStart) {
      if (t.type === "income") thisIncome += amt;
      else {
        thisExpense += amt;
        const n = t.category_id ? catName.get(t.category_id) ?? "Lainnya" : "Lainnya";
        thisCat.set(n, (thisCat.get(n) ?? 0) + amt);
      }
    }
  }

  // Rata-rata dari bulan penuh sebelumnya; kalau belum ada, pakai bulan berjalan
  const currentYm = today.slice(0, 7);
  const full = [...monthly.entries()].filter(([ym]) => ym < currentYm);
  const source = full.length > 0 ? full.map(([, v]) => v) : [{ income: thisIncome, expense: thisExpense }];
  const avgIncome = Math.round(source.reduce((a, v) => a + v.income, 0) / source.length);
  const avgExpense = Math.round(source.reduce((a, v) => a + v.expense, 0) / source.length);

  const wallets = walletRes.data ?? [];
  const totalBalance = wallets.filter((w) => !w.is_archived).reduce((a, w) => a + Number(w.balance || 0), 0);
  const savingsBalance = wallets
    .filter((w) => !w.is_archived && w.type === "tabungan")
    .reduce((a, w) => a + Number(w.balance || 0), 0);

  const goals = (goalRes.data ?? [])
    .filter((g) => g.status === "aktif")
    .map((g) => ({
      name: String(g.name),
      target: Number(g.target_amount) || 0,
      saved: Number(g.saved) || 0,
      deadline: g.deadline ?? null,
      monthly: Number(g.planned_per_payday) || 0,
    }));

  const goalsMonthly = goals.reduce((a, g) => a + g.monthly, 0);

  // Hitungan ala Money Planner: gaji dari jadwal gajian, dikurangi biaya hidup, tagihan rutin, dan cicilan utang.
  const pd = paydayInfoFromRows((planPayRes.data ?? []).map((r) => ({ date: String(r.date), expected_amount: Number(r.expected_amount) })));
  const planIncome = pd.incomeMonthly;
  const perMonth = pd.perMonth;
  const livingMonthly = Math.round(Number(settingsRes.data?.living_cost_per_payday ?? 0) * perMonth);
  const billsMonthly = billsMonthlyFromRules(recRes.data ?? []);
  const debtMonthly = Math.round((debtRes.data ?? []).reduce((a, d) => a + Number(d.min_payment || 0), 0));
  const useRencana = planIncome > 0;
  // Biaya hidup belum diisi: pakai rata-rata pengeluaran riwayat (sudah memuat tagihan), cicilan utang tetap ditambahkan.
  const planFixed = livingMonthly > 0 ? livingMonthly + billsMonthly + debtMonthly : Math.max(avgExpense, billsMonthly) + debtMonthly;

  return {
    today,
    planIncomeMonthly: useRencana ? planIncome : avgIncome,
    planFixedMonthly: useRencana ? planFixed : avgExpense + debtMonthly,
    planLivingMonthly: livingMonthly,
    planBillsMonthly: billsMonthly,
    planDebtMonthly: debtMonthly,
    planBasis: useRencana ? "rencana" : "rata-rata",
    planPayday: useRencana ? pd.payday : null,
    planOtherFixedMonthly: settingsRes.data?.other_fixed_monthly == null ? null : Number(settingsRes.data.other_fixed_monthly),
    avgMonthlyIncome: avgIncome,
    avgMonthlyExpense: avgExpense,
    monthsOfData: full.length,
    thisMonthIncome: thisIncome,
    thisMonthExpense: thisExpense,
    totalBalance,
    savingsBalance,
    topCategories: [...thisCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount })),
    goals,
    otherMonthlyCommitments: goalsMonthly,
    nextPayday: payRes.data?.[0]?.date ?? null,
    nextPaydayAmount: Number(planPayRes.data?.[0]?.expected_amount ?? 0) || 0,
    paydaysPerMonth: perMonth,
  };
}

/** Data yang belum ada dan memengaruhi rencana. Ruby menanyakannya di akhir jawaban (satu pertanyaan per giliran). */
export function missingDataText(s: FinanceSummary): string {
  const miss: string[] = [];
  if (!s.nextPaydayAmount || !s.nextPayday) miss.push("gaji dan tanggal gajian belum diatur");
  if (s.planBasis === "rencana" && s.planLivingMonthly <= 0) miss.push("biaya hidup per gajian belum diisi (hitungan memakai rata-rata riwayat)");
  if (s.planOtherFixedMonthly === null) miss.push("komitmen rutin lain (zakat, kiriman keluarga, asuransi, investasi) belum ditanyakan");
  const noDeadline = s.goals.filter((g) => !g.deadline).map((g) => g.name);
  if (noDeadline.length) miss.push(`target tanpa tenggat: ${noDeadline.join(", ")}`);
  if (miss.length === 0) return "";
  return `DATA YANG KURANG (setelah memberi rencana dengan data yang ada, tanyakan SATU hal paling penting dari daftar ini): ${miss.join("; ")}.`;
}

const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

/** Teks ringkas untuk dimasukkan ke prompt. */
export function allocationInputFromSummary(s: FinanceSummary): AllocationInput {
  return {
    today: s.today,
    totalBalance: s.totalBalance,
    savingsBalance: s.savingsBalance,
    nextPayday: s.nextPayday,
    nextPaydayAmount: s.nextPaydayAmount,
    perMonth: s.paydaysPerMonth,
    fixedMonthly: s.planFixedMonthly,
    goals: s.goals,
  };
}

export function summaryToText(s: FinanceSummary): string {
  const alloc = allocationInputFromSummary(s);
  return [
    `Hari ini: ${s.today}`,
    `Rata-rata per bulan (${s.monthsOfData || "bulan ini"} bulan data): pemasukan ${rp(s.avgMonthlyIncome)}, pengeluaran ${rp(s.avgMonthlyExpense)}`,
    s.planBasis === "rencana"
      ? `Hitungan Money Planner per bulan: gaji ${rp(s.planIncomeMonthly)}, dikurangi biaya hidup ${rp(s.planLivingMonthly)}, tagihan rutin ${rp(s.planBillsMonthly)}, cicilan utang ${rp(s.planDebtMonthly)}, setoran tabungan lain ${rp(s.otherMonthlyCommitments)}`
      : `Gaji belum diatur di Rencana, jadi dipakai rata-rata riwayat sebagai pemasukan.`,
    `Bulan ini sejauh ini: pemasukan ${rp(s.thisMonthIncome)}, pengeluaran ${rp(s.thisMonthExpense)}`,
    `Total saldo semua dompet: ${rp(s.totalBalance)} (di antaranya tabungan ${rp(s.savingsBalance)})`,
    `Pengeluaran terbesar bulan ini: ${s.topCategories.map((c) => `${c.name} ${rp(c.amount)}`).join(", ") || "belum ada"}`,
    `Tabungan aktif: ${s.goals.map((g) => `${g.name} (terkumpul ${rp(g.saved)} dari ${rp(g.target)}${g.deadline ? `, tenggat ${g.deadline}` : ""}, setoran ${rp(g.monthly)}/bulan)`).join("; ") || "belum ada"}`,
    `Gajian berikutnya: ${s.nextPayday ?? "belum diatur"}`,
    allocationToText(buildAllocation(alloc), s.nextPayday),
    roadmapToText(buildRoadmap(alloc)),
    missingDataText(s),
  ]
    .filter(Boolean)
    .join("\n");
}
